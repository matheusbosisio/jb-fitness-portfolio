# Modelo de dados

## Relacionamentos

```text
Category 1 ── N Product 1 ── N ProductVariant
                                  │
                    ┌─────────────┴─────────────┐
                    │                           │
StockEntry 1 ── N StockEntryItem     Sale 1 ── N SaleItem
      │                                      │
      └── pode substituir outra entrada      └── pode substituir outra venda

User 1 ── N StockEntry
User 1 ── N Sale criada
User 1 ── N Sale cancelada
```

## Estoque por variação

`ProductVariant` mantém `stockQuantity` e `averageUnitCost`. A combinação de produto, cor normalizada e tamanho é única.

O tamanho interno `NO_SIZE` representa produtos sem tamanho. Cor ausente é armazenada como `NULL`, enquanto `normalizedColor` usa uma string vazia para garantir unicidade no PostgreSQL.

O estoque atual é materializado na variação para tornar consultas frequentes rápidas. Entradas e vendas preservam o histórico que explica esse valor. Qualquer alteração deverá atualizar histórico e saldo na mesma transação.

## Precisão financeira

- preço de venda e totais: `DECIMAL(14,2)`;
- custo unitário e custo médio: `DECIMAL(14,4)`;
- quantidades: números inteiros.

Custos mantêm quatro casas para reduzir perdas sucessivas no custo médio. O fechamento de cada item da venda é arredondado para duas casas e congelado.

## Histórico e correções

Por padrão, entradas e vendas são corrigidas sem sobrescrever a versão anterior. Uma correção cria uma nova operação ligada à anterior pelos campos `replacesEntryId` ou `replacesSaleId`.

Essa ligação torna explícito qual lançamento substituiu o anterior e permite mostrar uma experiência de “editar” sem perder o histórico original.

Para remover lançamentos de teste, também existe exclusão definitiva com confirmação. Itens dependentes são removidos dentro de uma transação e o histórico restante é recalculado antes do commit. Uma entrada não é excluída quando sua ausência deixaria uma venda posterior com estoque negativo.

## Proteções no banco

A migration contém constraints adicionais às relações geradas pelo Prisma:

- estoque e custos não negativos;
- quantidades de itens positivas;
- nomes e e-mails normalizados;
- variações únicas;
- totais da venda matematicamente coerentes;
- cancelamento com data e responsável;
- impossibilidade de uma operação substituir a si própria;
- chaves estrangeiras com exclusão restrita.

Validações equivalentes também existirão nos casos de uso para produzir mensagens amigáveis. As constraints são a última barreira contra inconsistência.

## Datas retroativas

`occurredAt` e `soldAt` representam a data comercial informada. `createdAt` registra quando o lançamento entrou no sistema. O custo médio segue a ordem da data comercial e usa `createdAt` como desempate; por isso, inserir, corrigir ou excluir uma operação retroativa reconstrói os custos posteriores.

## Dados iniciais

O seed cria ou reativa, de forma idempotente:

- Conjuntos;
- Macacões;
- Macaquinhos.

Executar o seed mais de uma vez não duplica categorias.
