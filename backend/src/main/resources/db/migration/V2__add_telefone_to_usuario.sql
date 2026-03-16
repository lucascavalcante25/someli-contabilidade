ALTER TABLE usuario
    ADD COLUMN IF NOT EXISTS telefone VARCHAR(20);

UPDATE usuario
SET telefone = '(00) 00000-0000'
WHERE telefone IS NULL OR telefone = '';

ALTER TABLE usuario
    ALTER COLUMN telefone SET NOT NULL;
