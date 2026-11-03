-- Controle de envio do boleto do mês (evita enviar duplicado ou esquecer).
ALTER TABLE pagamento_mensal ADD COLUMN IF NOT EXISTS boleto_enviado BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE pagamento_mensal ADD COLUMN IF NOT EXISTS boleto_enviado_em TIMESTAMP;
ALTER TABLE pagamento_mensal ADD COLUMN IF NOT EXISTS boleto_enviado_por VARCHAR(120);
