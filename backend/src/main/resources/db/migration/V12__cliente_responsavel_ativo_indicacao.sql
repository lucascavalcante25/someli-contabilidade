ALTER TABLE cliente ALTER COLUMN cnpj DROP NOT NULL;

ALTER TABLE cliente
    ADD COLUMN IF NOT EXISTS responsavel_id BIGINT REFERENCES usuario (id),
    ADD COLUMN IF NOT EXISTS indicacao VARCHAR(255),
    ADD COLUMN IF NOT EXISTS forma_pagamento VARCHAR(30),
    ADD COLUMN IF NOT EXISTS ativo BOOLEAN NOT NULL DEFAULT TRUE;

CREATE INDEX IF NOT EXISTS idx_cliente_responsavel ON cliente (responsavel_id);
CREATE INDEX IF NOT EXISTS idx_cliente_ativo ON cliente (ativo);
