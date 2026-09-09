-- ============================================================
-- V23: Clientes fictícios para desenvolvimento/TDD local
-- Idempotente: não duplica se já existir pelo CNPJ.
-- ============================================================

-- Amplia catálogo de obrigações (templates)
INSERT INTO obrigacao (nome, tipo, descricao, dias_antecedencia_alerta, setor, periodicidade_padrao, dia_vencimento_padrao, tipo_regra_vencimento, ativo)
SELECT 'PGDAS-D', 'FISCAL', 'Declaração do Simples Nacional', 5, 'FISCAL', 'MENSAL', 20, 'DIA_FIXO', TRUE
WHERE NOT EXISTS (SELECT 1 FROM obrigacao WHERE nome = 'PGDAS-D');

INSERT INTO obrigacao (nome, tipo, descricao, dias_antecedencia_alerta, setor, periodicidade_padrao, dia_vencimento_padrao, tipo_regra_vencimento, ativo)
SELECT 'DCTFWeb', 'FISCAL', 'Declaração de Débitos e Créditos Tributários Federais', 7, 'FISCAL', 'MENSAL', 25, 'DIA_FIXO', TRUE
WHERE NOT EXISTS (SELECT 1 FROM obrigacao WHERE nome = 'DCTFWeb');

INSERT INTO obrigacao (nome, tipo, descricao, dias_antecedencia_alerta, setor, periodicidade_padrao, dia_vencimento_padrao, tipo_regra_vencimento, ativo)
SELECT 'eSocial', 'FISCAL', 'Escrituração Digital das Obrigações Previdenciárias', 5, 'DEPARTAMENTO_PESSOAL', 'MENSAL', 15, 'DIA_FIXO', TRUE
WHERE NOT EXISTS (SELECT 1 FROM obrigacao WHERE nome = 'eSocial');

INSERT INTO obrigacao (nome, tipo, descricao, dias_antecedencia_alerta, setor, periodicidade_padrao, dia_vencimento_padrao, tipo_regra_vencimento, ativo)
SELECT 'FGTS Digital', 'FISCAL', 'Recolhimento FGTS Digital', 5, 'DEPARTAMENTO_PESSOAL', 'MENSAL', 20, 'DIA_FIXO', TRUE
WHERE NOT EXISTS (SELECT 1 FROM obrigacao WHERE nome = 'FGTS Digital');

-- ---------- Clientes fictícios ----------
INSERT INTO cliente (
    cnpj, razao_social, nome_fantasia, proprietario, telefone, email,
    honorario, dia_vencimento, tipo_pagamento, status, data_inicio_cobranca,
    responsavel_id, indicacao, forma_pagamento, ativo
)
SELECT
    '11222333000181', 'ABC Tecnologia Ltda', 'ABC Tech', 'Carlos Mendes',
    '(81) 98888-1001', 'financeiro@abctech.demo',
    850.00, 10, 'pessoa_juridica', 'em_dia', DATE '2026-01-01',
    (SELECT id FROM usuario WHERE cpf = '22222222222'), 'Indicação Hemerson', 'pix', TRUE
WHERE NOT EXISTS (SELECT 1 FROM cliente WHERE cnpj = '11222333000181');

INSERT INTO cliente (
    cnpj, razao_social, nome_fantasia, proprietario, telefone, email,
    honorario, dia_vencimento, tipo_pagamento, status, data_inicio_cobranca,
    responsavel_id, indicacao, forma_pagamento, ativo
)
SELECT
    '22333444000172', 'Comércio XYZ ME', 'Loja XYZ', 'Marina Souza',
    '(81) 98888-1002', 'contato@xyz.demo',
    450.00, 15, 'pessoa_juridica', 'pendente', DATE '2026-02-01',
    (SELECT id FROM usuario WHERE cpf = '22222222222'), 'Site', 'boleto', TRUE
WHERE NOT EXISTS (SELECT 1 FROM cliente WHERE cnpj = '22333444000172');

INSERT INTO cliente (
    cnpj, razao_social, nome_fantasia, proprietario, telefone, email,
    honorario, dia_vencimento, tipo_pagamento, status, data_inicio_cobranca,
    responsavel_id, indicacao, forma_pagamento, ativo
)
SELECT
    '33444555000163', 'Delta Serviços Contábeis Ltda', 'Delta', 'João Pedro Lima',
    '(81) 98888-1003', 'joao@delta.demo',
    1200.00, 5, 'pessoa_juridica', 'em_dia', DATE '2025-11-01',
    (SELECT id FROM usuario WHERE cpf = '11111111111'), 'Parceiro', 'pix', TRUE
WHERE NOT EXISTS (SELECT 1 FROM cliente WHERE cnpj = '33444555000163');

INSERT INTO cliente (
    cnpj, razao_social, nome_fantasia, proprietario, telefone, email,
    honorario, dia_vencimento, tipo_pagamento, status, data_inicio_cobranca,
    responsavel_id, indicacao, forma_pagamento, ativo
)
SELECT
    '44555666000154', 'Padaria Bom Pão Ltda', 'Bom Pão', 'Saviane Costa',
    '(81) 98888-1004', 'padaria@bompao.demo',
    380.00, 20, 'pessoa_juridica', 'atrasado', DATE '2026-01-01',
    (SELECT id FROM usuario WHERE cpf = '33333333333'), 'Indicação Ana', 'boleto', TRUE
WHERE NOT EXISTS (SELECT 1 FROM cliente WHERE cnpj = '44555666000154');

INSERT INTO cliente (
    cnpj, razao_social, nome_fantasia, proprietario, telefone, email,
    honorario, dia_vencimento, tipo_pagamento, status, data_inicio_cobranca,
    responsavel_id, indicacao, forma_pagamento, ativo
)
SELECT
    '55666777000145', 'Clínica Saúde Total Ltda', 'Saúde Total', 'Dr. Ricardo Alves',
    '(81) 98888-1005', 'admin@saudetotal.demo',
    1500.00, 10, 'pessoa_juridica', 'em_dia', DATE '2026-03-01',
    (SELECT id FROM usuario WHERE cpf = '44444444444'), 'VIP', 'pix', TRUE
WHERE NOT EXISTS (SELECT 1 FROM cliente WHERE cnpj = '55666777000145');

INSERT INTO cliente (
    cnpj, razao_social, nome_fantasia, proprietario, telefone, email,
    honorario, dia_vencimento, tipo_pagamento, status, data_inicio_cobranca,
    responsavel_id, indicacao, forma_pagamento, ativo
)
SELECT
    '66777888000136', 'Transportadora Norte Sul Ltda', 'Norte Sul Log', 'Paulo Henrique',
    '(81) 98888-1006', 'financeiro@nortesul.demo',
    980.00, 12, 'pessoa_juridica', 'pendente', DATE '2026-01-15',
    (SELECT id FROM usuario WHERE cpf = '22222222222'), 'Carteira fiscal', 'boleto', TRUE
WHERE NOT EXISTS (SELECT 1 FROM cliente WHERE cnpj = '66777888000136');

INSERT INTO cliente (
    cnpj, razao_social, nome_fantasia, proprietario, telefone, email,
    honorario, dia_vencimento, tipo_pagamento, status, data_inicio_cobranca,
    responsavel_id, indicacao, forma_pagamento, ativo
)
SELECT
    '77888999000127', 'MEI Flores da Manhã', 'Flores da Manhã', 'Lucia Ferreira',
    '(81) 98888-1007', 'lucia@flores.demo',
    250.00, 25, 'pessoa_fisica', 'em_dia', DATE '2026-04-01',
    (SELECT id FROM usuario WHERE cpf = '33333333333'), 'MEI', 'pix', TRUE
WHERE NOT EXISTS (SELECT 1 FROM cliente WHERE cnpj = '77888999000127');

INSERT INTO cliente (
    cnpj, razao_social, nome_fantasia, proprietario, telefone, email,
    honorario, dia_vencimento, tipo_pagamento, status, data_inicio_cobranca,
    responsavel_id, indicacao, forma_pagamento, ativo
)
SELECT
    '88999000000118', 'Construtora Horizonte SA', 'Horizonte', 'Eng. Marcos Vieira',
    '(81) 98888-1008', 'obras@horizonte.demo',
    2200.00, 8, 'pessoa_juridica', 'em_dia', DATE '2025-08-01',
    (SELECT id FROM usuario WHERE cpf = '11111111111'), 'Lucro Presumido', 'boleto', TRUE
WHERE NOT EXISTS (SELECT 1 FROM cliente WHERE cnpj = '88999000000118');

-- ---------- Responsáveis por setor ----------
-- ABC Tech: Hemerson Fiscal, Patricia DP, Ana Contábil, Admin Gerente
INSERT INTO cliente_responsavel (cliente_id, usuario_id, setor, ativo, data_inicio)
SELECT c.id, u.id, v.setor, TRUE, CURRENT_DATE
FROM cliente c
CROSS JOIN (VALUES
    ('FISCAL', '22222222222'),
    ('DEPARTAMENTO_PESSOAL', '33333333333'),
    ('CONTABIL', '44444444444'),
    ('GERENTE_CONTA', '11111111111')
) AS v(setor, cpf)
JOIN usuario u ON u.cpf = v.cpf
WHERE c.cnpj = '11222333000181'
  AND NOT EXISTS (
      SELECT 1 FROM cliente_responsavel cr
      WHERE cr.cliente_id = c.id AND cr.setor = v.setor AND cr.ativo = TRUE
  );

-- XYZ: só Hemerson fiscal + gerente
INSERT INTO cliente_responsavel (cliente_id, usuario_id, setor, ativo, data_inicio)
SELECT c.id, u.id, v.setor, TRUE, CURRENT_DATE
FROM cliente c
CROSS JOIN (VALUES
    ('FISCAL', '22222222222'),
    ('GERENTE_CONTA', '22222222222')
) AS v(setor, cpf)
JOIN usuario u ON u.cpf = v.cpf
WHERE c.cnpj = '22333444000172'
  AND NOT EXISTS (
      SELECT 1 FROM cliente_responsavel cr
      WHERE cr.cliente_id = c.id AND cr.setor = v.setor AND cr.ativo = TRUE AND cr.usuario_id = u.id
  );

-- Delta: Admin gerente, Hemerson fiscal
INSERT INTO cliente_responsavel (cliente_id, usuario_id, setor, ativo, data_inicio)
SELECT c.id, u.id, v.setor, TRUE, CURRENT_DATE
FROM cliente c
CROSS JOIN (VALUES
    ('FISCAL', '22222222222'),
    ('CONTABIL', '44444444444'),
    ('GERENTE_CONTA', '11111111111')
) AS v(setor, cpf)
JOIN usuario u ON u.cpf = v.cpf
WHERE c.cnpj = '33444555000163'
  AND NOT EXISTS (
      SELECT 1 FROM cliente_responsavel cr
      WHERE cr.cliente_id = c.id AND cr.setor = v.setor AND cr.ativo = TRUE
  );

-- Padaria: Patricia DP + Hemerson fiscal
INSERT INTO cliente_responsavel (cliente_id, usuario_id, setor, ativo, data_inicio)
SELECT c.id, u.id, v.setor, TRUE, CURRENT_DATE
FROM cliente c
CROSS JOIN (VALUES
    ('FISCAL', '22222222222'),
    ('DEPARTAMENTO_PESSOAL', '33333333333'),
    ('GERENTE_CONTA', '33333333333')
) AS v(setor, cpf)
JOIN usuario u ON u.cpf = v.cpf
WHERE c.cnpj = '44555666000154'
  AND NOT EXISTS (
      SELECT 1 FROM cliente_responsavel cr
      WHERE cr.cliente_id = c.id AND cr.setor = v.setor AND cr.ativo = TRUE
  );

-- Clínica: Ana + Patricia DP
INSERT INTO cliente_responsavel (cliente_id, usuario_id, setor, ativo, data_inicio)
SELECT c.id, u.id, v.setor, TRUE, CURRENT_DATE
FROM cliente c
CROSS JOIN (VALUES
    ('FISCAL', '44444444444'),
    ('DEPARTAMENTO_PESSOAL', '33333333333'),
    ('FINANCEIRO', '11111111111'),
    ('GERENTE_CONTA', '44444444444')
) AS v(setor, cpf)
JOIN usuario u ON u.cpf = v.cpf
WHERE c.cnpj = '55666777000145'
  AND NOT EXISTS (
      SELECT 1 FROM cliente_responsavel cr
      WHERE cr.cliente_id = c.id AND cr.setor = v.setor AND cr.ativo = TRUE
  );

-- Norte Sul: Hemerson fiscal
INSERT INTO cliente_responsavel (cliente_id, usuario_id, setor, ativo, data_inicio)
SELECT c.id, u.id, 'FISCAL', TRUE, CURRENT_DATE
FROM cliente c
JOIN usuario u ON u.cpf = '22222222222'
WHERE c.cnpj = '66777888000136'
  AND NOT EXISTS (
      SELECT 1 FROM cliente_responsavel cr
      WHERE cr.cliente_id = c.id AND cr.setor = 'FISCAL' AND cr.ativo = TRUE
  );

-- Flores MEI: Patricia
INSERT INTO cliente_responsavel (cliente_id, usuario_id, setor, ativo, data_inicio)
SELECT c.id, u.id, v.setor, TRUE, CURRENT_DATE
FROM cliente c
CROSS JOIN (VALUES ('FISCAL'), ('GERENTE_CONTA')) AS v(setor)
JOIN usuario u ON u.cpf = '33333333333'
WHERE c.cnpj = '77888999000127'
  AND NOT EXISTS (
      SELECT 1 FROM cliente_responsavel cr
      WHERE cr.cliente_id = c.id AND cr.setor = v.setor AND cr.ativo = TRUE
  );

-- Horizonte: Admin + Hemerson
INSERT INTO cliente_responsavel (cliente_id, usuario_id, setor, ativo, data_inicio)
SELECT c.id, u.id, v.setor, TRUE, CURRENT_DATE
FROM cliente c
CROSS JOIN (VALUES
    ('FISCAL', '22222222222'),
    ('CONTABIL', '44444444444'),
    ('GERENTE_CONTA', '11111111111')
) AS v(setor, cpf)
JOIN usuario u ON u.cpf = v.cpf
WHERE c.cnpj = '88999000000118'
  AND NOT EXISTS (
      SELECT 1 FROM cliente_responsavel cr
      WHERE cr.cliente_id = c.id AND cr.setor = v.setor AND cr.ativo = TRUE
  );

-- ---------- Obrigações configuradas + ocorrências do mês ----------
-- Helper: para cada cliente Simples-like (ABC, XYZ, Padaria, Flores) → PGDAS-D mensal
INSERT INTO cliente_obrigacao (
    cliente_id, obrigacao_id, data_vencimento, ativo, observacao,
    periodicidade, dia_vencimento, tipo_regra_vencimento, setor, dias_antecedencia_alerta
)
SELECT
    c.id,
    o.id,
    MAKE_DATE(EXTRACT(YEAR FROM CURRENT_DATE)::INT, EXTRACT(MONTH FROM CURRENT_DATE)::INT, LEAST(20, EXTRACT(DAY FROM (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month - 1 day'))::INT)),
    TRUE,
    'Seed demo — obrigação recorrente',
    'MENSAL',
    20,
    'DIA_FIXO',
    'FISCAL',
    5
FROM cliente c
JOIN obrigacao o ON o.nome = 'PGDAS-D'
WHERE c.cnpj IN ('11222333000181', '22333444000172', '44555666000154', '77888999000127')
  AND NOT EXISTS (
      SELECT 1 FROM cliente_obrigacao co
      WHERE co.cliente_id = c.id AND co.obrigacao_id = o.id AND co.ativo = TRUE
  );

-- eSocial / FGTS para quem tem DP (ABC, Padaria, Clínica)
INSERT INTO cliente_obrigacao (
    cliente_id, obrigacao_id, data_vencimento, ativo, observacao,
    periodicidade, dia_vencimento, tipo_regra_vencimento, setor, dias_antecedencia_alerta
)
SELECT
    c.id,
    o.id,
    MAKE_DATE(EXTRACT(YEAR FROM CURRENT_DATE)::INT, EXTRACT(MONTH FROM CURRENT_DATE)::INT, LEAST(15, 28)),
    TRUE,
    'Seed demo — DP',
    'MENSAL',
    15,
    'DIA_FIXO',
    'DEPARTAMENTO_PESSOAL',
    5
FROM cliente c
JOIN obrigacao o ON o.nome = 'eSocial'
WHERE c.cnpj IN ('11222333000181', '44555666000154', '55666777000145')
  AND NOT EXISTS (
      SELECT 1 FROM cliente_obrigacao co
      WHERE co.cliente_id = c.id AND co.obrigacao_id = o.id AND co.ativo = TRUE
  );

-- Garante ocorrência do mês corrente para configs ativas sem ocorrência
INSERT INTO obrigacao_ocorrencia (cliente_obrigacao_id, competencia, data_vencimento, status, observacao)
SELECT
    co.id,
    TO_CHAR(CURRENT_DATE, 'YYYY-MM'),
    co.data_vencimento,
    CASE
        WHEN co.data_vencimento < CURRENT_DATE THEN 'ATRASADA'
        WHEN co.data_vencimento = CURRENT_DATE THEN 'EM_ANDAMENTO'
        ELSE 'PENDENTE'
    END,
    co.observacao
FROM cliente_obrigacao co
WHERE co.ativo = TRUE
  AND NOT EXISTS (
      SELECT 1 FROM obrigacao_ocorrencia oo
      WHERE oo.cliente_obrigacao_id = co.id
        AND oo.competencia = TO_CHAR(CURRENT_DATE, 'YYYY-MM')
  );

-- Tags demo
INSERT INTO cliente_tag (cliente_id, tag_id)
SELECT c.id, t.id
FROM cliente c
JOIN tag t ON t.nome = 'VIP'
WHERE c.cnpj = '55666777000145'
  AND NOT EXISTS (SELECT 1 FROM cliente_tag ct WHERE ct.cliente_id = c.id AND ct.tag_id = t.id);

INSERT INTO cliente_tag (cliente_id, tag_id)
SELECT c.id, t.id
FROM cliente c
JOIN tag t ON t.nome = 'MEI'
WHERE c.cnpj = '77888999000127'
  AND NOT EXISTS (SELECT 1 FROM cliente_tag ct WHERE ct.cliente_id = c.id AND ct.tag_id = t.id);

INSERT INTO cliente_tag (cliente_id, tag_id)
SELECT c.id, t.id
FROM cliente c
JOIN tag t ON t.nome = 'INADIMPLENTE'
WHERE c.cnpj = '44555666000154'
  AND NOT EXISTS (SELECT 1 FROM cliente_tag ct WHERE ct.cliente_id = c.id AND ct.tag_id = t.id);

INSERT INTO cliente_tag (cliente_id, tag_id)
SELECT c.id, t.id
FROM cliente c
JOIN tag t ON t.nome = 'NOVO_CLIENTE'
WHERE c.cnpj = '77888999000127'
  AND NOT EXISTS (SELECT 1 FROM cliente_tag ct WHERE ct.cliente_id = c.id AND ct.tag_id = t.id);
