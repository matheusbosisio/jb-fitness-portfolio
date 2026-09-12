# JB Fitness — Gestão de estoque e vendas

Sistema web desenvolvido para a operação real de uma pequena loja de moda fitness. A aplicação substitui controles manuais por um fluxo integrado de catálogo, estoque, vendas e resultados financeiros, com foco no uso pelo celular.

## Problema de negócio

Cada produto pode ter várias combinações de cor e tamanho, e cada combinação precisa de saldo independente. O custo das peças também muda entre compras. A loja precisava saber quanto possui em estoque, impedir vendas sem saldo e calcular corretamente o lucro de cada venda sem transformar o projeto em um ERP ou e-commerce.

## Solução

- catálogo com foto, categoria, preço e variações de cor e tamanho;
- entradas com vários itens, quantidade, custo unitário e data retroativa;
- custo médio ponderado recalculado cronologicamente;
- vendas com vários itens, preço ajustável por peça e uma forma de pagamento;
- PIX, dinheiro, débito e crédito;
- bloqueio de vendas acima do estoque disponível;
- snapshot do custo no momento de cada venda;
- correção, cancelamento e exclusão definitiva com recálculo transacional;
- dashboard com resultados do dia e do mês, posição e potencial do estoque;
- gráfico de receita e lucro dos últimos sete dias;
- relatórios por período, produto e forma de pagamento;
- backup e restauração em JSON;
- modo claro e noturno;
- interface responsiva e acessível;
- conta única da proprietária, sem cadastro público.

## Regras principais

### Estoque por variação

O saldo pertence à combinação `produto + cor + tamanho`. A mesma combinação não pode ser cadastrada duas vezes no produto. Cor e tamanho podem ficar vazios quando o tipo de peça não precisar deles.

### Custo médio ponderado

```text
(estoque anterior × custo médio anterior + quantidade recebida × novo custo)
÷ quantidade resultante
```

O custo unitário é mantido com quatro casas decimais. Sempre que uma operação retroativa é criada, corrigida, cancelada ou excluída, o sistema reconstrói cronologicamente o histórico dentro da mesma transação.

### Venda e lucro

Cada item registra o preço realmente cobrado e uma cópia do custo médio vigente naquela data. Assim, uma compra futura não altera o resultado de uma venda antiga.

```text
receita = quantidade × preço efetivo
custo = quantidade × custo congelado
lucro = receita − custo
```

### Cancelar ou excluir

Cancelar preserva o lançamento no histórico e devolve as peças ao estoque. Excluir remove definitivamente um registro de teste ou lançado por engano. A exclusão exige confirmação e recalcula todos os saldos; uma entrada não pode ser excluída se isso tornar negativo o estoque de alguma venda posterior.

## Arquitetura

Monólito modular com Next.js. Páginas protegidas consultam o banco em Server Components; alterações passam por ações executadas no servidor. PostgreSQL é a fonte única da verdade e os fluxos financeiros usam transações com isolamento `Serializable`.

```text
Category 1 ── N Product 1 ── N ProductVariant
                                  │
                    ┌─────────────┴─────────────┐
                    │                           │
StockEntry 1 ── N StockEntryItem     Sale 1 ── N SaleItem

User 1 ── N StockEntry
User 1 ── N Sale criada ou cancelada
```

Não há backend separado, microserviços, filas, Redis ou arquitetura distribuída. Para uma única loja e uma única operadora, isso reduziria a manutenção sem gerar benefício real.

## Stack

- Next.js 16 e React 19;
- TypeScript;
- Tailwind CSS;
- PostgreSQL;
- Prisma ORM;
- Argon2id para senhas;
- Node Test Runner e `tsx`;
- ESLint.

## Integridade e concorrência

- constraints impedem quantidades, custos e estoques inválidos;
- variações possuem chave única normalizada;
- entrada, venda e recálculo acontecem na mesma transação;
- falhas produzem rollback completo;
- transações `Serializable` impedem que duas vendas consumam a mesma última peça;
- exclusões recalculam estoque, custo e indicadores antes de confirmar a operação.

## Segurança

- senha armazenada somente como hash Argon2id com salt;
- sessão opaca; o banco guarda apenas o hash SHA-256 do token;
- cookies `HttpOnly`, `SameSite=Lax` e `Secure` em produção;
- autorização conferida novamente nas páginas, ações e APIs;
- bloqueio temporário após tentativas repetidas de login;
- cabeçalhos de segurança e validação server-side;
- segredos e credenciais fora do Git.

## Testes

Os testes unitários cobrem normalização, validações, custo médio, cálculos financeiros, períodos, imagens, backup e autenticação. Os testes de integração usam PostgreSQL separado e verificam:

- entrada e custo médio;
- venda, redução do saldo e snapshot do custo;
- cancelamento e restauração do estoque;
- rejeição e rollback de venda sem saldo;
- exclusão segura de venda e entrada;
- concorrência pela última unidade.

```bash
pnpm lint
pnpm test
pnpm build
```

Para integração, defina `TEST_DATABASE_URL` com um banco exclusivo e execute `pnpm test:integration`. Esse banco é limpo durante o teste; nunca use a URL de desenvolvimento ou produção.

## Executar localmente

Requisitos: Node.js e pnpm.

```bash
pnpm install
pnpm db:dev
pnpm db:migrate
pnpm db:seed
pnpm dev
```

Copie as URLs emitidas pelo banco local para `DATABASE_URL` e `SHADOW_DATABASE_URL` no arquivo `.env`. A aplicação ficará em `http://localhost:3000`.

Para criar a única conta proprietária, defina temporariamente `OWNER_NAME`, `OWNER_EMAIL` e `OWNER_PASSWORD` e execute:

```bash
pnpm owner:create
```

## Responsividade e experiência de uso

Os formulários e ações principais foram desenhados primeiro para celular: alvos de toque grandes, mensagens claras, estados vazios, prevenção de erros e navegação curta. No desktop, o espaço adicional é usado para tabelas, indicadores e relatórios mais amplos.

## Backup e fotos

O backup gera um arquivo JSON validado e a restauração exige confirmação textual. Fotos são salvas localmente durante o desenvolvimento e usam Cloudinary quando as variáveis de produção estão configuradas.

## Hospedagem planejada

O projeto está preparado para Render, Neon e Cloudinary, mas ainda não foi publicado. A ordem e os cuidados de produção estão em `docs/hosting.md`.

## Decisões e trade-offs

- estoque materializado na variação torna consultas frequentes simples, enquanto o histórico permite reconstrução segura;
- correções preservam versões antigas, mas exclusões definitivas foram mantidas para remover lançamentos de teste;
- custo médio é reconstruído por data comercial para aceitar lançamentos retroativos corretamente;
- não há controle de despesas operacionais, portanto o “lucro” exibido é receita menos custo das peças;
- armazenamento local de fotos serve apenas ao desenvolvimento, pois discos gratuitos de hospedagem podem ser temporários.

## Limitações atuais

- apenas uma loja, um estoque e uma proprietária;
- sem clientes, emissão fiscal, contas a pagar ou receber;
- sem trocas, devoluções comerciais, perdas ou transferências;
- sem integração com WhatsApp ou e-commerce;
- sem recuperação automática de senha;
- planos gratuitos de hospedagem não oferecem disponibilidade adequada para uma operação comercial crítica.

## Próximos passos

1. realizar uma rodada final de aceitação com dados fictícios;
2. registrar screenshots sem informações financeiras reais;
3. publicar o código no GitHub após aprovação;
4. provisionar banco e imagens em serviços externos;
5. validar backup, restauração e concorrência no ambiente hospedado;
6. migrar para infraestrutura paga antes do uso diário crítico.

## Documentação adicional

- `docs/architecture.md`: decisões arquiteturais;
- `docs/database.md`: modelagem e integridade;
- `docs/authentication.md`: autenticação e sessões;
- `docs/local-development.md`: ambiente local e testes;
- `docs/hosting.md`: preparação para publicação.

## Uso de inteligência artificial

Ferramentas de IA foram utilizadas como apoio em arquitetura, implementação, revisão e testes. As decisões de negócio, validações e trade-offs permanecem documentados para que o projeto possa ser compreendido, mantido e explicado pelo autor.

