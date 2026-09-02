-- Toda mensagem diária deve ter autor (citação) ou referência bíblica (versículo).
ALTER TABLE mensagem_diaria
  ALTER COLUMN referencia SET NOT NULL;

COMMENT ON COLUMN mensagem_diaria.referencia IS
  'Autor da citação ou referência bíblica do versículo (sempre preenchido).';
