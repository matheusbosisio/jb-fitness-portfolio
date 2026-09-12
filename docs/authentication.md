# Autenticação

## Estratégia

A aplicação usa autenticação própria e restrita a uma conta proprietária. Não existe cadastro público, recuperação pública ou autenticação social no MVP.

A senha é transformada por Argon2id com os parâmetros mínimos recomendados pela OWASP: 19 MiB de memória, duas iterações e paralelismo 1. O banco recebe somente o hash com salt; a senha original não pode ser recuperada.

## Sessão

Após um login válido:

1. o servidor gera 32 bytes aleatórios;
2. o navegador recebe o token em um cookie protegido;
3. o PostgreSQL recebe apenas o SHA-256 desse token;
4. a sessão expira depois de sete dias.

Se o banco for exposto, o hash armazenado não pode ser usado diretamente como cookie. O cookie usa `HttpOnly`, `SameSite=Lax`, caminho raiz e `Secure` em produção.

## Proteção das rotas

O Proxy do Next.js verifica a presença do cookie para redirecionamento rápido. Isso não é considerado autorização suficiente. Todas as páginas protegidas, ações do servidor e rotas de backup validam a sessão no banco e confirmam que a proprietária continua ativa.

Depois de cinco senhas incorretas vindas da mesma origem, novas tentativas ficam bloqueadas por 15 minutos. O controle é mantido em memória e serve como primeira barreira; a infraestrutura publicada também deve oferecer limitação de tráfego.

## Criação inicial

A primeira conta é criada por `pnpm owner:create` usando variáveis temporárias de ambiente. O comando:

- valida nome, e-mail e senha;
- normaliza o e-mail;
- exige ao menos 12 caracteres;
- recusa a operação caso já exista um usuário;
- não imprime a senha.

Não coloque credenciais reais em `.env.example`, comandos versionados, commits ou documentação.

## Limitações conhecidas

- ainda não há recuperação automática de senha;
- a recuperação de senha continua sendo um procedimento administrativo, adequado ao cenário de conta única.

Uma redefinição administrativa futura deverá revogar todas as sessões existentes.
