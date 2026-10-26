'use client';

import { Modal } from '@/components/ui/primitives';

export const RULES_SHORT = [
  { n: '1', t: 'Tajne hasło', d: 'Wszyscy poza impostorem znają tajne hasło. Impostor go nie zna.' },
  { n: '2', t: 'Skojarzenia po kolei', d: 'Każdy w swojej turze podaje jedno słowo związane z hasłem.' },
  { n: '3', t: 'Zdemaskuj oszusta', d: 'Po każdej rundzie decydujecie: kolejna runda czy głosowanie na impostora.' },
];

export function HowToPlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal open={open} onClose={onClose} title="Jak grać w IMPOSTORA?" wide labelledBy="how-title">
      <div className="space-y-5 text-[15px] leading-relaxed text-white/80">
        <section>
          <h3 className="mb-1 font-semibold text-white">Cel gry</h3>
          <p>
            Zwykli gracze znają tajne hasło i muszą wykryć impostora. Impostor nie zna hasła — słucha skojarzeń innych, udaje, że wie, o co chodzi, i stara się nie dać się zdemaskować.
          </p>
        </section>
        <section>
          <h3 className="mb-1 font-semibold text-white">Przebieg rundy</h3>
          <ol className="list-decimal space-y-1 pl-5">
            <li>Na początku każdy dostaje prywatną kartę z rolą. Zwykli gracze widzą hasło.</li>
            <li>Gracze po kolei podają po jednym słowie związanym z hasłem. W danej chwili mówi tylko jedna osoba.</li>
            <li>Uważaj: zbyt oczywiste słowo zdradzi hasło impostorowi, zbyt dziwne — narazi Cię na podejrzenia.</li>
            <li>Po rundzie wszyscy tajnie głosują: <b>„Kolejna runda słów”</b> albo <b>„Głosujemy na impostora”</b>. Remis oznacza kolejną rundę.</li>
            <li>W kolejnej rundzie pierwsza osoba przechodzi na koniec kolejki.</li>
          </ol>
        </section>
        <section>
          <h3 className="mb-1 font-semibold text-white">Głosowanie na impostora</h3>
          <ul className="list-disc space-y-1 pl-5">
            <li>Każdy wskazuje jedną osobę (nie można głosować na siebie). Głosów nie da się zmienić.</li>
            <li>Remis — dogrywka między remisującymi. Ponowny remis — nikt nie odpada, gracie kolejną rundę słów.</li>
            <li>Jeśli wskażecie zwykłego gracza — wygrywają impostorzy.</li>
            <li>Jeśli wskażecie impostora — wygrywają zwykli gracze (przy dwóch impostorach gra toczy się dalej).</li>
            <li>
              <b>Ostatnia próba</b> (opcjonalna): wykryty impostor może odgadnąć hasło. Jeśli trafi — impostorzy wygrywają.
            </li>
          </ul>
        </section>
        <section className="rounded-2xl border border-white/10 bg-white/[.04] p-4 text-sm">
          Dyskusję prowadźcie na żywo, przez telefon lub na Discordzie — aplikacja pilnuje tur, głosów i ról.
        </section>
      </div>
    </Modal>
  );
}
