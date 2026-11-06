# Relatório de Auditoria de Segurança e Lógica — PortalCursos.NG

SPA React + Vite + TypeScript, **sem backend**: dados em memória + `localStorage`.
Locale: pt-BR. Última atualização: rodada 2 da auditoria.

> Ambientes de demonstração, documentados como decisão de produto e **não**
> corrigidos de propósito (tornar o demo realista):
>
> - A senha do login é aceita/ignorada — qualquer e-mail cadastrado entra sem validar senha.
> - O passcode do portão aparece na própria tela, com botão "Preencher".

---

## Rodada 1 (commit 0.0.2) — corrigido

Todas as correções em `src/context/PortalContext.tsx`:

1. **Sessão sem fallback admin**: o app não inicializa mais logado como
   `DEMO_ACCOUNTS[1]`; sem id válido no `localStorage`, `currentUser = null`.
2. **Validação do `localStorage`**: toda leitura passa por `loadJsonState` /
   `loadLockState` com `try/catch` e checagem de estrutura — JSON corrompido ou
   manipulado volta ao estado limpo em vez de tela branca ou sessão falsa.
3. **Escalonamento de perfil**: `updateUserRole` permite que somente `root`
   conceda o papel `root` (guarda de privilégio).
4. **Trava de curso no contexto**: `updateCourse` revalida `lockedForEditing`
   no provider (não só na UI) — apenas `root` edita curso trancado.
5. **Reajuste de preços sanitizado**: `updatePriceTableItem` rejeita
   NaN/negativos/multas > 100% antes de gravar tabela e log de auditoria.
6. **Permissão revalidada na navegação**: `Index.tsx` revalida
   `canAccessModule` além da UI da sidebar (PortalShell).

## Rodada 2 — corrigido nesta auditoria

1. **Atalhos do painel respeitam permissão** (`DashboardOverview.tsx`): os
   botões de navegação e o grid de módulos só disparam `onNavigate` quando
   `canAccessModule` é verdadeiro; módulo sem permissão não abre (defesa em
   profundidade junto com a revalidação do `Index.tsx`).
2. **Persistência consistente** (`PortalContext.tsx`): `priceAuditLogs` e
   `billingExceptions` agora persistem no `localStorage` como `priceTable`,
   via `persistJson` (try/catch) — a trilha de auditoria tarifária sobrevive
   ao reload junto com a tabela.
3. **Lockout sobrevive ao reload** (`PortalContext.tsx`): tentativas falhas e
   expiração do portão (`GATE_LOCK`, 30s) e do login (`LOGIN_LOCK`, 25s) são
   persistidas e revalidadas (`loadLockState`); recarregar a página não zera o
   bloqueio (anti brute force por F5). Bloqueio já expirado enquanto a página
   estava fechada recomeça limpo.
4. **Timers com cleanup**:
   - Pix copiado (3s) e checkout de cartão (1,2s): `FinanceiroModule.tsx`
     guarda os timers em refs e limpa no unmount.
   - Auto-login pós-cadastro (1,2s): `LoginModalScreen.tsx` idem.
   - Lockouts (30s/25s): o hook `useLockExpiry` no provider limpa o timer
     quando o componente desmonta e só dispara setState enquanto montado.
5. **QR Code Pix e clipboard** (`FinanceiroModule.tsx`):
   - `<img src>` só recebe URL validada (`isTrustedPixQr`): aceita apenas
     `data:image/*;base64` e a origem do fluxo interno (`api.qrserver.com` do
     sandbox ou o próprio host); URLs de terceiros / `javascript:` caem no
     ícone de fallback.
   - `navigator.clipboard.writeText` agora é `await`ed em try/catch: falha de
     clipboard exibe toast de erro com instrução de cópia manual, em vez de
     rejeição não tratada.
6. **Uploads com limite** (`MatriculaModule.tsx`): foto 3x4 limitada a 2 MB
   (JPG/PNG/WEBP) e documentos a 5 MB cada (PDF/JPG/PNG/WEBP), com mensagem
   de erro ao usuário quando exceder; `FileReader` com `onerror` tratado.
7. **Ids sem colisão**: novo utilitário `src/lib/id.ts` — `crypto.randomUUID()`
   quando disponível, com fallback para `getRandomValues` (+ `Math.random` como
   última instância). Substitui todos os `Date.now().slice(-4)` do contexto,
   matrícula e sugestão de código de curso.

## Limitações da arquitetura (sem backend) — documentadas, não corrigíveis no cliente

- **Autenticação real**: login é client-side; senha ignorada é decisão de demo.
  Um atacante com acesso ao DevTools pode criar/alterar `localStorage`
  (`portalcursos_users`, `portalcursos_current_user_id`) e virar qualquer
  perfil, inclusive `root`. Sem servidor não há como impedir.
- **RBAC no servidor**: `canAccessModule` é UI/contexto; os dados do módulo
  estão todos no cliente, então a "permissão" esconde informação, não protege.
- **Headers de segurança** (CSP, HSTS, X-Frame-Options): exigem servidor/CDN;
  a SPA estática não os define.
- **PagBank/Pix real**: checkout é simulado (sandbox mock, QR fictício); nunca
  liquida dinheiro de verdade. Nenhum dado de cartão sai do navegador.
- **Rate limiting global**: o lockout é por navegador (`localStorage`); limpar
  dados do site ou usar aba anônima o contorna. Servidor é quem faria isso bem.
- **Trilha de auditoria imutável**: `priceAuditLogs` persistidos ainda podem
  ser editados/apagados via DevTools; imutabilidade real exige backend
  append-only.
