import type { Category, Difficulty } from './types';

export interface WordEntry {
  word: string;
  category: Exclude<Category, 'mieszane'>;
  difficulty: Exclude<Difficulty, 'dowolny'>;
}

type Bank = Record<Exclude<Category, 'mieszane'>, Record<Exclude<Difficulty, 'dowolny'>, string>>;

/** Hasła zapisane zwięźle: słowa oddzielone przecinkami. */
const BANK: Bank = {
  jedzenie: {
    latwy: 'pizza, pierogi, sushi, naleśniki, lody, czekolada, chleb, zupa pomidorowa, jajecznica, frytki, hamburger, jabłko, banan, ser',
    sredni: 'bigos, gołąbki, rosół, kebab, spaghetti, sernik, pączek, popcorn, tort, kanapka, makaron, żurek',
    trudny: 'tiramisu, risotto, kimchi, hummus, oscypek, krem brulee, kawior, falafel, gulasz, ratatouille',
  },
  zwierzeta: {
    latwy: 'żyrafa, pingwin, wilk, delfin, kot, pies, słoń, lew, krowa, koń, królik, małpa, rekin, żaba',
    sredni: 'kangur, sowa, wiewiórka, jeż, flaming, krokodyl, zebra, papuga, ośmiornica, niedźwiedź, bóbr, lis',
    trudny: 'kameleon, pancernik, dziobak, leniwiec, mrówkojad, żubr, koliber, meduza, kapibara, surykatka',
  },
  miejsca: {
    latwy: 'plaża, lotnisko, szkoła, kino, szpital, park, sklep, kościół, basen, restauracja, biblioteka, zoo, dworzec, kuchnia',
    sredni: 'muzeum, cmentarz, stadion, apteka, więzienie, poczta, teatr, łaźnia, wesołe miasteczko, cyrk, piekarnia, siłownia',
    trudny: 'latarnia morska, obserwatorium, kopalnia, ambasada, laboratorium, klasztor, skansen, wulkan, Sejm, Wawel',
  },
  przedmioty: {
    latwy: 'parasol, walizka, latarka, lodówka, krzesło, łóżko, zegarek, okulary, długopis, nożyczki, klucz, lustro, plecak, kubek',
    sredni: 'kompas, drabina, młotek, odkurzacz, żelazko, poduszka, świeca, portfel, szczoteczka do zębów, budzik, czajnik, wieszak',
    trudny: 'klepsydra, metronom, lornetka, maszyna do szycia, kalejdoskop, akwarium, gramofon, sztalugi, globus, wachlarz',
  },
  sport: {
    latwy: 'tenis, boks, siatkówka, narciarstwo, piłka nożna, koszykówka, pływanie, bieganie, rower, łyżwy, karate, golf, szachy, judo',
    sredni: 'hokej, skoki narciarskie, kolarstwo, wspinaczka, surfing, żeglarstwo, badminton, łucznictwo, rugby, maraton, gimnastyka, piłka ręczna',
    trudny: 'curling, szermierka, biathlon, skeleton, polo, triathlon, kajakarstwo, pięciobój, krykiet, saneczkarstwo',
  },
  filmy: {
    latwy: 'Harry Potter, Shrek, Król Lew, Titanic, Gwiezdne Wojny, Kevin sam w domu, Spider-Man, Kraina Lodu, Batman, Toy Story, Gdzie jest Nemo, Minionki',
    sredni: 'Matrix, Avatar, Piraci z Karaibów, Władca Pierścieni, Jurassic Park, Stranger Things, Gra o Tron, Przyjaciele, Simpsonowie, Wiedźmin, Rocky, Ranczo',
    trudny: 'Incepcja, Breaking Bad, Pulp Fiction, Seksmisja, Miś, Dom z papieru, Squid Game, Interstellar, Ojciec chrzestny, Chłopi',
  },
  gry: {
    latwy: 'Minecraft, Mario, Tetris, Pac-Man, Fortnite, Pokemon, chińczyk, warcaby, memory, puzzle, domino, Uno',
    sredni: 'Monopoly, Scrabble, Wiedźmin 3, The Sims, Angry Birds, Among Us, Grand Theft Auto, Roblox, sudoku, kalambury, bierki, Jenga',
    trudny: 'Cyberpunk 2077, Dark Souls, League of Legends, Counter-Strike, Catan, Dixit, mahjong, Portal, Zelda, Gwint',
  },
  zawody: {
    latwy: 'lekarz, nauczyciel, strażak, policjant, kucharz, pilot, rolnik, fryzjer, sprzedawca, kierowca, piłkarz, piosenkarz, piekarz',
    sredni: 'astronauta, weterynarz, architekt, dentysta, mechanik, listonosz, kelner, ogrodnik, sędzia, dziennikarz, programista, aktor',
    trudny: 'archeolog, notariusz, kominiarz, sommelier, tłumacz, kaskader, księgowy, meteorolog, iluzjonista, ratownik górski',
  },
  natura: {
    latwy: 'drzewo, kwiat, słońce, deszcz, śnieg, rzeka, góry, morze, tęcza, księżyc, chmura, las, burza',
    sredni: 'wodospad, jaskinia, pustynia, zachód słońca, lodowiec, jezioro, wyspa, mgła, grzyb, kaktus, róża, piorun',
    trudny: 'zorza polarna, tornado, rafa koralowa, bagno, gejzer, tsunami, zaćmienie, stalaktyt, tundra, monsun',
  },
  technologia: {
    latwy: 'smartfon, komputer, robot, dron, telewizor, internet, laptop, słuchawki, aparat, konsola, tablet, myszka, klawiatura',
    sredni: 'drukarka, satelita, router, pendrive, mikrofalówka, smartwatch, kamera, bluetooth, hulajnoga elektryczna, głośnik, e-mail, aplikacja',
    trudny: 'sztuczna inteligencja, blockchain, drukarka 3D, wirtualna rzeczywistość, procesor, chmura obliczeniowa, hologram, algorytm, kod QR, światłowód',
  },
};

export const WORDS: WordEntry[] = Object.entries(BANK).flatMap(([category, byDiff]) =>
  Object.entries(byDiff).flatMap(([difficulty, list]) =>
    list
      .split(',')
      .map((w) => w.trim())
      .filter(Boolean)
      .map((word) => ({
        word,
        category: category as WordEntry['category'],
        difficulty: difficulty as WordEntry['difficulty'],
      })),
  ),
);

export function filterWords(category: Category, difficulty: Difficulty): WordEntry[] {
  return WORDS.filter(
    (w) => (category === 'mieszane' || w.category === category) && (difficulty === 'dowolny' || w.difficulty === difficulty),
  );
}

/**
 * Losuje hasło z uwzględnieniem ustawień, unikając haseł już użytych w tym pokoju.
 * Gdy pula się wyczerpie, historia jest czyszczona dla tej puli.
 */
export function pickWord(
  category: Category,
  difficulty: Difficulty,
  used: Set<string>,
  rand: () => number = Math.random,
): WordEntry {
  const pool = filterWords(category, difficulty);
  let fresh = pool.filter((w) => !used.has(w.word));
  if (fresh.length === 0) {
    for (const w of pool) used.delete(w.word);
    fresh = pool;
  }
  const choice = fresh[Math.floor(rand() * fresh.length)];
  used.add(choice.word);
  return choice;
}
