-- Garante que o usuário ADMIN exista com senha adm@Someli
-- Usa pgcrypto para gerar hash BCrypt compatível com Spring Security
CREATE EXTENSION IF NOT EXISTS pgcrypto;

INSERT INTO usuario (nome, cpf, email, telefone, senha, perfil, ativo, data_criacao)
VALUES (
    'Administrador',
    '11111111111',
    'admin@someli.com',
    '(11) 99999-0000',
    crypt('adm@Someli', gen_salt('bf')),
    'ADMIN',
    true,
    NOW()
)
ON CONFLICT (cpf) DO UPDATE SET
    senha = crypt('adm@Someli', gen_salt('bf')),
    nome = EXCLUDED.nome,
    email = EXCLUDED.email,
    perfil = EXCLUDED.perfil,
    ativo = EXCLUDED.ativo;
