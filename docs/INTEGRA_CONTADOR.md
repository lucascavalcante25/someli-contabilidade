# Integra Contador (Serpro) — pré-requisitos

## Honestidade de custo

O **Integra Contador** é o canal **oficial** da Receita Federal / Serpro para serviços digitais do contador (DCTFWeb, PGDAS, etc. via APIs homologadas).

| Aspecto | Realidade |
|---------|-----------|
| Gratuito? | **Não.** Modelo comercial Serpro (contrato / pós-pago). |
| Cadastro | Contrato Serpro + credenciais OAuth (Consumer Key/Secret) |
| Certificado | Certificado digital e-CNPJ do escritório (A1/A3) em geral exigido |
| Homologação | Ambiente de testes Serpro antes de produção |

**O SOMELI não finge integração gratuita.** Enquanto não houver contrato, o sistema expõe apenas:

- Interface Java `IntegraContadorClient`
- Stub `IntegraContadorStubClient` (`isConfigured() == false`)
- Endpoint informativo `GET /integracoes/integra-contador/status`

## Quando ligar de verdade

1. Escritório fecha contrato Serpro Integra Contador.
2. Obtém Consumer Key / Secret e configura certificado.
3. Implementa `IntegraContadorHttpClient` (produção) e troca o bean do stub.
4. Variáveis sugeridas (ainda não ativas no stub):

```yaml
integra-contador:
  enabled: true
  consumer-key: ${INTEGRA_CONSUMER_KEY:}
  consumer-secret: ${INTEGRA_CONSUMER_SECRET:}
  base-url: https://gateway.apiserpro.serpro.gov.br
```

## Alternativa gratuita enquanto isso

- Cumprimento operacional via **portais oficiais** (links em `obrigacao.url_portal`)
- Checklist na ocorrência (docs → apurado → transmitido → guia enviada)
- Import **XML local** NFe/NFSe (gratuito, sem Serpro)
