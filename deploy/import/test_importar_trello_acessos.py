"""Testes do importador de acessos/anotações do Trello. Rodar: python -I deploy/import/test_importar_trello_acessos.py"""
import io
import json
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).parent))

from importar_trello_acessos import enviar, extrair, main  # noqa: E402

SENHA = "senha-ficticia-123"
CLIENTES = {"Fra Carnes": True, "Someli Interno": True}


def quadro():
    return {
        "lists": [{"id": "l1", "name": "EMPRESAS SERV", "closed": False}],
        "cards": [
            {
                "id": "c1",
                "name": "fra frigorifico",
                "idList": "l1",
                "closed": False,
                "desc": "e-CAC\nlogin: joao.ficticio\nsenha: " + SENHA + "\nhttps://cav.exemplo.test\n\n"
                        "Ligar para o sócio antes de transmitir a DEFIS.\nhttps://exemplo.test/manual",
                "idChecklists": ["ck1", "ck2"],
                "attachments": [{"name": "Manual", "url": "https://exemplo.test/anexo"}],
            },
            {"id": "c2", "name": "someli", "idList": "l1", "closed": False, "desc": "login: nao-importar\nsenha: " + SENHA},
        ],
        "checklists": [
            {"id": "ck1", "name": "Mensal", "checkItems": [
                {"name": "DAS"},
                {"name": "Código do alarme da sala: 0000"},
            ]},
            {"id": "ck2", "name": "Societário", "checkItems": [{"name": "Contrato social na pasta azul"}]},
        ],
        "actions": [
            {"type": "commentCard", "data": {"card": {"id": "c1"}, "text": "Prefeitura\nusuário: maria\nsenha: outra-ficticia\nhttps://prefeitura.exemplo.test"}},
        ],
    }


class ExtrairTest(unittest.TestCase):
    def test_separa_acesso_anotacao_e_reusa_apelido(self):
        linhas = extrair(quadro(), CLIENTES)
        acessos = [l for l in linhas if l["tipo"] == "ACESSO"]
        notas = [l for l in linhas if l["tipo"] == "ANOTACAO"]
        self.assertTrue(all(l["cliente"] == "Fra Carnes" for l in linhas))
        self.assertTrue(all(l["origem"] == "TRELLO" for l in linhas))
        sistemas = {a["sistema"] for a in acessos}
        self.assertIn("e-CAC", sistemas)
        self.assertIn("Prefeitura", sistemas)
        self.assertTrue(any(a["login"] == "joao.ficticio" and a["senha"] == SENHA for a in acessos))
        self.assertTrue(any("DEFIS" in n["texto"] for n in notas))
        self.assertTrue(any("Contrato social" in n["texto"] for n in notas))
        self.assertTrue(any("https://exemplo.test/anexo" in n["texto"] for n in notas))
        self.assertFalse(any(n["texto"].strip() == "DAS" for n in notas))
        self.assertTrue(any("alarme" in n["texto"] for n in notas))

    def test_cartao_que_nao_e_cliente_fica_de_fora(self):
        linhas = extrair(quadro(), CLIENTES)
        self.assertFalse(any("nao-importar" in json.dumps(l, ensure_ascii=False) for l in linhas))

    def test_revisar_so_imprime_contagem(self):
        with tempfile.TemporaryDirectory() as pasta:
            base = Path(pasta)
            (base / "q.json").write_text(json.dumps(quadro()), encoding="utf-8")
            (base / "c.txt").write_text("Fra Carnes\n", encoding="utf-8")
            buf = io.StringIO()
            with patch("sys.stdout", buf):
                code = main(["revisar", "--json", str(base / "q.json"), "--clientes", str(base / "c.txt"), "--saida", str(base)])
            self.assertEqual(code, 0)
            self.assertNotIn(SENHA, buf.getvalue())
            self.assertNotIn("joao.ficticio", buf.getvalue())
            csv = (base / "revisao_trello.csv").read_text(encoding="utf-8-sig")
            self.assertIn(SENHA, csv)
            self.assertNotIn("INSERT", csv)


class EnviarTest(unittest.TestCase):
    def test_recusa_http(self):
        with self.assertRaises(SystemExit):
            enviar(Path("x.csv"), "http://localhost:8080", "tok")

    def test_nao_reenvia_acesso_trello_e_nao_imprime_valor(self):
        chamadas = []

        class Resp:
            def __init__(self, status, corpo):
                self.status = status
                self._corpo = corpo

            def read(self):
                return json.dumps(self._corpo).encode()

            def __enter__(self):
                return self

            def __exit__(self, *args):
                return False

        def abrir(req, timeout=60):
            chamadas.append((req.method, req.full_url))
            if req.full_url.endswith("/clientes") and req.method == "GET":
                return Resp(200, [{"id": 30, "nomeFantasia": "Fra Carnes"}])
            if req.full_url.endswith("/acessos") and req.method == "GET":
                return Resp(200, [{"sistema": "e-CAC", "origem": "TRELLO", "loginMascarado": "joa•••"}])
            if req.full_url.endswith("/anotacoes") and req.method == "GET":
                return Resp(200, [])
            if req.method == "POST":
                return Resp(201, {"id": 1})
            return Resp(500, {})

        with tempfile.TemporaryDirectory() as pasta:
            base = Path(pasta)
            (base / "q.json").write_text(json.dumps(quadro()), encoding="utf-8")
            (base / "c.txt").write_text("Fra Carnes\n", encoding="utf-8")
            main(["revisar", "--json", str(base / "q.json"), "--clientes", str(base / "c.txt"), "--saida", str(base)])
            contagem = enviar(base / "revisao_trello.csv", "https://api.exemplo.test", "tok", abrir=abrir)
        posts = [url for metodo, url in chamadas if metodo == "POST" and url.endswith("/acessos")]
        self.assertEqual(len(posts), 1)
        self.assertGreaterEqual(contagem["acessos_existentes"], 1)
        self.assertGreaterEqual(contagem["anotacoes_criadas"], 1)

    def test_conexao_derrubada_tenta_de_novo(self):
        import urllib.error
        import importar_trello_acessos as mod

        class Resp:
            status = 200

            def read(self):
                return b'{"ok": true}'

            def __enter__(self):
                return self

            def __exit__(self, *args):
                return False

        tentativas = []

        def abrir(req, timeout=60):
            tentativas.append(1)
            if len(tentativas) < 3:
                raise urllib.error.URLError(ConnectionResetError(10054, "reset"))
            return Resp()

        with patch.object(mod.time, "sleep"), patch("sys.stderr", new=io.StringIO()):
            status, corpo = mod._json("https://api.exemplo.test/clientes", "tok", abrir=abrir)
        self.assertEqual((status, corpo), (200, {"ok": True}))
        self.assertEqual(len(tentativas), 3)

    def test_token_nao_entra_em_argumento(self):
        code = main(["enviar", "--csv", "x.csv", "--api", "https://api.exemplo.test", "--token", "segredo"])
        self.assertEqual(code, 2)


if __name__ == "__main__":
    unittest.main()
