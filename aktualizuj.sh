#!/usr/bin/env bash
# Aktualizacja gry IMPOSTOR na VPS jedną komendą:  sudo bash /opt/impostor/aktualizuj.sh
set -euo pipefail
DIR=/opt/impostor
cd "$DIR"

git config --global --add safe.directory "$DIR" 2>/dev/null || true
echo "▶ Pobieranie zmian z GitHuba…"
git fetch origin
git reset --hard origin/main          # serwer ma mieć dokładnie to, co jest na GitHubie

echo "▶ Instalowanie paczek…"
npm ci --no-audit --no-fund

echo "▶ Budowanie…"
rm -rf .next
npm run build

chown -R impostor:impostor "$DIR"
echo "▶ Restart gry…"
systemctl restart impostor
sleep 4

echo
echo "Kod na serwerze: $(git log -1 --format='%h %s (%cd)' --date=format:'%d.%m %H:%M')"
echo
bash "$DIR/sprawdz.sh" || true
