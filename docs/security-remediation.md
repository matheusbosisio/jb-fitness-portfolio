# Proteções de autenticação e implantação

O limite de login é compartilhado pelo PostgreSQL: cinco tentativas por conta em quinze minutos. A reserva é atômica e ocorre antes do cálculo da senha; tentativas simultâneas e processos reiniciados não ganham um novo orçamento. A chave deriva do ID persistente da conta, sem confiar em cabeçalhos de IP enviados pelo cliente. Contas inexistentes não criam registros. Todas as tentativas contam, inclusive acessos corretos; o prazo não é prolongado por tentativas bloqueadas.

Esse limite pode permitir que alguém bloqueie temporariamente uma conta conhecida. Ele não substitui proteção contra tráfego abusivo no provedor de hospedagem. Sessões existentes continuam funcionando durante o bloqueio.

## Implantação

Execute `pnpm db:deploy` antes de iniciar a nova aplicação. A migração adiciona somente a tabela `login_attempts`; não altera registros de usuários ou vendas. Sem essa tabela o login falha de forma fechada. O comando de build do Render já executa a migração.

A CSP usa nonce por resposta; todas as páginas são dinâmicas e não devem receber cache público de HTML. Estilos inline continuam permitidos por compatibilidade com os gráficos. Cookies e validação de sessão permanecem obrigatórios nas rotas protegidas.

## Dependências

Os overrides são restritos a `prisma > mysql2 3.24.4` e `@prisma/config > deepmerge-ts 8.0.2`. A alteração principal de deepmerge 8 envolve Maps; a configuração Prisma deste projeto usa objetos simples. Validação do schema, geração do cliente, migrações, testes e build foram executados com esses overrides. Remova-os quando uma versão estável do Prisma já usar versões corrigidas.

## Verificação

`pnpm test` com `TEST_DATABASE_URL` apontando exclusivamente para um banco descartável executa os testes de integração, que apagam dados de teste. Nunca use a URL de produção. O workflow Security checks cria um PostgreSQL temporário e verifica testes, lint, build e auditoria de produção.
