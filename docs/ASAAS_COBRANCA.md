# Cobrança de honorários — Asaas (Trilha B)

Spike mínimo. **Não há gateway live** na Someli. Este documento e o stub `/webhooks/asaas` preparam o próximo passo sem fingir emissão de boleto/Pix.

## Escopo desejado

- Cobrar **honorário do escritório** (não fiscal, não DAS).
- Régua operacional na UI: em dia → lembrete → atraso → cobrança (status local).
- Gateway (Asaas/Iugu) só quando houver conta + token + webhook assinados.

## Já no código

| Item | Status |
|------|--------|
| Status de adimplência por cliente (`em_dia` / `pendente` / `atrasado`) | ✅ |
| Tag `INADIMPLENTE` automática | ✅ |
| UX de régua (rótulos por status) no detalhe do cliente | ✅ leve |
| `POST /webhooks/asaas` (stub: log + 200) | ✅ |
| Criação de cobrança Asaas API | ❌ próximo ciclo |
| Baixa automática de `pagamento_mensal` via webhook | ❌ próximo ciclo |

## Próximos passos (ordem sugerida)

1. Conta Asaas sandbox + `ASAAS_API_KEY` / `ASAAS_WEBHOOK_TOKEN` em env (nunca no Git).
2. Endpoint autenticado `POST /cobrancas/honorario` criando customer+charge no Asaas a partir do cliente.
3. Validar `asaas-access-token` no webhook; mapear `PAYMENT_RECEIVED` → marcar mês pago.
4. Não misturar com Integra Contador / XML / obrigações fiscais.

## Princípio

Orquestrador interno ≠ emissor fiscal. Cobrança de honorário é Trilha B separada do Fortes/Domínio.
