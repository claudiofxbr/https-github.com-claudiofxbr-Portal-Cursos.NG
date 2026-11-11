#!/bin/sh
# Verificação simples de arquivos sensíveis versionados (PortalCursos.NG).
# Uso: sh scripts/check-sensitive-files.sh
# Retorna código 1 se encontrar arquivo sensível rastreado pelo git.
# Não depende de ferramentas externas — apenas git e grep.

set -u

fail=0

# 1. Padrões de nome de arquivo que NUNCA devem estar rastreados
sensitive_patterns='^\.env$|^\.env\.|\.pem$|\.key$|\.p12$|\.pfx$|id_rsa|credentials|\.pinfo$'

echo "==> Verificando arquivos sensíveis rastreados pelo git..."

for f in $(git ls-files 2>/dev/null); do
  case "$f" in
    pocketbase/pb_data/*|pb_data/*)
      echo "SENSÍVEL: $f (dados do banco de produção — LGPD)"; fail=1 ;;
    *.log)
      echo "SENSÍVEL: $f (log)"; fail=1 ;;
    *)
      if echo "$f" | grep -Eq "$sensitive_patterns"; then
        echo "SENSÍVEL: $f (padrão de segredo/credencial)"; fail=1
      fi
      ;;
  esac
done

# 2. Segredos hardcoded em código versionado (src/ e pocketbase/)
echo "==> Verificando segredos hardcoded em código..."
if grep -rInE "(sk-[A-Za-z0-9]{20,}|ghp_[A-Za-z0-9]{30,}|AKIA[0-9A-Z]{16}|-----BEGIN (RSA |EC )?PRIVATE KEY-----)" \
    src pocketbase scripts 2>/dev/null; then
  echo "SENSÍVEL: padrão de token/chave encontrado acima"; fail=1
fi

if [ "$fail" -eq 0 ]; then
  echo "OK: nenhum arquivo sensível versionado."
fi

exit $fail
