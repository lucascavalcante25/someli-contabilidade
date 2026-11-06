-- Ocorrências mensais concluídas na competência errada (mês do vencimento, ex.: 11/2026) passam o que foi feito
-- (status, caixinhas, quem/quando concluiu, histórico) para a certa da competência anterior (10/2026),
-- quando a certa ainda está PENDENTE e intacta. Depois apaga a errada. Tudo numa transação.

BEGIN;

CREATE TEMP TABLE par ON COMMIT DROP AS
SELECT errada.id AS errada_id, certa.id AS certa_id
FROM obrigacao_ocorrencia errada
JOIN cliente_obrigacao co ON co.id = errada.cliente_obrigacao_id
JOIN obrigacao_ocorrencia certa
  ON certa.cliente_obrigacao_id = errada.cliente_obrigacao_id
 AND certa.competencia = to_char(errada.data_vencimento - interval '1 month', 'YYYY-MM')
WHERE co.periodicidade = 'MENSAL'
  AND errada.competencia = to_char(errada.data_vencimento, 'YYYY-MM')
  AND certa.status = 'PENDENTE'
  AND NOT (coalesce(certa.docs_ok, FALSE) OR coalesce(certa.apurado, FALSE)
           OR coalesce(certa.transmitido, FALSE) OR coalesce(certa.guia_enviada, FALSE));

\echo '== Transferências =='
SELECT coalesce(c.nome_fantasia, c.razao_social) AS cliente, o.nome AS obrigacao,
       e.competencia || ' → ' || k.competencia AS competencia, e.status
FROM par p
JOIN obrigacao_ocorrencia e ON e.id = p.errada_id
JOIN obrigacao_ocorrencia k ON k.id = p.certa_id
JOIN cliente_obrigacao co ON co.id = e.cliente_obrigacao_id
JOIN cliente c ON c.id = co.cliente_id
JOIN obrigacao o ON o.id = co.obrigacao_id
ORDER BY 1, 2;

UPDATE obrigacao_ocorrencia certa
SET status = e.status, concluida_em = e.concluida_em, concluida_por_id = e.concluida_por_id,
    docs_ok = e.docs_ok, apurado = e.apurado, transmitido = e.transmitido, guia_enviada = e.guia_enviada,
    observacao = coalesce(certa.observacao, e.observacao), updated_at = now()
FROM par p JOIN obrigacao_ocorrencia e ON e.id = p.errada_id
WHERE certa.id = p.certa_id;

-- Histórico vai junto (o evento de criação da errada fica de fora)
UPDATE obrigacao_ocorrencia_evento ev SET ocorrencia_id = p.certa_id
FROM par p WHERE ev.ocorrencia_id = p.errada_id AND ev.tipo_evento <> 'CRIADA';

DELETE FROM obrigacao_ocorrencia oc USING par p WHERE oc.id = p.errada_id;

SELECT count(*) AS transferidas FROM par;

COMMIT;
