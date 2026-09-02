-- Repara histórico Flyway quando V21 foi aplicada antes de V18–V20.
UPDATE flyway_schema_history SET installed_rank = 21 WHERE version = '21';

INSERT INTO flyway_schema_history (installed_rank, version, description, type, script, checksum, installed_by, installed_on, execution_time, success)
VALUES
  (18, '18', 'mensagem diaria limpa rotulo animo', 'SQL', 'V18__mensagem_diaria_limpa_rotulo_animo.sql', 264064976, 'manual-repair', NOW(), 1, true),
  (19, '19', 'mensagem diaria conhecidas', 'SQL', 'V19__mensagem_diaria_conhecidas.sql', 137512912, 'manual-repair', NOW(), 1, true),
  (20, '20', 'mensagem diaria referencia obrigatoria', 'SQL', 'V20__mensagem_diaria_referencia_obrigatoria.sql', -858174691, 'manual-repair', NOW(), 1, true);
