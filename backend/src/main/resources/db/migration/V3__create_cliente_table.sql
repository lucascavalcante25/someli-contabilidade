CREATE TABLE IF NOT EXISTS cliente (
    id BIGSERIAL PRIMARY KEY,
    cnpj VARCHAR(14) NOT NULL UNIQUE,
    razao_social VARCHAR(255) NOT NULL,
    nome_fantasia VARCHAR(255),
    proprietario VARCHAR(255),
    telefone VARCHAR(20),
    email VARCHAR(255),
    honorario NUMERIC(12,2) NOT NULL DEFAULT 0,
    dia_vencimento INTEGER NOT NULL DEFAULT 10,
    tipo_pagamento VARCHAR(30) NOT NULL,
    status VARCHAR(20) NOT NULL,
    data_criacao TIMESTAMP NOT NULL DEFAULT NOW()
);
