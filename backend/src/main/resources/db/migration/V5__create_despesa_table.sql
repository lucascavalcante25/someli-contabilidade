CREATE TABLE IF NOT EXISTS despesa (
    id BIGSERIAL PRIMARY KEY,
    descricao VARCHAR(255) NOT NULL,
    valor_mensal NUMERIC(12,2) NOT NULL DEFAULT 0,
    tipo VARCHAR(30) NOT NULL,
    dia_pagamento INTEGER NOT NULL DEFAULT 10,
    data_inicio DATE NOT NULL,
    parcelas INTEGER,
    parcela_atual INTEGER DEFAULT 1,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    data_criacao TIMESTAMP NOT NULL DEFAULT NOW()
);
