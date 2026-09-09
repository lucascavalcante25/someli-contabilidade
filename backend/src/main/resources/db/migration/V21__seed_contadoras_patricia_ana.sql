-- Contadoras ADMIN — insert UMA vez (não sobrescreve se já existir).
-- Senha BCrypt: Melissa11+
-- pgcrypto em public (instalação local) ou extensions (Supabase)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

INSERT INTO usuario (nome, cpf, email, telefone, senha, perfil, ativo, data_criacao)
SELECT
    'Patricia da Silva Lopes',
    '33333333333',
    'patricia.lopes@someli.com',
    '(81) 90000-0001',
    crypt('Melissa11+', gen_salt('bf')),
    'ADMIN',
    true,
    NOW()
WHERE NOT EXISTS (SELECT 1 FROM usuario WHERE cpf = '33333333333');

INSERT INTO usuario (nome, cpf, email, telefone, senha, perfil, ativo, data_criacao)
SELECT
    'Ana Karoline Pereira da Silva',
    '44444444444',
    'ana.karoline@someli.com',
    '(81) 90000-0002',
    crypt('Melissa11+', gen_salt('bf')),
    'ADMIN',
    true,
    NOW()
WHERE NOT EXISTS (SELECT 1 FROM usuario WHERE cpf = '44444444444');
