-- Atividades mensais que a equipe controlava no checklist do Trello e ainda não existiam no catálogo.
-- Vencimentos sugeridos; o escritório ajusta em Tipos de Obrigação. Idempotente.

INSERT INTO obrigacao (nome, tipo, descricao, dias_antecedencia_alerta, setor, periodicidade_padrao, dia_vencimento_padrao, tipo_regra_vencimento, ativo, url_portal)
SELECT x.nome, x.tipo, x.descricao, 3, x.setor, 'MENSAL', x.dia, 'DIA_FIXO', TRUE, NULL
FROM (VALUES
        ('Emissão de nota fiscal', 'FISCAL', 'Emitir as notas fiscais do cliente no mês', 'FISCAL', 5),
        ('Solicitar faturamento', 'FISCAL', 'Pedir ao cliente o faturamento do mês para apuração', 'FISCAL', 3),
        ('Importar NFS-e', 'FISCAL', 'Importar as NFS-e do mês para a apuração', 'FISCAL', 10),
        ('ICMS-ST', 'FISCAL', 'Apuração do ICMS por substituição tributária', 'FISCAL', 20),
        ('Parc. Receita Federal', 'FISCAL', 'Parcela do parcelamento na Receita Federal', 'FISCAL', 25),
        ('Relatórios de cartão', 'CONTABIL', 'Relatórios das vendas em cartão do mês', 'CONTABIL', 10),
        ('Extrato bancário', 'CONTABIL', 'Solicitar e conferir os extratos bancários do mês', 'CONTABIL', 10),
        ('DET (Domicílio Eletrônico Trabalhista)', 'PESSOAL', 'Conferir as mensagens do DET do empregador', 'DEPARTAMENTO_PESSOAL', 10)
     ) AS x(nome, tipo, descricao, setor, dia)
WHERE NOT EXISTS (SELECT 1 FROM obrigacao o WHERE o.nome = x.nome);
