-- ============================================================
-- V28: Pedido de documento por link, sem login do cliente.
-- Guarda apenas o hash do token; o link aparece uma única vez.
-- ============================================================

CREATE TABLE IF NOT EXISTS solicitacao_documento (
    id                 BIGSERIAL PRIMARY KEY,
    cliente_id         BIGINT       NOT NULL REFERENCES cliente (id) ON DELETE CASCADE,
    titulo             VARCHAR(200) NOT NULL,
    descricao          VARCHAR(500),
    competencia        VARCHAR(7),
    token_hash         VARCHAR(64)  NOT NULL UNIQUE,
    status             VARCHAR(20)  NOT NULL DEFAULT 'PENDENTE',
    expira_em          TIMESTAMP    NOT NULL,
    arquivos_recebidos INTEGER      NOT NULL DEFAULT 0,
    criado_em          TIMESTAMP    NOT NULL DEFAULT NOW(),
    recebido_em        TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_solicitacao_documento_cliente
    ON solicitacao_documento (cliente_id, criado_em DESC);
