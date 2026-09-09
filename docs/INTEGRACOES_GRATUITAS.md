# Integrações e automações — SOMELI

Foco: **gratuito** ou custo zero para começar. Evoluímos com TDD.

O SOMELI é plataforma do **escritório contábil** (carteira, alçada, obrigações), não um ERP do cliente final. Isso muda o que “encaixa”.

## Fit dos 4 pilares (mercado SaaS contábil × SOMELI)

| Pilar | Exemplos do mercado | Encaixa no SOMELI? | Prioridade |
|-------|---------------------|--------------------|------------|
| **Meios de pagamento** | Asaas, Iugu, PagBank, Stripe | **Parcial** — útil para **cobrar honorário** (boleto/Pix) e régua de inadimplência; Stripe é mais global/SaaS B2C | Média (depois do operacional) |
| **ERP / e-commerce** | Omie, Conta Azul, Bling, Shopify, Hotmart | **Baixo agora** — o cliente já usa o escritório; importar balancete/NF de Omie/Bling é fase 2 se houver demanda paga de API | Baixa |
| **Bancos / Open Finance** | Pluggy, Conta Simples, Inter, Cora, Nubank | **Alto valor, cuidado com custo** — Nubank sem API gratuita; Pluggy **pago**; Inter/Cora APIs abertas só para quem é cliente desses bancos; **OFX/CSV** encaixa 100% e é gratuito | Alta (OFX/CSV); Open Finance pago só com decisão explícita |
| **NFe / NFSe** | Focus NFe, eNotas | **Alto** para escritório — ideal: **receber/importar XML** (gratuito) e depois API de emissão se o produto for “emite pelo portal” | Alta (import XML); emissão via API = pago |
| **Produtividade** | Pluga, Zapier, Slack, WhatsApp | **Alto** — alertas de obrigação já existem in-app; WhatsApp/e-mail para “guia pronta / pendência” agrega muito; Zapier é atalho, não substitui domínio | Média-alta (webhooks depois) |

### O que já cobre valor sem agregador pago

- Consulta CNPJ (ReceitaWS) + Sintegra  
- BrasilAPI (CEP, feriados → dia útil)  
- Obrigações / ocorrências / notificações por alçada  
- Aplicação em massa de obrigações  
- Tags operacionais (VIP, MEI, INADIMPLENTE…) — base para filtros e automações  

### O que adotar depois (ordem sugerida)

1. Importador **OFX/CSV** (Nubank e demais bancos)  
2. Importador **XML NFe/NFSe** (pasta/upload do cliente)  
3. Cobrança de honorário via **Asaas/Iugu** (se quiser régua automática)  
4. Alertas **e-mail / WhatsApp Business** (pendências e guias)  
5. Open Finance (Pluggy etc.) **somente** se o escritório pagar a conexão  

### Evitar por enquanto

- Pluggy/Belvo sem orçamento  
- Scraping Nubank  
- Integração profunda Omie/Conta Azul sem caso de uso claro (o SOMELI já é o hub do escritório)

## Nubank PJ — verdade prática

| Caminho | Gratuito? | Viável agora? |
|---------|-----------|---------------|
| API Nubank pública | Não | Não |
| Open Finance via Pluggy/Belvo | Não | Futuro pago |
| Importação OFX/CSV do app | **Sim** | **Sim** |
| Inter / Cora API | Sim (conta nesses bancos) | Opcional se houver clientes nesses bancos |

## Endpoints internos de integração (já no produto)

| Rota | Uso |
|------|-----|
| `GET /integracoes/cep/{cep}` | BrasilAPI CEP |
| `GET /integracoes/feriados/{ano}` | Feriados nacionais |
| `GET /integracoes/dia-util?data=` | Ajuste para dia útil |
| `GET /someli/api/consultaCNPJ/{cnpj}` | ReceitaWS |
| `POST /someli/api/sintegra/consulta` | Sintegra |

## Automações internas (maior ROI)

1. Geração de ocorrências + notificações por alçada  
2. Tags + filtros de carteira  
3. Aplicação em massa de obrigações  
4. Import OFX/CSV (ciclo bancário)  
5. Import XML NFe/NFSe  
6. Redistribuição de carteira / férias  
7. Solicitações ao cliente  

## Como testar banco sem API (futuro)

1. Exportar CSV/OFX  
2. Upload no SOMELI  
3. Conciliação com honorários/pagamentos  
