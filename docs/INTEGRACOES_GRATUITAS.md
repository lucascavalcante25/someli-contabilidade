# Integrações e automações — SOMELI

Foco: **honestidade de custo**. Nem tudo que o mercado vende como “API” é gratuito — RFB/Serpro em especial **não**.

O SOMELI é plataforma do **escritório contábil** (carteira, alçada, obrigações), não um ERP do cliente final.

## Tabela-mestre (gratuita / freemium / paga)

| Integração | Gratuita? | Uso na Someli | Status |
|------------|-----------|---------------|--------|
| **Import XML NFe/NFSe** (upload local) | **Sim** | Conferência fiscal por cliente/competência | **Feito agora** |
| **BrasilAPI** (CEP, feriados, dia útil) | **Sim** (limites públicos) | Ajuste de vencimento / endereço | Já tem |
| **ReceitaWS** (CNPJ) | Freemium (rate limit) | Cadastro / consulta CNPJ | Já tem |
| **Sintegra** (InfoSimples) | Pago por consulta (token) | Consulta IE | Já tem (token config) |
| **OFX/CSV Nubank** (export do app) | **Sim** (export manual) | Conciliação honorários / caixa do escritório | Planejado |
| **Open Finance / Pluggy / Belvo** | **Paga** | Extrato automático multi-banco | Planejado (só com orçamento) |
| **Asaas / Iugu** | Freemium → pago | Boleto/Pix de honorário do escritório | Planejado (Trilha B) |
| **Serpro Integra Contador** | **Paga / pós-paga oficial** | Transmissão/consulta obrigações RFB | Stub + doc (sem fingir API free) |
| **Focus NFe / eNotas** (emissão) | Paga | Emissão NF do cliente | Fora de escopo agora |
| **WhatsApp Business API** | Paga | Alertas “guia pronta / pendência” | Planejado |
| **mailto / e-mail SMTP próprio** | Gratuito (infra própria) | Mesmos alertas sem Meta API | Planejado (MVP) |
| **Pluga / Zapier** | Freemium | Atalhos, não substitui domínio | Evitar como núcleo |

### Expectativa “espero que todas sejam gratuitas”

O que **é** gratuito de verdade para o escritório:

1. Importar arquivos que o cliente/banco/portal já entrega (XML, OFX, CSV, PDF).
2. APIs públicas comunitárias com limite (BrasilAPI).
3. Orquestração interna (templates, checklist, tags, ocorrências) — código próprio.

O que **exige custo oficial** (não dá para maquiar):

1. **Integra Contador / Serpro** — canal RFB para automação fiscal homologada.
2. **Open Finance agregadores** (Pluggy etc.).
3. **WhatsApp Business API** Meta.
4. Gateways de cobrança em escala (Asaas/Iugu além do freemium).

## Fit dos 4 pilares (mercado SaaS contábil × SOMELI)

| Pilar | Exemplos do mercado | Encaixa no SOMELI? | Prioridade |
|-------|---------------------|--------------------|------------|
| **Meios de pagamento** | Asaas, Iugu, PagBank | Parcial — honorário do escritório | Média (Trilha B) |
| **ERP / e-commerce** | Omie, Conta Azul, Bling | Baixo agora | Baixa |
| **Bancos / Open Finance** | Pluggy, Nubank | Alto valor; OFX/CSV gratis primeiro | Alta (OFX); Open Finance pago só com decisão |
| **NFe / NFSe** | Focus, eNotas | Alto — **import XML gratis** agora; emissão = pago | Alta (import feito) |
| **Produtividade** | WhatsApp, e-mail | Alto — mailto free / WA pago | Média-alta |

## Endpoints internos de integração

| Rota | Uso |
|------|-----|
| `GET /integracoes/cep/{cep}` | BrasilAPI CEP |
| `GET /integracoes/feriados/{ano}` | Feriados nacionais |
| `GET /integracoes/dia-util?data=` | Ajuste para dia útil |
| `GET /integracoes/integra-contador/status` | Stub Serpro (nunca finge ready) |
| `GET /someli/api/consultaCNPJ/{cnpj}` | ReceitaWS |
| `POST /someli/api/sintegra/consulta` | Sintegra |
| `POST /clientes/{id}/notas-fiscais/importar` | Import XML lote |
| `POST /notas-fiscais/importar` | Import XML global (vínculo por CNPJ) |
| `POST /tags/sincronizar` | Resync tags inteligentes |
| `GET/POST /obrigacao-templates` | Templates por regime |

## Tags inteligentes (estado)

| Tag | Tipo | Regra |
|-----|------|-------|
| `NOVO_CLIENTE` | Automática | Some após ~90 dias **e** após até 3 competências (config `app.tags.*`) desde `data_inicio_cobranca` (fallback `data_criacao`) |
| `INADIMPLENTE` | Automática | Aparece com meses em atraso / status atrasado; some ao quitar |
| `MEI` / regimes | Manual | Estável — não remove por tempo |

## Automações internas (maior ROI)

1. Geração de ocorrências + notificações por alçada  
2. Tags inteligentes + filtros de carteira  
3. Templates de obrigações por regime + aplicação em massa  
4. Checklist na ocorrência  
5. Import XML NFe/NFSe  
6. Import OFX/CSV (próximo)  
7. Redistribuição de carteira / férias  

## Como testar banco sem API (futuro OFX)

1. Exportar CSV/OFX do Nubank  
2. Upload no SOMELI  
3. Conciliação com honorários/pagamentos  
