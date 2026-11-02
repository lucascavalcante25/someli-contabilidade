# NFS-e automática pelo Portal Nacional (ADN)

Busca as NFS-e em que o cliente é prestador, tomador ou intermediário, usando o certificado A1 do próprio cliente,
e guarda o XML em Docs na competência da nota. Não emite nota e não manifesta nada (NFS-e não tem "ciência").

## Como funciona

1. Na ficha do cliente, aba **Docs**, quem tem a permissão **Gerenciar certificado A1** envia o `.pfx`/`.p12` e a senha.
2. O servidor valida a senha, a validade e se o CNPJ do certificado tem a **mesma raiz** do CNPJ do cliente
   (o ADN aceita o certificado da matriz para consultar a filial).
3. Arquivo e senha ficam cifrados com AES-256-GCM (`cliente_certificado_arquivo`). A chave mestra só existe na
   variável `CERTIFICADO_CHAVE_MESTRA`. A API nunca devolve arquivo nem senha.
4. A busca chama `GET {NFSE_ADN_BASE_URL}/contribuintes/DFe/{ultimoNSU}?lote=true&cnpjConsulta={cnpj}` com mTLS
   (lotes de até 50 documentos, ArquivoXml em GZip+Base64) e guarda o último NSU em `nfse_sync_estado`.
5. Cada NFS-e vira `nota_fiscal_import` (origem `ADN`) e um XML em Docs. Evento de cancelamento
   (e101101, e105102, e105104, e305101) marca a nota como `CANCELADA`, e ela sai dos totais do radar.

## Regras de consulta

- Nota já conhecida (mesma chave) não é gravada de novo: a reentrega não duplica.
- Sem documentos novos: próxima busca em 1 hora. HTTP 429: respeita o `Retry-After`.
- "Buscar agora" exige ao menos 5 minutos desde a última busca.
- Até 20 lotes por rodada. O restante continua na rodada seguinte.

## Configuração (produção)

| Variável | Uso |
|----------|-----|
| `CERTIFICADO_CHAVE_MESTRA` | 32 bytes em Base64 (`openssl rand -base64 32`). Sem ela, o envio de certificado fica desligado |
| `NFSE_ADN_AGENDAMENTO` | `true` liga o job de hora em hora (padrão `false`) |
| `NFSE_ADN_BASE_URL` | Padrão `https://adn.nfse.gov.br`. Testes: `https://adn.producaorestrita.nfse.gov.br` |
| `NFSE_ADN_CRON` | Padrão `0 17 * * * *` (minuto 17 de cada hora) |

Se a chave mestra for perdida ou trocada, os certificados guardados não abrem mais. A tela avisa para reenviar.

## Permissões

| Ação | Permissão | Alçada |
|------|-----------|--------|
| Ver situação | `CLIENTES_VISUALIZAR` | sim |
| Enviar / remover certificado | `CERTIFICADO_A1_GERENCIAR` (ADMIN e SOCIO por padrão) | sim |
| Buscar agora / pausar / ligar | `CLIENTES_EDITAR` | sim |

Envio, troca e remoção do certificado, além de ligar e pausar a busca, vão para o `audit_log` sem a senha.

## LGPD

Usar somente com autorização por escrito do cliente para guardar o certificado. O log registra apenas o ID do cliente,
sem CNPJ, senha ou conteúdo das notas.

## O que ainda não foi validado

A chamada ao ADN foi testada contra um ADN simulado local e contra a produção restrita com um certificado de teste
autoassinado, que o ADN recusa no handshake TLS. Falta a primeira busca com o A1 real de um cliente.
