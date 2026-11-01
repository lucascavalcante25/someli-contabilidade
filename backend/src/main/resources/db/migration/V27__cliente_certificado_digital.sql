-- ============================================================
-- V27: Certificado digital do cliente (controle operacional).
-- Não armazena arquivo/senha do certificado — só metadados.
-- ============================================================

ALTER TABLE cliente
    ADD COLUMN IF NOT EXISTS certificado_vencimento DATE;

ALTER TABLE cliente
    ADD COLUMN IF NOT EXISTS certificado_tipo VARCHAR(10);

ALTER TABLE cliente
    ADD COLUMN IF NOT EXISTS certificado_observacao VARCHAR(500);

CREATE INDEX IF NOT EXISTS idx_cliente_certificado_vencimento
    ON cliente (certificado_vencimento)
    WHERE certificado_vencimento IS NOT NULL;
