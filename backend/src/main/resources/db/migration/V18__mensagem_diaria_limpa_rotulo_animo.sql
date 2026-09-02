-- Remove o rótulo genérico; ânimo fica só com o texto (sem "autor" fictício).
UPDATE mensagem_diaria
SET referencia = NULL
WHERE tipo = 'animo'
  AND referencia ILIKE 'Mensagem de %nimo%';
