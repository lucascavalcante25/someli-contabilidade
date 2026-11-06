-- Ajusta vencimentos JÁ SALVOS que caem em sábado, domingo ou feriado nacional (de hoje em diante).
-- Mesma regra do sistema (DiaUtilService): Departamento Pessoal antecipa para o dia útil anterior;
-- as demais áreas prorrogam para o próximo dia útil.
-- Só mexe em vínculos ativos e em ocorrências ainda abertas (não concluídas, entregues ou não aplicáveis).
-- Tudo numa transação: se algo der errado, nada é gravado. Pode rodar de novo sem efeito.

BEGIN;

CREATE TEMP TABLE feriado (d date PRIMARY KEY, nome text) ON COMMIT DROP;
INSERT INTO feriado VALUES
 ('2026-01-01', 'Confraternização mundial'), ('2026-04-03', 'Sexta-feira Santa'), ('2026-04-21', 'Tiradentes'),
 ('2026-05-01', 'Dia do trabalho'), ('2026-09-07', 'Independência do Brasil'), ('2026-10-12', 'Nossa Senhora Aparecida'),
 ('2026-11-02', 'Finados'), ('2026-11-15', 'Proclamação da República'), ('2026-11-20', 'Dia da Consciência Negra'),
 ('2026-12-25', 'Natal'),
 ('2027-01-01', 'Confraternização mundial'), ('2027-03-26', 'Sexta-feira Santa'), ('2027-04-21', 'Tiradentes'),
 ('2027-05-01', 'Dia do trabalho'), ('2027-09-07', 'Independência do Brasil'), ('2027-10-12', 'Nossa Senhora Aparecida'),
 ('2027-11-02', 'Finados'), ('2027-11-15', 'Proclamação da República'), ('2027-11-20', 'Dia da Consciência Negra'),
 ('2027-12-25', 'Natal'),
 ('2028-01-01', 'Confraternização mundial');

-- Dia útil mais próximo na direção da regra do setor
CREATE TEMP TABLE ajuste_vinculo ON COMMIT DROP AS
SELECT co.id, co.cliente_id, co.obrigacao_id, co.setor, co.data_vencimento AS antes,
       CASE WHEN co.setor = 'DEPARTAMENTO_PESSOAL' THEN
         (SELECT max(x::date) FROM generate_series(co.data_vencimento - 15, co.data_vencimento, interval '1 day') x
           WHERE extract(isodow FROM x) < 6 AND NOT EXISTS (SELECT 1 FROM feriado f WHERE f.d = x::date))
       ELSE
         (SELECT min(x::date) FROM generate_series(co.data_vencimento, co.data_vencimento + 15, interval '1 day') x
           WHERE extract(isodow FROM x) < 6 AND NOT EXISTS (SELECT 1 FROM feriado f WHERE f.d = x::date))
       END AS depois
FROM cliente_obrigacao co
WHERE co.ativo AND co.data_vencimento >= current_date;
DELETE FROM ajuste_vinculo WHERE antes = depois;

CREATE TEMP TABLE ajuste_ocorrencia ON COMMIT DROP AS
SELECT oc.id, co.cliente_id, co.obrigacao_id, co.setor, oc.data_vencimento AS antes,
       CASE WHEN co.setor = 'DEPARTAMENTO_PESSOAL' THEN
         (SELECT max(x::date) FROM generate_series(oc.data_vencimento - 15, oc.data_vencimento, interval '1 day') x
           WHERE extract(isodow FROM x) < 6 AND NOT EXISTS (SELECT 1 FROM feriado f WHERE f.d = x::date))
       ELSE
         (SELECT min(x::date) FROM generate_series(oc.data_vencimento, oc.data_vencimento + 15, interval '1 day') x
           WHERE extract(isodow FROM x) < 6 AND NOT EXISTS (SELECT 1 FROM feriado f WHERE f.d = x::date))
       END AS depois
FROM obrigacao_ocorrencia oc
JOIN cliente_obrigacao co ON co.id = oc.cliente_obrigacao_id
WHERE oc.data_vencimento >= current_date
  AND oc.status NOT IN ('CONCLUIDA', 'ENTREGUE', 'NAO_APLICAVEL');
DELETE FROM ajuste_ocorrencia WHERE antes = depois;

\echo '== O que vai mudar (vínculo = cadastro da obrigação no cliente; ocorrência = o mês da fila de trabalho) =='
SELECT 'vínculo' AS onde, coalesce(c.nome_fantasia, c.razao_social) AS cliente, o.nome AS obrigacao, a.setor,
       to_char(a.antes, 'DD/MM/YYYY') AS antes, to_char(a.depois, 'DD/MM/YYYY') AS depois,
       coalesce(f.nome, to_char(a.antes, 'TMDay')) AS motivo
FROM ajuste_vinculo a JOIN cliente c ON c.id = a.cliente_id JOIN obrigacao o ON o.id = a.obrigacao_id
LEFT JOIN feriado f ON f.d = a.antes
UNION ALL
SELECT 'ocorrência', coalesce(c.nome_fantasia, c.razao_social), o.nome, a.setor,
       to_char(a.antes, 'DD/MM/YYYY'), to_char(a.depois, 'DD/MM/YYYY'), coalesce(f.nome, to_char(a.antes, 'TMDay'))
FROM ajuste_ocorrencia a JOIN cliente c ON c.id = a.cliente_id JOIN obrigacao o ON o.id = a.obrigacao_id
LEFT JOIN feriado f ON f.d = a.antes
ORDER BY 2, 3, 1;

UPDATE cliente_obrigacao co SET data_vencimento = a.depois FROM ajuste_vinculo a WHERE co.id = a.id;
UPDATE obrigacao_ocorrencia oc SET data_vencimento = a.depois, updated_at = now() FROM ajuste_ocorrencia a WHERE oc.id = a.id;

SELECT (SELECT count(*) FROM ajuste_vinculo) AS vinculos_ajustados,
       (SELECT count(*) FROM ajuste_ocorrencia) AS ocorrencias_ajustadas;

COMMIT;
