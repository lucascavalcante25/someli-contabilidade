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

## Automação e integrações (gratuitas primeiro)

**Já no produto:** BrasilAPI, ReceitaWS, Sintegra, obrigações/ocorrências, massa, tags (agora com regras auto), templates, XML import.

**Adiado:** importador OFX/CSV Nubank / Open Finance pago; WhatsApp Business; Asaas/Iugu (Trilha B).

## Alta prioridade (próximos ciclos)

1. Importador **OFX/CSV** (após XML).
2. Substituição temporária de responsável / férias (`substituto_de_id` já preparado).
3. Filtros avançados + paginação.
4. Solicitações ao cliente + `compartilhado_com_cliente` na UI do portal.
5. Alertas e-mail (mailto/SMTP) antes de WhatsApp pago.
6. Cliente HTTP real Integra Contador **somente** após contrato Serpro.

## Média prioridade

- Visão 360° do cliente.
- Relatórios gerenciais exportáveis.
- Capacidade/produtividade por funcionário.
- Cobrança honorário Asaas/Iugu (Trilha B — não misturar com fiscal).

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
