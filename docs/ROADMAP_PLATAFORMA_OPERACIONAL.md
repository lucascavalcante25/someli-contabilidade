# Roadmap — Plataforma Operacional SOMELI

Documento vivo. Integrações: [INTEGRACOES_GRATUITAS.md](./INTEGRACOES_GRATUITAS.md). Serpro: [INTEGRA_CONTADOR.md](./INTEGRA_CONTADOR.md).

## Feito nesta evolução (ciclo obrigações + tags)

| Entrega | Status |
|---------|--------|
| Templates de obrigações por regime (MEI / Simples / Presumido) + aplicar em massa | ✅ |
| Checklist mínimo na ocorrência (docs → apurado → transmitido → guia) | ✅ API + UI |
| Documentos por cliente + competência (+ categoria) | ✅ |
| Import XML NFe/NFSe (parse básico, vínculo, lote) | ✅ |
| Integra Contador Serpro | ✅ Stub + doc (não finge API free) |
| Tags inteligentes NOVO_CLIENTE / INADIMPLENTE | ✅ Sync + scheduler + UI |
| Regime tributário no cliente | ✅ Campo + templates |

## Feito — ciclo Emitte-inspired (orquestrador, sem NF / sem Fortes)

| Entrega | Status |
|---------|--------|
| Certificado digital (vencimento, A1/A3, obs.) — Flyway V27 + API + UI + filtro/badge | ✅ |
| Alertas de certificado no Meu Trabalho / Dashboard (30 dias) | ✅ |
| Central de alertas operacionais (`/alertas-operacionais`) | ✅ |
| Ficha 360° no `ClienteDetalhe` (honorário/régua, obrigações, ocorrências, docs, tags, cert.) | ✅ |
| Radar fiscal leve por competência (XML já importado; upload continua atrás de flag) | ✅ |
| Spike Asaas: [ASAAS_COBRANCA.md](./ASAAS_COBRANCA.md) + webhook stub + régua UX local | ✅ parcial |

## Automação e integrações (gratuitas primeiro)

**Já no produto:** BrasilAPI, ReceitaWS, Sintegra, obrigações/ocorrências, massa, tags (agora com regras auto), templates, XML import, certificado, central de alertas, radar XML.

**Adiado:** importador OFX/CSV Nubank / Open Finance pago; WhatsApp Business; Asaas/Iugu live (Trilha B — ver ASAAS_COBRANCA.md).

## Alta prioridade (próximos ciclos)

1. Importador **OFX/CSV** (após XML).
2. Substituição temporária de responsável / férias (`substituto_de_id` já preparado).
3. Filtros avançados + paginação.
4. Solicitações ao cliente + `compartilhado_com_cliente` na UI do portal.
5. Alertas e-mail (mailto/SMTP) antes de WhatsApp pago.
6. Cliente HTTP real Integra Contador **somente** após contrato Serpro.
7. Asaas live (customer + charge + baixa via webhook validado).

## Média prioridade

- Relatórios gerenciais exportáveis.
- Capacidade/produtividade por funcionário.
- Enriquecer régua de cobrança (histórico de lembretes) sem gateway.

## Futura — Portal do Cliente

- Tipo `CLIENTE` (já bloqueado em AuthorizationService).
- Central de documentos por competência/setor.
- Guias, certidões (sem senha de certificado).
- Mensagens contextualizadas.

## Princípios

- Backend é autoridade de autorização.
- Interno ≠ compartilhável com cliente.
- Não duplicar módulos; reutilizar componentes.
- Não maquiar custo de APIs oficiais (RFB/Serpro).
