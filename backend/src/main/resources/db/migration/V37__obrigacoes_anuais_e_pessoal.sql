-- Obrigações anuais com mês/dia padrão de vencimento e novas obrigações do Pessoal (pedido da Karol, 09/11/2026).
-- Idempotente: pode rodar de novo sem duplicar nem desfazer ajustes feitos depois na tela de Tipos de Obrigação.

ALTER TABLE obrigacao ADD COLUMN IF NOT EXISTS mes_vencimento_padrao SMALLINT;

-- 1) Anuais com data conhecida: só preenche o mês quando ainda está vazio
UPDATE obrigacao SET periodicidade_padrao = 'ANUAL', dia_vencimento_padrao = 31, mes_vencimento_padrao = 3
WHERE nome = 'DEFIS' AND mes_vencimento_padrao IS NULL;
UPDATE obrigacao SET periodicidade_padrao = 'ANUAL', dia_vencimento_padrao = 31, mes_vencimento_padrao = 5
WHERE nome = 'DASN-SIMEI' AND mes_vencimento_padrao IS NULL;
UPDATE obrigacao SET periodicidade_padrao = 'ANUAL', dia_vencimento_padrao = 30, mes_vencimento_padrao = 6
WHERE nome = 'ECD' AND mes_vencimento_padrao IS NULL;
UPDATE obrigacao SET periodicidade_padrao = 'ANUAL', dia_vencimento_padrao = 31, mes_vencimento_padrao = 7
WHERE nome = 'ECF' AND mes_vencimento_padrao IS NULL;

-- 2) Licenças anuais: a data depende de cada cliente (validade do alvará), então fica sem mês padrão
UPDATE obrigacao SET nome = 'Corpo de Bombeiros'
WHERE nome = 'Bombeiros' AND NOT EXISTS (SELECT 1 FROM obrigacao o WHERE o.nome = 'Corpo de Bombeiros');

INSERT INTO obrigacao (nome, tipo, descricao, dias_antecedencia_alerta, setor, periodicidade_padrao, dia_vencimento_padrao, tipo_regra_vencimento, ativo, url_portal)
SELECT 'Alvará de Funcionamento', 'LICENCA', 'Renovação anual do alvará de funcionamento', 30, 'SOCIETARIO', 'ANUAL', NULL, 'DIA_FIXO', TRUE, NULL
WHERE NOT EXISTS (SELECT 1 FROM obrigacao o WHERE o.nome = 'Alvará de Funcionamento');

UPDATE obrigacao SET periodicidade_padrao = 'ANUAL'
WHERE nome IN ('Alvará Sanitário', 'Corpo de Bombeiros', 'Alvará de Funcionamento') AND periodicidade_padrao = 'UNICA';

-- Vínculos já cadastrados dessas obrigações passam a se repetir todo ano
UPDATE cliente_obrigacao co SET periodicidade = 'ANUAL'
FROM obrigacao o
WHERE o.id = co.obrigacao_id AND co.periodicidade = 'UNICA'
  AND o.nome IN ('DEFIS', 'DASN-SIMEI', 'ECD', 'ECF', 'Alvará Sanitário', 'Corpo de Bombeiros', 'Alvará de Funcionamento');

-- 3) Novas obrigações do Pessoal
INSERT INTO obrigacao (nome, tipo, descricao, dias_antecedencia_alerta, setor, periodicidade_padrao, dia_vencimento_padrao, mes_vencimento_padrao, tipo_regra_vencimento, ativo, url_portal)
SELECT x.nome, 'PESSOAL', x.descricao, x.alerta, 'DEPARTAMENTO_PESSOAL', x.periodicidade, x.dia, x.mes, 'DIA_FIXO', TRUE, NULL
FROM (VALUES
        ('13º salário', 'Pagamento da 2ª parcela do 13º salário', 10, 'ANUAL', 20, 12),
        ('Adiantamento do 13º', 'Pagamento da 1ª parcela (adiantamento) do 13º salário', 10, 'ANUAL', 30, 11),
        ('Adiantamento de folha', 'Adiantamento salarial (vale) do mês', 3, 'MENSAL', 15, CAST(NULL AS INTEGER)),
        ('Empréstimo consignado', 'Repasse das parcelas do empréstimo consignado descontadas em folha (vence com FGTS e INSS)', 3, 'MENSAL', 20, CAST(NULL AS INTEGER))
     ) AS x(nome, descricao, alerta, periodicidade, dia, mes)
WHERE NOT EXISTS (SELECT 1 FROM obrigacao o WHERE o.nome = x.nome);

-- 4) FGTS (guia antiga) substituído pelo FGTS Digital
-- 4a) vínculos de clientes: passa para o FGTS Digital quando o cliente ainda não tem esse vínculo
UPDATE cliente_obrigacao co
SET obrigacao_id = d.id, periodicidade = 'MENSAL', dia_vencimento = COALESCE(co.dia_vencimento, d.dia_vencimento_padrao)
FROM obrigacao f, obrigacao d
WHERE f.nome = 'FGTS' AND d.nome = 'FGTS Digital' AND co.obrigacao_id = f.id
  AND NOT EXISTS (SELECT 1 FROM cliente_obrigacao x WHERE x.cliente_id = co.cliente_id AND x.obrigacao_id = d.id);
-- 4b) o que sobrou (cliente já tinha FGTS Digital) fica inativo
UPDATE cliente_obrigacao co SET ativo = FALSE
FROM obrigacao f
WHERE f.nome = 'FGTS' AND co.obrigacao_id = f.id AND co.ativo = TRUE;
-- 4c) modelos de obrigações: troca o item, sem repetir FGTS Digital no mesmo modelo
UPDATE obrigacao_template_item i SET obrigacao_id = d.id, periodicidade = 'MENSAL', dia_vencimento = d.dia_vencimento_padrao
FROM obrigacao f, obrigacao d
WHERE f.nome = 'FGTS' AND d.nome = 'FGTS Digital' AND i.obrigacao_id = f.id
  AND NOT EXISTS (SELECT 1 FROM obrigacao_template_item x WHERE x.template_id = i.template_id AND x.obrigacao_id = d.id);
DELETE FROM obrigacao_template_item i USING obrigacao f WHERE f.nome = 'FGTS' AND i.obrigacao_id = f.id;
-- 4d) sai do catálogo: apaga se nada mais aponta para ele; se ainda houver histórico, só desativa
DELETE FROM obrigacao f
WHERE f.nome = 'FGTS'
  AND NOT EXISTS (SELECT 1 FROM cliente_obrigacao co WHERE co.obrigacao_id = f.id);
UPDATE obrigacao SET ativo = FALSE WHERE nome = 'FGTS';
