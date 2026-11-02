#!/usr/bin/env python3
"""
Gera o SQL que deixa a produção igual à planilha FINANCEIRO SOMELI.xlsx (aba RECEITAS 2026 e DESPESAS 2026),
sem apagar nem recriar clientes: casa cada linha com o cliente existente pelo nome normalizado ou pelo CNPJ.

Uso (no computador, depois rodar o SQL na VPS):
  python deploy/import/sync_planilha_2026.py --xlsx "FINANCEIRO SOMELI.xlsx" \\
      --receita receita.json --saida pasta_de_saida

`--receita` é opcional: JSON {nome_na_planilha: {"cnpj", "receita": {dados da BrasilAPI}}} com os CNPJs confirmados.
Regras confirmadas pelo escritório: docs da memória "projeto-sync-planilha-2026" e docs/SYNC_PLANILHA.md.
"""
from __future__ import annotations

import argparse
import json
import re
import unicodedata
from decimal import ROUND_HALF_UP, Decimal
from pathlib import Path

ANO = 2026
MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"]

# Cores de preenchimento das células (planilha usa o tema do Office)
PRETA, VERDE, VERMELHA, BRANCA, ROXA = "preta", "verde", "vermelha", "branca", "roxa"
# Situação de cada mês depois da leitura
PAGO, NAO_PAGO, NAO_COBRAVEL, PRETO, VAZIO = "pago", "nao_pago", "nao_cobravel", "preto", "vazio"

FICTICIOS_V23 = ["11222333000181", "22333444000172", "33444555000163", "44555666000154",
                 "55666777000145", "66777888000136", "77888999000127", "88999000000118"]
NOVOS = {"clinicaramona", "jlrepresentacao", "mundokids"}

SIGLAS = {"ME", "MEI", "MKT", "RR", "JG", "DS", "CA", "JF", "DJ", "J&L"}
MINUSCULAS = {"de", "da", "do", "das", "dos", "e"}

ACENTOS = "áàâãäéèêëíìîïóòôõöúùûüçñÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑ"
SEM_ACENTO = "aaaaaeeeeiiiiooooouuuucnAAAAAEEEEIIIIOOOOOUUUUCN"


# ---------------------------------------------------------------- regras puras

def padronizar_nome(nome: str) -> str:
    palavras = " ".join(str(nome).split()).split(" ")
    saida = []
    for i, p in enumerate(palavras):
        if p.upper() in SIGLAS:
            saida.append(p.upper())
        elif i > 0 and p.lower() in MINUSCULAS:
            saida.append(p.lower())
        elif len(p) == 1 or p == "-":
            saida.append(p.upper())
        else:
            saida.append(p[:1].upper() + p[1:].lower())
    return " ".join(saida)


def chave(nome: str | None) -> str:
    """Mesma regra da expressão SQL `_chave()`: sem acento, só letras e números, minúsculo."""
    s = unicodedata.normalize("NFKD", nome or "")
    s = "".join(c for c in s if not unicodedata.combining(c))
    return re.sub(r"[^a-z0-9]", "", s.lower())


def _decimal(v) -> Decimal | None:
    if v is None or v == "":
        return None
    try:
        return Decimal(str(v).replace(",", "."))
    except Exception:
        return None


def honorario(primeira, segunda) -> Decimal | None:
    """2ª coluna (reajustada); vazia ou zero usa a 1ª. As duas zeradas: None (mantém o valor atual)."""
    for v in (segunda, primeira):
        d = _decimal(v)
        if d is not None and d > 0:
            return d.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    return None


def conta_recebimento(flag) -> str | None:
    f = (str(flag).strip().upper() if flag is not None else "")
    return {"S": "SOMELI", "P": "PATRICIA"}.get(f)


def _numero(v) -> Decimal | None:
    if isinstance(v, (int, float, Decimal)) and not isinstance(v, bool):
        return Decimal(str(v))
    return None


def classificar_mes(valor, cor) -> str:
    texto = str(valor).strip().upper() if valor is not None else ""
    if cor == PRETA:
        return PRETO
    if texto == "-":
        return NAO_COBRAVEL
    if cor == VERMELHA:
        return NAO_PAGO
    numero = _numero(valor)
    if texto == "OK" or (numero is not None and numero > 0):
        return PAGO
    if numero is not None:
        return NAO_COBRAVEL
    return VAZIO


def analisar_cliente(celulas: list[tuple], inativo: bool) -> dict:
    situacoes = [classificar_mes(v, c) for v, c in celulas]
    mes = {i + 1: s for i, s in enumerate(situacoes)}
    pagos_idx = [m for m, s in mes.items() if s == PAGO]
    nunca_pagou = not pagos_idx
    if pagos_idx:
        inicio = pagos_idx[0]
    else:
        debitos = [m for m, s in mes.items() if s == NAO_PAGO]
        pretos = [m for m, s in mes.items() if s == PRETO]
        if debitos:
            inicio = debitos[0]
        elif pretos:
            inicio = pretos[-1]
            while inicio - 1 in pretos:
                inicio -= 1
        else:
            inicio = None

    pagos, nao_pagos, nao_cobraveis = set(), set(), set()
    if inicio is not None:
        for m in range(inicio, 13):
            s = mes[m]
            if s == PAGO:
                pagos.add(m)
            elif s in (NAO_PAGO, PRETO):
                nao_pagos.add(m)
            elif s == NAO_COBRAVEL:
                nao_cobraveis.add(m)

    fim = None
    if inativo:
        atividade = sorted(pagos | nao_pagos)
        # Sem nenhum movimento: fim em Jan, para o sistema não cobrar mês algum
        fim = atividade[-1] + 1 if atividade else 1
        if fim is not None:
            nao_pagos = {m for m in nao_pagos if m < fim}
    return {"inicio": inicio, "fim": fim, "ativo": not inativo, "pagos": pagos, "nao_pagos": nao_pagos,
            "nao_cobraveis": nao_cobraveis, "nunca_pagou": nunca_pagou, "situacoes": situacoes}


def analisar_despesa(celulas: list[tuple]) -> dict:
    mensais = {}
    for i, (v, cor) in enumerate(celulas):
        d = _decimal(v)
        if d is None or d <= 0:
            continue
        mensais[i + 1] = (d.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP), cor == VERDE)
    valor = mensais[max(mensais)][0] if mensais else Decimal("0.00")
    pagos = [m for m, (_, pago) in mensais.items() if pago]
    if pagos:
        valor = mensais[max(pagos)][0]
    return {"mensais": mensais, "valor_mensal": valor}


def tipo_despesa(categoria: str | None) -> str:
    c = (categoria or "").lower()
    if "cart" in c:
        return "cartao"
    if "fixa" in c:
        return "fixa"
    return "recorrente"


# ---------------------------------------------------------------- SQL

def _lit(v) -> str:
    if v is None:
        return "NULL"
    if isinstance(v, bool):
        return "TRUE" if v else "FALSE"
    if isinstance(v, (int, Decimal)):
        return str(v)
    return "'" + str(v).replace("'", "''") + "'"


def _data(mes: int | None) -> str:
    if mes is None:
        return "NULL"
    if mes > 12:
        return f"'{ANO + 1}-01-01'"
    return f"'{ANO}-{mes:02d}-01'"


CHAVE_SQL = ("lower(regexp_replace(translate(coalesce({x}, ''), '" + ACENTOS + "', '" + SEM_ACENTO
             + "'), '[^a-zA-Z0-9]', '', 'g'))")


def _chave_sql(expr: str) -> str:
    return CHAVE_SQL.format(x=expr)


def gerar_sql(clientes: list[dict], despesas: list[dict], ficticios: list[str]) -> str:
    l = ["BEGIN;", "",
         "-- Trava: a V30 precisa estar publicada antes.",
         "DO $$ BEGIN",
         "  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cliente'",
         "                 AND column_name = 'conta_recebimento') THEN",
         "    RAISE EXCEPTION 'Publique a V30 (conta_recebimento) antes de rodar este SQL';",
         "  END IF;",
         "END $$;", "",
         "CREATE TEMP TABLE planilha (",
         "  chave text PRIMARY KEY, cnpj text, nome text, razao text, honorario numeric(12,2), dia int,",
         "  forma text, conta text, ativo boolean, inicio date, fim date, regime text, proprietario text, novo boolean",
         ") ON COMMIT DROP;",
         "CREATE TEMP TABLE planilha_mes (chave text, mes int, pago boolean, cobravel boolean) ON COMMIT DROP;", ""]
    for c in clientes:
        razao = c.get("razao_oficial") or c["nome"]
        l.append("INSERT INTO planilha VALUES (" + ", ".join([
            _lit(chave(c["nome_planilha"])), _lit(c.get("cnpj")), _lit(c["nome"]), _lit(razao),
            _lit(c["honorario"]), _lit(c["dia_vencimento"]), _lit(c.get("forma")), _lit(c.get("conta")),
            _lit(c["ativo"]), _data(c["inicio"]), _data(c["fim"]), _lit(c.get("regime")),
            _lit(c.get("proprietario")), _lit(c.get("novo", False))]) + ");")
        for m in sorted(c["pagos"]):
            l.append(f"INSERT INTO planilha_mes VALUES ({_lit(chave(c['nome_planilha']))}, {m}, TRUE, TRUE);")
        for m in sorted(c["nao_cobraveis"]):
            l.append(f"INSERT INTO planilha_mes VALUES ({_lit(chave(c['nome_planilha']))}, {m}, FALSE, FALSE);")

    fict = "ARRAY[" + ", ".join(_lit(x) for x in ficticios) + "]::text[]"
    l += ["",
          "-- Casamento: cada linha da planilha com um cliente existente (nome normalizado ou CNPJ).",
          "CREATE TEMP TABLE casamento ON COMMIT DROP AS",
          "SELECT DISTINCT p.chave, c.id FROM planilha p JOIN cliente c",
          f"  ON (p.cnpj IS NOT NULL AND c.cnpj = p.cnpj) OR {_chave_sql('c.razao_social')} = p.chave",
          f"  OR {_chave_sql('c.nome_fantasia')} = p.chave;",
          "",
          "DO $$ DECLARE r record; problema boolean := FALSE; BEGIN",
          "  FOR r IN SELECT chave FROM casamento GROUP BY chave HAVING count(*) > 1 LOOP",
          "    RAISE NOTICE 'Mais de um cliente para a linha da planilha: %', r.chave; problema := TRUE; END LOOP;",
          "  FOR r IN SELECT id FROM casamento GROUP BY id HAVING count(*) > 1 LOOP",
          "    RAISE NOTICE 'Cliente % casou com mais de uma linha da planilha', r.id; problema := TRUE; END LOOP;",
          "  FOR r IN SELECT p.chave FROM planilha p WHERE NOT p.novo",
          "           AND NOT EXISTS (SELECT 1 FROM casamento m WHERE m.chave = p.chave) LOOP",
          "    RAISE NOTICE 'Cliente da planilha sem correspondente na produção: %', r.chave; problema := TRUE; END LOOP;",
          "  FOR r IN SELECT c.id, c.razao_social FROM cliente c",
          f"           WHERE NOT (coalesce(c.cnpj, '') = ANY({fict}))",
          "           AND NOT EXISTS (SELECT 1 FROM casamento m WHERE m.id = c.id) LOOP",
          "    RAISE NOTICE 'Cliente da produção fora da planilha: % (id %)', r.razao_social, r.id; problema := TRUE; END LOOP;",
          "  IF problema THEN",
          "    RAISE EXCEPTION 'Sincronização cancelada: confira os avisos acima. Nada foi alterado.';",
          "  END IF;",
          "END $$;", "",
          "-- Clientes fictícios da V23 (demonstração)",
          f"DELETE FROM cliente WHERE cnpj = ANY({fict});", "",
          "-- Clientes novos da planilha",
          "INSERT INTO cliente (razao_social, nome_fantasia, cnpj, honorario, dia_vencimento, tipo_pagamento, status, ativo)",
          "SELECT p.razao, p.nome, p.cnpj, coalesce(p.honorario, 0), coalesce(p.dia, 10), 'pessoa_juridica', 'em_dia', p.ativo",
          "FROM planilha p WHERE p.novo AND NOT EXISTS (SELECT 1 FROM casamento m WHERE m.chave = p.chave);",
          "INSERT INTO casamento",
          f"SELECT p.chave, c.id FROM planilha p JOIN cliente c ON {_chave_sql('c.nome_fantasia')} = p.chave",
          "WHERE p.novo AND NOT EXISTS (SELECT 1 FROM casamento m WHERE m.chave = p.chave);", "",
          "-- Dados do cliente",
          "UPDATE cliente c SET",
          "  razao_social = p.razao,",
          "  nome_fantasia = p.nome,",
          "  cnpj = COALESCE(p.cnpj, CASE WHEN c.cnpj ~ '^99000000' THEN NULL ELSE c.cnpj END),  -- 99... = provisório do import antigo",
          "  honorario = COALESCE(p.honorario, c.honorario),  -- planilha zerada mantém o valor atual",
          "  dia_vencimento = coalesce(p.dia, c.dia_vencimento),",
          "  forma_pagamento = coalesce(p.forma, c.forma_pagamento),",
          "  conta_recebimento = p.conta,",
          "  tipo_pagamento = CASE WHEN p.cnpj IS NOT NULL THEN 'pessoa_juridica' ELSE c.tipo_pagamento END,",
          "  ativo = p.ativo,",
          "  data_inicio_cobranca = p.inicio,",
          "  data_fim_cobranca = p.fim,",
          "  regime_tributario = coalesce(p.regime, c.regime_tributario),",
          "  proprietario = coalesce(nullif(c.proprietario, ''), p.proprietario)",
          "FROM casamento m JOIN planilha p ON p.chave = m.chave",
          "WHERE c.id = m.id;", "",
          f"-- Pagamentos de {ANO}: regravados a partir da planilha (mês sem linha = em aberto)",
          f"DELETE FROM pagamento_mensal WHERE ano = {ANO} AND cliente_id IN (SELECT id FROM casamento);",
          "INSERT INTO pagamento_mensal (cliente_id, mes, ano, pago, cobravel)",
          f"SELECT m.id, pm.mes, {ANO}, pm.pago, pm.cobravel FROM planilha_mes pm JOIN casamento m ON m.chave = pm.chave;",
          ""]

    l += ["CREATE TEMP TABLE planilha_despesa (chave text PRIMARY KEY, descricao text, tipo text, dia int,",
          "  valor numeric(12,2)) ON COMMIT DROP;",
          "CREATE TEMP TABLE planilha_despesa_mes (chave text, mes int, valor numeric(12,2), paga boolean) ON COMMIT DROP;"]
    for d in despesas:
        k = chave(d["descricao"])
        l.append(f"INSERT INTO planilha_despesa VALUES ({_lit(k)}, {_lit(d['descricao'])}, {_lit(d['tipo'])}, "
                 f"{_lit(d['dia'])}, {_lit(d['valor_mensal'])});")
        for m, (valor, paga) in sorted(d["mensais"].items()):
            l.append(f"INSERT INTO planilha_despesa_mes VALUES ({_lit(k)}, {m}, {_lit(valor)}, {_lit(paga)});")
    l += ["",
          "-- Despesas: atualiza as existentes e cria as que faltam",
          "UPDATE despesa d SET valor_mensal = pd.valor, dia_pagamento = pd.dia, ativo = TRUE",
          f"FROM planilha_despesa pd WHERE {_chave_sql('d.descricao')} = pd.chave;",
          "INSERT INTO despesa (descricao, valor_mensal, tipo, dia_pagamento, data_inicio, ativo, data_inicio_cobranca)",
          f"SELECT pd.descricao, pd.valor, pd.tipo, pd.dia, '{ANO}-01-01', TRUE, '{ANO}-01-01' FROM planilha_despesa pd",
          f"WHERE NOT EXISTS (SELECT 1 FROM despesa d WHERE {_chave_sql('d.descricao')} = pd.chave);",
          f"DELETE FROM despesa_mensal WHERE ano = {ANO} AND despesa_id IN (",
          f"  SELECT d.id FROM despesa d JOIN planilha_despesa pd ON {_chave_sql('d.descricao')} = pd.chave);",
          "INSERT INTO despesa_mensal (despesa_id, mes, ano, paga, valor)",
          f"SELECT d.id, pm.mes, {ANO}, pm.paga, pm.valor FROM planilha_despesa_mes pm",
          f"JOIN despesa d ON {_chave_sql('d.descricao')} = pm.chave;", "",
          "-- Conferência depois da gravação",
          "SELECT count(*) AS clientes, count(*) FILTER (WHERE ativo) AS ativos, count(cnpj) AS com_cnpj,",
          "       count(conta_recebimento) AS com_conta FROM cliente;",
          f"SELECT count(*) AS pagamentos_{ANO} FROM pagamento_mensal WHERE ano = {ANO};",
          "",
          "COMMIT;"]
    return "\n".join(l) + "\n"


# ---------------------------------------------------------------- relatório de conferência

def _brl(v) -> str:
    if v is None:
        return "mantém atual"
    return f"{v:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")


def _meses(ms) -> str:
    return ", ".join(MESES[m - 1] for m in sorted(ms)) or "—"


def relatorio_md(clientes: list[dict], despesas: list[dict], avisos: list[str]) -> str:
    simbolo = {PAGO: "✓", NAO_PAGO: "✗", NAO_COBRAVEL: "–", PRETO: "■", VAZIO: "·"}
    conta = {"SOMELI": "Someli", "PATRICIA": "Patrícia"}
    l = [f"# Conferência da planilha {ANO}", "",
         "Legenda dos meses (Jan a Dez): ✓ pago, ✗ vermelho, ■ preto, – não cobrável, · vazio.",
         "Em aberto = meses a partir do início sem pagamento (vermelho ou preto).", "",
         "| Linha | Nome padronizado | Honorário | Venc. | Conta (planilha) | Situação | Início | Fim | Meses | Em aberto |"
         " CNPJ | Razão social na Receita |",
         "|---|---|---|---|---|---|---|---|---|---|---|---|"]
    for c in clientes:
        sit = ("novo, " if c.get("novo") else "") + ("ativo" if c["ativo"] else "inativo")
        meses = "".join(simbolo.get(x, "?") for x in c.get("situacoes", []))
        receita = c.get("razao_oficial") or "—"
        if c.get("situacao_receita") and c["situacao_receita"] != "ATIVA":
            receita += f" (**{c['situacao_receita']}**)"
        l.append(f"| {c.get('linha', '')} | {c['nome']} | {_brl(c['honorario'])} | {c.get('dia_vencimento') or '—'} "
                 f"| {conta.get(c.get('conta'), '—')} ({c.get('flag_s') or '—'}) | {sit} "
                 f"| {MESES[c['inicio'] - 1] if c['inicio'] else '—'} "
                 f"| {(MESES[c['fim'] - 1] if c['fim'] <= 12 else 'Jan/' + str(ANO + 1)) if c['fim'] else '—'} "
                 f"| {meses} | {_meses(c['nao_pagos'])}{' (nunca pagou)' if c.get('nunca_pagou') and c['inicio'] else ''} "
                 f"| {c.get('cnpj') or '—'} | {receita} |")
    l += ["", "## Avisos", ""] + [f"- {a}" for a in avisos]
    l += ["", "## Despesas", "", "| Descrição | Tipo | Dia | Valor mensal | Pagas | Em aberto |", "|---|---|---|---|---|---|"]
    for d in despesas:
        pagas = [m for m, (_, paga) in d["mensais"].items() if paga]
        abertas = [m for m, (_, paga) in d["mensais"].items() if not paga]
        l.append(f"| {d['descricao']} | {d['tipo']} | {d['dia']} | {_brl(d['valor_mensal'])} | {_meses(pagas)} "
                 f"| {_meses(abertas)} |")
    return "\n".join(l) + "\n"


# ---------------------------------------------------------------- leitura da planilha

def _cor(cell) -> str:
    f = cell.fill
    if f is None or f.fill_type is None:
        return BRANCA
    fg = f.fgColor
    if fg.type == "theme":
        return {1: PRETA, 9: VERDE, 8: ROXA, 0: BRANCA}.get(fg.theme, BRANCA)
    if fg.type == "rgb" and (fg.rgb or "").upper().endswith("FF0000"):
        return VERMELHA
    return BRANCA


def ler_planilha(caminho: Path, receita: dict) -> tuple[list[dict], list[dict], list[str]]:
    import openpyxl

    formato = openpyxl.load_workbook(caminho)
    valores = openpyxl.load_workbook(caminho, data_only=True)
    fr, vr = formato["RECEITAS 2026"], valores["RECEITAS 2026"]
    receita_por_chave = {chave(k): v for k, v in receita.items()}

    clientes, avisos = [], []
    abaixo_totais = False
    for r in range(2, vr.max_row + 1):
        nome = vr.cell(r, 3).value
        if nome is None or not str(nome).strip():
            continue
        if str(nome).strip().upper() == "TOTAIS":
            abaixo_totais = True
            continue
        nome = str(nome)
        celulas = [(vr.cell(r, c).value, _cor(fr.cell(r, c))) for c in range(9, 21)]
        inativo = abaixo_totais or _cor(fr.cell(r, 3)) == VERMELHA
        analise = analisar_cliente(celulas, inativo)
        hon = honorario(vr.cell(r, 7).value, vr.cell(r, 8).value)
        dados = receita_por_chave.get(chave(nome), {})
        rec = dados.get("receita") or {}
        regime = None
        if rec.get("opcao_pelo_mei"):
            regime = "MEI"
        elif rec.get("opcao_pelo_simples"):
            regime = "SIMPLES_NACIONAL"
        socios = [s.get("nome_socio") for s in rec.get("qsa") or []
                  if "ADMINISTRADOR" in (s.get("qualificacao_socio") or "").upper() and s.get("nome_socio")]
        forma = str(vr.cell(r, 4).value or "").strip().upper()
        cliente = {
            "linha": r, "nome_planilha": nome, "nome": padronizar_nome(nome), "honorario": hon,
            "dia_vencimento": int(vr.cell(r, 6).value) if str(vr.cell(r, 6).value or "").isdigit() else None,
            "forma": "pix" if "PIX" in forma else "boleto" if "BOLETO" in forma else None,
            "flag_s": vr.cell(r, 5).value, "conta": conta_recebimento(vr.cell(r, 5).value),
            "novo": chave(nome) in NOVOS, "cnpj": dados.get("cnpj") if rec and not rec.get("erro") else None,
            "razao_oficial": rec.get("razao_social") if rec and not rec.get("erro") else None,
            "situacao_receita": rec.get("descricao_situacao_cadastral"),
            "regime": regime, "proprietario": socios[0].title() if len(socios) == 1 else None,
            "cor_nome": _cor(fr.cell(r, 3)), "abaixo_totais": abaixo_totais, **analise,
        }
        if hon is None:
            avisos.append(f"{cliente['nome']}: honorário zerado na planilha, mantém o valor atual da produção")
        clientes.append(cliente)

    fd, vd = formato["DESPESAS 2026"], valores["DESPESAS 2026"]
    despesas, categoria = [], None
    for r in range(4, vd.max_row + 1):
        desc = vd.cell(r, 3).value
        if desc is None or not str(desc).strip() or str(desc).strip().upper() in {"TOTAL", "TOTAIS"}:
            continue
        if vd.cell(r, 1).value:
            categoria = str(vd.cell(r, 1).value)
        celulas = [(vd.cell(r, c).value, _cor(fd.cell(r, c))) for c in range(4, 16)]
        analise = analisar_despesa(celulas)
        if not analise["mensais"]:
            continue
        dia = vd.cell(r, 2).value
        despesas.append({"descricao": " ".join(str(desc).split()), "tipo": tipo_despesa(categoria),
                         "dia": int(dia) if str(dia or "").isdigit() else 10, **analise})
    return clientes, despesas, avisos


def gravar(caminho: Path, texto: str) -> None:
    """Quebra de linha Unix: na VPS o ensaio troca `^COMMIT;$` por ROLLBACK com sed, e CRLF não casa."""
    caminho.write_text(texto, encoding="utf-8", newline="\n")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--xlsx", required=True, type=Path)
    ap.add_argument("--receita", type=Path)
    ap.add_argument("--saida", required=True, type=Path)
    a = ap.parse_args()
    receita = json.loads(a.receita.read_text(encoding="utf-8")) if a.receita else {}
    clientes, despesas, avisos = ler_planilha(a.xlsx, receita)
    a.saida.mkdir(parents=True, exist_ok=True)
    gravar(a.saida / "sync_planilha_2026.sql", gerar_sql(clientes, despesas, FICTICIOS_V23))
    (a.saida / "conferencia.md").write_text(relatorio_md(clientes, despesas, avisos), encoding="utf-8")
    (a.saida / "conferencia.json").write_text(json.dumps(
        {"clientes": clientes, "despesas": despesas, "avisos": avisos}, ensure_ascii=False, indent=1,
        default=lambda o: sorted(o) if isinstance(o, set) else str(o)), encoding="utf-8")
    print(f"clientes: {len(clientes)} | despesas: {len(despesas)} | avisos: {len(avisos)}")


if __name__ == "__main__":
    main()
