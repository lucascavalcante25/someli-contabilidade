-- Tabela de tipos de obrigação (catálogo dinâmico)
CREATE TABLE IF NOT EXISTS obrigacao (
    id BIGSERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    tipo VARCHAR(30) NOT NULL,
    descricao VARCHAR(500),
    dias_antecedencia_alerta INTEGER NOT NULL DEFAULT 7
);

-- Tabela de obrigações por cliente
CREATE TABLE IF NOT EXISTS cliente_obrigacao (
    id BIGSERIAL PRIMARY KEY,
    cliente_id BIGINT NOT NULL REFERENCES cliente(id) ON DELETE CASCADE,
    obrigacao_id BIGINT NOT NULL REFERENCES obrigacao(id) ON DELETE RESTRICT,
    data_vencimento DATE NOT NULL,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    observacao VARCHAR(500),
    CONSTRAINT uk_cliente_obrigacao UNIQUE (cliente_id, obrigacao_id, data_vencimento)
);

CREATE INDEX idx_cliente_obrigacao_cliente ON cliente_obrigacao(cliente_id);
CREATE INDEX idx_cliente_obrigacao_vencimento ON cliente_obrigacao(data_vencimento);
CREATE INDEX idx_cliente_obrigacao_ativo ON cliente_obrigacao(ativo) WHERE ativo = TRUE;

-- Tabela de notificações vinculadas a ClienteObrigacao
CREATE TABLE IF NOT EXISTS notification (
    id BIGSERIAL PRIMARY KEY,
    cliente_obrigacao_id BIGINT NOT NULL REFERENCES cliente_obrigacao(id) ON DELETE CASCADE,
    titulo VARCHAR(200) NOT NULL,
    descricao VARCHAR(1000),
    prioridade VARCHAR(20) NOT NULL DEFAULT 'normal',
    data_criacao TIMESTAMP NOT NULL DEFAULT NOW(),
    lida BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX idx_notification_cliente_obrigacao ON notification(cliente_obrigacao_id);
CREATE INDEX idx_notification_lida ON notification(lida) WHERE lida = FALSE;

-- Inserir obrigações padrão para o catálogo
INSERT INTO obrigacao (nome, tipo, descricao, dias_antecedencia_alerta) VALUES
    ('Alvará Sanitário', 'LICENCA', 'Alvará de funcionamento sanitário', 30),
    ('DAS', 'FISCAL', 'Documento de Arrecadação do Simples Nacional', 7),
    ('Bombeiros', 'LICENCA', 'Licença do Corpo de Bombeiros', 60),
    ('INSS', 'FISCAL', 'Guia de recolhimento do INSS', 7),
    ('FGTS', 'FISCAL', 'Guia de recolhimento do FGTS', 7),
    ('IRPJ', 'FISCAL', 'Imposto de Renda Pessoa Jurídica', 15),
    ('ISS', 'FISCAL', 'Imposto Sobre Serviços', 10),
    ('Outros', 'OUTROS', 'Outras obrigações', 7);
