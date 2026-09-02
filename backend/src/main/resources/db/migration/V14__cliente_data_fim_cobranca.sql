ALTER TABLE cliente ADD COLUMN IF NOT EXISTS data_fim_cobranca DATE;

COMMENT ON COLUMN cliente.data_fim_cobranca IS 'Data a partir da qual o cliente deixou de ser cobrado (inativo).';
