-- ============================================================
-- V29: Distribuição automática de NFS-e pelo ADN (Portal Nacional).
-- Certificado A1 do cliente guardado cifrado (AES-GCM, chave só em
-- variável de ambiente). Idempotente: pode rodar de novo sem efeito.
-- ============================================================

CREATE TABLE IF NOT EXISTS cliente_certificado_arquivo (
    id                BIGSERIAL PRIMARY KEY,
    cliente_id        BIGINT       NOT NULL UNIQUE REFERENCES cliente (id) ON DELETE CASCADE,
    pfx_cifrado       BYTEA        NOT NULL,
    senha_cifrada     BYTEA        NOT NULL,
    cnpj_certificado  VARCHAR(14),
    titular           VARCHAR(200),
    valido_ate        DATE,
    enviado_por_id    BIGINT REFERENCES usuario (id) ON DELETE SET NULL,
    enviado_em        TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS nfse_sync_estado (
    id                BIGSERIAL PRIMARY KEY,
    cliente_id        BIGINT       NOT NULL UNIQUE REFERENCES cliente (id) ON DELETE CASCADE,
    ativo             BOOLEAN      NOT NULL DEFAULT FALSE,
    ultimo_nsu        BIGINT       NOT NULL DEFAULT 0,
    ultima_consulta   TIMESTAMP,
    proxima_consulta  TIMESTAMP,
    ultimo_status     VARCHAR(30),
    ultima_mensagem   VARCHAR(500)
);

CREATE INDEX IF NOT EXISTS idx_nfse_sync_proxima
    ON nfse_sync_estado (proxima_consulta)
    WHERE ativo = TRUE;

-- Origem da nota: UPLOAD (manual) ou ADN (automática) + NSU de distribuição.
ALTER TABLE nota_fiscal_import
    ADD COLUMN IF NOT EXISTS origem VARCHAR(20) NOT NULL DEFAULT 'UPLOAD';

ALTER TABLE nota_fiscal_import
    ADD COLUMN IF NOT EXISTS nsu BIGINT;

CREATE INDEX IF NOT EXISTS idx_nota_cliente_origem ON nota_fiscal_import (cliente_id, origem);

-- Permissão sensível: enviar/remover o arquivo do certificado A1.
INSERT INTO permissao (codigo, modulo, descricao, sensivel) VALUES
 ('CERTIFICADO_A1_GERENCIAR', 'CLIENTES', 'Enviar e remover certificado A1 do cliente', TRUE)
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO perfil_permissao (perfil, permissao_id)
SELECT perfil, p.id
FROM permissao p
CROSS JOIN (VALUES ('ADMIN'), ('SOCIO')) AS perfis(perfil)
WHERE p.codigo = 'CERTIFICADO_A1_GERENCIAR'
ON CONFLICT DO NOTHING;
