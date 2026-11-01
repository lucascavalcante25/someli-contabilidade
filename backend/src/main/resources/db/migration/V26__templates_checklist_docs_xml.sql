-- ============================================================
-- V26: Templates por regime, checklist de ocorrência,
-- documentos por competência, import XML NFe/NFSe.
-- ============================================================

-- ---------- Regime tributário do cliente ----------
ALTER TABLE cliente
    ADD COLUMN IF NOT EXISTS regime_tributario VARCHAR(40);

-- Backfill MEI a partir da tag operacional
UPDATE cliente c
SET regime_tributario = 'MEI'
FROM cliente_tag ct
JOIN tag t ON t.id = ct.tag_id AND t.nome = 'MEI'
WHERE ct.cliente_id = c.id
  AND (c.regime_tributario IS NULL OR c.regime_tributario = '');

CREATE INDEX IF NOT EXISTS idx_cliente_regime ON cliente(regime_tributario);

INSERT INTO tag (nome, cor) VALUES
 ('SIMPLES_NACIONAL', '#059669'),
 ('LUCRO_PRESUMIDO', '#0369A1')
ON CONFLICT (nome) DO NOTHING;

-- ---------- Amplia catálogo de obrigações (tipos) ----------
INSERT INTO obrigacao (nome, tipo, descricao, dias_antecedencia_alerta, setor, periodicidade_padrao, dia_vencimento_padrao, tipo_regra_vencimento, ativo, url_portal)
SELECT 'DAS MEI', 'FISCAL', 'Documento de Arrecadação do Simples Nacional — MEI', 5, 'FISCAL', 'MENSAL', 20, 'DIA_FIXO', TRUE,
       'https://www.gov.br/empresas-e-negocios/pt-br/empreendedor'
WHERE NOT EXISTS (SELECT 1 FROM obrigacao WHERE nome = 'DAS MEI');

INSERT INTO obrigacao (nome, tipo, descricao, dias_antecedencia_alerta, setor, periodicidade_padrao, dia_vencimento_padrao, tipo_regra_vencimento, ativo, url_portal)
SELECT 'DASN-SIMEI', 'FISCAL', 'Declaração Anual do Simples Nacional — MEI', 15, 'FISCAL', 'ANUAL', 31, 'DIA_FIXO', TRUE,
       'https://www.gov.br/empresas-e-negocios/pt-br/empreendedor'
WHERE NOT EXISTS (SELECT 1 FROM obrigacao WHERE nome = 'DASN-SIMEI');

INSERT INTO obrigacao (nome, tipo, descricao, dias_antecedencia_alerta, setor, periodicidade_padrao, dia_vencimento_padrao, tipo_regra_vencimento, ativo, url_portal)
SELECT 'DEFIS', 'FISCAL', 'Declaração de Informações Socioeconômicas e Fiscais (Simples)', 15, 'FISCAL', 'ANUAL', 31, 'DIA_FIXO', TRUE,
       'https://www8.receita.fazenda.gov.br/SimplesNacional'
WHERE NOT EXISTS (SELECT 1 FROM obrigacao WHERE nome = 'DEFIS');

INSERT INTO obrigacao (nome, tipo, descricao, dias_antecedencia_alerta, setor, periodicidade_padrao, dia_vencimento_padrao, tipo_regra_vencimento, ativo, url_portal)
SELECT 'EFD-Contribuições', 'FISCAL', 'Escrituração Fiscal Digital das Contribuições (PIS/COFINS)', 7, 'FISCAL', 'MENSAL', 15, 'DIA_FIXO', TRUE,
       'http://sped.rfb.gov.br'
WHERE NOT EXISTS (SELECT 1 FROM obrigacao WHERE nome = 'EFD-Contribuições');

INSERT INTO obrigacao (nome, tipo, descricao, dias_antecedencia_alerta, setor, periodicidade_padrao, dia_vencimento_padrao, tipo_regra_vencimento, ativo, url_portal)
SELECT 'EFD-ICMS/IPI', 'FISCAL', 'Escrituração Fiscal Digital ICMS/IPI (quando aplicável)', 7, 'FISCAL', 'MENSAL', 15, 'DIA_FIXO', TRUE,
       'http://sped.rfb.gov.br'
WHERE NOT EXISTS (SELECT 1 FROM obrigacao WHERE nome = 'EFD-ICMS/IPI');

INSERT INTO obrigacao (nome, tipo, descricao, dias_antecedencia_alerta, setor, periodicidade_padrao, dia_vencimento_padrao, tipo_regra_vencimento, ativo, url_portal)
SELECT 'GIA/ICMS', 'FISCAL', 'Guia de Informação e Apuração do ICMS (estadual, se devido)', 7, 'FISCAL', 'MENSAL', 15, 'DIA_FIXO', TRUE, NULL
WHERE NOT EXISTS (SELECT 1 FROM obrigacao WHERE nome = 'GIA/ICMS');

-- Atualiza DAS legado se ainda existir sem periodicidade mensal
UPDATE obrigacao
SET periodicidade_padrao = 'MENSAL',
    dia_vencimento_padrao = COALESCE(dia_vencimento_padrao, 20),
    setor = 'FISCAL',
    url_portal = COALESCE(url_portal, 'https://www8.receita.fazenda.gov.br/SimplesNacional')
WHERE nome = 'DAS';

UPDATE obrigacao
SET url_portal = COALESCE(url_portal, 'https://www8.receita.fazenda.gov.br/SimplesNacional')
WHERE nome = 'PGDAS-D';

-- ---------- Templates por regime ----------
CREATE TABLE IF NOT EXISTS obrigacao_template (
    id          BIGSERIAL PRIMARY KEY,
    codigo      VARCHAR(40) NOT NULL UNIQUE,
    nome        VARCHAR(120) NOT NULL,
    regime      VARCHAR(40) NOT NULL,
    descricao   VARCHAR(500),
    ativo       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS obrigacao_template_item (
    id                    BIGSERIAL PRIMARY KEY,
    template_id           BIGINT NOT NULL REFERENCES obrigacao_template(id) ON DELETE CASCADE,
    obrigacao_id          BIGINT NOT NULL REFERENCES obrigacao(id) ON DELETE RESTRICT,
    periodicidade         VARCHAR(20),
    dia_vencimento        INTEGER,
    ordem                 INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT uk_template_obrigacao UNIQUE (template_id, obrigacao_id)
);

CREATE INDEX IF NOT EXISTS idx_template_regime ON obrigacao_template(regime);
CREATE INDEX IF NOT EXISTS idx_template_item_template ON obrigacao_template_item(template_id);

INSERT INTO obrigacao_template (codigo, nome, regime, descricao)
SELECT 'MEI_MENSAL', 'Pacote mensal MEI', 'MEI',
       'Obrigações típicas do Microempreendedor Individual (calendário operacional do escritório).'
WHERE NOT EXISTS (SELECT 1 FROM obrigacao_template WHERE codigo = 'MEI_MENSAL');

INSERT INTO obrigacao_template (codigo, nome, regime, descricao)
SELECT 'SIMPLES_MENSAL', 'Pacote mensal Simples Nacional', 'SIMPLES_NACIONAL',
       'Obrigações recorrentes típicas de empresas no Simples Nacional.'
WHERE NOT EXISTS (SELECT 1 FROM obrigacao_template WHERE codigo = 'SIMPLES_MENSAL');

INSERT INTO obrigacao_template (codigo, nome, regime, descricao)
SELECT 'PRESUMIDO_MENSAL', 'Pacote mensal Lucro Presumido', 'LUCRO_PRESUMIDO',
       'Obrigações recorrentes típicas de Lucro Presumido (sem substituir SPED completo).'
WHERE NOT EXISTS (SELECT 1 FROM obrigacao_template WHERE codigo = 'PRESUMIDO_MENSAL');

-- Itens MEI
INSERT INTO obrigacao_template_item (template_id, obrigacao_id, periodicidade, dia_vencimento, ordem)
SELECT t.id, o.id, 'MENSAL', 20, 1
FROM obrigacao_template t, obrigacao o
WHERE t.codigo = 'MEI_MENSAL' AND o.nome = 'DAS MEI'
  AND NOT EXISTS (SELECT 1 FROM obrigacao_template_item i WHERE i.template_id = t.id AND i.obrigacao_id = o.id);

INSERT INTO obrigacao_template_item (template_id, obrigacao_id, periodicidade, dia_vencimento, ordem)
SELECT t.id, o.id, 'ANUAL', 31, 2
FROM obrigacao_template t, obrigacao o
WHERE t.codigo = 'MEI_MENSAL' AND o.nome = 'DASN-SIMEI'
  AND NOT EXISTS (SELECT 1 FROM obrigacao_template_item i WHERE i.template_id = t.id AND i.obrigacao_id = o.id);

-- Itens Simples
INSERT INTO obrigacao_template_item (template_id, obrigacao_id, periodicidade, dia_vencimento, ordem)
SELECT t.id, o.id, 'MENSAL', 20, 1
FROM obrigacao_template t, obrigacao o
WHERE t.codigo = 'SIMPLES_MENSAL' AND o.nome = 'PGDAS-D'
  AND NOT EXISTS (SELECT 1 FROM obrigacao_template_item i WHERE i.template_id = t.id AND i.obrigacao_id = o.id);

INSERT INTO obrigacao_template_item (template_id, obrigacao_id, periodicidade, dia_vencimento, ordem)
SELECT t.id, o.id, 'MENSAL', 20, 2
FROM obrigacao_template t, obrigacao o
WHERE t.codigo = 'SIMPLES_MENSAL' AND o.nome = 'DAS'
  AND NOT EXISTS (SELECT 1 FROM obrigacao_template_item i WHERE i.template_id = t.id AND i.obrigacao_id = o.id);

INSERT INTO obrigacao_template_item (template_id, obrigacao_id, periodicidade, dia_vencimento, ordem)
SELECT t.id, o.id, 'MENSAL', 15, 3
FROM obrigacao_template t, obrigacao o
WHERE t.codigo = 'SIMPLES_MENSAL' AND o.nome = 'eSocial'
  AND NOT EXISTS (SELECT 1 FROM obrigacao_template_item i WHERE i.template_id = t.id AND i.obrigacao_id = o.id);

INSERT INTO obrigacao_template_item (template_id, obrigacao_id, periodicidade, dia_vencimento, ordem)
SELECT t.id, o.id, 'MENSAL', 20, 4
FROM obrigacao_template t, obrigacao o
WHERE t.codigo = 'SIMPLES_MENSAL' AND o.nome = 'FGTS Digital'
  AND NOT EXISTS (SELECT 1 FROM obrigacao_template_item i WHERE i.template_id = t.id AND i.obrigacao_id = o.id);

INSERT INTO obrigacao_template_item (template_id, obrigacao_id, periodicidade, dia_vencimento, ordem)
SELECT t.id, o.id, 'ANUAL', 31, 5
FROM obrigacao_template t, obrigacao o
WHERE t.codigo = 'SIMPLES_MENSAL' AND o.nome = 'DEFIS'
  AND NOT EXISTS (SELECT 1 FROM obrigacao_template_item i WHERE i.template_id = t.id AND i.obrigacao_id = o.id);

-- Itens Lucro Presumido
INSERT INTO obrigacao_template_item (template_id, obrigacao_id, periodicidade, dia_vencimento, ordem)
SELECT t.id, o.id, 'MENSAL', 25, 1
FROM obrigacao_template t, obrigacao o
WHERE t.codigo = 'PRESUMIDO_MENSAL' AND o.nome = 'DCTFWeb'
  AND NOT EXISTS (SELECT 1 FROM obrigacao_template_item i WHERE i.template_id = t.id AND i.obrigacao_id = o.id);

INSERT INTO obrigacao_template_item (template_id, obrigacao_id, periodicidade, dia_vencimento, ordem)
SELECT t.id, o.id, 'MENSAL', 15, 2
FROM obrigacao_template t, obrigacao o
WHERE t.codigo = 'PRESUMIDO_MENSAL' AND o.nome = 'EFD-Contribuições'
  AND NOT EXISTS (SELECT 1 FROM obrigacao_template_item i WHERE i.template_id = t.id AND i.obrigacao_id = o.id);

INSERT INTO obrigacao_template_item (template_id, obrigacao_id, periodicidade, dia_vencimento, ordem)
SELECT t.id, o.id, 'MENSAL', 15, 3
FROM obrigacao_template t, obrigacao o
WHERE t.codigo = 'PRESUMIDO_MENSAL' AND o.nome = 'eSocial'
  AND NOT EXISTS (SELECT 1 FROM obrigacao_template_item i WHERE i.template_id = t.id AND i.obrigacao_id = o.id);

INSERT INTO obrigacao_template_item (template_id, obrigacao_id, periodicidade, dia_vencimento, ordem)
SELECT t.id, o.id, 'MENSAL', 20, 4
FROM obrigacao_template t, obrigacao o
WHERE t.codigo = 'PRESUMIDO_MENSAL' AND o.nome = 'FGTS Digital'
  AND NOT EXISTS (SELECT 1 FROM obrigacao_template_item i WHERE i.template_id = t.id AND i.obrigacao_id = o.id);

INSERT INTO obrigacao_template_item (template_id, obrigacao_id, periodicidade, dia_vencimento, ordem)
SELECT t.id, o.id, 'TRIMESTRAL', 30, 5
FROM obrigacao_template t, obrigacao o
WHERE t.codigo = 'PRESUMIDO_MENSAL' AND o.nome = 'IRPJ'
  AND NOT EXISTS (SELECT 1 FROM obrigacao_template_item i WHERE i.template_id = t.id AND i.obrigacao_id = o.id);

INSERT INTO obrigacao_template_item (template_id, obrigacao_id, periodicidade, dia_vencimento, ordem)
SELECT t.id, o.id, 'MENSAL', 15, 6
FROM obrigacao_template t, obrigacao o
WHERE t.codigo = 'PRESUMIDO_MENSAL' AND o.nome = 'ISS'
  AND NOT EXISTS (SELECT 1 FROM obrigacao_template_item i WHERE i.template_id = t.id AND i.obrigacao_id = o.id);

-- ---------- Checklist mínimo na ocorrência ----------
ALTER TABLE obrigacao_ocorrencia
    ADD COLUMN IF NOT EXISTS docs_ok BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS apurado BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS transmitido BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS guia_enviada BOOLEAN NOT NULL DEFAULT FALSE;

-- ---------- Documentos: categoria + índices por competência ----------
ALTER TABLE cliente_documento
    ADD COLUMN IF NOT EXISTS categoria VARCHAR(40) NOT NULL DEFAULT 'GERAL';

CREATE INDEX IF NOT EXISTS idx_cliente_documento_comp
    ON cliente_documento(cliente_id, competencia);

CREATE INDEX IF NOT EXISTS idx_cliente_documento_setor
    ON cliente_documento(cliente_id, setor);

-- ---------- Import XML NFe/NFSe ----------
CREATE TABLE IF NOT EXISTS nota_fiscal_import (
    id                  BIGSERIAL PRIMARY KEY,
    cliente_id          BIGINT REFERENCES cliente(id) ON DELETE SET NULL,
    documento_id        BIGINT REFERENCES cliente_documento(id) ON DELETE SET NULL,
    tipo                VARCHAR(10) NOT NULL,
    chave_acesso        VARCHAR(60),
    numero              VARCHAR(20),
    serie               VARCHAR(10),
    cnpj_emitente       VARCHAR(14),
    cnpj_destinatario   VARCHAR(14),
    data_emissao        DATE,
    valor_total         NUMERIC(14, 2),
    competencia         VARCHAR(7),
    nome_arquivo        VARCHAR(255),
    status_parse        VARCHAR(30) NOT NULL DEFAULT 'OK',
    mensagem_erro       VARCHAR(500),
    created_at          TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT uk_nota_chave UNIQUE (chave_acesso)
);

CREATE INDEX IF NOT EXISTS idx_nota_cliente_comp ON nota_fiscal_import(cliente_id, competencia);
CREATE INDEX IF NOT EXISTS idx_nota_cnpj_emit ON nota_fiscal_import(cnpj_emitente);
CREATE INDEX IF NOT EXISTS idx_nota_cnpj_dest ON nota_fiscal_import(cnpj_destinatario);

-- ---------- Tags inteligentes (automáticas vs manuais) ----------
ALTER TABLE tag
    ADD COLUMN IF NOT EXISTS automatica BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS regra VARCHAR(40);

UPDATE tag SET automatica = TRUE, regra = 'NOVO_CLIENTE'
WHERE nome = 'NOVO_CLIENTE';

UPDATE tag SET automatica = TRUE, regra = 'INADIMPLENTE'
WHERE nome = 'INADIMPLENTE';

-- MEI e regimes permanecem manuais (classificação estável)
UPDATE tag SET automatica = FALSE, regra = NULL
WHERE nome IN ('MEI', 'SIMPLES_NACIONAL', 'LUCRO_PRESUMIDO', 'URGENTE');
