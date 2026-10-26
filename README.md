# IMPOSTOR — gra towarzyska multiplayer 3D w przeglądarce

Większość graczy zna tajne hasło i po kolei podaje skojarzenia. Impostor hasła nie zna — słucha innych i próbuje się nie zdradzić. Po każdej rundzie gracze decydują: kolejna runda słów czy głosowanie na impostora.

- Wspólna arena 3D (React Three Fiber) — poczekalnia i rozgrywka w jednym widoku.
- Liczba podestów = limit graczy ustawiony przez hosta (3–12), wolne miejsca widoczne.
- Serwer jest jedynym źródłem prawdy: role, hasło, kolejka tur, głosowania i wyniki liczone są na serwerze.
- Działa na komputerach i telefonach, bez rejestracji. Cały interfejs po polsku.

## Szybki start (lokalnie)

Wymagania: **Node.js 20+** (testowane na 22).

```bash
npm install
npm run dev            # tryb deweloperski → http://localhost:3000
```

Produkcyjnie:

```bash
npm install
npm run build
npm start              # http://localhost:3000 (PORT zmienisz zmienną środowiskową)
```

Aby zagrać „na kilku urządzeniach” lokalnie, otwórz grę w kilku kartach (każda karta to osobny gracz) albo wejdź z telefonu w tej samej sieci Wi-Fi na `http://<IP-komputera>:3000`.

## Zmienne środowiskowe

| Zmienna | Domyślnie | Opis |
|---|---|---|
| `PORT` | `3000` | Port HTTP (Next.js i Socket.IO działają na tym samym porcie). |
| `HOSTNAME` | `0.0.0.0` | Adres nasłuchu. |
| `CORS_ORIGIN` | puste | Lista originów oddzielona przecinkami — potrzebna tylko, gdy frontend jest serwowany z innej domeny niż serwer. |
| `NODE_ENV` | `production` | `npm start` zawsze uruchamia tryb produkcyjny; `npm run dev` — deweloperski. |

Baza danych **nie jest potrzebna**: pokoje żyją w pamięci serwera i znikają, gdy opustoszeją (PostgreSQL/Prisma byłyby potrzebne dopiero np. do kont, statystyk czy historii gier).

## Wdrożenie online

Gra potrzebuje serwera, który utrzymuje długie połączenia WebSocket — **nie** wdrażaj jej na platformach typu serverless (np. Vercel Functions).

**Docker (dowolny VPS, Railway, Render, Fly.io):**

```bash
docker build -t impostor .
docker run -p 3000:3000 impostor
```

**Render / Railway bez Dockera:** build command `npm install && npm run build`, start command `npm start`, health check `/healthz`.

**VPS + nginx** (proxy z obsługą WebSocket):

```nginx
location / {
  proxy_pass http://127.0.0.1:3000;
  proxy_http_version 1.1;
  proxy_set_header Upgrade $http_upgrade;
  proxy_set_header Connection "upgrade";
  proxy_set_header Host $host;
  proxy_read_timeout 120s;
}
```

Uruchom proces np. przez `pm2 start npm --name impostor -- start` lub systemd i dodaj HTTPS (Let's Encrypt).

**Skalowanie:** stan gry jest w pamięci jednego procesu — uruchamiaj jedną instancję. Przy wielu instancjach potrzebny byłby adapter Redis dla Socket.IO, sticky sessions i współdzielony magazyn stanu pokoi.

## Struktura projektu

```
server/
  index.ts        serwer HTTP: Next.js + Socket.IO na jednym porcie, /healthz
  socket.ts       zdarzenia Socket.IO: walidacja Zod, uprawnienia, limit żądań, rozgłaszanie stanu
  room.ts         logika pokoju i gry (maszyna stanów) — jedyne źródło prawdy
  manager.ts      rejestr pokoi, unikalne kody z kontrolą kolizji
shared/
  types.ts        typy stanu publicznego i prywatnego, ustawienia
  schemas.ts      schematy Zod, normalizacja tekstu, porównanie odpowiedzi
  layout.ts       algorytm rozmieszczenia podestów i dopasowania kamery
  words.ts        baza 353 haseł (10 kategorii + „Mieszane”, 3 poziomy trudności)
  constants.ts    limity czasu, kolory graczy
app/              Next.js (App Router): strona główna i /room/[kod]
components/
  home/           strona startowa, „Jak grać?”
  room/           wspólny widok pokoju: górny pasek, panele etapów, karta roli, historia, ustawienia
  arena/          scena 3D: podesty, postacie, kamera, nicki (warstwa HTML), widok bez WebGL
lib/              klient Socket.IO, sesja (token w sessionStorage), hook połączenia
tests/            testy Vitest (logika, Socket.IO z wieloma klientami, układ podestów)
e2e/              scenariusz Playwright z 4 graczami (desktop + telefony), podgląd 12 graczy
```

## Zasady zaimplementowane w grze

- **Lobby:** kod 5-znakowy (bez mylących znaków), dołączanie kodem lub linkiem `/room/KOD`, 3–12 graczy, unikalne nicki (bez względu na wielkość liter i polskie znaki). Host zmienia ustawienia, usuwa graczy i przekazuje rolę hosta. Gra startuje, gdy jest ≥3 graczy, wszyscy (poza hostem, który startuje grę) są gotowi i połączeni, a liczba impostorów pasuje do liczby graczy (2 impostorów od 5 graczy).
- **Limit graczy:** zmiana tylko w poczekalni, nie poniżej liczby obecnych graczy. Gracze zachowują swoje miejsca; przy zmniejszeniu limitu przenoszeni są tylko ci, których miejsce zniknęło.
- **Role:** losowane na serwerze. Impostor nigdy nie dostaje hasła (ani w stanie publicznym, ani prywatnym). Dwóch impostorów nie zna siebie nawzajem. Role ujawniane są dopiero po głosowaniu/na końcu gry.
- **Tury:** kolejka ustalana przez serwer; w danej chwili pisać może tylko jedna osoba; jedno słowo na rundę; w kolejnej rundzie pierwsza osoba przechodzi na koniec. Zwykły gracz nie może podać samego hasła. Po upływie limitu czasu tura jest pomijana.
- **Głosowanie decyzyjne:** tajne, niezmienne, widać tylko licznik `x/y`; remis = kolejna runda; limit rund wymusza głosowanie na impostora. Limit czasu 45 s (nieoddane głosy się nie liczą).
- **Dyskusja:** opcjonalna, z odliczaniem; host może rozpocząć głosowanie wcześniej.
- **Głosowanie eliminacyjne:** nie można głosować na siebie, głos niezmienny, limit 60 s. Remis → dogrywka między remisującymi (głosują pozostali); ponowny remis → nikt nie odpada, kolejna runda. Tryb jawny pokazuje po głosowaniu, kto na kogo głosował.
- **Wynik:** wskazanie zwykłego gracza = wygrana impostorów. Wykrycie impostora = wygrana zwykłych graczy (przy dwóch impostorach gra trwa do wykrycia obu). Ostatnia próba (opcjonalna, 30 s): odpowiedź porównywana bez wielkości liter, zbędnych spacji i polskich znaków — ale tylko całe hasło, bez dopasowań częściowych.
- **Rozłączenia:** miejsce trzymane 60 s; powrót przez bezpieczny token (256 bitów, w `sessionStorage` karty) — sam kod pokoju nie wystarczy do przejęcia gracza. Tura rozłączonego gracza jest wstrzymana na 20 s, potem pomijana. Jeśli w trakcie gry zostanie mniej niż 3 aktywnych graczy albo odejdzie ostatni niewykryty impostor, gra jest przerywana z wyjaśnieniem. Wyjście hosta przekazuje hosta kolejnej osobie; puste pokoje są usuwane.

## Testy

```bash
npm test                 # Vitest: logika gry, Socket.IO z wieloma klientami, układ podestów i kamera
npm run typecheck
```

Test w przeglądarce (wymaga zbudowanej i uruchomionej aplikacji oraz Playwright z Chromium):

```bash
npm i -D playwright && npx playwright install chromium
npm run build && npm start &
BASE_URL=http://localhost:3000 npm run test:e2e
```

Scenariusz E2E rozgrywa pełną grę 4 graczy (2 na komputerze, 2 na emulowanych telefonach): błędy w lobby, zmianę limitu widoczną na wszystkich urządzeniach, prywatność ról, kolejność tur, odświeżenie strony w trakcie gry, remis w głosowaniu decyzyjnym, eliminację, ostatnią próbę, restart, widok bez WebGL i brak poziomego przewijania na telefonie. Zrzuty ekranu trafiają do `e2e/out/`. Na maszynach bez GPU część graczy korzysta z widoku zastępczego (`E2E_ALL_WEBGL=1` wymusza WebGL dla wszystkich).

## Przydatne parametry adresu

- `?webgl=0` — wymusza uproszczony widok areny bez WebGL.
- `?quality=low` / `?quality=high` — wymusza jakość sceny (zapamiętywane w przeglądarce). Domyślnie telefony i słabsze urządzenia dostają niższą jakość: bez cieni, mniej świateł, 30 kl./s.

## Zrzuty ekranu

Przykładowe zrzuty z testu E2E znajdują się w `docs/screenshots/` (poczekalnia z 8 podestami, tura gracza, głosowanie na telefonie, ekran końcowy, arena z 12 graczami na komputerze i telefonie).
