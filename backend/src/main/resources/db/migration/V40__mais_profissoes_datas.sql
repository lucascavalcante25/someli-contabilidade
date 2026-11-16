-- Mais datas comemorativas de profissões para o calendário do Dashboard (aparecem mesmo sem cliente vinculado).
-- Idempotente: não duplica nem altera profissão que o escritório já cadastrou ou corrigiu.
INSERT INTO profissao (nome, dia, mes, cnae_prefixos)
SELECT v.nome, v.dia, v.mes, NULLIF(v.cnae, '')
FROM (VALUES
    ('Fotógrafo',               8,  1, '7420'),
    ('Carteiro',               25,  1, ''),
    ('Publicitário',            1,  2, '7311,7319'),
    ('Bibliotecário',          12,  3, ''),
    ('Jornalista',              7,  4, '6391'),
    ('Zootecnista',            13,  5, ''),
    ('Geógrafo',               29,  5, ''),
    ('Químico',                18,  6, ''),
    ('Bombeiro',                2,  7, ''),
    ('Motorista',              25,  7, '4921,4922,4923,4924,4929,4930'),
    ('Agricultor',             28,  7, '011,012,013'),
    ('Economista',             13,  8, ''),
    ('Ator',                   19,  8, '9001901'),
    ('Historiador',            19,  8, ''),
    ('Bancário',               28,  8, '64'),
    ('Biólogo',                 3,  9, ''),
    ('Administrador',           9,  9, '7020'),
    ('Secretário',             30,  9, '8211'),
    ('Tradutor',               30,  9, '7490101'),
    ('Vendedor',                1, 10, ''),
    ('Empreendedor',            5, 10, ''),
    ('Corretor de seguros',    12, 10, '6622'),
    ('Engenheiro agrônomo',    12, 10, '0161'),
    ('Terapeuta ocupacional',  13, 10, '8650005'),
    ('Comerciário',            30, 10, ''),
    ('Designer',                5, 11, '7410'),
    ('Biomédico',              20, 11, '8640202'),
    ('Músico',                 22, 11, '9001902'),
    ('Mecânico',               20, 12, '4520')
) AS v (nome, dia, mes, cnae)
WHERE NOT EXISTS (SELECT 1 FROM profissao p WHERE LOWER(p.nome) = LOWER(v.nome));
