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

## Fluxo definido em 01/11/2026

A nota do honorário só é emitida depois do pagamento.

1. Someli cria a cobrança no Asaas (boleto com Pix) no vencimento do cliente.
2. Someli envia ao cliente o e-mail com texto próprio e o boleto.
3. O cliente paga. O Asaas chama `POST /webhooks/asaas` com `PAYMENT_RECEIVED`.
4. Someli valida `asaas-access-token`, ignora evento repetido e marca o mês como pago. A tag `INADIMPLENTE` sai sozinha.
5. Someli agenda a NFS-e em `POST /v3/invoices`, vinculada à cobrança (`payment`).
6. O Asaas responde por webhook: `INVOICE_AUTHORIZED` ou `INVOICE_ERROR`.
7. Autorizada: Someli envia a nota ao cliente por e-mail. Erro: alerta para a equipe, sem reenvio automático.

O dinheiro entra no saldo do Asaas. A transferência para o Nubank PJ é feita depois, por Pix. Não é preciso API do Nubank: quem confirma o pagamento é o Asaas.

## Pré-requisitos

- Conta Asaas com o CNPJ do escritório e chave de API do sandbox.
- Dados fiscais na conta: `POST /v3/fiscalInfo`, inscrição municipal e serviço municipal.
- Confirmar suporte da prefeitura do escritório. Esse ponto decide se a nota automática funciona.
- E-mail do escritório para o envio (SMTP) em variáveis de ambiente.

## Próximos passos (ordem sugerida)

1. Conta Asaas sandbox + `ASAAS_API_KEY` / `ASAAS_WEBHOOK_TOKEN` em env (nunca no Git).
2. Endpoint autenticado `POST /cobrancas/honorario` criando customer+charge no Asaas a partir do cliente.
3. Validar `asaas-access-token` no webhook; mapear `PAYMENT_RECEIVED` → marcar mês pago.
4. Agendar a NFS-e e tratar `INVOICE_AUTHORIZED` / `INVOICE_ERROR`.
5. Enviar boleto e nota por SMTP.
6. Não misturar com Integra Contador / XML / obrigações fiscais.

## Princípio

Orquestrador interno ≠ emissor fiscal. Cobrança de honorário é Trilha B separada do Fortes/Domínio.

A nota automática é só a do honorário do próprio escritório, emitida pelo Asaas. A Someli continua sem emitir notas dos clientes.
