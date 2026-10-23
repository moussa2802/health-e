/**
 * moodLog.ts — « Noter mon humeur · 30 s ».
 * Vague 1 : stocké dans le navigateur uniquement (localStorage), invité comme compte.
 * Vague 2 : synchronisation Firestore users/{uid}/moods/{jour} (nécessite une règle
 * Firestore à déployer par le porteur du projet).
 */

export type MoodId = 'tres_bien' | 'plutot_bien' | 'bof' | 'pas_bien' | 'tres_dur';

export interface MoodDef { id: MoodId; label: string; color: string; low: boolean }

export const MOODS: MoodDef[] = [
  { id: 'tres_bien', label: 'Très bien', color: '#F2B66D', low: false },
  { id: 'plutot_bien', label: 'Plutôt bien', color: '#E9C88F', low: false },
  { id: 'bof', label: 'Bof', color: '#CFC6B8', low: false },
  { id: 'pas_bien', label: 'Pas bien', color: '#9FB4C8', low: true },
  { id: 'tres_dur', label: 'Très dur', color: '#B9A6D6', low: true },
];

export const moodById = (id: MoodId): MoodDef => MOODS.find(m => m.id === id) ?? MOODS[2];

export interface MoodEntry { mood: MoodId; at: number }
export type MoodMap = Record<string, MoodEntry>;

export const MOOD_STORAGE_PREFIX = 'he_moods_v1:';

/** Clé de jour locale AAAA-MM-JJ (le fuseau de la personne, pas UTC). */
export function dayKey(d: Date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function setMood(map: MoodMap, day: string, mood: MoodId, at = Date.now()): MoodMap {
  return { ...map, [day]: { mood, at } };
}

export function removeMood(map: MoodMap, day: string): MoodMap {
  const next = { ...map };
  delete next[day];
  return next;
}

/** Réponse de Dr Lô après la saisie. Douceur si ça ne va pas, jamais de jugement. */
export function moodReply(mood: MoodId, prenom?: string, alreadyToday = false): string {
  const p = prenom ? `, ${prenom}` : '';
  if (mood === 'tres_dur') {
    return `Merci de me le dire${p}. Je suis là. Tu veux qu'on en parle maintenant, ou juste respirer un moment ensemble ? Et si c'est trop lourd là, tout de suite, le 1515 répond à toute heure.`;
  }
  if (mood === 'pas_bien') {
    return `Merci de me le dire${p}. Je suis là. Tu veux qu'on en parle maintenant, ou juste respirer un moment ensemble ?`;
  }
  const label = moodById(mood).label.toLowerCase();
  if (alreadyToday) return `C'est mis à jour${p} : ${label}. L'humeur bouge dans la journée, c'est normal.`;
  return `Merci${p}, c'est noté : ${label}. Reviens me dire demain comment tu te sens : jour après jour, ta météo intérieure va se dessiner.`;
}

export function loadMoods(storageKey: string): MoodMap {
  try {
    const raw = localStorage.getItem(storageKey);
    const m = raw ? JSON.parse(raw) : {};
    return m && typeof m === 'object' ? (m as MoodMap) : {};
  } catch { return {}; }
}

export function saveMoods(storageKey: string, map: MoodMap): void {
  try { localStorage.setItem(storageKey, JSON.stringify(map)); } catch { /* stockage indisponible */ }
}
