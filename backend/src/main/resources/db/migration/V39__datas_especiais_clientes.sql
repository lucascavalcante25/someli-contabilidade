-- Datas especiais (pedido da Patrícia): aniversário do dono, da empresa e dia da profissão.
-- Idempotente: pode rodar de novo sem duplicar.

CREATE TABLE IF NOT EXISTS profissao (
    id            BIGSERIAL PRIMARY KEY,
    nome          VARCHAR(80)  NOT NULL,
    dia           INTEGER      NOT NULL CHECK (dia BETWEEN 1 AND 31),
    mes           INTEGER      NOT NULL CHECK (mes BETWEEN 1 AND 12),
    -- Prefixos de CNAE (só números, separados por vírgula) para sugerir a profissão no cadastro
    cnae_prefixos VARCHAR(200),
    ativo         BOOLEAN      NOT NULL DEFAULT TRUE
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_profissao_nome ON profissao (LOWER(nome));

ALTER TABLE cliente ADD COLUMN IF NOT EXISTS data_nascimento_responsavel DATE;
ALTER TABLE cliente ADD COLUMN IF NOT EXISTS data_abertura DATE;
ALTER TABLE cliente ADD COLUMN IF NOT EXISTS profissao_id BIGINT;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_cliente_profissao') THEN
        ALTER TABLE cliente ADD CONSTRAINT fk_cliente_profissao
            FOREIGN KEY (profissao_id) REFERENCES profissao (id) ON DELETE SET NULL;
    END IF;
END $$;

-- Datas comemorativas mais conhecidas; o escritório pode corrigir ou incluir outras na tela.
INSERT INTO profissao (nome, dia, mes, cnae_prefixos)
SELECT v.nome, v.dia, v.mes, v.cnae
FROM (VALUES
    ('Dentista',              25, 10, '8630504'),
    ('Médico',                18, 10, '8630501,8630502,8630503,8610'),
    ('Nutricionista',         31,  8, '8650002'),
    ('Psicólogo',             27,  8, '8650003'),
    ('Fisioterapeuta',        13, 10, '8650004'),
    ('Fonoaudiólogo',          9, 12, '8650006'),
    ('Enfermeiro',            12,  5, '8650001'),
    ('Educador físico',        1,  9, '9313,8591'),
    ('Advogado',              11,  8, '6911'),
    ('Contador',              22,  9, '6920'),
    ('Arquiteto',             15, 12, '7111'),
    ('Engenheiro',            11, 12, '7112'),
    ('Médico veterinário',     9,  9, '75'),
    ('Farmacêutico',          20,  1, '4771'),
    ('Corretor de imóveis',   27,  8, '6821,6822'),
    ('Professor',             15, 10, '85'),
    ('Comerciante',           16,  7, '45,46,47')
) AS v (nome, dia, mes, cnae)
WHERE NOT EXISTS (SELECT 1 FROM profissao p WHERE LOWER(p.nome) = LOWER(v.nome));
