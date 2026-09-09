-- ============================================================
-- V22: Plataforma operacional — responsáveis, permissões,
-- alçada, obrigações recorrentes, notificações por usuário,
-- auditoria e preparação para portal do cliente.
-- ============================================================

-- ---------- Usuário: alçada global + tipo (INTERNO/CLIENTE) ----------
ALTER TABLE usuario
    ADD COLUMN IF NOT EXISTS alcada_global BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS tipo_usuario VARCHAR(20) NOT NULL DEFAULT 'INTERNO';

UPDATE usuario SET alcada_global = TRUE WHERE perfil = 'ADMIN';

-- Amplia coluna de perfil para novos valores
ALTER TABLE usuario ALTER COLUMN perfil TYPE VARCHAR(40);

-- ---------- Responsáveis por cliente/setor ----------
CREATE TABLE IF NOT EXISTS cliente_responsavel (
    id              BIGSERIAL PRIMARY KEY,
    cliente_id      BIGINT NOT NULL REFERENCES cliente(id) ON DELETE CASCADE,
    usuario_id      BIGINT NOT NULL REFERENCES usuario(id) ON DELETE RESTRICT,
    setor           VARCHAR(40) NOT NULL,
    ativo           BOOLEAN NOT NULL DEFAULT TRUE,
    data_inicio     DATE NOT NULL DEFAULT CURRENT_DATE,
    data_fim        DATE,
    substituto_de_id BIGINT REFERENCES cliente_responsavel(id) ON DELETE SET NULL,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT uk_cliente_responsavel_ativo UNIQUE (cliente_id, setor, usuario_id, data_inicio)
);

CREATE INDEX IF NOT EXISTS idx_cliente_resp_cliente ON cliente_responsavel(cliente_id);
CREATE INDEX IF NOT EXISTS idx_cliente_resp_usuario ON cliente_responsavel(usuario_id);
CREATE INDEX IF NOT EXISTS idx_cliente_resp_setor ON cliente_responsavel(setor);
CREATE INDEX IF NOT EXISTS idx_cliente_resp_ativo ON cliente_responsavel(ativo) WHERE ativo = TRUE;

-- Migra responsável legado como GERENTE_CONTA
INSERT INTO cliente_responsavel (cliente_id, usuario_id, setor, ativo, data_inicio)
SELECT c.id, c.responsavel_id, 'GERENTE_CONTA', TRUE, CURRENT_DATE
FROM cliente c
WHERE c.responsavel_id IS NOT NULL
  AND NOT EXISTS (
      SELECT 1 FROM cliente_responsavel cr
      WHERE cr.cliente_id = c.id
        AND cr.usuario_id = c.responsavel_id
        AND cr.setor = 'GERENTE_CONTA'
        AND cr.ativo = TRUE
  );

-- ---------- Catálogo de permissões ----------
CREATE TABLE IF NOT EXISTS permissao (
    id          BIGSERIAL PRIMARY KEY,
    codigo      VARCHAR(80) NOT NULL UNIQUE,
    modulo      VARCHAR(40) NOT NULL,
    descricao   VARCHAR(200) NOT NULL,
    sensivel    BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS perfil_permissao (
    id            BIGSERIAL PRIMARY KEY,
    perfil        VARCHAR(40) NOT NULL,
    permissao_id  BIGINT NOT NULL REFERENCES permissao(id) ON DELETE CASCADE,
    CONSTRAINT uk_perfil_permissao UNIQUE (perfil, permissao_id)
);

CREATE TABLE IF NOT EXISTS usuario_permissao (
    id            BIGSERIAL PRIMARY KEY,
    usuario_id    BIGINT NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
    permissao_id  BIGINT NOT NULL REFERENCES permissao(id) ON DELETE CASCADE,
    concedida     BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT uk_usuario_permissao UNIQUE (usuario_id, permissao_id)
);

CREATE INDEX IF NOT EXISTS idx_usuario_permissao_usuario ON usuario_permissao(usuario_id);
CREATE INDEX IF NOT EXISTS idx_perfil_permissao_perfil ON perfil_permissao(perfil);

-- Seed permissões
INSERT INTO permissao (codigo, modulo, descricao, sensivel) VALUES
 ('DASHBOARD_VISUALIZAR', 'DASHBOARD', 'Visualizar dashboard', FALSE),
 ('CONSULTAS_VISUALIZAR', 'CONSULTAS', 'Acessar consultas CNPJ/Sintegra', FALSE),
 ('CLIENTES_VISUALIZAR', 'CLIENTES', 'Visualizar clientes', FALSE),
 ('CLIENTES_CADASTRAR', 'CLIENTES', 'Cadastrar clientes', FALSE),
 ('CLIENTES_EDITAR', 'CLIENTES', 'Editar clientes', FALSE),
 ('CLIENTES_EXCLUIR', 'CLIENTES', 'Excluir clientes', FALSE),
 ('CLIENTES_RESPONSAVEIS_EDITAR', 'CLIENTES', 'Editar responsáveis do cliente', FALSE),
 ('OBRIGACOES_VISUALIZAR', 'OBRIGACOES', 'Visualizar obrigações', FALSE),
 ('OBRIGACOES_CRIAR', 'OBRIGACOES', 'Criar obrigações', FALSE),
 ('OBRIGACOES_EDITAR', 'OBRIGACOES', 'Editar obrigações', FALSE),
 ('OBRIGACOES_CONCLUIR', 'OBRIGACOES', 'Concluir obrigações', FALSE),
 ('OBRIGACOES_EXCLUIR', 'OBRIGACOES', 'Excluir obrigações', FALSE),
 ('OBRIGACOES_REABRIR', 'OBRIGACOES', 'Reabrir obrigações', FALSE),
 ('OBRIGACOES_TIPOS_GERENCIAR', 'OBRIGACOES', 'Gerenciar tipos de obrigação', FALSE),
 ('FINANCEIRO_VISUALIZAR', 'FINANCEIRO', 'Visualizar módulo financeiro', TRUE),
 ('FINANCEIRO_LANCAR', 'FINANCEIRO', 'Lançar pagamentos', TRUE),
 ('FINANCEIRO_EDITAR', 'FINANCEIRO', 'Editar lançamentos financeiros', TRUE),
 ('FINANCEIRO_EXCLUIR', 'FINANCEIRO', 'Excluir lançamentos financeiros', TRUE),
 ('HONORARIO_VISUALIZAR', 'HONORARIOS', 'Visualizar valores de honorários', TRUE),
 ('HONORARIO_EDITAR', 'HONORARIOS', 'Editar valores de honorários', TRUE),
 ('DESPESAS_VISUALIZAR', 'DESPESAS', 'Visualizar despesas', TRUE),
 ('DESPESAS_EDITAR', 'DESPESAS', 'Editar despesas', TRUE),
 ('USUARIOS_VISUALIZAR', 'USUARIOS', 'Visualizar usuários', FALSE),
 ('USUARIOS_CADASTRAR', 'USUARIOS', 'Cadastrar usuários', FALSE),
 ('USUARIOS_EDITAR', 'USUARIOS', 'Editar usuários', FALSE),
 ('USUARIOS_DESATIVAR', 'USUARIOS', 'Desativar usuários', FALSE),
 ('USUARIOS_PERMISSOES', 'USUARIOS', 'Alterar permissões de usuários', FALSE),
 ('RELATORIOS_OPERACIONAIS', 'RELATORIOS', 'Visualizar relatórios operacionais', FALSE),
 ('RELATORIOS_FINANCEIROS', 'RELATORIOS', 'Visualizar relatórios financeiros', TRUE),
 ('RELATORIOS_EXPORTAR', 'RELATORIOS', 'Exportar relatórios', FALSE),
 ('ADMINISTRACAO_VISUALIZAR', 'ADMINISTRACAO', 'Acessar administração', FALSE),
 ('ALCADA_GLOBAL', 'ALCADA', 'Acesso a todos os clientes', FALSE),
 ('ALCADA_SETOR', 'ALCADA', 'Acesso ampliado ao setor', FALSE),
 ('VISAO_GERENCIAL', 'DASHBOARD', 'Visualizar indicadores gerenciais', FALSE)
ON CONFLICT (codigo) DO NOTHING;

-- Perfil ADMIN: todas as permissões
INSERT INTO perfil_permissao (perfil, permissao_id)
SELECT 'ADMIN', p.id FROM permissao p
ON CONFLICT DO NOTHING;

-- CONTADOR: operacional amplo sem admin de usuários sensível completo
INSERT INTO perfil_permissao (perfil, permissao_id)
SELECT 'CONTADOR', p.id FROM permissao p
WHERE p.codigo IN (
  'DASHBOARD_VISUALIZAR','CONSULTAS_VISUALIZAR',
  'CLIENTES_VISUALIZAR','CLIENTES_CADASTRAR','CLIENTES_EDITAR','CLIENTES_RESPONSAVEIS_EDITAR',
  'OBRIGACOES_VISUALIZAR','OBRIGACOES_CRIAR','OBRIGACOES_EDITAR','OBRIGACOES_CONCLUIR','OBRIGACOES_REABRIR','OBRIGACOES_TIPOS_GERENCIAR',
  'FINANCEIRO_VISUALIZAR','FINANCEIRO_LANCAR','HONORARIO_VISUALIZAR',
  'DESPESAS_VISUALIZAR','RELATORIOS_OPERACIONAIS','VISAO_GERENCIAL'
)
ON CONFLICT DO NOTHING;

-- OPERADOR: limitado
INSERT INTO perfil_permissao (perfil, permissao_id)
SELECT 'OPERADOR', p.id FROM permissao p
WHERE p.codigo IN (
  'DASHBOARD_VISUALIZAR','CONSULTAS_VISUALIZAR',
  'CLIENTES_VISUALIZAR',
  'OBRIGACOES_VISUALIZAR','OBRIGACOES_EDITAR','OBRIGACOES_CONCLUIR'
)
ON CONFLICT DO NOTHING;

-- Novos perfis template
INSERT INTO perfil_permissao (perfil, permissao_id)
SELECT 'FISCAL', p.id FROM permissao p
WHERE p.codigo IN (
  'DASHBOARD_VISUALIZAR','CONSULTAS_VISUALIZAR','CLIENTES_VISUALIZAR',
  'OBRIGACOES_VISUALIZAR','OBRIGACOES_CRIAR','OBRIGACOES_EDITAR','OBRIGACOES_CONCLUIR','OBRIGACOES_REABRIR'
)
ON CONFLICT DO NOTHING;

INSERT INTO perfil_permissao (perfil, permissao_id)
SELECT 'SUPERVISOR_FISCAL', p.id FROM permissao p
WHERE p.codigo IN (
  'DASHBOARD_VISUALIZAR','CONSULTAS_VISUALIZAR','CLIENTES_VISUALIZAR','CLIENTES_EDITAR','CLIENTES_RESPONSAVEIS_EDITAR',
  'OBRIGACOES_VISUALIZAR','OBRIGACOES_CRIAR','OBRIGACOES_EDITAR','OBRIGACOES_CONCLUIR','OBRIGACOES_EXCLUIR','OBRIGACOES_REABRIR','OBRIGACOES_TIPOS_GERENCIAR',
  'ALCADA_SETOR','VISAO_GERENCIAL','RELATORIOS_OPERACIONAIS'
)
ON CONFLICT DO NOTHING;

INSERT INTO perfil_permissao (perfil, permissao_id)
SELECT 'DEPARTAMENTO_PESSOAL', p.id FROM permissao p
WHERE p.codigo IN (
  'DASHBOARD_VISUALIZAR','CLIENTES_VISUALIZAR',
  'OBRIGACOES_VISUALIZAR','OBRIGACOES_CRIAR','OBRIGACOES_EDITAR','OBRIGACOES_CONCLUIR','OBRIGACOES_REABRIR'
)
ON CONFLICT DO NOTHING;

INSERT INTO perfil_permissao (perfil, permissao_id)
SELECT 'SUPERVISOR_DP', p.id FROM permissao p
WHERE p.codigo IN (
  'DASHBOARD_VISUALIZAR','CLIENTES_VISUALIZAR','CLIENTES_EDITAR','CLIENTES_RESPONSAVEIS_EDITAR',
  'OBRIGACOES_VISUALIZAR','OBRIGACOES_CRIAR','OBRIGACOES_EDITAR','OBRIGACOES_CONCLUIR','OBRIGACOES_EXCLUIR','OBRIGACOES_REABRIR',
  'ALCADA_SETOR','VISAO_GERENCIAL','RELATORIOS_OPERACIONAIS'
)
ON CONFLICT DO NOTHING;

INSERT INTO perfil_permissao (perfil, permissao_id)
SELECT 'CONTABIL', p.id FROM permissao p
WHERE p.codigo IN (
  'DASHBOARD_VISUALIZAR','CLIENTES_VISUALIZAR',
  'OBRIGACOES_VISUALIZAR','OBRIGACOES_CRIAR','OBRIGACOES_EDITAR','OBRIGACOES_CONCLUIR','OBRIGACOES_REABRIR'
)
ON CONFLICT DO NOTHING;

INSERT INTO perfil_permissao (perfil, permissao_id)
SELECT 'FINANCEIRO', p.id FROM permissao p
WHERE p.codigo IN (
  'DASHBOARD_VISUALIZAR','CLIENTES_VISUALIZAR',
  'FINANCEIRO_VISUALIZAR','FINANCEIRO_LANCAR','FINANCEIRO_EDITAR',
  'HONORARIO_VISUALIZAR','HONORARIO_EDITAR',
  'DESPESAS_VISUALIZAR','DESPESAS_EDITAR',
  'RELATORIOS_FINANCEIROS','RELATORIOS_EXPORTAR'
)
ON CONFLICT DO NOTHING;

INSERT INTO perfil_permissao (perfil, permissao_id)
SELECT 'GERENTE', p.id FROM permissao p
WHERE p.codigo NOT IN ('USUARIOS_PERMISSOES')
ON CONFLICT DO NOTHING;

INSERT INTO perfil_permissao (perfil, permissao_id)
SELECT 'SOCIO', p.id FROM permissao p
ON CONFLICT DO NOTHING;

INSERT INTO perfil_permissao (perfil, permissao_id)
SELECT 'ATENDIMENTO', p.id FROM permissao p
WHERE p.codigo IN (
  'DASHBOARD_VISUALIZAR','CONSULTAS_VISUALIZAR','CLIENTES_VISUALIZAR'
)
ON CONFLICT DO NOTHING;

INSERT INTO perfil_permissao (perfil, permissao_id)
SELECT 'ESTAGIARIO', p.id FROM permissao p
WHERE p.codigo IN (
  'DASHBOARD_VISUALIZAR','CLIENTES_VISUALIZAR','OBRIGACOES_VISUALIZAR'
)
ON CONFLICT DO NOTHING;

-- ---------- Evolução do catálogo de obrigações ----------
ALTER TABLE obrigacao
    ADD COLUMN IF NOT EXISTS setor VARCHAR(40) NOT NULL DEFAULT 'FISCAL',
    ADD COLUMN IF NOT EXISTS periodicidade_padrao VARCHAR(20) NOT NULL DEFAULT 'UNICA',
    ADD COLUMN IF NOT EXISTS dia_vencimento_padrao INTEGER,
    ADD COLUMN IF NOT EXISTS tipo_regra_vencimento VARCHAR(40) NOT NULL DEFAULT 'DIA_FIXO',
    ADD COLUMN IF NOT EXISTS ativo BOOLEAN NOT NULL DEFAULT TRUE;

UPDATE obrigacao SET setor = 'FISCAL' WHERE tipo = 'FISCAL';
UPDATE obrigacao SET setor = 'OUTROS' WHERE tipo IN ('LICENCA', 'OUTROS') AND setor = 'FISCAL';

-- ---------- Evolução cliente_obrigacao (configuração / vínculo) ----------
ALTER TABLE cliente_obrigacao
    ADD COLUMN IF NOT EXISTS periodicidade VARCHAR(20) NOT NULL DEFAULT 'UNICA',
    ADD COLUMN IF NOT EXISTS dia_vencimento INTEGER,
    ADD COLUMN IF NOT EXISTS tipo_regra_vencimento VARCHAR(40) NOT NULL DEFAULT 'DIA_FIXO',
    ADD COLUMN IF NOT EXISTS setor VARCHAR(40),
    ADD COLUMN IF NOT EXISTS responsavel_usuario_id BIGINT REFERENCES usuario(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS dias_antecedencia_alerta INTEGER,
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NOT NULL DEFAULT NOW();

UPDATE cliente_obrigacao co
SET setor = o.setor,
    dias_antecedencia_alerta = o.dias_antecedencia_alerta,
    dia_vencimento = EXTRACT(DAY FROM co.data_vencimento)::INTEGER
FROM obrigacao o
WHERE co.obrigacao_id = o.id
  AND co.setor IS NULL;

-- ---------- Ocorrências por competência ----------
CREATE TABLE IF NOT EXISTS obrigacao_ocorrencia (
    id                    BIGSERIAL PRIMARY KEY,
    cliente_obrigacao_id  BIGINT NOT NULL REFERENCES cliente_obrigacao(id) ON DELETE CASCADE,
    competencia           VARCHAR(7),
    data_vencimento       DATE NOT NULL,
    status                VARCHAR(30) NOT NULL DEFAULT 'PENDENTE',
    observacao            VARCHAR(500),
    concluida_em          TIMESTAMP,
    concluida_por_id      BIGINT REFERENCES usuario(id) ON DELETE SET NULL,
    created_at            TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at            TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT uk_ocorrencia_comp UNIQUE (cliente_obrigacao_id, competencia, data_vencimento)
);

CREATE INDEX IF NOT EXISTS idx_ocorrencia_vencimento ON obrigacao_ocorrencia(data_vencimento);
CREATE INDEX IF NOT EXISTS idx_ocorrencia_status ON obrigacao_ocorrencia(status);
CREATE INDEX IF NOT EXISTS idx_ocorrencia_cliente_obrigacao ON obrigacao_ocorrencia(cliente_obrigacao_id);

-- Migra registros existentes como ocorrências
INSERT INTO obrigacao_ocorrencia (cliente_obrigacao_id, competencia, data_vencimento, status, observacao)
SELECT
    co.id,
    TO_CHAR(co.data_vencimento, 'YYYY-MM'),
    co.data_vencimento,
    CASE WHEN co.ativo THEN 'PENDENTE' ELSE 'NAO_APLICAVEL' END,
    co.observacao
FROM cliente_obrigacao co
WHERE NOT EXISTS (
    SELECT 1 FROM obrigacao_ocorrencia oo WHERE oo.cliente_obrigacao_id = co.id
);

-- Histórico de eventos da ocorrência
CREATE TABLE IF NOT EXISTS obrigacao_ocorrencia_evento (
    id              BIGSERIAL PRIMARY KEY,
    ocorrencia_id   BIGINT NOT NULL REFERENCES obrigacao_ocorrencia(id) ON DELETE CASCADE,
    usuario_id      BIGINT REFERENCES usuario(id) ON DELETE SET NULL,
    tipo_evento     VARCHAR(40) NOT NULL,
    status_anterior VARCHAR(30),
    status_novo     VARCHAR(30),
    mensagem        VARCHAR(500),
    created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ocorrencia_evento_ocorrencia ON obrigacao_ocorrencia_evento(ocorrencia_id);

-- ---------- Notificações por usuário ----------
ALTER TABLE notification
    ADD COLUMN IF NOT EXISTS usuario_id BIGINT REFERENCES usuario(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS ocorrencia_id BIGINT REFERENCES obrigacao_ocorrencia(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS tipo VARCHAR(40) NOT NULL DEFAULT 'OBRIGACAO_ALERTA',
    ADD COLUMN IF NOT EXISTS link VARCHAR(300),
    ADD COLUMN IF NOT EXISTS chave_dedup VARCHAR(200);

-- Torna cliente_obrigacao_id opcional (novas notificações podem usar ocorrencia)
ALTER TABLE notification ALTER COLUMN cliente_obrigacao_id DROP NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uk_notification_dedup
    ON notification (usuario_id, chave_dedup)
    WHERE chave_dedup IS NOT NULL AND usuario_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_notification_usuario_lida ON notification(usuario_id, lida);

-- ---------- Auditoria ----------
CREATE TABLE IF NOT EXISTS audit_log (
    id              BIGSERIAL PRIMARY KEY,
    usuario_id      BIGINT REFERENCES usuario(id) ON DELETE SET NULL,
    acao            VARCHAR(60) NOT NULL,
    entidade        VARCHAR(60) NOT NULL,
    entidade_id     VARCHAR(60),
    valor_anterior  TEXT,
    valor_novo      TEXT,
    ip              VARCHAR(60),
    created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_entidade ON audit_log(entidade, entidade_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_usuario ON audit_log(usuario_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON audit_log(created_at);

-- ---------- Tags de cliente (classificação operacional) ----------
CREATE TABLE IF NOT EXISTS tag (
    id     BIGSERIAL PRIMARY KEY,
    nome   VARCHAR(60) NOT NULL UNIQUE,
    cor    VARCHAR(20)
);

CREATE TABLE IF NOT EXISTS cliente_tag (
    cliente_id BIGINT NOT NULL REFERENCES cliente(id) ON DELETE CASCADE,
    tag_id     BIGINT NOT NULL REFERENCES tag(id) ON DELETE CASCADE,
    PRIMARY KEY (cliente_id, tag_id)
);

INSERT INTO tag (nome, cor) VALUES
 ('URGENTE', '#DC2626'),
 ('VIP', '#CA8A04'),
 ('INADIMPLENTE', '#EA580C'),
 ('NOVO_CLIENTE', '#2563EB'),
 ('MEI', '#7C3AED')
ON CONFLICT (nome) DO NOTHING;

-- ---------- Visibilidade de documentos (interno vs cliente) ----------
ALTER TABLE cliente_documento
    ADD COLUMN IF NOT EXISTS compartilhado_com_cliente BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS competencia VARCHAR(7),
    ADD COLUMN IF NOT EXISTS setor VARCHAR(40),
    ADD COLUMN IF NOT EXISTS origem VARCHAR(40) NOT NULL DEFAULT 'INTERNO';
