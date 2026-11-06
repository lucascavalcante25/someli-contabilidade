-- Pedidos do escritório (06/11/2026): encerramento fiscal do ISS, Pró-labore e Folha de pagamento no DP
-- (no lugar do eSocial nos pacotes) e parcelamentos. Idempotente.

INSERT INTO obrigacao (nome, tipo, descricao, dias_antecedencia_alerta, setor, periodicidade_padrao, dia_vencimento_padrao, tipo_regra_vencimento, ativo, url_portal)
SELECT x.nome, x.tipo, x.descricao, 5, x.setor, 'MENSAL', x.dia, 'DIA_FIXO', TRUE, NULL
FROM (VALUES
        ('Encerramento fiscal (ISS)', 'FISCAL', 'Encerramento mensal do ISS das empresas de serviço', 'FISCAL', 10),
        ('Pró-labore', 'PESSOAL', 'Pró-labore dos sócios (competência do mês anterior)', 'DEPARTAMENTO_PESSOAL', 5),
        ('Folha de pagamento', 'PESSOAL', 'Folha de pagamento dos empregados (competência do mês anterior)', 'DEPARTAMENTO_PESSOAL', 5),
        ('Parc. Simples', 'FISCAL', 'Parcela do parcelamento do Simples Nacional', 'FISCAL', 25),
        ('Parc. MEI', 'FISCAL', 'Parcela do parcelamento do MEI', 'FISCAL', 25),
        ('Parc. PGFN', 'FISCAL', 'Parcela do parcelamento na PGFN (dívida ativa)', 'FISCAL', 25)
     ) AS x(nome, tipo, descricao, setor, dia)
WHERE NOT EXISTS (SELECT 1 FROM obrigacao o WHERE o.nome = x.nome);

-- Pacotes: Pró-labore e Folha de pagamento entram no lugar do eSocial
DELETE FROM obrigacao_template_item i
USING obrigacao_template t, obrigacao o
WHERE i.template_id = t.id AND i.obrigacao_id = o.id
  AND t.codigo IN ('SIMPLES_MENSAL', 'PRESUMIDO_MENSAL', 'REAL_MENSAL')
  AND o.nome = 'eSocial';

INSERT INTO obrigacao_template_item (template_id, obrigacao_id, periodicidade, dia_vencimento, ordem)
SELECT t.id, o.id, 'MENSAL', 5, x.ordem
FROM obrigacao_template t
JOIN (VALUES ('Pró-labore', 20), ('Folha de pagamento', 21)) AS x(nome, ordem) ON TRUE
JOIN obrigacao o ON o.nome = x.nome
WHERE t.codigo IN ('SIMPLES_MENSAL', 'PRESUMIDO_MENSAL', 'REAL_MENSAL')
  AND NOT EXISTS (SELECT 1 FROM obrigacao_template_item i WHERE i.template_id = t.id AND i.obrigacao_id = o.id);
