#!/usr/bin/env bash
# Publica o último commit na VPS da Hostinger (app.aixtradex.com + license.aixtradex.com).
# Uso (Git Bash, dentro de site/):  bash scripts/deploy-vps.sh
# Só o que está commitado vai pro servidor. Configurações ficam em /srv/pulse/shared/.env (nunca no git).
set -euo pipefail

HOST="pulse@2.25.215.59"
KEY="$HOME/.ssh/aixtradex_vps"
RELEASE="$(date +%Y%m%d-%H%M%S)-$(git rev-parse --short HEAD)"
SSH=(ssh -i "$KEY" -o BatchMode=yes "$HOST")

if [ -n "$(git status --porcelain)" ]; then
  echo "Aviso: há mudanças não commitadas, elas NÃO vão pro servidor."
fi

echo "→ Enviando $RELEASE"
git archive --format=tar HEAD | "${SSH[@]}" "mkdir -p /srv/pulse/releases/$RELEASE && tar -x -C /srv/pulse/releases/$RELEASE"

"${SSH[@]}" "RELEASE=$RELEASE bash -s" <<'REMOTE'
set -euo pipefail
cd "/srv/pulse/releases/$RELEASE"
set -a; . /srv/pulse/shared/.env; set +a
echo "→ Instalando dependências"
npm ci --no-audit --no-fund --loglevel=error
echo "→ Atualizando banco"
npx drizzle-kit migrate
echo "→ Build"
npm run build >/tmp/pulse-build.log 2>&1 || { tail -40 /tmp/pulse-build.log; exit 1; }
ln -sfn "/srv/pulse/releases/$RELEASE" /srv/pulse/current
sudo systemctl restart pulse-web
sleep 4
curl -fsS -o /dev/null -w "→ Site respondeu HTTP %{http_code}\n" http://127.0.0.1:3100/pt
# Mantém só as 3 últimas versões.
ls -1dt /srv/pulse/releases/* | tail -n +4 | xargs -r rm -rf
echo "→ Publicado: $RELEASE"
REMOTE
