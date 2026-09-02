-- V15: meses sem cobrança (traço na planilha) + valor real da despesa no mês
ALTER TABLE pagamento_mensal
    ADD COLUMN IF NOT EXISTS cobravel BOOLEAN NOT NULL DEFAULT TRUE;

COMMENT ON COLUMN pagamento_mensal.cobravel IS 'FALSE = mês sem cobrança (traço na planilha); não conta como pendência nem receita.';

ALTER TABLE despesa_mensal
    ADD COLUMN IF NOT EXISTS valor NUMERIC(12, 2);

COMMENT ON COLUMN despesa_mensal.valor IS 'Valor efetivo da despesa naquele mês (quando diferente do valor_mensal padrão).';
