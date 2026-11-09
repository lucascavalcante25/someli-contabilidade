-- A V37 criou mes_vencimento_padrao como SMALLINT, mas a entidade usa Integer.
-- Em produção (ddl-auto: validate) o Hibernate recusa a diferença e a API não sobe. Idempotente.
ALTER TABLE obrigacao ALTER COLUMN mes_vencimento_padrao TYPE INTEGER;
