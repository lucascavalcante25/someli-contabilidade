-- Remove ocorrências criadas por engano pela rotina diária antiga (garantirOcorrenciasAbertas), corrigida no código:
--  A) mensais com competência = mês do vencimento (ex.: vence 16/11, comp. 11/2026) quando já existe a certa
--     da competência anterior (vence em novembro, comp. 10/2026);
--  B) trimestrais/semestrais/anuais criadas de novo todo mês (não é a primeira ocorrência do vínculo e a
--     competência é o mês em que foi criada).
-- Só apaga ocorrência intacta: PENDENTE, sem caixinhas marcadas e sem eventos além da criação.
-- Tudo numa transação; pode rodar de novo sem efeito.

BEGIN;

CREATE TEMP TABLE apagar ON COMMIT DROP AS
SELECT oc.id, co.cliente_id, co.obrigacao_id, co.periodicidade, oc.competencia, oc.data_vencimento, 'A' AS regra
FROM obrigacao_ocorrencia oc
JOIN cliente_obrigacao co ON co.id = oc.cliente_obrigacao_id
WHERE co.periodicidade = 'MENSAL'
  AND oc.competencia = to_char(oc.data_vencimento, 'YYYY-MM')
  AND EXISTS (SELECT 1 FROM obrigacao_ocorrencia certa
              WHERE certa.cliente_obrigacao_id = oc.cliente_obrigacao_id
                AND certa.id <> oc.id
                AND certa.competencia = to_char(oc.data_vencimento - interval '1 month', 'YYYY-MM'))
UNION ALL
SELECT oc.id, co.cliente_id, co.obrigacao_id, co.periodicidade, oc.competencia, oc.data_vencimento, 'B'
FROM obrigacao_ocorrencia oc
JOIN cliente_obrigacao co ON co.id = oc.cliente_obrigacao_id
WHERE co.periodicidade IN ('TRIMESTRAL', 'SEMESTRAL', 'ANUAL')
  AND oc.competencia = to_char(oc.created_at, 'YYYY-MM')
  AND oc.id <> (SELECT min(p.id) FROM obrigacao_ocorrencia p WHERE p.cliente_obrigacao_id = oc.cliente_obrigacao_id);

-- Mantém qualquer uma que alguém já tenha mexido
DELETE FROM apagar a
USING obrigacao_ocorrencia oc
WHERE oc.id = a.id
  AND (oc.status <> 'PENDENTE'
       OR coalesce(oc.docs_ok, FALSE) OR coalesce(oc.apurado, FALSE)
       OR coalesce(oc.transmitido, FALSE) OR coalesce(oc.guia_enviada, FALSE)
       OR EXISTS (SELECT 1 FROM obrigacao_ocorrencia_evento e WHERE e.ocorrencia_id = oc.id AND e.tipo_evento <> 'CRIADA'));

\echo '== Ocorrências que serão apagadas =='
SELECT coalesce(c.nome_fantasia, c.razao_social) AS cliente, o.nome AS obrigacao, a.periodicidade,
       a.competencia, to_char(a.data_vencimento, 'DD/MM/YYYY') AS vencimento, a.regra
FROM apagar a JOIN cliente c ON c.id = a.cliente_id JOIN obrigacao o ON o.id = a.obrigacao_id
ORDER BY 1, 2;

DELETE FROM obrigacao_ocorrencia oc USING apagar a WHERE oc.id = a.id;

SELECT count(*) AS ocorrencias_apagadas FROM apagar;

COMMIT;
