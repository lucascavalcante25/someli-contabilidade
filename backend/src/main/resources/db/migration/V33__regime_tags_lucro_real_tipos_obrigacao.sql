-- Tags de regime passam a seguir o regime do cadastro (TagSyncService, regra REGIME),
-- Lucro Real ganha tag e pacote de obrigações, e os tipos de obrigação viram áreas do escritório.
-- Idempotente: pode rodar de novo sem duplicar nada.

-- ---------- Tags de regime ----------
INSERT INTO tag (nome, cor) VALUES ('LUCRO_REAL', '#7C3AED')
ON CONFLICT (nome) DO NOTHING;

-- Quem tinha só a tag manual e regime vazio ganha o regime antes de a tag virar automática
UPDATE cliente c
SET regime_tributario = t.nome
FROM cliente_tag ct
JOIN tag t ON t.id = ct.tag_id AND t.nome IN ('SIMPLES_NACIONAL', 'LUCRO_PRESUMIDO', 'LUCRO_REAL')
WHERE ct.cliente_id = c.id
  AND (c.regime_tributario IS NULL OR c.regime_tributario = '');

UPDATE tag SET automatica = TRUE, regra = 'REGIME'
WHERE nome IN ('MEI', 'SIMPLES_NACIONAL', 'LUCRO_PRESUMIDO', 'LUCRO_REAL');

-- ---------- Tipos de obrigação = área responsável ----------
UPDATE obrigacao SET tipo = 'PESSOAL', setor = 'DEPARTAMENTO_PESSOAL'
WHERE nome IN ('eSocial', 'FGTS', 'FGTS Digital', 'INSS');

UPDATE obrigacao SET tipo = 'LICENCA', setor = 'SOCIETARIO'
WHERE nome IN ('Alvará Sanitário', 'Bombeiros');

UPDATE obrigacao SET setor = 'FISCAL'
WHERE tipo = 'FISCAL' AND setor <> 'FISCAL';

-- Vínculos já criados copiam o setor da obrigação: acompanham a reclassificação (ex.: eSocial vai para o DP)
UPDATE cliente_obrigacao co
SET setor = o.setor
FROM obrigacao o
WHERE co.obrigacao_id = o.id
  AND o.nome IN ('eSocial', 'FGTS', 'FGTS Digital', 'INSS', 'Alvará Sanitário', 'Bombeiros')
  AND co.setor IS DISTINCT FROM o.setor;

-- ---------- Obrigações do Lucro Real ----------
INSERT INTO obrigacao (nome, tipo, descricao, dias_antecedencia_alerta, setor, periodicidade_padrao, dia_vencimento_padrao, tipo_regra_vencimento, ativo, url_portal)
SELECT 'EFD-Reinf', 'FISCAL', 'Escrituração Fiscal Digital de Retenções e Outras Informações Fiscais', 7, 'FISCAL', 'MENSAL', 15, 'DIA_FIXO', TRUE,
       'https://www.gov.br/receitafederal/pt-br/assuntos/orientacao-tributaria/declaracoes-e-demonstrativos/sped-sistema-publico-de-escrituracao-digital/efd-reinf'
WHERE NOT EXISTS (SELECT 1 FROM obrigacao WHERE nome = 'EFD-Reinf');

INSERT INTO obrigacao (nome, tipo, descricao, dias_antecedencia_alerta, setor, periodicidade_padrao, dia_vencimento_padrao, tipo_regra_vencimento, ativo, url_portal)
SELECT 'CSLL', 'FISCAL', 'Contribuição Social sobre o Lucro Líquido (estimativa mensal no Lucro Real)', 7, 'FISCAL', 'MENSAL', 30, 'DIA_FIXO', TRUE, NULL
WHERE NOT EXISTS (SELECT 1 FROM obrigacao WHERE nome = 'CSLL');

INSERT INTO obrigacao (nome, tipo, descricao, dias_antecedencia_alerta, setor, periodicidade_padrao, dia_vencimento_padrao, tipo_regra_vencimento, ativo, url_portal)
SELECT 'ECD', 'CONTABIL', 'Escrituração Contábil Digital (SPED Contábil)', 30, 'CONTABIL', 'ANUAL', 31, 'DIA_FIXO', TRUE,
       'http://sped.rfb.gov.br/projeto/show/273'
WHERE NOT EXISTS (SELECT 1 FROM obrigacao WHERE nome = 'ECD');

INSERT INTO obrigacao (nome, tipo, descricao, dias_antecedencia_alerta, setor, periodicidade_padrao, dia_vencimento_padrao, tipo_regra_vencimento, ativo, url_portal)
SELECT 'ECF', 'CONTABIL', 'Escrituração Contábil Fiscal (IRPJ e CSLL)', 30, 'CONTABIL', 'ANUAL', 31, 'DIA_FIXO', TRUE,
       'http://sped.rfb.gov.br/projeto/show/268'
WHERE NOT EXISTS (SELECT 1 FROM obrigacao WHERE nome = 'ECF');

INSERT INTO obrigacao_template (codigo, nome, regime, descricao)
SELECT 'REAL_MENSAL', 'Pacote mensal Lucro Real', 'LUCRO_REAL',
       'Obrigações recorrentes típicas de Lucro Real (estimativa mensal de IRPJ/CSLL e SPED).'
WHERE NOT EXISTS (SELECT 1 FROM obrigacao_template WHERE codigo = 'REAL_MENSAL');

INSERT INTO obrigacao_template_item (template_id, obrigacao_id, periodicidade, dia_vencimento, ordem)
SELECT t.id, o.id, x.periodicidade, x.dia, x.ordem
FROM obrigacao_template t
JOIN (VALUES
        ('DCTFWeb', 'MENSAL', 25, 1),
        ('EFD-Contribuições', 'MENSAL', 15, 2),
        ('EFD-Reinf', 'MENSAL', 15, 3),
        ('IRPJ', 'MENSAL', 30, 4),
        ('CSLL', 'MENSAL', 30, 5),
        ('eSocial', 'MENSAL', 15, 6),
        ('FGTS Digital', 'MENSAL', 20, 7),
        ('ECD', 'ANUAL', 31, 8),
        ('ECF', 'ANUAL', 31, 9)
     ) AS x(nome, periodicidade, dia, ordem) ON TRUE
JOIN obrigacao o ON o.nome = x.nome
WHERE t.codigo = 'REAL_MENSAL'
  AND NOT EXISTS (SELECT 1 FROM obrigacao_template_item i WHERE i.template_id = t.id AND i.obrigacao_id = o.id);
