# Someli Contabilidade

Sistema interno do escritório: clientes, honorários, obrigações, fila de trabalho e alertas.
Não é emissor fiscal, não substitui o Fortes nem ERP/SPED. Stack: Spring Boot, React/Vite, PostgreSQL, Flyway.
Responder e escrever a UI em português. Commit e push só quando o usuário pedir.

## Definição de pronto

Toda implementação só termina quando estes passos foram feitos e o resultado foi relatado:

1. **TDD:** escreva primeiro um teste que falha, implemente o mínimo e refatore. Bug corrigido ganha teste que reproduz o bug. Detalhes em `docs/TDD.md`.
2. **Testes:** `npm run test:all`.
3. **Qualidade:** `npx tsc --noEmit -p tsconfig.app.json` e `npx eslint .` sem erro novo nos arquivos alterados.
4. **Segurança:** aplicar o checklist abaixo a todo endpoint, upload ou integração alterados.
5. **App real:** subir API e front, usar a funcionalidade e chamar o endpoint. Teste unitário sozinho não basta.
6. **UX:** conferir a tela em 375px e 1280px: sem rolagem horizontal da página, sem erro no console, com estados de carregando, vazio e erro.

Se algum passo não puder ser feito, dizer qual e por quê. Nunca relatar como testado o que não foi executado.

## Checklist de segurança

- Endpoint novo: exige autenticação, permissão (`requirePermission`) e alçada (`requireCompanyAccess`) dentro do service.
- Acesso por ID de recurso: carregar o recurso e validar a alçada do cliente dono antes de devolver ou alterar.
- Todo endpoint novo ganha teste de 401/403: sem token, sem permissão e sem alçada sobre o cliente.
- `permitAll` só com justificativa em comentário e proteção própria (token do webhook, limite de requisições).
- Webhook: validar o token antes de qualquer efeito e tratar reentrega sem duplicar.
- Upload: lista de tipos permitidos, limite de tamanho e nome gerado no servidor. Nome original nunca entra em caminho ou cabeçalho sem sanitizar.
- Segredos só em variável de ambiente, nunca como valor padrão no `application.yml`, em migration ou em código.
- Logs sem CPF, token, senha ou dado de cliente (LGPD).
- Dependência nova: conferir `npm audit` e manutenção do pacote.

## Padrões de arquitetura

- Backend em camadas: controller só traduz HTTP; regra de negócio e autorização ficam no service; acesso a dados no repository.
- `AuthorizationService` é a fonte única de autorização. O front apenas reflete o que o backend decide.
- API expõe DTO, nunca entidade. Validar entrada com Bean Validation.
- Erros vão para o `GlobalExceptionHandler`. Não capturar `Exception` no controller.
- Mudança de banco sempre por nova migration Flyway. Nunca editar migration já aplicada: isso já quebrou o deploy.
- Migration que altera dados deve ser idempotente e segura para produção.
- Front: chamadas pela camada `src/lib`, sem `any` novo, componentes de `src/components/ui`. Ao mexer em página acima de 500 linhas, extrair o trecho alterado em componente.
- Separar erro de rede de erro de credencial na UI.

## Comandos

- Testes: `npm test`, `npm run test:backend`, `npm run test:all`
- Subir local: configurações `api` (8080) e `web` (4200) em `.claude/launch.json`, com Postgres local.
- Em modo dev o front usa `localhost:8080`. O build de produção usa a API do Contabo.

## Referências

`docs/ROADMAP_PLATAFORMA_OPERACIONAL.md`, `docs/INTEGRA_CONTADOR.md`, `docs/ASAAS_COBRANCA.md`, `docs/INTEGRACOES_GRATUITAS.md`, `docs/AUDITORIA.md`
