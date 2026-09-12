# Ambiente local

## Banco de dados

O desenvolvimento usa Prisma Postgres local, executado por PGlite e exposto por uma conexão compatível com PostgreSQL. Isso evita instalar Docker ou um servidor PostgreSQL completo apenas para desenvolver a aplicação.

```bash
pnpm db:dev
```

Na primeira execução, copie o `DATABASE_URL` e o `SHADOW_DATABASE_URL` apresentados para `.env`. Esse arquivo é ignorado pelo Git. As duas URLs devem apontar para bancos distintos: o Prisma recria o banco auxiliar ao validar migrations.

Depois, prepare o banco:

```bash
pnpm db:migrate
pnpm db:seed
pnpm db:status
```

Para encerrar a instância:

```bash
pnpm db:stop
```

## Testes de integração

Os fluxos críticos devem ser executados em um banco separado. Inicie outra instância, aplique as migrations nela e informe sua URL somente em `TEST_DATABASE_URL` antes de executar:

```bash
pnpm test:integration
```

O teste cria e remove dados temporários e, por segurança, não utiliza `DATABASE_URL`. Ele valida entrada, custo médio, snapshot do custo da venda, cancelamento, rollback e duas vendas concorrentes disputando a última peça.

## Limites

O servidor local é adequado para desenvolvimento funcional e integração. Antes da produção, os testes críticos de concorrência também serão executados em PostgreSQL hospedado, porque o servidor local utiliza PGlite internamente e não deve ser a única evidência para comportamento concorrente.

O banco de produção será escolhido separadamente. Dados locais, senhas e URLs de conexão nunca devem ser enviados ao repositório.
