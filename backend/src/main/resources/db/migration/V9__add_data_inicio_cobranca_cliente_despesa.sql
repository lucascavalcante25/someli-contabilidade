ALTER TABLE cliente ADD COLUMN IF NOT EXISTS data_inicio_cobranca DATE;
ALTER TABLE despesa ADD COLUMN IF NOT EXISTS data_inicio_cobranca DATE;
