-- Cofre de acessos do cliente (login/senha/observação em bytea cifrado)
-- e anotações operacionais. A chave fica só em COFRE_CHAVE_MESTRA.
-- Idempotente: pode rodar de novo sem efeito.

CREATE TABLE IF NOT EXISTS cliente_acesso (
    id                 BIGSERIAL PRIMARY KEY,
    cliente_id         BIGINT       NOT NULL REFERENCES cliente (id) ON DELETE CASCADE,
    sistema            VARCHAR(120) NOT NULL,
    url                VARCHAR(500),
    login              BYTEA        NOT NULL,
    senha              BYTEA        NOT NULL,
    observacao         BYTEA,
    setor              VARCHAR(40),
    origem             VARCHAR(20)  NOT NULL DEFAULT 'MANUAL',
    ativo              BOOLEAN      NOT NULL DEFAULT TRUE,
    criado_em          TIMESTAMP    NOT NULL DEFAULT NOW(),
    criado_por_id      BIGINT REFERENCES usuario (id) ON DELETE SET NULL,
    atualizado_em      TIMESTAMP    NOT NULL DEFAULT NOW(),
    atualizado_por_id  BIGINT REFERENCES usuario (id) ON DELETE SET NULL,
    CONSTRAINT cliente_acesso_url_http CHECK (url IS NULL OR url ~ '^https?://'),
    CONSTRAINT cliente_acesso_setor CHECK (
        setor IS NULL OR setor IN ('FISCAL', 'DEPARTAMENTO_PESSOAL', 'CONTABIL', 'SOCIETARIO')
    ),
    CONSTRAINT cliente_acesso_origem CHECK (origem IN ('MANUAL', 'TRELLO'))
);

CREATE INDEX IF NOT EXISTS idx_cliente_acesso_cliente
    ON cliente_acesso (cliente_id)
    WHERE ativo = TRUE;

-- Um portal importado do Trello não entra duas vezes (reativar o script não duplica).
CREATE UNIQUE INDEX IF NOT EXISTS uq_cliente_acesso_trello
    ON cliente_acesso (cliente_id, lower(sistema))
    WHERE origem = 'TRELLO' AND ativo = TRUE;

CREATE TABLE IF NOT EXISTS cliente_anotacao (
    id                 BIGSERIAL PRIMARY KEY,
    cliente_id         BIGINT       NOT NULL REFERENCES cliente (id) ON DELETE CASCADE,
    titulo             VARCHAR(200),
    texto              TEXT         NOT NULL,
    setor              VARCHAR(40),
    fixada             BOOLEAN      NOT NULL DEFAULT FALSE,
    origem             VARCHAR(20)  NOT NULL DEFAULT 'MANUAL',
    ativo              BOOLEAN      NOT NULL DEFAULT TRUE,
    criado_em          TIMESTAMP    NOT NULL DEFAULT NOW(),
    criado_por_id      BIGINT REFERENCES usuario (id) ON DELETE SET NULL,
    atualizado_em      TIMESTAMP    NOT NULL DEFAULT NOW(),
    atualizado_por_id  BIGINT REFERENCES usuario (id) ON DELETE SET NULL,
    CONSTRAINT cliente_anotacao_setor CHECK (
        setor IS NULL OR setor IN ('FISCAL', 'DEPARTAMENTO_PESSOAL', 'CONTABIL', 'SOCIETARIO')
    ),
    CONSTRAINT cliente_anotacao_origem CHECK (origem IN ('MANUAL', 'TRELLO'))
);

CREATE INDEX IF NOT EXISTS idx_cliente_anotacao_cliente
    ON cliente_anotacao (cliente_id)
    WHERE ativo = TRUE;

INSERT INTO permissao (codigo, modulo, descricao, sensivel) VALUES
 ('CLIENTE_ACESSOS_VER', 'CLIENTES', 'Ver acessos de portais do cliente (login mascarado)', TRUE),
 ('CLIENTE_ACESSOS_EDITAR', 'CLIENTES', 'Cadastrar, alterar e desativar acessos de portais do cliente', TRUE)
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO perfil_permissao (perfil, permissao_id)
SELECT perfil, p.id
FROM permissao p
CROSS JOIN (VALUES ('ADMIN'), ('SOCIO')) AS perfis(perfil)
WHERE p.codigo IN ('CLIENTE_ACESSOS_VER', 'CLIENTE_ACESSOS_EDITAR')
ON CONFLICT DO NOTHING;
