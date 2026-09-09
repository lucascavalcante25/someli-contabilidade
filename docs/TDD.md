# TDD no SOMELI — como vamos evoluir juntos

## O ciclo em 30 segundos

1. **Red** — escreva um teste que descreve o comportamento desejado e **falha**.
2. **Green** — implemente o mínimo para o teste passar.
3. **Refactor** — limpe o código sem mudar o comportamento (testes continuam verdes).

## Exemplo que já existe no projeto

`NotificationServiceTest` cobre a regra: **mesma `chave_dedup` não gera notificação duplicada**.

Quando formos criar o importador OFX/CSV (extrato Nubank sem API), faremos o mesmo:

1. Teste do parser com um arquivo fictício pequeno.
2. Implementação do parser.
3. Teste de “lançamento já conciliado não duplica”.

## Comandos

```bash
npm test                 # frontend (Vitest)
npm run test:backend     # backend (Maven/JUnit)
npm run test:all         # ambos
```

## Regra no Cursor

Arquivo `.cursor/rules/tdd-someli.mdc` — o agente segue TDD em regras de negócio, segurança e integrações.
