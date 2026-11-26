# Simulador CBS/IBS/IS (calculadoras da Receita Federal)

Ferramenta interna para a equipe simular CBS, IBS e Imposto Seletivo nas operações típicas dos clientes,
do Simples Nacional e do regime regular, e preparar a conversa sobre 2027. **Não emite nota, não é para o
cliente final e não substitui o Fortes nem o ERP.**

O cálculo é feito pelas calculadoras oficiais publicadas pela Receita Federal no GitHub, sob licença MIT:

- [calculadora-rtc-regime-regular](https://github.com/ReceitaFederal/calculadora-rtc-regime-regular) (Java), versão em uso **1.7.2** (18/11/2026)
- [calculadora-rtc-simples-nacional](https://github.com/ReceitaFederal/calculadora-rtc-simples-nacional) (Java), versão em uso **1.0.2** (18/11/2026)

O gerador de DANFSe (Go) ficou de fora porque não calcula tributo.

> Aviso exibido em toda simulação: *"Simulação com a calculadora oficial da Receita Federal (versão X).
> Conferir enquadramento e classificação antes de orientar o cliente."*
>
> Licença: as calculadoras são distribuídas sob a licença MIT (copyright da Receita Federal / Serpro).
> O texto da licença vai dentro de cada imagem Docker (`/app/LICENSE`). Não alteramos a lógica de cálculo.

---

## 1. Como funciona

```
Tela (React)  →  API Someli (Spring)  →  calculadora da Receita (container próprio)
src/lib/simuladorRtc.ts   CalculadoraRtcClient        POST .../observabilidade/...
```

| Camada | Arquivo | O que faz |
|---|---|---|
| Montagem da operação | `src/lib/simuladorRtc.ts` | Transforma o formulário no JSON que cada calculadora espera. Não calcula tributo. |
| Leitura do resultado | `src/lib/simuladorRtc.ts` (`resumirResultado`) | Lê base, alíquota efetiva, CBS, IBS, IS, memória e erros que a calculadora devolveu. A única conta feita é somar CBS + IBS + IS já devolvidos para o "total de tributos". |
| Integração | `backend/.../integration/CalculadoraRtcClient.java` | Envia a operação, devolve o corpo sem mudar nada, lê a versão nos cabeçalhos `X-CALC-APP-VERSION` e `X-CALC-DB-VERSION` e traduz erro de rede (503) e de validação (422). |
| Regra e permissão | `backend/.../service/SimuladorRtcService.java` | Exige `SIMULADOR_RTC_USAR`; cenários exigem alçada sobre o cliente. Ao salvar, recalcula na calculadora: o resultado guardado nunca vem do navegador. |
| Banco | `V41__simulador_rtc.sql` | Tabela `simulacao_rtc_cenario` (operação e resposta como vieram, com a versão) e a permissão nova. |

Endpoints do sistema:

| Método | Caminho | Permissão |
|---|---|---|
| GET | `/simulador-rtc/versoes` | `SIMULADOR_RTC_USAR` |
| POST | `/simulador-rtc/calcular` | `SIMULADOR_RTC_USAR` |
| GET / POST | `/clientes/{id}/simulacoes-rtc` | `SIMULADOR_RTC_USAR` + alçada do cliente |
| GET / DELETE | `/simulacoes-rtc/{id}` | `SIMULADOR_RTC_USAR` + alçada do cliente dono |

A permissão nova vem marcada para ADMIN, SÓCIO, GERENTE, CONTADOR, SUPERVISOR FISCAL, FISCAL e CONTÁBIL.
Os outros perfis podem recebê-la na tela de usuários.

Endpoints das calculadoras que o sistema usa:

- Regime regular: `POST /api/calculadora/observabilidade/regime-geral` (devolve o erro de cada item sem
  recusar a operação inteira) e `GET /api/calculadora/dados-abertos/versao`.
- Simples Nacional: `POST /api/calculadora/observabilidade/simples-nacional/nao-assistido` (recebe as
  alíquotas efetivas por anexo e aceita NF-e, NFC-e e NFS-e) e `GET /api/versao`.

---

## 2. O que as calculadoras oferecem (estudo da fase 1)

### 2.1 Regime regular (`api-regime-geral`, porta 8080, base `/api`)

| Grupo | Endpoints |
|---|---|
| Cálculo | `POST /calculadora/regime-geral` (falha inteira no 1º erro, HTTP 422) · `POST /calculadora/observabilidade/regime-geral` (erro por item, HTTP 200) · `GET /calculadora/observabilidade/erros?codigo=REG-011` |
| Base de cálculo | `POST /calculadora/base-calculo/base-calculo-unificada` (NF-e/NFC-e) · `.../base-calculo-unificada-nfse` |
| Pedágio | `POST /calculadora/pedagio` |
| NFS-e | `GET /calculadora/nfse/indicador-operacao`, `local-operacao`, `locais-fornecimento`, `locais-incidencia` e validação |
| XML | `POST /calculadora/xml/generate?tipo=nfe` · `POST /calculadora/xml/validate?tipo=nfe&subtipo=grupo` |
| Dados abertos | `GET /calculadora/dados-abertos/...`: `ufs`, `ufs/municipios`, `situacoes-tributarias/cbs-ibs`, `classificacoes-tributarias/...`, `ncm`, `ncm/vigentes`, `nbs`, `fundamentacoes-legais`, `aliquota-uniao`, `aliquota-uf`, `aliquota-municipio`, `redutores-compra-governamental`, `dfe/grupos`, `versao` e outros |
| Versão | `GET /versao/status` (perfil offline) |
| Documentação | Swagger em `/api/swagger-ui.html` |

**Entrada do cálculo** (`OperacaoInput`):

- da operação: `id`, `versao`, `dhFatoGerador` (data e hora com fuso), `municipio` (código IBGE, 7 dígitos),
  `uf`, `tpDoc` (opcional: 55 NF-e, 65 NFC-e…), `gCompraGov` (compra governamental, opcional);
- de cada item: `numero`, `ncm` **ou** `nbs`, `cst` (3 dígitos), `cClassTrib` (6 dígitos), `baseCalculo`,
  `quantidade`, `unidade`, `impostoSeletivo` (CST, cClassTrib, base, quantidade, unidade, imposto informado),
  `tributacaoRegular`, `gComponentesBC` (componentes da base) e `aliquotasNominais` (CBS, IBS estadual,
  IBS municipal e IS ad valorem / ad rem).
- **Regra importante:** em 2026 `aliquotasNominais` é proibido (a calculadora usa a tabela dela); **a partir
  de 01/01/2027 é obrigatório**. Os resultados com alíquota informada saem com estado `CALCULO_SIMULADO` e o
  cabeçalho `x-warning-dados-simulados`.

**Resposta:** por item (`objetos[]`): `estadoItem` (`CALCULADO`, `CALCULO_SIMULADO`, `INCONSISTENCIA_ENTRADA`,
`NAO_IMPLEMENTADO`, `FALHA_TECNICA`), `tribCalc.IBSCBS` com `CST`, `cClassTrib`, `gIBSCBS` (`vBC`, `gIBSUF`,
`gIBSMun`, `vIBS`, `gCBS`, cada um com alíquota, `gRed` com redução e alíquota efetiva, e valor),
`memoriaCalculo` (texto da conta de CBS, IBS UF e IBS Mun), `tribCalc.IS` (`vBCIS`, `pIS`, `vIS`…) e `erros`
(código `REG-xxx`, título, campo e detalhe). Totais em `total.tribCalc` (`ISTot`, `IBSCBSTot`), que somam
só os itens calculados.

### 2.2 Simples Nacional (`api-simples-nacional`, porta 8082, base `/api`)

| Endpoint | Para quê |
|---|---|
| `POST /calculadora/observabilidade/simples-nacional` | Cálculo com a alíquota efetiva informada por item (`pCBSSN`, `pIBSSN`); NF-e e NFC-e |
| `POST /calculadora/observabilidade/simples-nacional/nao-assistido` | Cálculo com a linha de alíquotas efetivas por anexo (I a V); NF-e, NFC-e, CT-e e NFS-e (**o que o sistema usa**) |
| `GET /calculadora/observabilidade/simples-nacional/erros?codigo=VSN-001` | Texto do erro |
| `GET /calculadora/simples-nacional/atividades?data=` e `/{codigo}` | Catálogo de atividades (cAtivSN) vigente |
| `GET /versao`, `GET /versao/status` | Versão |

**Entrada (não assistido):** `data` (AAAA-MM-DD), `tpDoc`; nos documentos com CRT: `CRT` (1 Simples,
2 excesso de sublimite, 3 normal, 4 MEI) e `tpRegimeIBSCBS`; na NFS-e: `opSimpNac`, `regApIBSCBSSN`,
`regApTribSN`; `aliquotasEfetivas` (`fatorR`, `impedimentoSublimite` e o par CBS/IBS de cada anexo, com o
par "sem redistribuição do ISS" nos anexos III a V); itens com `cAtivSN`, `cClassTrib`, `ncm`/`nbs`,
`baseCalculo` (texto, sem o IS), `valorImpostoSeletivo` e, na NFS-e, `tribISSQN`, `tpRetISSQN`, `tpBM`.
A NFS-e aceita exatamente 1 item.

**Resposta:** por item `estadoItem` (`CALCULADO`, `NAO_CALCULADO` com `motivoEstado`, erros `VSN-xxx`),
`tribCalc` com `vRBSNitem`, `tpRBSN`, `vBC`, `pIBSSN`, `vIBSSN`, `pCBSSN`, `vCBSSN`, valores pendentes/suspensos,
`IS.valor` (só repassado), `totalItem` e `memoriaCalculo`; `resolucaoAliquotas` (qual par de alíquotas foi
usado e avisos); `total` com `vRBSNtot`, `vBC`, `vIBSSNtot`, `vCBSSNtot`, `totalIs`, `totalTributos`.

### 2.3 Tabelas embutidas (banco SQLite gerado pelos scripts Flyway do regime regular)

Banco gerado em 26/11/2026 com os scripts da tag 1.7.2, última migração **V0073** (registro de 09/11/2026:
"Nova tabela de Classificações Tributárias (IT 2025.002 v.1.71), publicada em 30/10/2026"). Os dois serviços
usam o mesmo banco.

| Tabela | Conteúdo conferido no banco gerado |
|---|---|
| Alíquotas de referência | Só **2026**: CBS **0,9%**, IBS UF **0,1%**, IBS Mun **0%** (vigência 01/01 a 31/12/2026). De 2027 em diante não há alíquota: a consulta dá 404 e o cálculo exige `aliquotasNominais`. |
| Alíquota padrão por UF/município | Vazia. |
| Imposto Seletivo | 46 faixas ad valorem e 2 ad rem cadastradas a partir de 2027, **todas sem valor** (alíquota ainda não definida). |
| Classificação tributária (cClassTrib) | 202 registros (IT 2025.002 v1.71). |
| CST | 25. |
| NCM / NBS | 15.162 NCM (atualizado pelo Classif, V0070) e 1.237 NBS (nbs2-0.csv do MDIC, V0072). |
| Percentuais de redução | 519 registros (ex.: 60% e 100% dos anexos da LC 214). |
| Municípios | 5.573, com vigência IBGE (Fortaleza = 2304400). |
| Atividades do Simples | 15 (cAtivSN 01 a 14 e 90), a partir de 01/01/2027, com o anexo de cada uma. |
| Compra governamental no Simples | Fator de transição: 0 em 2027-2028, 0,1 em 2029 … 1,0 em 2033. |

---

## 3. O que a calculadora NÃO cobre e o que o contador precisa decidir

**Fora do escopo das calculadoras (versões 1.7.2 / 1.0.2):**

1. **Alíquotas de 2027 em diante.** Não vêm na calculadora. A pessoa precisa informar a CBS e o IBS
   (o exemplo oficial usa CBS 8,8% e IBS 0,05% + 0,05%, mas é exemplo, não alíquota vigente).
2. **Alíquota efetiva do Simples.** Não é calculada: vem do PGDAS-D. A consulta automática (Receita Integra,
   autenticada) está prevista para a Release 16. Hoje a alíquota precisa ser informada.
3. **Imposto Seletivo** com alíquotas vazias: só calcula se a alíquota for informada.
4. **Apuração do período**, créditos do adquirente acumulados, ressarcimento, split payment completo e
   cashback: a calculadora trata a operação, não a apuração.
5. Documentos NF-e ABI (77), DERE (94), DIR (95) e DUIMP (96): retornam "não tratado".
6. Zona Franca de Manaus, monofasia de combustíveis, códigos ANP/Anvisa e benefícios que dependem da
   qualificação das partes: ainda em evolução (roadmap 2027).
7. Comparação com o PIS/COFINS/ICMS/ISS atuais: a calculadora não faz o "antes e depois".

**Decisões do contador antes de orientar o cliente:**

1. Qual **CST e cClassTrib** se aplica a cada produto ou serviço (a calculadora só confere o vínculo com
   NCM/NBS, não escolhe por você).
2. Qual **NCM ou NBS** é o correto para o item.
3. Quais **alíquotas** usar em 2027 (CBS de referência, IBS de transição) e a data do fato gerador.
4. No Simples: **anexo e atividade** (cAtivSN), **Fator "r"**, sublimite e a alíquota efetiva do período;
   e se o cliente deve **optar pelo regime regular do IBS/CBS** (tpRegimeIBSCBS / regApIBSCBSSN) por causa do
   crédito para o comprador.
5. **Local da operação** (município/UF) em serviços.
6. Se a operação tem **redução, isenção, imunidade, diferimento ou suspensão**, e se o cliente cumpre as
   condições do benefício.
7. Como tratar **erros de cadastro** que a calculadora apontar (ex.: `REG-011` NCM não vinculada).

Observação da fase 1: o `docs/exemplos.md` do repositório do Simples é uma cópia do exemplo do regime
regular (porta 8080, endpoint `regime-geral`); para o Simples, o contrato certo está no Swagger e no código
(`OperacaoSimplesNaoAssistidaInput`).

---

## 4. Instalação

### 4.1 Local (desenvolvimento)

Requisitos: **Java 25** (as versões 1.7.x e 1.0.x passaram de Java 21 para 25) e Git. O Maven vem pelo wrapper.
Nesta máquina há um JDK 25 portátil (Temurin 25.0.5.1, SHA-256 conferido) em `C:\Workspace\calculadora-rtc\jdk-25`:
antes dos comandos, `$env:JAVA_HOME="C:\Workspace\calculadora-rtc\jdk-25"`. No Windows, sem o argumento
`-Djdk.net.unixdomain.tmpdir` o Tomcat não sobe ("Invalid argument: connect"), o mesmo ajuste do `launch.json` da Someli.

```powershell
mkdir C:\Workspace\calculadora-rtc; cd C:\Workspace\calculadora-rtc
git clone https://github.com/ReceitaFederal/calculadora-rtc-regime-regular.git
git clone https://github.com/ReceitaFederal/calculadora-rtc-simples-nacional.git

# banco (os dois usam o mesmo; o Simples precisa da pasta flyway do regime regular)
cd calculadora-rtc-regime-regular
mkdir calculadora\db
.\mvnw.cmd flyway:migrate "-Dflyway.configFiles=flyway\flyway-pro.conf" --batch-mode
Copy-Item -Recurse flyway ..\calculadora-rtc-simples-nacional\
Copy-Item -Recurse calculadora ..\calculadora-rtc-simples-nacional\

# regime regular na 8180 (a 8080 é da API da Someli)
.\mvnw.cmd spring-boot:run "-Dspring-boot.run.profiles=offline" "-Dspring-boot.run.jvmArguments=-Djdk.net.unixdomain.tmpdir=C:/Windows/Temp -XX:-UseBASE64Intrinsics" "-Dspring-boot.run.arguments=--server.port=8180 --management.server.port=9181"

# Simples na 8182 (outro terminal)
cd ..\calculadora-rtc-simples-nacional
.\mvnw.cmd spring-boot:run "-Dspring-boot.run.profiles=offline" "-Dspring-boot.run.jvmArguments=-Djdk.net.unixdomain.tmpdir=C:/Windows/Temp -XX:-UseBASE64Intrinsics" "-Dspring-boot.run.arguments=--server.port=8182 --management.server.port=9183"
```

A API da Someli procura as calculadoras em `RTC_REGIME_REGULAR_URL` (padrão `http://localhost:8180/api`) e
`RTC_SIMPLES_URL` (padrão `http://localhost:8182/api`).

### 4.2 Produção (VPS Contabo)

As calculadoras rodam como dois containers a mais no `deploy/contabo/docker-compose.yml`, sem porta exposta
(só a API da Someli fala com elas pela rede interna do Docker). A imagem (`deploy/contabo/rtc/Dockerfile`)
clona a tag oficial, gera o banco e roda o JAR sem alterar nada.

Elas ficam no perfil `rtc`, então o deploy automático (que só refaz a `api`) não as sobe. Antes da primeira
vez, conferir a memória:

```powershell
ssh root@169.58.179.91 "free -m; docker stats --no-stream"
```

Cada calculadora tem `mem_limit: 512m` (cerca de 1 GB a mais no total). Com memória livre, subir:

```powershell
ssh root@169.58.179.91 "cd /opt/someli-contabilidade/deploy/contabo && docker compose --env-file .env --profile rtc up -d --build rtc-regime-regular rtc-simples"
```

(mesma pasta usada pelo deploy automático). Sem as calculadoras no ar, a tela do simulador mostra
"Calculadora indisponível" e o resto do sistema segue normal.

## 5. Atualização de versão

1. Ler o `CHANGELOG.md` da nova versão nos dois repositórios (mudança de arredondamento, campos e tabelas).
2. Trocar `TAG` (e `TAG_BANCO`, que é a tag do regime regular) em `deploy/contabo/docker-compose.yml`.
3. Localmente: `git fetch --tags` e `git checkout <tag>` nos dois clones, apagar `calculadora/db` e gerar o
   banco de novo; rodar a conferência abaixo.
4. Na VPS: o mesmo comando `--profile rtc up -d --build`. A versão nova aparece sozinha na tela e nos
   cenários salvos dali em diante (os antigos guardam a versão que os calculou).

## 6. Conferir os exemplos oficiais

`backend/src/test/java/br/com/someli/integration/ExemplosOficiaisRtcIT.java` envia a operação de
`docs/exemplos.md` do regime regular para a calculadora no ar e confere os valores publicados: arroz com
redução de 100%, cerveja com IS de R$ 15,00, educação com redução de 60% (CBS R$ 42,24, IBS R$ 0,48),
erro `REG-011` no item 4 e os totais (CBS R$ 56,76, IBS R$ 0,64, IS R$ 15,00, base R$ 1.465,00).
Não roda no `npm run test:all` comum, porque precisa da calculadora no ar:

```powershell
cd backend; $env:RTC_REGIME_REGULAR_URL="http://localhost:8180/api"; mvn test "-Dtest=ExemplosOficiaisRtcIT"
```

O teste do front (`src/lib/simuladorRtc.test.ts`) lê a resposta publicada nesse mesmo exemplo.
