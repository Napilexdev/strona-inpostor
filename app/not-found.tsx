import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="bg-stage flex min-h-dvh flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="font-display text-3xl font-bold">Nie znaleziono strony</h1>
      <Link href="/" className="rounded-xl bg-accent px-5 py-3 font-semibold">Wróć na stronę główną</Link>
    </main>
  );
}
