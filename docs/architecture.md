# Arquitetura da JB Fitness

## Contexto

A JB Fitness possui uma loja, um estoque físico e uma única proprietária operando o sistema. A aplicação não é um e-commerce: seu objetivo é controlar catálogo, estoque, vendas, custo e lucro.

## Arquitetura

A aplicação utiliza um monólito modular em Next.js. Leituras internas são feitas em Server Components e mutações por funções executadas no servidor. PostgreSQL é a fonte única da verdade e operações críticas usam transações com isolamento serializável.

Não haverá backend separado, microserviços, filas ou cache distribuído no MVP.

## Decisões confirmadas

- o estoque pertence à combinação de produto, cor e tamanho;
- todas as variações compartilham o preço de referência do produto;
- o preço efetivo pode mudar em cada item da venda;
- uma venda aceita vários itens e uma única forma de pagamento;
- formas de pagamento: PIX, dinheiro, débito ou crédito;
- correções preservam a versão anterior, enquanto exclusões definitivas removem lançamentos de teste;
- exclusões exigem confirmação e recalculam todo o histórico;
- vendas guardam um snapshot do custo médio vigente;
- cancelamentos restauram estoque usando o custo histórico da venda;
- datas informadas podem ser retroativas, mas o custo é processado na ordem real dos lançamentos;
- o lucro exibido corresponde à receita menos o custo das peças;
- uma foto será armazenada por produto;
- categorias iniciais: Conjuntos, Macacões e Macaquinhos.

## Direção da modelagem

Entidades planejadas:

- User;
- Category;
- Product;
- ProductVariant;
- StockEntry e StockEntryItem;
- Sale e SaleItem.

Produtos e variações podem ser desativados para preservar o histórico ou excluídos definitivamente. Ao excluir, suas referências são removidas e os lançamentos restantes são recalculados na mesma transação. Constraints do banco impedem estoque negativo e variações duplicadas.

## Custo médio

O custo médio móvel será calculado nas entradas:

```text
(quantidade atual × custo médio atual + quantidade recebida × custo recebido)
÷ quantidade resultante
```

O custo médio terá precisão adicional no banco. Valores exibidos e totais financeiros terão arredondamento monetário explícito.

## Concorrência

Entradas, vendas e reconstruções do estoque usam transações com isolamento `Serializable`. Assim, operações concorrentes conflitantes são abortadas e podem ser repetidas sem permitir estoque negativo.

## Privacidade

Dados financeiros reais não serão usados na apresentação pública do portfólio. Demonstrações e screenshots utilizarão dados fictícios ou anonimizados.
