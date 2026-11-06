-- Tipos oficiais de XLSX/DOCX passam de 50 caracteres (ex.: application/vnd.openxmlformats-...).
ALTER TABLE cliente_documento ALTER COLUMN tipo_arquivo TYPE VARCHAR(120);
