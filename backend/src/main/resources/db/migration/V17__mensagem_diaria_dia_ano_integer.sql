ALTER TABLE mensagem_diaria
    ALTER COLUMN dia_ano TYPE INTEGER USING dia_ano::integer;
