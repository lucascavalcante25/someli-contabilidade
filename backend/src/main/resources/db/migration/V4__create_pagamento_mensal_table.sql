CREATE TABLE IF NOT EXISTS pagamento_mensal (
    id BIGSERIAL PRIMARY KEY,
    cliente_id BIGINT NOT NULL REFERENCES cliente(id) ON DELETE CASCADE,
    mes INTEGER NOT NULL,
    ano INTEGER NOT NULL,
    pago BOOLEAN NOT NULL DEFAULT FALSE,
    UNIQUE(cliente_id, mes, ano)
);

CREATE INDEX IF NOT EXISTS idx_pagamento_mensal_cliente_mes_ano ON pagamento_mensal(cliente_id, mes, ano);
