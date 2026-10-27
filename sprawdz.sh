#!/usr/bin/env bash
# Szybki przegląd stanu gry IMPOSTOR na VPS:   sudo bash /opt/impostor/sprawdz.sh [twoja-domena.pl]
# Podanie domeny dodatkowo sprawdza, czy strona odpowiada z internetu (przez nginx i HTTPS).
set -uo pipefail
DOMAIN="${1:-}"
G=$'\e[32m'; Y=$'\e[33m'; R=$'\e[31m'; B=$'\e[1m'; N=$'\e[0m'
ok()   { echo "  ${G}✔${N} $*"; }
warn() { echo "  ${Y}!${N} $*"; PROBLEMS=$((PROBLEMS+1)); }
bad()  { echo "  ${R}✘${N} $*"; PROBLEMS=$((PROBLEMS+1)); }
PROBLEMS=0

echo "${B}Usługa gry${N}"
if systemctl is-active --quiet impostor; then
  since=$(systemctl show impostor -p ActiveEnterTimestamp --value)
  ok "impostor działa (od: ${since})"
else
  bad "impostor NIE działa — zobacz: journalctl -u impostor -n 50"
fi
restarts=$(systemctl show impostor -p NRestarts --value 2>/dev/null || echo 0)
[ "${restarts:-0}" -gt 0 ] && warn "usługa restartowała się sama ${restarts}× (możliwe awarie — sprawdź logi)"

echo "${B}Odpowiedź serwera (/healthz)${N}"
JSON=$(curl -fsS -m 5 http://127.0.0.1:3000/healthz 2>/dev/null)
if [ -z "$JSON" ]; then
  bad "serwer nie odpowiada na porcie 3000"
else
  node -e '
    const r = JSON.parse(process.argv[1]);
    const c = { ok: "\x1b[32m✔\x1b[0m", warn: "\x1b[33m!\x1b[0m", error: "\x1b[31m✘\x1b[0m" }[r.status] ?? "?";
    const p = r.process, s = r.system;
    const up = (t) => t > 86400 ? `${Math.floor(t / 86400)} d ${Math.floor((t % 86400) / 3600)} h` : t > 3600 ? `${Math.floor(t / 3600)} h ${Math.floor((t % 3600) / 60)} min` : `${Math.floor(t / 60)} min`;
    console.log(`  ${c} status: ${r.status}`);
    for (const w of r.warnings ?? []) console.log(`  \x1b[33m!\x1b[0m ${w}`);
    console.log(`    pokoje: ${r.rooms}   gracze: ${r.playersConnected}/${r.players} połączonych   połączenia: ${r.sockets}`);
    console.log(`    CPU gry: ${p.cpuPercent}%   RAM gry: ${p.memoryMB.rss} MB   opóźnienie: ${p.eventLoopLagMs.p99} ms (maks. ${p.eventLoopLagMs.max})`);
    console.log(`    gra działa od: ${up(p.uptimeSec)}   wersja: ${r.commit ?? "?"}`);
    const d = Object.entries(r.disconnectsLastHour ?? {});
    if (d.length) console.log(`    rozłączenia w ostatniej godzinie: ${d.map(([k, v]) => `${v}× ${k}`).join(", ")}`);
    process.exit(r.status === "ok" ? 0 : 3);
  ' "$JSON" || PROBLEMS=$((PROBLEMS+1))
fi

echo "${B}Serwer (VPS)${N}"
cores=$(nproc)
read -r l1 l5 l15 _ < /proc/loadavg
if awk "BEGIN{exit !($l5 > $cores)}"; then warn "obciążenie ${l1} / ${l5} / ${l15} (rdzenie: ${cores}) — wysokie"; else ok "obciążenie ${l1} / ${l5} / ${l15} (rdzenie: ${cores})"; fi
avail=$(free -m | awk '/^Mem:/{print $7}'); total=$(free -m | awk '/^Mem:/{print $2}')
if [ "$avail" -lt 150 ]; then warn "wolna pamięć: ${avail} / ${total} MB — mało"; else ok "wolna pamięć: ${avail} / ${total} MB"; fi
usep=$(df -P / | awk 'NR==2{gsub("%","",$5); print $5}')
if [ "$usep" -ge 90 ]; then warn "dysk zajęty w ${usep}% — zrób miejsce"; else ok "dysk zajęty w ${usep}%"; fi

oom=$(journalctl -k --since "24 hours ago" --no-pager -q 2>/dev/null | grep -ci "out of memory\|oom-kill")
[ "${oom:-0}" -gt 0 ] && warn "system ubijał procesy z braku pamięci (${oom}× w 24 h) — rozważ swap albo większy VPS"

echo "${B}nginx${N}"
if systemctl is-active --quiet nginx; then ok "nginx działa"; else bad "nginx NIE działa — sudo systemctl restart nginx"; fi
if [ -n "$DOMAIN" ]; then
  t=$(curl -s -o /dev/null -m 10 -w '%{http_code} %{time_total}' "https://${DOMAIN}/healthz")
  code=${t%% *}; secs=${t##* }
  if [ "$code" = "200" ]; then ok "https://${DOMAIN} odpowiada (${secs} s)"; else bad "https://${DOMAIN} zwraca kod ${code:-brak}"; fi
  exp=$(echo | openssl s_client -servername "$DOMAIN" -connect "$DOMAIN:443" 2>/dev/null | openssl x509 -noout -enddate 2>/dev/null | cut -d= -f2)
  if [ -n "$exp" ]; then
    days=$(( ( $(date -d "$exp" +%s) - $(date +%s) ) / 86400 ))
    if [ "$days" -lt 14 ]; then warn "certyfikat HTTPS wygasa za ${days} dni"; else ok "certyfikat HTTPS ważny jeszcze ${days} dni"; fi
  fi
fi

echo "${B}Błędy z ostatniej godziny${N}"
errs=$(journalctl -u impostor --since "1 hour ago" -p err --no-pager -q 2>/dev/null | wc -l)
if [ "$errs" -gt 0 ]; then
  warn "${errs} linii z błędami — ostatnie:"
  journalctl -u impostor --since "1 hour ago" -p err --no-pager -q | tail -n 5 | sed 's/^/      /'
else
  ok "brak błędów"
fi
ngx=$(grep -c "$(date '+%Y/%m/%d %H')" /var/log/nginx/error.log 2>/dev/null || echo 0)
[ "$ngx" -gt 0 ] && warn "nginx: ${ngx} błędów w tej godzinie (sudo tail /var/log/nginx/error.log)"

echo
if [ "$PROBLEMS" -eq 0 ]; then echo "${G}${B}Wszystko w porządku.${N}"; else echo "${Y}${B}Do sprawdzenia: ${PROBLEMS}.${N}"; fi
echo "Na żywo w przeglądarce: https://${DOMAIN:-twoja-domena}/status"
