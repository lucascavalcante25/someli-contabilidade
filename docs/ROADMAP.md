# Roadmap SOMELI Contabilidade

Plano de evolução do sistema interno da **SOMELI Assessoria Contábil**, organizado por etapas com base no que escritórios brasileiros usam hoje (Domínio, Alterdata, Fortes, Onvio, Calima, Contmatic) e no que faz sentido construir **internamente** versus integrar com sistemas especializados.

---

## O que o sistema já faz (base atual)

| Área | Status |
|------|--------|
| Autenticação por CPF/senha | ✅ |
| Gestão de clientes (razão social, CNPJ, honorário, responsável, ativo/inativo) | ✅ |
| Controle financeiro (receitas, despesas, resumo, gráficos) | ✅ |
| Pagamentos e status de adimplência | ✅ |
| Obrigações fiscais por cliente (vencimentos, alertas no dashboard) | ✅ |
| Usuários e perfis | ✅ |
| PWA mobile (ícone, manifest, responsivo) | ✅ |
| API própria + Postgres na VPS | ✅ |

---

## Benchmark — o que os grandes sistemas oferecem

### Domínio (Thomson Reuters)
- Contabilidade, fiscal, folha, eSocial, SPED integrados
- Central de cobrança de honorários, fluxo de caixa, contratos
- Dashboard de rentabilidade por cliente
- Auditoria e consolidação de grupos econômicos
- **Complexidade para replicar:** 🔴 Muito alta (anos de desenvolvimento + legislação)

### Alterdata
- Plano de contas, balancete, DRE, conciliação bancária automática
- Importação de extratos (OFX/PDF com IA)
- Integração nativa fiscal + DP + financeiro
- Assistente IA para dúvidas de SPED
- **Complexidade:** 🔴 Muito alta no fiscal; 🟡 Média em financeiro básico

### Fortes (Total Contador)
- Lançamentos contábeis, SPED ECD/ECF, centros de custo
- Gestão de equipes e tempo por cliente
- CRM / relacionamento com cliente
- **Complexidade:** 🔴 Alta no contábil formal; 🟢 Baixa em CRM interno

### Onvio / Sage (nuvem)
- Portal do cliente, compartilhamento de documentos
- Workflow de tarefas e prazos
- Assinatura digital de documentos
- **Complexidade:** 🟡 Média (bom candidato a construir por etapas)

### Calima / Contmatic (PME)
- Foco em escritórios menores, interface simples
- Honorários, cobrança, agenda de obrigações
- **Complexidade:** 🟢 Baixa a média — **alinhado ao perfil SOMELI**

---

## Princípio estratégico

> **Construir o que diferencia o escritório na gestão interna. Integrar (ou não competir) com o que exige conformidade fiscal/contábil formal.**

A SOMELI não precisa substituir Domínio/Alterdata no SPED e na escrituração. O sistema interno deve ser o **cérebro operacional**: clientes, honorários, cobrança, prazos, documentos, equipe e indicadores.

---

## Fase 1 — Consolidação operacional (1–2 meses)

**Objetivo:** Estabilizar o que já existe e fechar gaps do dia a dia do escritório.

| # | Entrega | Complexidade | Prioridade |
|---|---------|--------------|------------|
| 1.1 | Corrigir PWA (ícone, manifest, reload em rotas) | 🟢 Baixa | ✅ Feito |
| 1.2 | Dashboard com clientes **ativos** vs inativos separados | 🟢 Baixa | Alta |
| 1.3 | Filtros na listagem: responsável, status pagamento, ativo | 🟢 Baixa | Alta |
| 1.4 | Exportar relatórios (Excel/PDF): receitas, despesas, inadimplentes | 🟡 Média | Alta |
| 1.5 | Histórico de alterações em clientes (auditoria simples) | 🟡 Média | Média |
| 1.6 | Recuperação de senha / troca obrigatória no 1º login | 🟡 Média | Alta |
| 1.7 | Backup automático do Postgres (cron na VPS) | 🟢 Baixa | Alta |

**Critério de conclusão:** Equipe usa o sistema diariamente sem planilha paralela para honorários e cobrança.

---

## Fase 2 — Cobrança e financeiro avançado (2–3 meses)

**Objetivo:** Aproximar-se da "Central de Cobranças" dos sistemas maiores, sem complexidade fiscal.

| # | Entrega | Inspiração | Complexidade |
|---|---------|------------|--------------|
| 2.1 | Contratos por cliente (valor, periodicidade, reajuste) | Domínio Honorários | 🟡 Média |
| 2.2 | Geração automática de cobranças mensais (boletos ou PIX) | Domínio / Calima | 🟡 Média |
| 2.3 | Integração PIX (QR estático/dinâmico) ou gateway (Asaas, Gerencianet) | Mercado | 🟡 Média |
| 2.4 | Régua de cobrança: lembretes por e-mail/WhatsApp antes/depois do vencimento | Onvio | 🟡 Média |
| 2.5 | DRE simplificado do escritório (receita − despesa por categoria) | Alterdata Financeiro | 🟡 Média |
| 2.6 | Fluxo de caixa projetado (próximos 3–6 meses) | Domínio | 🟡 Média |
| 2.7 | Categorização de despesas (fixas, variáveis, impostos) | Geral | 🟢 Baixa |

**Critério de conclusão:** Reduzir inadimplência mensurável; eliminar cobrança manual por WhatsApp para clientes recorrentes.

---

## Fase 3 — Obrigações e produtividade da equipe (2–4 meses)

**Objetivo:** Agenda inteligente de obrigações e visão de carga de trabalho (como Fortes Total Contador).

| # | Entrega | Complexidade |
|---|---------|--------------|
| 3.1 | Calendário fiscal unificado (por cliente, regime, estado) | 🟡 Média |
| 3.2 | Checklist por obrigação (documentos recebidos, enviado, protocolado) | 🟡 Média |
| 3.3 | Atribuição de tarefas entre Hemerson / equipe com prazo | 🟡 Média |
| 3.4 | Notificações push/e-mail: vence hoje, atrasou, cliente sem documento | 🟡 Média |
| 3.5 | Tempo gasto por cliente (opcional, para precificar honorários) | 🟡 Média |
| 3.6 | Templates de obrigações por regime (Simples, Presumido, MEI) | 🔴 Alta |

**Critério de conclusão:** Nenhuma obrigação crítica passa sem alerta; responsável sempre visível.

---

## Fase 4 — Portal do cliente (3–4 meses)

**Objetivo:** Área externa para o cliente (inspirado em Onvio / portais de escritórios modernos).

| # | Entrega | Complexidade |
|---|---------|--------------|
| 4.1 | Login do cliente (CNPJ + código ou e-mail) | 🟡 Média |
| 4.2 | Upload de documentos mensais (NF, extrato, holerite) | 🟡 Média |
| 4.3 | Status das obrigações ("em análise", "entregue", "pendente doc") | 🟡 Média |
| 4.4 | Segunda via de boleto/PIX de honorários | 🟢 Baixa (após Fase 2) |
| 4.5 | Solicitação de serviços extras (abertura, alteração contrato) | 🟡 Média |

**Critério de conclusão:** Reduzir e-mails e WhatsApp com "mandei o extrato?".

---

## Fase 5 — Inteligência e integrações (contínuo)

**Objetivo:** Dados que sistemas grandes vendem como diferencial — construir só o que agrega sem replicar SPED.

| # | Entrega | Viabilidade |
|---|---------|-------------|
| 5.1 | Rentabilidade por cliente (honorário − tempo − custo estimado) | 🟡 Média |
| 5.2 | Indicadores: churn, ticket médio, crescimento M/M | 🟢 Baixa |
| 5.3 | Integração leitura de NF-e (XML via certificado ou e-mail) | 🔴 Alta |
| 5.4 | API aberta para exportar lançamentos → Domínio/Alterdata | 🔴 Alta |
| 5.5 | Assistente IA: responde dúvidas internas sobre prazos e processos | 🟡 Média |
| 5.6 | App nativo (opcional; PWA já cobre 80%) | 🟡 Média |

---

## O que NÃO recomendamos construir (por ora)

| Funcionalidade | Motivo |
|----------------|--------|
| SPED Fiscal / ECD / ECF completos | Legislação muda constantemente; Domínio/Alterdata já resolvem |
| Folha de pagamento / eSocial | Altíssima complexidade regulatória |
| Escrituração contábil formal | Melhor integrar com sistema contábil existente |
| Emissão de NF do escritório | Usar emissor fiscal dedicado ou contabilidade integrada |

---

## Matriz resumo: construir vs comprar/integrar

```
                    IMPACTO NO ESCRITÓRIO
                    Baixo          Alto
              ┌─────────────┬─────────────┐
    Baixa     │  PWA, UI    │  Cobrança,  │
COMPLEXIDADE  │  filtros    │  dashboard, │
              ├─────────────┼─────────────┤
    Alta      │  —          │  Portal     │
              │             │  cliente    │
              └─────────────┴─────────────┘
                              │
                    SPED/Fiscal → COMPRAR/INTEGRAR
```

---

## Próximos passos imediatos (esta semana)

1. ✅ Deploy do `vercel.json` (corrige 404 ao recarregar no celular)
2. ✅ Ícones PWA com identidade Someli (rosa/roxo)
3. Validar responsividade em iPhone/Android após deploy
4. Separar contagem de clientes ativos no dashboard
5. Definir senha definitiva do Hemerson
6. Configurar backup diário Postgres na VPS

---

## Estimativa de esforço (ordem de grandeza)

| Fase | Duração | Esforço dev |
|------|---------|-------------|
| Fase 1 | 1–2 meses | ~40–80h |
| Fase 2 | 2–3 meses | ~80–120h |
| Fase 3 | 2–4 meses | ~100–150h |
| Fase 4 | 3–4 meses | ~120–180h |
| Fase 5 | Contínuo | Sob demanda |

*Valores assumem 1 desenvolvedor part-time; fases podem sobrepor-se.*

---

*Documento vivo — revisar a cada entrega concluída.*
