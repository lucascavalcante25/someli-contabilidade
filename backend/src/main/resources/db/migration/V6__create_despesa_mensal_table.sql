CREATE TABLE IF NOT EXISTS despesa_mensal (
    id BIGSERIAL PRIMARY KEY,
    despesa_id BIGINT NOT NULL REFERENCES despesa(id) ON DELETE CASCADE,
    mes INTEGER NOT NULL,
    ano INTEGER NOT NULL,
    paga BOOLEAN NOT NULL DEFAULT FALSE,
    UNIQUE(despesa_id, mes, ano)
);

CREATE INDEX IF NOT EXISTS idx_despesa_mensal_despesa_mes_ano ON despesa_mensal(despesa_id, mes, ano);
