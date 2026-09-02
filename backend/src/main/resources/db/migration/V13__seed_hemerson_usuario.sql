-- Funcionário responsável pelos clientes (H na planilha = Hemerson)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

INSERT INTO usuario (nome, cpf, email, telefone, senha, perfil, ativo, data_criacao)
VALUES (
    'Hemerson',
    '22222222222',
    'hemerson@someli.com',
    '(81) 99999-0001',
    crypt('Someli@2026', gen_salt('bf')),
    'CONTADOR',
    true,
    NOW()
)
ON CONFLICT (cpf) DO UPDATE SET
    nome = EXCLUDED.nome,
    email = EXCLUDED.email,
    telefone = EXCLUDED.telefone,
    perfil = EXCLUDED.perfil,
    ativo = EXCLUDED.ativo;
