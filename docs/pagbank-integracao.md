# Integração PagBank — Guia do Administrador

Este guia explica como cadastrar, testar, trocar e remover o token de API do
PagBank no PortalCursos.NG. A operação está disponível **somente para o perfil
root**.

## Onde está a tela

1. Faça login com uma conta **root**.
2. No menu lateral ("Módulos do Sistema"), clique em **Integração PagBank**
   (ícone de chave).

> Não vê o módulo no menu? Seu usuário não é root. A tela e os endpoints do
> backend recusam qualquer outro perfil.

## Passo 1 — Obter o token no PagBank (sandbox)

1. Acesse a área de desenvolvedor do PagBank
   (<https://dev.pagbank.brb.com.br> — produção usa a conta comercial; para
   testes use o ambiente **sandbox**).
2. Entre na sua conta de testes (sandbox) e abra a seção de **aplicações /
   credenciais de API**.
3. Crie (ou selecione) a aplicação do portal e copie o **token de API**
   (Bearer). No sandbox o token é diferente do de produção — confirme que você
   copiou o do ambiente sandbox.
4. Guarde o token temporariamente no gerenciador de senhas da instituição. **Não
   envie por e-mail, chat ou captura de tela.**

## Passo 2 — Colar o token na tela

1. Em **Integração PagBank**, localize o campo "Token de API do PagBank
   (sandbox)".
2. Cole o token (o campo aparece mascarado; use o ícone de olho para conferir
   antes de salvar).
3. Clique em **Salvar token**.

Ao salvar:

- aparece a confirmação "Token salvo";
- o campo do formulário é limpo imediatamente — o token nunca mais é exibido;
- o card "Status do token" passa a mostrar **Token configurado**, a máscara com
  as **4 últimas posições** (ex.: `••••••••abcd`) e a data da gravação.

O token é enviado uma única vez por HTTPS ao endpoint
`POST /backend/v1/pagbank/token` e armazenado **somente no servidor**, em uma
collection interna (`_pagbank_config`) sem nenhuma regra de acesso via API —
nenhum usuário, mesmo administrador, consegue lê-lo pelo navegador. Ele também
não é gravado em localStorage, sessionStorage ou cookies do portal.

## Passo 3 — Testar a conexão

1. Clique em **Testar conexão**.
2. O servidor faz uma chamada leve à API sandbox do PagBank
   (`https://sandbox.api.pagseguro.com`) usando o token salvo e responde apenas:
   - **Sucesso** — "o token foi aceito pela API sandbox do PagBank";
   - **Falha** — mensagem genérica (token rejeitado, erro do ambiente ou falha
     de comunicação). A resposta nunca inclui o token.
3. Se o teste falhar: confira se copiou o token do ambiente **sandbox**, gere um
   novo no painel do PagBank e repita o passo 2.

## Trocar (rotacionar) o token

1. Gere um novo token no painel do PagBank.
2. Na tela do portal, cole o novo token e salve — a substituição é imediata
   (o token antigo deixa de ser usado no mesmo instante).
3. Revogue o token antigo na conta do PagBank.
4. Use **Testar conexão** para confirmar o novo token.

## Remover o token

1. Clique em **Remover token** e confirme.
2. O token é apagado do servidor e o status volta a "Nenhum token configurado".
3. Revogue também o token na conta do PagBank para invalidá-lo definitivamente.

## Perguntas rápidas

- **Quem pode ver o token?** Ninguém, nem no portal. O perfil root cadastra e
  testa, mas o valor nunca é retornado por nenhum endpoint nem aparece em logs.
- **Onde o token fica guardado?** No banco do servidor, em uma collection
  interna bloqueada para acesso via API REST; somente o código do servidor o lê.
- **O que acontece se o token vazar?** Remova-o na tela (ou revogue direto no
  PagBank), gere outro e cadastre novamente.
