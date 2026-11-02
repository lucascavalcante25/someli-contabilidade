"""Testes do gerador de sincronização com a planilha. Rodar: python -m unittest deploy/import/test_sync_planilha_2026.py"""
import sys
import unittest
from decimal import Decimal
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from sync_planilha_2026 import (  # noqa: E402
    PAGO, NAO_PAGO, NAO_COBRAVEL, PRETO, VAZIO,
    PRETA, VERDE, VERMELHA, BRANCA,
    analisar_cliente, chave, classificar_mes, conta_recebimento, gerar_sql, honorario,
    padronizar_nome, analisar_despesa, relatorio_md, gravar,
)


def meses(*celulas):
    """Completa os 12 meses com células brancas vazias."""
    lista = list(celulas)
    return lista + [(None, BRANCA)] * (12 - len(lista))


class NomeTest(unittest.TestCase):
    def test_iniciais_maiusculas_e_preposicoes_minusculas(self):
        self.assertEqual(padronizar_nome("ALEXSANDRO RODRIGUES DO NASCIMENTO"), "Alexsandro Rodrigues do Nascimento")
        self.assertEqual(padronizar_nome("Pai e Filhos auto peças"), "Pai e Filhos Auto Peças")

    def test_siglas_curtas_ficam_maiusculas(self):
        self.assertEqual(padronizar_nome("OCTOOBRAND MKT "), "Octoobrand MKT")
        self.assertEqual(padronizar_nome("DJ PEDRO HENRICO LTDA"), "DJ Pedro Henrico Ltda")
        self.assertEqual(padronizar_nome("EXTRAPACK DISTRIBUIDORA LTDA. - ME"), "Extrapack Distribuidora Ltda. - ME")
        self.assertEqual(padronizar_nome("J&L REPRESENTAÇÃO "), "J&L Representação")
        self.assertEqual(padronizar_nome("Kelly MEI"), "Kelly MEI")
        self.assertEqual(padronizar_nome("RR Albuquerque"), "RR Albuquerque")

    def test_espacos_duplicados_e_sem_inventar_acento(self):
        self.assertEqual(padronizar_nome("Clinica  RAMONA"), "Clinica Ramona")
        self.assertEqual(padronizar_nome("DS SOLUCOES LTDA"), "DS Solucoes Ltda")

    def test_chave_ignora_acento_espaco_e_simbolo(self):
        self.assertEqual(chave("AUTO PEÇAS NOVA ERA"), "autopecasnovaera")
        self.assertEqual(chave("Clinica  RAMONA"), chave("clinica ramona"))
        self.assertEqual(chave("J&L REPRESENTAÇÃO "), "jlrepresentacao")


class HonorarioTest(unittest.TestCase):
    def test_usa_segunda_coluna_reajustada(self):
        self.assertEqual(honorario(400, 430), Decimal("430.00"))

    def test_arredonda_meio_para_cima(self):
        self.assertEqual(honorario(450, 480.555), Decimal("480.56"))
        self.assertEqual(honorario(345, 368.4255), Decimal("368.43"))

    def test_segunda_vazia_ou_zero_usa_primeira(self):
        self.assertEqual(honorario(380, None), Decimal("380.00"))
        self.assertEqual(honorario(350, 0), Decimal("350.00"))

    def test_as_duas_zeradas_mantem_valor_atual(self):
        self.assertIsNone(honorario(0, 0))
        self.assertIsNone(honorario(None, None))


class ContaTest(unittest.TestCase):
    def test_letra_da_planilha(self):
        self.assertEqual(conta_recebimento("S"), "SOMELI")
        self.assertEqual(conta_recebimento("s"), "SOMELI")
        self.assertEqual(conta_recebimento("P"), "PATRICIA")

    def test_vazio_traco_ou_desconhecido_fica_sem_conta(self):
        self.assertIsNone(conta_recebimento(None))
        self.assertIsNone(conta_recebimento("-"))
        self.assertIsNone(conta_recebimento("K"))


class MesTest(unittest.TestCase):
    def test_classificacao(self):
        self.assertEqual(classificar_mes("OK", VERDE), PAGO)
        self.assertEqual(classificar_mes(280, VERDE), PAGO)
        self.assertEqual(classificar_mes("-", PRETA), PRETO)
        self.assertEqual(classificar_mes(None, PRETA), PRETO)
        self.assertEqual(classificar_mes(375, VERMELHA), NAO_PAGO)
        self.assertEqual(classificar_mes(None, VERMELHA), NAO_PAGO)
        self.assertEqual(classificar_mes("-", VERDE), NAO_COBRAVEL)
        self.assertEqual(classificar_mes("-", VERMELHA), NAO_COBRAVEL)
        self.assertEqual(classificar_mes(None, VERDE), VAZIO)
        self.assertEqual(classificar_mes(None, BRANCA), VAZIO)


class ClienteTest(unittest.TestCase):
    def test_pretos_antes_do_primeiro_pagamento_nao_contam(self):
        r = analisar_cliente(meses(("-", PRETA), ("-", PRETA), ("OK", VERDE), ("OK", VERDE)), inativo=False)
        self.assertEqual(r["inicio"], 3)
        self.assertEqual(r["pagos"], {3, 4})
        self.assertEqual(r["nao_pagos"], set())
        self.assertTrue(r["ativo"])
        self.assertIsNone(r["fim"])

    def test_preto_depois_do_inicio_e_inadimplencia(self):
        r = analisar_cliente(meses(("OK", VERDE), ("OK", VERDE), ("-", PRETA), ("-", PRETA)), inativo=False)
        self.assertEqual(r["inicio"], 1)
        self.assertEqual(r["nao_pagos"], {3, 4})

    def test_vermelho_isolado_e_nao_pago(self):
        r = analisar_cliente(meses(("OK", VERDE), (459, VERMELHA), ("OK", VERDE)), inativo=False)
        self.assertEqual(r["nao_pagos"], {2})
        self.assertEqual(r["pagos"], {1, 3})

    def test_traco_fora_do_preto_e_mes_nao_cobravel(self):
        r = analisar_cliente(meses(("OK", VERDE), ("-", VERDE), ("OK", VERDE)), inativo=False)
        self.assertEqual(r["nao_cobraveis"], {2})

    def test_nunca_pagou_comeca_na_ultima_sequencia_preta(self):
        r = analisar_cliente(meses(("-", PRETA), (None, VERDE), ("-", PRETA), ("-", PRETA)), inativo=False)
        self.assertEqual(r["inicio"], 3)
        self.assertEqual(r["nao_pagos"], {3, 4})
        self.assertTrue(r["nunca_pagou"])

    def test_inativo_termina_no_mes_seguinte_a_ultima_atividade(self):
        r = analisar_cliente(meses((None, PRETA), ("OK", VERDE), ("OK", VERDE), (375, VERMELHA)), inativo=True)
        self.assertFalse(r["ativo"])
        self.assertEqual(r["inicio"], 2)
        self.assertEqual(r["fim"], 5)

    def test_inativo_sem_atividade_nao_tem_cobranca(self):
        r = analisar_cliente(meses(*[("-", VERMELHA)] * 12), inativo=True)
        self.assertFalse(r["ativo"])
        self.assertIsNone(r["inicio"])
        self.assertEqual(r["pagos"] | r["nao_pagos"], set())


class DespesaTest(unittest.TestCase):
    def test_verde_e_pago_branco_e_futuro_zero_ignora(self):
        d = analisar_despesa([(425, VERDE), (763.3, VERDE), (763.3, BRANCA), (0, VERDE)] + [(None, BRANCA)] * 8)
        self.assertEqual(d["mensais"], {1: (Decimal("425.00"), True), 2: (Decimal("763.30"), True),
                                        3: (Decimal("763.30"), False)})
        self.assertEqual(d["valor_mensal"], Decimal("763.30"))


class SqlTest(unittest.TestCase):
    def setUp(self):
        self.cliente = {
            "nome_planilha": "AUTO PEÇAS NOVA ERA", "nome": "Auto Peças Nova Era", "honorario": Decimal("310.00"),
            "dia_vencimento": 10, "forma": "boleto", "conta": "SOMELI", "ativo": True, "inicio": 1, "fim": None,
            "pagos": {1, 2}, "nao_pagos": {3}, "nao_cobraveis": set(), "novo": False,
            "cnpj": "35019071000110", "razao_oficial": "AUTO PECAS NOVA ERA LTDA.", "regime": "SIMPLES_NACIONAL",
            "proprietario": "Fulano de Tal",
        }
        self.sql = gerar_sql([self.cliente], [], ["11222333000181"])

    def test_transacao_e_trava_de_seguranca(self):
        self.assertTrue(self.sql.lstrip().startswith("BEGIN;"))
        self.assertTrue(self.sql.rstrip().endswith("COMMIT;"))
        self.assertIn("RAISE EXCEPTION", self.sql)

    def test_so_apaga_clientes_ficticios(self):
        apagar = [l for l in self.sql.splitlines() if l.strip().upper().startswith("DELETE FROM CLIENTE ")]
        self.assertEqual(len(apagar), 1)
        self.assertIn("11222333000181", apagar[0])

    def test_casa_por_nome_normalizado_ou_cnpj_e_grava_campos(self):
        self.assertIn("autopecasnovaera", self.sql)
        self.assertIn("35019071000110", self.sql)
        self.assertIn("'SOMELI'", self.sql)
        self.assertIn("2026-01-01", self.sql)

    def test_cnpj_provisorio_do_import_antigo_e_limpo(self):
        self.assertIn("'^99000000' THEN NULL", self.sql)

    def test_aspas_no_nome_sao_escapadas(self):
        c = dict(self.cliente, nome="D'Ávila", nome_planilha="D'Ávila", cnpj=None, razao_oficial=None)
        sql = gerar_sql([c], [], [])
        self.assertIn("'D''Ávila'", sql)

    def test_honorario_nulo_mantem_valor_atual(self):
        c = dict(self.cliente, honorario=None)
        sql = gerar_sql([c], [], [])
        self.assertIn("COALESCE(", sql)



class RelatorioTest(unittest.TestCase):
    def test_mostra_nome_honorario_inicio_e_meses_em_aberto(self):
        c = {"linha": 7, "nome_planilha": "AUTO PEÇAS NOVA ERA", "nome": "Auto Peças Nova Era",
             "honorario": Decimal("310.00"), "dia_vencimento": 15, "forma": "pix", "conta": "SOMELI", "flag_s": "S",
             "ativo": True, "inicio": 2, "fim": None, "pagos": {2}, "nao_pagos": {3}, "nao_cobraveis": set(),
             "nunca_pagou": False, "novo": False, "cnpj": "35019071000110", "razao_oficial": "AUTO PECAS NOVA ERA LTDA",
             "situacao_receita": "ATIVA", "regime": None, "situacoes": ["preto", "pago", "nao_pago"] + ["vazio"] * 9}
        md = relatorio_md([c], [], ["aviso x"])
        self.assertIn("Auto Peças Nova Era", md)
        self.assertIn("310,00", md)
        self.assertIn("Fev", md)
        self.assertIn("Mar", md)
        self.assertIn("aviso x", md)


class GravarTest(unittest.TestCase):
    def test_sql_sai_com_quebra_de_linha_unix_para_o_sed_da_vps(self):
        import tempfile
        with tempfile.TemporaryDirectory() as d:
            arq = Path(d) / "x.sql"
            gravar(arq, "BEGIN;\nCOMMIT;\n")
            self.assertEqual(arq.read_bytes(), b"BEGIN;\nCOMMIT;\n")

if __name__ == "__main__":
    unittest.main()
