#!/usr/bin/env python3
"""
Importa as atividades mensais dos checklists do Trello (quadro SOMELI ADM) para o sistema.

Lê do JSON exportado SÓ o nome do cartão e os itens de checklist. Descrição, comentários e anexos
(onde ficam logins e senhas) nunca são lidos aqui; os acessos vão para o cofre em outra etapa.

Uso:
  python -I deploy/import/importar_trello.py --json "docs/<quadro>.json" --clientes clientes.txt --saida deploy/import/saida
  (clientes.txt: um nome fantasia por linha, como está no sistema)
Gera conferencia_trello.md (para revisar) e importar_trello.sql (BEGIN/COMMIT, cria só o que falta).
"""
from __future__ import annotations

import argparse
import json
import re
import unicodedata
from pathlib import Path

LISTAS = {"EMPRESAS SERV": "SERVICOS", "EMPRESAS COMERCIO": "COMERCIO_INDUSTRIA"}

# Cartão do Trello → nome fantasia no sistema (quando o nome não bate direto)
APELIDOS = {
    "fra frigorifico": "Fra Carnes",
    "rumosmoveis": "Rumos Moveis",
    "ds solucoes davi": "DS Solucoes Ltda",
    "dra ramona kelly torres matias ltda": "Clinica Ramona",
    "empresa eudinho mei": "Eudinho",
    "samuel ltda": "Samuel Alcantara",
    "matheus vieira de araujo": "Matheus",
    "timbu acaiteria": "Açai Timbu",
    "jg moveis": "JG Almeida",
    "lebeniste ltda": "Lebeniste",
    "ce salinas do nordeste ltda": "Salinas",
    "morales medical support ltda filial": "Morales Medical Support Ltda",
    "jf tecnologia joao": "JF Tecnologia Ltda",
    "registre clicks 2 simples": "Registre Clicks",
    "dj": "DJ Pedro Henrico Ltda",
    "mercadinho novo luciana glauberto": "Preço Bom Mercadinho",
    "mega distribuidora adrielle": "Adrielee",
    "irisnei ltda": "Irisnei Ltda",
    "consfel construcoes ltda": "Consfel Construções Ltda",
    "alianca construcao ltda": "Alianca Construcao Ltda",
    "extrapack distribuidora ltda me": "Extrapack Distribuidora Ltda. - ME",
    "churrascaria louro grill ltda": "Churrascaria Louro Grill Ltda",
    "daniel mercadinho compre sempre": "Daniel - Mercadinho Compre Sempre",
}
# Cartões que não são cliente (ou não estão no sistema)
NAO_CLIENTE = {"someli", "igreja semear patricia", "fazer defis"}
# Nomes que batem com mais de um cliente
AMBIGUOS = {"estrela ester"}

# Item do checklist → obrigação(ões) do catálogo. Ordem importa: a primeira regra que casa vale.
REGRAS: list[tuple[str, list[str]]] = [
    (r"prolabore.*folha", ["Pró-labore", "Folha de pagamento", "FGTS Digital"]),
    (r"folha.*fgts", ["Folha de pagamento", "FGTS Digital"]),
    (r"folha de pagamento", ["Folha de pagamento"]),
    (r"pro ?labore", ["Pró-labore"]),
    (r"^enc\w*r+am", ["Encerramento fiscal (ISS)"]),  # ENCERRAMENTO, ENCERRAMNETO, ENCRRAMENTO...
    (r"parc\w*\.? *(simples)", ["Parc. Simples"]),
    (r"parc\w*\.? *pgfn", ["Parc. PGFN"]),
    (r"parc\w* .*mei", ["Parc. MEI"]),
    (r"parcelamento receita$", ["Parc. Receita Federal"]),
    (r"^simples nacional$", ["PGDAS-D"]),
    (r"^das$", ["DAS"]),
    (r"^das mei", ["DAS MEI"]),
    (r"dctf", ["DCTFWeb"]),
    (r"import\w* (de )?nfs", ["Importar NFS-e"]),
    (r"emiss\w* (de )?(nfs|nota)|^nfs ?e$|^nota fiscal$", ["Emissão de nota fiscal"]),
    (r"solicitar faturamento", ["Solicitar faturamento"]),
    (r"relat\w* de cart", ["Relatórios de cartão"]),
    (r"extrato banc|^bancos", ["Extrato bancário"]),
    (r"cadastro det", ["DET (Domicílio Eletrônico Trabalhista)"]),
    (r"icms st", ["ICMS-ST"]),
]

SENSIVEL = re.compile(r"senha|login|usu[aá]rio|@|\d{3}\.\d{3}|\d{6,}", re.I)


def chave(texto: str | None) -> str:
    s = unicodedata.normalize("NFKD", texto or "")
    s = "".join(c for c in s if not unicodedata.combining(c)).lower()
    return " ".join(re.sub(r"[^a-z0-9]+", " ", s).split())


def nome_sensivel(nome: str) -> bool:
    return bool(SENSIVEL.search(nome or ""))


def atividade_para_obrigacao(item: str) -> list[str]:
    k = chave(item)
    for padrao, obrigacoes in REGRAS:
        if re.search(padrao, k):
            return list(obrigacoes)
    return []


def casar_cliente(nome_cartao: str, clientes: dict[str, object]) -> tuple[str | None, str]:
    k = chave(nome_cartao)
    if k in NAO_CLIENTE:
        return None, "não é cliente"
    if k in AMBIGUOS:
        return None, "ambíguo"
    por_chave = {chave(n): n for n in clientes}
    if k in por_chave:
        return por_chave[k], "exato"
    if k in APELIDOS and APELIDOS[k] in clientes:
        return APELIDOS[k], "apelido"
    return None, "sem cliente"


def ler_quadro(quadro: dict, prefixos: list[str]) -> list[dict]:
    """Só nome do cartão e itens de checklist. A descrição (desc) nunca é lida."""
    listas = {l["id"]: l["name"].strip() for l in quadro.get("lists", []) if not l.get("closed")}
    checklists = {c["id"]: c for c in quadro.get("checklists", [])}
    saida = []
    for c in quadro.get("cards", []):
        lista = listas.get(c.get("idList"))
        if c.get("closed") or not lista or not any(lista.upper().startswith(p) for p in prefixos):
            continue
        itens = [it.get("name", "").strip()
                 for cid in c.get("idChecklists", []) if cid in checklists
                 for it in checklists[cid].get("checkItems", [])]
        saida.append({"lista": lista, "nome": c.get("name", "").strip(), "itens": [i for i in itens if i]})
    return saida


def _lit(v: str) -> str:
    return "'" + v.replace("'", "''") + "'"


def gerar_sql(planos: list[dict]) -> str:
    """planos: [{cliente: nome fantasia, obrigacoes: [...], segmento: SERVICOS|COMERCIO_INDUSTRIA}]"""
    l = ["BEGIN;", "",
         "CREATE TEMP TABLE trello (cliente text, obrigacao text, segmento text) ON COMMIT DROP;"]
    for p in planos:
        for o in p["obrigacoes"]:
            l.append(f"INSERT INTO trello VALUES ({_lit(p['cliente'])}, {_lit(o)}, {_lit(p['segmento'])});")
    l += ["",
          "DO $$ DECLARE r record; problema boolean := FALSE; BEGIN",
          "  FOR r IN SELECT DISTINCT t.cliente FROM trello t",
          "           WHERE (SELECT count(*) FROM cliente c WHERE c.nome_fantasia = t.cliente) <> 1 LOOP",
          "    RAISE NOTICE 'Cliente não encontrado (ou repetido) no sistema: %', r.cliente; problema := TRUE; END LOOP;",
          "  FOR r IN SELECT DISTINCT t.obrigacao FROM trello t",
          "           WHERE NOT EXISTS (SELECT 1 FROM obrigacao o WHERE o.nome = t.obrigacao) LOOP",
          "    RAISE NOTICE 'Obrigação não existe no catálogo: %', r.obrigacao; problema := TRUE; END LOOP;",
          "  IF problema THEN RAISE EXCEPTION 'Importação cancelada: confira os avisos acima. Nada foi alterado.'; END IF;",
          "END $$;", "",
          "-- Segmento como tag (Serviços / Comércio e Indústria)",
          "INSERT INTO tag (nome, cor) VALUES ('SERVICOS', '#2563EB'), ('COMERCIO_INDUSTRIA', '#D97706')",
          "ON CONFLICT (nome) DO NOTHING;",
          "INSERT INTO cliente_tag (cliente_id, tag_id)",
          "SELECT DISTINCT c.id, g.id FROM trello t JOIN cliente c ON c.nome_fantasia = t.cliente JOIN tag g ON g.nome = t.segmento",
          "WHERE c.ativo AND NOT EXISTS (SELECT 1 FROM cliente_tag x WHERE x.cliente_id = c.id AND x.tag_id = g.id);", "",
          "-- Atividades mensais que o cliente ainda não tem (a ocorrência do mês é criada pela API ao reiniciar)",
          "INSERT INTO cliente_obrigacao (cliente_id, obrigacao_id, data_vencimento, ativo, periodicidade, dia_vencimento,",
          "                               tipo_regra_vencimento, setor, dias_antecedencia_alerta, observacao)",
          "SELECT DISTINCT c.id, o.id,",
          "       make_date(extract(year FROM current_date)::int, extract(month FROM current_date)::int,",
          "                 least(coalesce(o.dia_vencimento_padrao, 20), 28)),",
          "       TRUE, 'MENSAL', coalesce(o.dia_vencimento_padrao, 20), 'DIA_FIXO', o.setor, o.dias_antecedencia_alerta,",
          "       'Importado do Trello'",
          "FROM trello t JOIN cliente c ON c.nome_fantasia = t.cliente JOIN obrigacao o ON o.nome = t.obrigacao",
          "WHERE c.ativo  -- inativo não ganha atividade",
          "  AND NOT EXISTS (SELECT 1 FROM cliente_obrigacao x WHERE x.cliente_id = c.id AND x.obrigacao_id = o.id AND x.ativo);",
          "",
          "SELECT count(DISTINCT cliente) AS clientes, count(*) AS atividades_no_trello FROM trello;",
          "",
          "COMMIT;"]
    return "\n".join(l) + "\n"


def montar(cartoes: list[dict], clientes: dict[str, object]) -> tuple[list[dict], list[str]]:
    planos: dict[str, dict] = {}
    linhas = ["# Conferência da importação do Trello", "",
              "Só nome do cartão e itens de checklist foram lidos. Descrições (acessos) ficaram de fora.", "",
              "| Lista | Cartão | Cliente no sistema | Como casou | Atividades → obrigações | Fora do painel mensal |",
              "|---|---|---|---|---|---|"]
    for c in cartoes:
        segmento = next(v for p, v in LISTAS.items() if c["lista"].upper().startswith(p))
        nome = "[título com dado sensível — revisar no Trello]" if nome_sensivel(c["nome"]) else c["nome"]
        cliente, como = (None, "título sensível") if nome_sensivel(c["nome"]) else casar_cliente(c["nome"], clientes)
        obrigacoes, fora = [], []
        for item in c["itens"]:
            alvo = atividade_para_obrigacao(item)
            if alvo:
                obrigacoes += [o for o in alvo if o not in obrigacoes]
            else:
                fora.append("[oculto]" if nome_sensivel(item) else item)
        linhas.append(f"| {segmento} | {nome} | {cliente or '—'} | {como} | {', '.join(obrigacoes) or '—'} "
                      f"| {', '.join(fora) or '—'} |")
        if cliente and obrigacoes:
            plano = planos.setdefault(cliente, {"cliente": cliente, "obrigacoes": [], "segmento": segmento})
            plano["obrigacoes"] += [o for o in obrigacoes if o not in plano["obrigacoes"]]
    return list(planos.values()), linhas


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--json", required=True, type=Path)
    ap.add_argument("--clientes", required=True, type=Path)
    ap.add_argument("--saida", required=True, type=Path)
    a = ap.parse_args()
    quadro = json.loads(a.json.read_text(encoding="utf-8"))
    clientes = {l.strip(): True for l in a.clientes.read_text(encoding="utf-8").splitlines() if l.strip()}
    planos, linhas = montar(ler_quadro(quadro, list(LISTAS)), clientes)
    a.saida.mkdir(parents=True, exist_ok=True)
    (a.saida / "conferencia_trello.md").write_text("\n".join(linhas) + "\n", encoding="utf-8", newline="\n")
    (a.saida / "importar_trello.sql").write_text(gerar_sql(planos), encoding="utf-8", newline="\n")
    total = sum(len(p["obrigacoes"]) for p in planos)
    print(f"clientes com atividades: {len(planos)} | vínculos previstos (antes de descontar os existentes): {total}")


if __name__ == "__main__":
    main()
