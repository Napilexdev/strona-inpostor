/** Emotki postaci. Kolejność = kolejność przycisków. */
export const EMOTES = [
  { id: 'wave', label: 'Cześć', icon: '👋' },
  { id: 'dab', label: 'Dab', icon: '😎' },
  { id: 'six-seven', label: '67', icon: '🤲' },
  { id: 'dance', label: 'Taniec', icon: '🕺' },
  { id: 'facepalm', label: 'Facepalm', icon: '🤦' },
  { id: 'shrug', label: 'Nie wiem', icon: '🤷' },
  { id: 'clap', label: 'Brawo', icon: '👏' },
  { id: 'sus', label: 'Podejrzane', icon: '🤨' },
  { id: 'flex', label: 'Siła', icon: '💪' },
  { id: 'hype', label: 'Radocha', icon: '🎉' },
] as const;

export type EmoteId = (typeof EMOTES)[number]['id'];
export const EMOTE_IDS = EMOTES.map((e) => e.id) as [EmoteId, ...EmoteId[]];
/** Przerwa między emotkami jednego gracza. */
export const EMOTE_COOLDOWN_MS = 2_000;
/** Jak długo trwa animacja emotki. */
export const EMOTE_DURATION_MS = 3_200;
