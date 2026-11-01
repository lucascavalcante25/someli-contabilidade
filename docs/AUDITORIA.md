# Auditoria do sistema — 01/11/2026

Base: leitura do código e testes no ambiente local. As falhas de autorização foram confirmadas por leitura do código, sem exploração. Produção não foi testada.

## Críticas

As falhas 1 a 5 e a parte de rotas da falha 6 foram corrigidas em 01/11/2026, com testes automatizados e validação na API real local.

| # | Falha | Onde | Situação |
|---|---|---|---|
| 1 | Qualquer usuário logado podia excluir qualquer usuário, inclusive admin | `UsuarioService.remover` | Corrigida: exige `USUARIOS_DESATIVAR` e registra auditoria |
| 2 | Qualquer usuário logado podia trocar a foto de outro usuário | `UsuarioService.uploadFoto` | Corrigida: própria foto ou `USUARIOS_EDITAR` |
| 3 | Download de documento não validava alçada | `ClienteDocumentoService.obterArquivo` | Corrigida: exige alçada sobre o cliente |
| 4 | Tipos de obrigação podiam ser alterados sem permissão | `ObrigacaoService` | Corrigida: exige `OBRIGACOES_TIPOS_GERENCIAR` |
| 5 | Usuário inativo continuava logando | `AuthService.login`, `JwtAuthenticationFilter` | Corrigida: login recusado e token antigo sem efeito |
| 6 | Token InfoSimples versionado e rota Sintegra pública: consumia crédito sem login | `application.yml`, `SecurityConfig` | Parcial: Sintegra e CNPJ exigem login. O token continua no `application.yml` porque a produção depende dele (ver abaixo) |

### Passos para encerrar a falha 6

O `docker-compose` não repassa `INFOSIMPLES_TOKEN`, então a produção usa o valor padrão do `application.yml`. Remover esse valor antes de configurar a VPS derruba a Sintegra. Ordem segura:

1. Gerar um token novo no painel da InfoSimples.
2. Acrescentar `INFOSIMPLES_TOKEN=<novo>` ao `deploy/contabo/.env` da VPS.
3. Repassar a variável em `deploy/contabo/docker-compose.yml`, remover o valor padrão do `application.yml` e fazer o deploy.
4. Testar uma consulta Sintegra e só então revogar o token antigo.

## Altas

| # | Falha | Onde |
|---|---|---|
| 7 | Deploy em produção sem rodar nenhum teste | `.github/workflows/deploy-contabo.yml` |
| 8 | Login sem limite de tentativas | `AuthController` |
| 9 | `/auth/preview` revela nome do usuário a partir do CPF, sem login; login devolve erro diferente para CPF inexistente | `AuthController`, `AuthService` |
| 10 | Senha de admin em texto puro no repositório | `V7__ensure_admin_user.sql` |
| 11 | Upload de documento aceita qualquer tipo e o nome original vai sem sanitizar para o cabeçalho de download | `ClienteDocumentoService`, `ClienteDocumentoController` |
| 12 | 14 vulnerabilidades em pacotes de produção do front (12 altas), incluindo `react-router-dom`, `zod` e `postcss` | `package.json` |

## Médias

- CPF gravado em logs de login (LGPD).
- `/management` e detalhes do health público expõem informação interna.
- Token válido por 72 horas em `localStorage`, sem revogação.
- Porta 8081 publicada em todas as interfaces no compose; conferir o firewall da VPS.
- Webhook Asaas sem validar token (aceitável só enquanto for stub).
- Sem análise de vulnerabilidades das dependências Maven.

## Arquitetura

**Bom:** camadas bem separadas, DTOs e mappers, Flyway, tratamento global de erros, `AuthorizationService` central, BCrypt, parser XML protegido contra XXE.

**A melhorar:**
- A autorização é por adesão: método sem chamada explícita fica aberto a qualquer logado. Foi a causa das falhas 1 a 4 e o risco continua para código novo.
- `GET /usuarios/{id}` e a leitura de tipos de obrigação seguem sem permissão específica; basta estar logado.
- `ClienteDetalhe.tsx` (1.488 linhas) e `Clientes.tsx` (1.430 linhas) concentram lógica demais.
- Controllers com lógica e `catch (Exception)`, como `UsuarioController`.

## Testes

| Item | Situação |
|---|---|
| Backend | 59 testes passando; 18 classes de teste para 29 services e 24 controllers |
| Front | 11 testes passando em 4 arquivos |
| Testes de API com segurança (401/403) | Praticamente inexistentes |
| E2E | Não existe; `playwright.config.ts` depende de pacote não instalado |
| Cobertura medida | Não existe (sem JaCoCo) |
| `tsc` | 2 erros em `Usuarios.tsx` |
| ESLint | 32 erros e 11 avisos; 29 são `any` |

## UX

Testadas as 8 rotas principais e a ficha do cliente em 375px, e as 8 rotas em 1280px.

**Bom:** nenhuma rolagem horizontal da página nos dois tamanhos; layout mobile próprio em Clientes; ficha 360° legível em 375px.

**A melhorar:**
- Muitos alvos de toque abaixo de 32px em 375px: Dashboard 62, Obrigações 59, Clientes 46, Financeiro 22.
- Campos sem rótulo acessível: Configurações 7, Consultas 3.
- Botões só com ícone sem nome acessível.
- Falha de conexão aparece como "CPF ou senha inválidos".
- Modal de notificações volta a cada recarga e empilha com a ficha do cliente.

## Ordem de correção

1. Encerrar a falha 6 com a troca do token.
2. Corrigir `USUARIOS_EDITAR`, que permite promover usuário a ADMIN.
3. Falha 7: CI com testes antes do deploy.
4. Falhas 8, 9 e 11, e atualização das dependências.
5. Conferir a senha do admin em produção.
6. Melhorias de UX e divisão das páginas grandes, junto das próximas alterações nelas.
