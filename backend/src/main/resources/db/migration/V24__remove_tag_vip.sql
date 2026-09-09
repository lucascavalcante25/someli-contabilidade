-- Remove tag VIP: classificação explícita de "cliente VIP" não é necessária.
-- Tags operacionais (MEI, NOVO_CLIENTE, INADIMPLENTE, URGENTE) permanecem.

DELETE FROM cliente_tag
WHERE tag_id IN (SELECT id FROM tag WHERE nome = 'VIP');

DELETE FROM tag WHERE nome = 'VIP';

UPDATE cliente
SET indicacao = 'Indicacao parceiro'
WHERE indicacao = 'VIP';
