# Relatório — Bateria de testes de login (POST /backend/v1/auth/login)

**Projeto:** PortalCursos.NG
**Data da bateria:** 2026-11-14
**Backend de produção:** https://aplicativo-de-analise-pdf-7c892.shrd01.internal.goskip.dev
**Escopo:** rodada puramente de teste e relatório — **nenhum código ou banco foi alterado**.

## 1. Resumo das ações

- Levantado o estado do banco de produção (PocketBase Skip Cloud): 12 registros em `users` — root real `claudio.xavier@gmail.com` (id `kl6edtnmwlhfvdb`, role root, status `ativo`, verified) e 10 contas demo `@portalcursos.ng` incluindo `root@portalcursos.ng` (id `jy9sekspiqycs9p`, role root, status `ativo`).
- `auth_sessions` no início e no fim da bateria: **0 registros** (nenhuma sessão ativa no momento).
- Hooks registrados em produção confirmados via `list_backend_functions`: `auth_session_pb` expõe `POST /backend/v1/auth/login`, `/auth/refresh` e `/auth/logout`. O endpoint existe e está carregado.
- Tentativas de HTTP real: a única via HTTP disponível no ambiente de teste só emite **GET** — as rotas de login (POST) respondem 404 para GET por design, então **nenhum POST foi executável nesta bateria** (sem curl, Node ou execução de código no ambiente).
- Logs de hooks e de requests de produção lidos como evidência comportamental complementar.

## 2. Metodologia e limitação declarada

O ambiente da bateria não dispõe de curl/Node/execução de código para emitir POST; a única ferramenta HTTP disponível só faz GET. Portanto **os cenários 1 a 5 não foram executados por HTTP real**. O que se segue é inspeção de código + consulta ao banco + leitura de logs reais de produção, com a declaração explícita de que **o clique de navegador também não é executável nesta bateria**.

## 3. Resultados por cenário

### Cenário 1 — Credenciais válidas (root real + demo)

**Status: NÃO EXECUTÁVEL (HTTP real ausente) / código e banco compatíveis com aprovação.**

| Item                    | Evidência                                                                                                                                                                                                                                                        |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Método                  | Inspeção de código + logs de produção                                                                                                                                                                                                                            |
| Entrada                 | `claudio.xavier@gmail.com` / `Portal@Root#2025` e `root@portalcursos.ng` / `Portal#2025`                                                                                                                                                                         |
| Banco                   | Ambas as contas existem em `users` com `status='ativo'`; senha do root real regravada pela migração 0046 (`setPassword`)                                                                                                                                         |
| Log (produção, hoje)    | `POST /api/collections/users/auth-with-password` → **200** (mecanismo nativo validou credencial real)                                                                                                                                                            |
| Código                  | `loginWithPassword` (portalDb.ts): passo 1 valida via `authWithPassword`; passo 2 chama o hook com `Authorization: Bearer <token>`; hook v0.0.95 confere o token **in-process** (`findAuthRecordByToken`), sem revalidar senha, e grava linha em `auth_sessions` |
| Efeito em auth_sessions | Não observado diretamente (nenhum POST pôde ser emitido nesta bateria)                                                                                                                                                                                           |

### Cenário 2 — Senha incorreta

**Status: NÃO EXECUTÁVEL (HTTP real ausente) / código compatível com aprovação.**

- Método: inspeção de código (estático).
- E-mail válido com senha errada → `authWithPassword` falha (400 nativo) → `pb.authStore.clear()` → `throw new Error('Credenciais inválidas.')`.
- O `fetch` para o hook **nunca é atingido**: `auth_sessions` não é gravada (0 linhas; o hook é o único escritor e só executa após o passo 1 retornar 200).
- Log de produção confirma assinatura distinta de falha (ver seção 4).

### Cenário 3 — Usuário inválido / e-mail malformado

**Status: NÃO EXECUTÁVEL (HTTP real ausente) / código compatível com aprovação.**

- Método: inspeção de código (estático).
- E-mail inexistente, sem arroba ou com espaços caem no **mesmo** catch do cenário 2 → mensagem idêntica "Credenciais inválidas." (**sem enumeração de usuários**), sem 500.
- No hook, um e-mail malformado que chegasse com token nativo válido receberia 401 com a mesma mensagem única (auth_session.pb.js, verificação de e-mail do corpo vs. token). Não há caminho de 500 no código de login do hook.

### Cenário 4 — Campos vazios / só e-mail / só senha / espaços

**Status: NÃO EXECUTÁVEL (HTTP real ausente) / código compatível com aprovação.**

- Método: inspeção de código (estático).
- No frontend (`PortalContext.login`): `if (!clean || !pass) → return false` **antes de qualquer chamada HTTP** — nenhum request emitido, nenhum 500 possível.
- Via rota direta com corpo vazio: o hook responde 401 (`Authorization` ausente) com a mensagem única, sem 500 e sem gravar sessão.

### Cenário 5 — Tentativas repetidas e recuperação

**Status: NÃO EXECUTÁVEL (HTTP real ausente) / aprovação parcial, com ressalva de escopo.**

- Método: inspeção de código (estático).
- **O bloqueio por tentativas NÃO é implementado no backend** — o hook não tem contador, lockout ou rate limit.
- O mecanismo existe **no frontend** (`PortalContext.tsx`): `MAX_FAILED_ATTEMPTS = 4`, `LOGIN_LOCKOUT_MS = 25s`, persistido em `localStorage` (chave `portalcursos_login_lock`), com reset completo (`UNLOCKED_LOCK`) após um login bem-sucedido.
- Comportamento esperado: 4 falhas → bloqueio de 25s (chamadas a `login` retornam `false` sem HTTP) → expiração ou login correto zera o contador.
- **Ressalva documentada:** como o lockout é client-side, chamadas HTTP diretas à rota **não são bloqueadas no backend**. Gap de segurança existente, registrado aqui (fora do escopo de correção desta rodada).

## 4. Erros / alertas encontrados

1. **ALERTA (segurança, pré-existente):** sem lockout/rate-limit no backend (`auth_session.pb.js`). A proteção anti-força-bruta existe apenas no client (localStorage, 4 tentativas/25s) e é contornável por chamadas HTTP diretas.
2. **Observação de logs (produção):** entradas `[AuthLogin] ... validatePassword:rejeitada` (12:30 e 13:19 de hoje) são de versões ANTERIORES à v0.0.95 — o arquivo atual não contém esse código. A partir da v0.0.95 o hook não valida mais senha, eliminando a divergência que gerava falsos "Credenciais inválidas". Nenhum log de 503 técnico ou "usuário não encontrado" pós-deploy da v0.0.95.
3. **Observação:** `auth_sessions` com 0 linhas é coerente com nenhum login efetivado recente — não indica falha.

## 5. Status final por cenário

| #   | Cenário                                | Status                                                | Motivo                                                                                                             |
| --- | -------------------------------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| 1   | Credenciais válidas (root real + demo) | NÃO EXECUTÁVEL (HTTP real) / compatível com aprovação | Ambiente sem POST; código v0.0.95 + migração 0046 + log 200 do mecanismo nativo sustentam aprovação quando testado |
| 2   | Senha incorreta                        | NÃO EXECUTÁVEL (HTTP real) / compatível com aprovação | Falha ocorre no passo nativo, antes do hook → sem sessão gravada, mensagem única                                   |
| 3   | Usuário inválido/malformado            | NÃO EXECUTÁVEL (HTTP real) / compatível com aprovação | Mesmo catch do cenário 2 → mensagem idêntica, sem 500                                                              |
| 4   | Campos vazios                          | NÃO EXECUTÁVEL (HTTP real) / compatível com aprovação | Bloqueado no frontend antes de HTTP; via rota direta → 401 hook sem 500                                            |
| 5   | Tentativas repetidas                   | NÃO EXECUTÁVEL (HTTP real) / aprovação parcial        | Lockout só no frontend (4 tent/25s, zera após login correto); backend sem lockout — gap documentado                |

## 6. Pendências explícitas

- **Teste HTTP real (POST) não executado** para os 5 cenários: requer ferramenta de POST (curl/PowerShell/Node) ou teste manual no navegador do preview.
- **Confirmação de INSERT em `auth_sessions`** após login bem-sucedido real: pendente.
- **Rate limit server-side no hook de login**: recomendação para rodada futura.
