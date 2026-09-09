# Roadmap — Plataforma Operacional SOMELI

Documento de preparação arquitetural. Não implementa funcionalidades futuras.

## Automação e integrações (gratuitas primeiro)
Ver [INTEGRACOES_GRATUITAS.md](./INTEGRACOES_GRATUITAS.md).

**Feito nesta evolução:** BrasilAPI (CEP + feriados + ajuste dia útil), UI de ocorrências (Dashboard / ficha do cliente), aplicação em massa de obrigações, **tags operacionais** (UI + filtro + massa por tag).

**Adiado:** importador OFX/CSV Nubank / Open Finance pago.

## Alta prioridade (próximos ciclos)
1. **Importador XML NFe/NFSe** (gratuito, alto valor fiscal) — em seguida OFX/CSV.
2. **Substituição temporária de responsável / férias** — modelagem `cliente_responsavel.substituto_de_id` já preparada.
3. **Filtros avançados** em listas (competência, setor, responsável) com paginação no backend.
4. **Solicitações ao cliente** + flag `compartilhado_com_cliente` em documentos.
5. **Alertas e-mail / WhatsApp** (produtividade) após canal definido.

## Média prioridade
- Tags operacionais na UI (tabelas `tag` / `cliente_tag` criadas).
- Checklists / templates de processo (fechamento fiscal mensal).
- Visão 360° do cliente com abas reutilizando componentes atuais.
- Relatórios gerenciais exportáveis.
- Capacidade/produtividade por funcionário.

## Futura — Portal do Cliente
- Tipo `CLIENTE` / `tipo_usuario=CLIENTE` sem herdar permissões internas (já bloqueado em `AuthorizationService`).
- Central de documentos por competência/setor.
- Guias, certidões, procurações (sem armazenar senha de certificado).
- Mensagens contextualizadas (empresa + obrigação + solicitação).
- Financeiro do cliente com permissões próprias.

## Princípios
- Backend é autoridade de autorização.
- Interno ≠ compartilhável com cliente.
- Não duplicar módulos; reutilizar componentes.
