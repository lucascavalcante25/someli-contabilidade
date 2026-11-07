#!/usr/bin/env python3
"""
Importa acessos e anotações que ficavam dentro dos cartões do Trello.

Passo 1 (revisar): lê o JSON local e gera um CSV para um humano corrigir.
Passo 2 (enviar): lê o CSV revisado e grava pela API em HTTPS. O backend cifra.

Não gera SQL. Não imprime senha, login nem texto — só contagens.
O CSV fica em deploy/import/saida/ (gitignored). Apague-o depois.

  python -I deploy/import/importar_trello_acessos.py revisar --json quadro.json --clientes clientes.txt --saida deploy/import/saida
  python -I deploy/import/importar_trello_acessos.py enviar --csv deploy/import/saida/revisao_trello.csv --api https://host
"""
from __future__ import annotations

import argparse
import csv
import getpass
import json
import re
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

from importar_trello import (
    LISTAS,
    atividade_para_obrigacao,
    casar_cliente,
    chave,
    nome_sensivel,
)

CRED = re.compile(
    r"\b(login|usu[aá]rio|usuario|user|senha|password|c[oó]digo de acesso|codigo de acesso)\b",
    re.I,
)
PORTAL = re.compile(
    r"e-?\s?cac|prefeitura|sefaz|e-?\s?social|simples nacional|fgts|internet banking|gov\.br|nfs-?e",
    re.I,
)
CAMPO = re.compile(
    r"^(login|usu[aá]rio|usuario|user|senha|password|c[oó]digo de acesso|codigo de acesso)\s*[:\-]\s*(.+)$",
    re.I,
)
URL_RE = re.compile(r"https?://\S+")
TENTATIVAS = 5
PAUSA_ENTRE_PEDIDOS = 0.3
COLUNAS = [
    "tipo", "situacao", "cliente", "cartao", "sistema", "url", "login", "senha",
    "observacao", "titulo", "texto", "setor", "origem",
]


def checklist_mensal(nome: str) -> bool:
    k = chave(nome)
    return bool(re.search(r"\bmensal\b|todo mes|competenc", k))


def parece_acesso(texto: str) -> bool:
    if CRED.search(texto or ""):
        return True
    return bool(PORTAL.search(texto or "") and (URL_RE.search(texto or "") or ":" in (texto or "")))


def adivinhar_setor(texto: str) -> str:
    k = chave(texto)
    if re.search(r"pessoal|folha|esocial|e social|fgts|pro ?labore", k):
        return "DEPARTAMENTO_PESSOAL"
    if re.search(r"societ|contrato social|junta comercial", k):
        return "SOCIETARIO"
    if re.search(r"\bcontabil\b", k):
        return "CONTABIL"
    if re.search(r"fiscal|sefaz|ecac|e cac|prefeitura|simples|nfse|nfs e|\bdas\b", k):
        return "FISCAL"
    return ""


def _blocos(texto: str) -> list[str]:
    partes = re.split(r"\n\s*\n", texto or "")
    return [p.strip() for p in partes if p and p.strip()]


def _parse_acesso(bloco: str) -> dict:
    sistema = ""
    url = ""
    login = ""
    senha = ""
    extras: list[str] = []
    for linha in bloco.splitlines():
        linha = linha.strip()
        if not linha:
            continue
        murl = URL_RE.search(linha)
        if murl and not url:
            url = murl.group(0).rstrip(".,)")
        campo = CAMPO.match(linha)
        if campo:
            nome, valor = campo.group(1).lower(), campo.group(2).strip()
            if nome.startswith("sen") or "password" in nome or "digo" in nome:
                if not senha:
                    senha = valor
                else:
                    extras.append(linha)
            else:
                login = valor
            continue
        if not sistema and not murl:
            sistema = linha[:120]
        elif murl and linha.replace(url, "").strip(" :-") == "":
            continue
        else:
            extras.append(linha)
    if not sistema:
        sistema = "Portal"
    return {
        "tipo": "ACESSO",
        "sistema": sistema,
        "url": url,
        "login": login,
        "senha": senha,
        "observacao": "\n".join(extras),
        "titulo": "",
        "texto": "",
        "setor": adivinhar_setor(bloco),
        "origem": "TRELLO",
    }


def _anotacao(titulo: str, texto: str, setor: str = "") -> dict:
    return {
        "tipo": "ANOTACAO",
        "sistema": "",
        "url": "",
        "login": "",
        "senha": "",
        "observacao": "",
        "titulo": (titulo or "Anotação")[:200],
        "texto": texto.strip(),
        "setor": setor or adivinhar_setor(texto),
        "origem": "TRELLO",
    }


def _classificar_bloco(bloco: str, titulo: str) -> dict | None:
    if not bloco.strip():
        return None
    if parece_acesso(bloco):
        return _parse_acesso(bloco)
    return _anotacao(titulo, bloco)


def ler_cartoes(quadro: dict) -> list[dict]:
    listas = {item["id"]: item.get("name", "").strip() for item in quadro.get("lists", []) if not item.get("closed")}
    checks = {item["id"]: item for item in quadro.get("checklists", [])}
    comentarios: dict[str, list[str]] = {}
    for acao in quadro.get("actions", []):
        if acao.get("type") != "commentCard":
            continue
        data = acao.get("data") or {}
        card_id = (data.get("card") or {}).get("id")
        texto = (data.get("text") or "").strip()
        if card_id and texto:
            comentarios.setdefault(card_id, []).append(texto)
    saida = []
    for card in quadro.get("cards", []):
        if card.get("closed"):
            continue
        lista = listas.get(card.get("idList"))
        if not lista or not any(lista.upper().startswith(prefixo) for prefixo in LISTAS):
            continue
        listas_check = []
        for cid in card.get("idChecklists") or []:
            ck = checks.get(cid)
            if not ck:
                continue
            itens = [it.get("name", "").strip() for it in ck.get("checkItems") or []]
            listas_check.append({"nome": ck.get("name") or "", "itens": [i for i in itens if i]})
        anexos = [{"nome": at.get("name") or "", "url": at.get("url") or ""} for at in card.get("attachments") or []]
        saida.append({
            "nome": (card.get("name") or "").strip(),
            "lista": lista,
            "desc": card.get("desc") or "",
            "comentarios": comentarios.get(card.get("id"), []),
            "checklists": listas_check,
            "anexos": anexos,
        })
    return saida


def extrair(quadro: dict, clientes: dict[str, object]) -> list[dict]:
    linhas: list[dict] = []
    for card in ler_cartoes(quadro):
        if nome_sensivel(card["nome"]):
            cliente, como = "", "título sensível"
        else:
            cliente, como = casar_cliente(card["nome"], clientes)
            cliente = cliente or ""
        situacao = "ok" if cliente else "revisar"
        base = {"situacao": situacao if como not in {"ambíguo", "não é cliente", "título sensível"} else "revisar",
                "cliente": cliente, "cartao": "[oculto]" if nome_sensivel(card["nome"]) else card["nome"]}
        if como == "não é cliente":
            continue

        def acrescentar(item: dict | None) -> None:
            if not item:
                return
            if item["tipo"] == "ANOTACAO" and not item["texto"].strip():
                return
            linhas.append({**base, **item})

        for bloco in _blocos(card["desc"]):
            acrescentar(_classificar_bloco(bloco, "Descrição"))
        for comentario in card["comentarios"]:
            acrescentar(_classificar_bloco(comentario, "Comentário"))
        for ck in card["checklists"]:
            for item in ck["itens"]:
                if atividade_para_obrigacao(item):
                    continue
                if checklist_mensal(ck["nome"]) and not parece_acesso(item):
                    acrescentar(_anotacao(ck["nome"] or "Checklist", item))
                    continue
                acrescentar(_classificar_bloco(item, ck["nome"] or "Checklist"))
        links = []
        for anexo in card["anexos"]:
            if parece_acesso(anexo["nome"]):
                bloco = anexo["nome"]
                if anexo["url"]:
                    bloco += "\n" + anexo["url"]
                acrescentar(_classificar_bloco(bloco, "Anexo"))
            elif anexo["url"] or anexo["nome"]:
                links.append(" ".join(p for p in (anexo["nome"], anexo["url"]) if p))
        if links:
            acrescentar(_anotacao("Links", "\n".join(links)))
    return linhas


def escrever_csv(linhas: list[dict], pasta: Path) -> Path:
    pasta.mkdir(parents=True, exist_ok=True)
    destino = pasta / "revisao_trello.csv"
    with destino.open("w", encoding="utf-8-sig", newline="") as arq:
        writer = csv.DictWriter(arq, fieldnames=COLUNAS, extrasaction="ignore")
        writer.writeheader()
        for linha in linhas:
            writer.writerow({coluna: linha.get(coluna, "") for coluna in COLUNAS})
    return destino


def _json(url: str, token: str, metodo: str = "GET", corpo: dict | None = None, abrir=urllib.request.urlopen):
    data = None if corpo is None else json.dumps(corpo).encode("utf-8")
    req = urllib.request.Request(url, data=data, method=metodo)
    req.add_header("Authorization", f"Bearer {token}")
    req.add_header("Accept", "application/json")
    if corpo is not None:
        req.add_header("Content-Type", "application/json")
    # Conexões seguidas às vezes são derrubadas pelo servidor: espera e tenta de novo.
    # Reenviar é seguro: o backend não duplica acesso do Trello com o mesmo sistema.
    for tentativa in range(TENTATIVAS):
        if abrir is urllib.request.urlopen:
            time.sleep(PAUSA_ENTRE_PEDIDOS)
        try:
            with abrir(req, timeout=60) as resp:
                bruto = resp.read().decode("utf-8")
                status = getattr(resp, "status", 200)
                return status, json.loads(bruto) if bruto else None
        except urllib.error.HTTPError as ex:
            if ex.code in (429, 502, 503, 504) and tentativa < TENTATIVAS - 1:
                time.sleep(2 ** (tentativa + 1))
                continue
            return ex.code, None
        except (urllib.error.URLError, ConnectionError, TimeoutError):
            if tentativa == TENTATIVAS - 1:
                raise
            print(f"conexão caiu, tentando de novo ({tentativa + 2}/{TENTATIVAS})...", file=sys.stderr)
            time.sleep(2 ** (tentativa + 1))
    return 0, None


def _id_cliente(clientes: list, nome: str) -> int | None:
    alvo = chave(nome)
    for cliente in clientes:
        if chave(str(cliente.get("nomeFantasia") or "")) == alvo:
            return int(cliente["id"])
    return None


def enviar(csv_path: Path, api: str, token: str, abrir=urllib.request.urlopen) -> dict[str, int]:
    if not api.startswith("https://"):
        raise SystemExit("A API precisa ser HTTPS.")
    api = api.rstrip("/")
    contagem = {"acessos_criados": 0, "acessos_existentes": 0, "anotacoes_criadas": 0,
                "anotacoes_existentes": 0, "pulados": 0, "falhas": 0}
    status, clientes = _json(f"{api}/clientes", token, abrir=abrir)
    if status != 200 or not isinstance(clientes, list):
        contagem["falhas"] += 1
        return contagem
    with csv_path.open(encoding="utf-8-sig", newline="") as arq:
        for numero, linha in enumerate(csv.DictReader(arq), start=2):
            cliente_id = _id_cliente(clientes, linha.get("cliente") or "")
            if not cliente_id or (linha.get("situacao") or "").strip() == "revisar":
                contagem["pulados"] += 1
                continue
            if linha.get("tipo") == "ACESSO":
                if not (linha.get("sistema") and linha.get("login") and linha.get("senha")):
                    contagem["pulados"] += 1
                    continue
                st, atuais = _json(f"{api}/clientes/{cliente_id}/acessos", token, abrir=abrir)
                if st != 200 or not isinstance(atuais, list):
                    contagem["falhas"] += 1
                    print(f"falha na linha {numero} do CSV (consulta): HTTP {st}", file=sys.stderr)
                    continue
                if any(item.get("origem") == "TRELLO" and chave(str(item.get("sistema") or "")) == chave(linha["sistema"])
                       for item in atuais):
                    contagem["acessos_existentes"] += 1
                    continue
                st, _ = _json(f"{api}/clientes/{cliente_id}/acessos", token, "POST", {
                    "sistema": linha["sistema"],
                    "url": linha.get("url") or None,
                    "login": linha["login"],
                    "senha": linha["senha"],
                    "observacao": linha.get("observacao") or None,
                    "setor": linha.get("setor") or None,
                    "origem": "TRELLO",
                }, abrir)
                if st in (200, 201):
                    contagem["acessos_criados" if st == 201 else "acessos_existentes"] += 1
                else:
                    contagem["falhas"] += 1
                    print(f"falha na linha {numero} do CSV (acesso): HTTP {st}", file=sys.stderr)
            elif linha.get("tipo") == "ANOTACAO":
                texto = (linha.get("texto") or "").strip()
                if not texto:
                    contagem["pulados"] += 1
                    continue
                st, atuais = _json(f"{api}/clientes/{cliente_id}/anotacoes", token, abrir=abrir)
                if st != 200 or not isinstance(atuais, list):
                    contagem["falhas"] += 1
                    print(f"falha na linha {numero} do CSV (consulta): HTTP {st}", file=sys.stderr)
                    continue
                titulo = (linha.get("titulo") or "").strip() or None
                if any(item.get("origem") == "TRELLO" and (item.get("titulo") or None) == titulo and item.get("texto") == texto
                       for item in atuais):
                    contagem["anotacoes_existentes"] += 1
                    continue
                st, _ = _json(f"{api}/clientes/{cliente_id}/anotacoes", token, "POST", {
                    "titulo": titulo,
                    "texto": texto,
                    "setor": linha.get("setor") or None,
                    "fixada": False,
                    "origem": "TRELLO",
                }, abrir)
                if st in (200, 201):
                    contagem["anotacoes_criadas" if st == 201 else "anotacoes_existentes"] += 1
                else:
                    contagem["falhas"] += 1
                    print(f"falha na linha {numero} do CSV (anotação): HTTP {st}", file=sys.stderr)
            else:
                contagem["pulados"] += 1
    return contagem


def _ler_clientes(path: Path) -> dict[str, bool]:
    return {linha.strip(): True for linha in path.read_text(encoding="utf-8").splitlines() if linha.strip()}


def main(argv: list[str] | None = None) -> int:
    if argv and any(arg == "--token" or arg.startswith("--token=") for arg in argv):
        print("O token não vai em argumento. Ele é pedido no terminal.", file=sys.stderr)
        return 2
    ap = argparse.ArgumentParser()
    sub = ap.add_subparsers(dest="cmd", required=True)
    rev = sub.add_parser("revisar")
    rev.add_argument("--json", required=True, type=Path)
    rev.add_argument("--clientes", required=True, type=Path)
    rev.add_argument("--saida", required=True, type=Path)
    env = sub.add_parser("enviar")
    env.add_argument("--csv", required=True, type=Path)
    env.add_argument("--api", required=True)
    args = ap.parse_args(argv)
    if args.cmd == "revisar":
        quadro = json.loads(args.json.read_text(encoding="utf-8"))
        linhas = extrair(quadro, _ler_clientes(args.clientes))
        destino = escrever_csv(linhas, args.saida)
        acessos = sum(1 for linha in linhas if linha["tipo"] == "ACESSO")
        notas = sum(1 for linha in linhas if linha["tipo"] == "ANOTACAO")
        revisar = sum(1 for linha in linhas if linha["situacao"] != "ok")
        print(f"acessos: {acessos} | anotações: {notas} | para revisar: {revisar}")
        print(f"CSV: {destino}")
        print("Revise o CSV e apague-o depois da importação. Ele contém senhas.")
        return 0
    token = getpass.getpass("Token de admin: ")
    if not token.strip():
        print("Token vazio.", file=sys.stderr)
        return 2
    contagem = enviar(args.csv, args.api, token.strip())
    print(
        "acessos criados: {acessos_criados} | acessos já importados: {acessos_existentes} | "
        "anotações criadas: {anotacoes_criadas} | anotações já importadas: {anotacoes_existentes} | "
        "pulados: {pulados} | falhas: {falhas}".format(**contagem)
    )
    print("Apague o CSV revisado: ele contém senhas em texto puro.")
    return 0 if contagem["falhas"] == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
