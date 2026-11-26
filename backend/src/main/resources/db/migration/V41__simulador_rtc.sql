-- Simulador CBS/IBS/IS com as calculadoras oficiais da Receita (licença MIT).
-- Cenários salvos por cliente: a operação enviada e a resposta da calculadora, como vieram, com a versão.
-- Idempotente: pode rodar de novo sem efeito. Só tipos que batem com a entidade (validate de produção).

CREATE TABLE IF NOT EXISTS simulacao_rtc_cenario (
    id                     BIGSERIAL PRIMARY KEY,
    cliente_id             BIGINT        NOT NULL REFERENCES cliente (id) ON DELETE CASCADE,
    nome                   VARCHAR(120)  NOT NULL,
    regime                 VARCHAR(30)   NOT NULL,
    observacao             VARCHAR(1000),
    entrada                TEXT          NOT NULL,
    resultado              TEXT          NOT NULL,
    versao_calculadora     VARCHAR(40),
    versao_base            VARCHAR(40),
    aviso_dados_simulados  VARCHAR(200),
    ativo                  BOOLEAN       NOT NULL DEFAULT TRUE,
    criado_em              TIMESTAMP     NOT NULL DEFAULT NOW(),
    criado_por_id          BIGINT REFERENCES usuario (id) ON DELETE SET NULL,
    atualizado_em          TIMESTAMP     NOT NULL DEFAULT NOW(),
    CONSTRAINT simulacao_rtc_cenario_regime CHECK (regime IN ('REGIME_REGULAR', 'SIMPLES_NACIONAL'))
);

CREATE INDEX IF NOT EXISTS idx_simulacao_rtc_cenario_cliente
    ON simulacao_rtc_cenario (cliente_id)
    WHERE ativo = TRUE;

INSERT INTO permissao (codigo, modulo, descricao, sensivel) VALUES
 ('SIMULADOR_RTC_USAR', 'CONSULTAS', 'Simular CBS/IBS com a calculadora da Receita e salvar cenários dos clientes', FALSE)
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO perfil_permissao (perfil, permissao_id)
SELECT perfil, p.id
FROM permissao p
CROSS JOIN (VALUES ('ADMIN'), ('SOCIO'), ('GERENTE'), ('CONTADOR'),
                   ('SUPERVISOR_FISCAL'), ('FISCAL'), ('CONTABIL')) AS perfis(perfil)
WHERE p.codigo = 'SIMULADOR_RTC_USAR'
ON CONFLICT DO NOTHING;
