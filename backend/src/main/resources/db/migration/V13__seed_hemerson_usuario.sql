-- Funcionário responsável pelos clientes (H na planilha = Hemerson)
-- Senha inicial igual ao admin (adm@Someli) — altere depois no sistema.
INSERT INTO usuario (nome, cpf, email, telefone, senha, perfil, ativo, data_criacao)
SELECT
    'Hemerson',
    '22222222222',
    'hemerson@someli.com',
    '(81) 99999-0001',
    u.senha,
    'CONTADOR',
    true,
    NOW()
FROM usuario u
WHERE u.cpf = '11111111111'
  AND NOT EXISTS (SELECT 1 FROM usuario WHERE cpf = '22222222222');

UPDATE usuario
SET nome = 'Hemerson',
    email = 'hemerson@someli.com',
    telefone = '(81) 99999-0001',
    perfil = 'CONTADOR',
    ativo = true
WHERE cpf = '22222222222';
