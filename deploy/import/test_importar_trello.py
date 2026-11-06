"""Testes do importador de atividades do Trello. Rodar: python -I deploy/import/test_importar_trello.py"""
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from importar_trello import (  # noqa: E402
    atividade_para_obrigacao, casar_cliente, gerar_sql, nome_sensivel, ler_quadro,
)

CLIENTES = {"Fra Carnes": 30, "DS Solucoes Ltda": 22, "Evyla Advogada": 26, "Estrela Ester Belém": 23,
            "Estrela Ester Curitiba": 24, "Clinica Ramona": 61, "Auto Peças Nova Era": 14}


class AtividadeTest(unittest.TestCase):
    def test_grafias_do_encerramento_viram_uma_obrigacao(self):
        for item in ["ENCERRAMNETO FISCAL", "Encerramento fiscal", "ENCERRAMENTO ISS", "ENCRRAMENTO FISCAL",
                     "ENCERRAMENTO FISCAL- AINDA VAI TER", "ENCERRAMENTO FISCAL ISS"]:
            self.assertEqual(atividade_para_obrigacao(item), ["Encerramento fiscal (ISS)"], item)

    def test_folha_com_fgts_gera_duas(self):
        self.assertEqual(atividade_para_obrigacao("FOLHA DE PAGAMENTO + FGTS"), ["Folha de pagamento", "FGTS Digital"])
        self.assertEqual(atividade_para_obrigacao("PROLABORE + FOLHA DE PAGAMENTO FGTS"),
                         ["Pró-labore", "Folha de pagamento", "FGTS Digital"])

    def test_parcelamentos(self):
        self.assertEqual(atividade_para_obrigacao("PARC. SIMPLES NACIONAL"), ["Parc. Simples"])
        self.assertEqual(atividade_para_obrigacao("parcelamento pgfn"), ["Parc. PGFN"])
        self.assertEqual(atividade_para_obrigacao("PARCELAMENTO RELP MEI"), ["Parc. MEI"])

    def test_simples_e_notas(self):
        self.assertEqual(atividade_para_obrigacao("SIMPLES NACIONAL"), ["PGDAS-D"])
        self.assertEqual(atividade_para_obrigacao("EMISSÃO DE NFS-E"), ["Emissão de nota fiscal"])
        self.assertEqual(atividade_para_obrigacao("IMPORTAR NFS-E"), ["Importar NFS-e"])

    def test_grafias_com_hifen_e_sem_preposicao(self):
        self.assertEqual(atividade_para_obrigacao("Emissão NFS-e"), ["Emissão de nota fiscal"])
        self.assertEqual(atividade_para_obrigacao("NFS-e"), ["Emissão de nota fiscal"])
        self.assertEqual(atividade_para_obrigacao("Importação NFS-e"), ["Importar NFS-e"])
        self.assertEqual(atividade_para_obrigacao("DAS - MEI - nao enviar ele tem acesso."), ["DAS MEI"])
        self.assertEqual(atividade_para_obrigacao("icms - st"), ["ICMS-ST"])

    def test_nao_mensal_ou_vago_fica_de_fora(self):
        for item in ["ALVARÁ DE FUNCIONAMENTO", "CORPO DE BOMBEIROS", "LEGALIZAÇÃO", "ACOMPANHAR SISTEMA", "RUMOS BEER"]:
            self.assertEqual(atividade_para_obrigacao(item), [], item)


class ClienteTest(unittest.TestCase):
    def test_nome_igual_ignorando_acento_e_caixa(self):
        self.assertEqual(casar_cliente("evyla advogada", CLIENTES), ("Evyla Advogada", "exato"))
        self.assertEqual(casar_cliente("AUTO PEÇAS NOVA ERA", CLIENTES), ("Auto Peças Nova Era", "exato"))

    def test_apelido_conhecido(self):
        self.assertEqual(casar_cliente("FRA FRIGORIFICO", CLIENTES), ("Fra Carnes", "apelido"))
        self.assertEqual(casar_cliente("DS SOLUÇOES - DAVI", CLIENTES), ("DS Solucoes Ltda", "apelido"))
        self.assertEqual(casar_cliente("DRA. RAMONA KELLY TORRES MATIAS LTDA,", CLIENTES), ("Clinica Ramona", "apelido"))

    def test_nome_colado(self):
        self.assertEqual(casar_cliente("rumosmoveis", {"Rumos Moveis": 56}), ("Rumos Moveis", "apelido"))

    def test_ambiguo_e_desconhecido(self):
        self.assertEqual(casar_cliente("Estrela Ester", CLIENTES), (None, "ambíguo"))
        self.assertEqual(casar_cliente("Aço Inox Pará", CLIENTES), (None, "sem cliente"))

    def test_titulo_com_dado_sensivel(self):
        self.assertTrue(nome_sensivel("FULANO - 123.456.789-00 SENHA abc"))
        self.assertFalse(nome_sensivel("Fra Carnes"))


class QuadroTest(unittest.TestCase):
    def test_le_so_nome_e_checklist_nunca_descricao(self):
        quadro = {
            "lists": [{"id": "L1", "name": "EMPRESAS SERVIÇOS", "closed": False}],
            "checklists": [{"id": "K1", "checkItems": [{"name": "ENCERRAMENTO FISCAL"}, {"name": "PROLABORE"}]}],
            "cards": [{"id": "C1", "idList": "L1", "name": "Fra Carnes", "desc": "usuario x senha 123",
                       "closed": False, "idChecklists": ["K1"]}],
        }
        cartoes = ler_quadro(quadro, ["EMPRESAS SERV"])
        self.assertEqual(cartoes, [{"lista": "EMPRESAS SERVIÇOS", "nome": "Fra Carnes",
                                    "itens": ["ENCERRAMENTO FISCAL", "PROLABORE"]}])
        self.assertNotIn("senha", repr(cartoes))


class SqlTest(unittest.TestCase):
    def test_sql_cria_vinculo_mensal_sem_duplicar_e_marca_segmento(self):
        sql = gerar_sql([{"cliente": "D'Ávila", "obrigacoes": ["Encerramento fiscal (ISS)"], "segmento": "SERVICOS"}])
        self.assertTrue(sql.startswith("BEGIN;"))
        self.assertIn("'D''Ávila'", sql)
        self.assertIn("RAISE EXCEPTION", sql)
        self.assertTrue(sql.rstrip().endswith("COMMIT;"))
        self.assertIn("NOT EXISTS", sql)
        self.assertIn("'Encerramento fiscal (ISS)'", sql)
        self.assertIn("SERVICOS", sql)
        self.assertNotIn("\r", sql)
        # Inativo não ganha atividade nem tag
        self.assertIn("c.ativo", sql)


if __name__ == "__main__":
    unittest.main()
