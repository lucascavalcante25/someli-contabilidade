-- ============================================================
-- V30: Conta em que o honorário é recebido (planilha, coluna "S").
-- S = Someli, P = Patrícia. Nulo enquanto não for informado.
-- Os dados vêm no SQL de sincronização com a planilha; aqui só a estrutura.
-- ============================================================

ALTER TABLE cliente
    ADD COLUMN IF NOT EXISTS conta_recebimento VARCHAR(20);

ALTER TABLE cliente
    DROP CONSTRAINT IF EXISTS ck_cliente_conta_recebimento;

ALTER TABLE cliente
    ADD CONSTRAINT ck_cliente_conta_recebimento
        CHECK (conta_recebimento IS NULL OR conta_recebimento IN ('SOMELI', 'PATRICIA'));
