# Preparação da hospedagem

## Arquitetura sugerida

- Aplicação: Render Web Service (plano gratuito apenas para validação e demonstração).
- Banco PostgreSQL: Neon Free, usando uma URL com pool de conexões em `DATABASE_URL`.
- Fotos: Cloudinary Free, usando as três variáveis `CLOUDINARY_*`.

O plano gratuito do Render hiberna após inatividade e o próprio provedor não o recomenda para produção. Antes de a loja depender do sistema diariamente, migre o serviço web para um plano com disponibilidade adequada. A aplicação não deve ser publicada no Hobby da Vercel para operação comercial, pois esse plano é destinado a uso pessoal e não comercial.

## Ordem de publicação

1. Criar o banco no Neon e copiar a URL com pool de conexões.
2. Criar uma conta Cloudinary e obter cloud name, API key e API secret.
3. Enviar o repositório ao GitHub somente depois da aprovação final.
4. No Render, criar o serviço a partir do `render.yaml`.
5. Cadastrar `DATABASE_URL`, `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY` e `CLOUDINARY_API_SECRET` como segredos.
6. Aguardar migrations e build terminarem.
7. Criar a conta inicial da proprietária por uma execução administrativa segura, sem registrar a senha em logs.
8. Testar login, produto com foto, entrada, venda, relatório, backup e restauração.

## Comportamento das fotos

Sem variáveis Cloudinary, o ambiente de desenvolvimento continua salvando fotos em `public/uploads/products`. Em produção, o envio é bloqueado até o armazenamento online estar configurado, evitando que imagens sejam perdidas no disco temporário da hospedagem.

## Verificação de saúde

`GET /api/health` consulta o PostgreSQL. O Render usa essa rota para detectar indisponibilidade do banco ou da aplicação.
