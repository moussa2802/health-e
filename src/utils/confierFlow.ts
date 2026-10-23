/**
 * confierFlow.ts — « Me confier à Dr Lô » : tout ce qu'on écrit va dans le journal privé.
 * Logique pure (testable avec node --test). Dr Lô écoute : il ne répond que par un mot bref,
 * sauf si la personne demande son avis (payant, comme le journal classique), ou si un message
 * inquiétant apparaît (il sort alors du silence avec les ressources d'urgence, gratuitement).
 */
import { detectCrisis } from './accueilFlow.ts'; // extension explicite : testable avec node --test

export type ConfierItem =
  | { kind: 'entry'; id: string; text: string; at: number; journalId: string | null; status: 'saving' | 'saved' | 'cancelled' | 'error' }
  | { kind: 'ack'; id: string; text: string }
  | { kind: 'advice'; id: string; text: string }
  | { kind: 'crisis'; id: string }
  | { kind: 'note'; id: string; text: string };

export interface ConfierState {
  v: 1;
  items: ConfierItem[];
  seq: number;
  /** Nombre d'entrées déjà soumises à l'avis de Dr Lô. */
  advisedUpTo: number;
}

export const MAX_ITEMS = 40;
export const MAX_ENTRY_CHARS = 4000;

export const emptyConfier = (): ConfierState => ({ v: 1, items: [], seq: 0, advisedUpTo: 0 });

const ACKS = [
  'Je t\'entends.',
  'Je suis là. Continue si tu veux.',
  'Merci de l\'écrire.',
  'Je lis. Prends ton temps.',
  'C\'est posé, en sécurité ici.',
];

/**
 * Accusé de réception : il reprend le thème du texte quand on le reconnaît (sans conseil,
 * sans IA, rien n'est envoyé), sinon une phrase d'écoute qui varie.
 */
const THEMES: { re: RegExp; text: string }[] = [
  { re: /\b(deuil|decede|deces|est mort|est morte|enterrement|ma perte)\b/, text: 'Perdre quelqu\'un, ça laisse un vide immense. Je suis là, prends ton temps.' },
  { re: /\b(mere|maman|pere|papa|parents?|famille|frere|soeur|tante|oncle|belle-mere|beaux-parents|ndeye|baye)\b/, text: 'Les tensions en famille, ça pèse lourd, surtout avec ceux qu\'on aime. Je t\'entends.' },
  { re: /\b(mari|femme|epou\w*|copain|copine|couple|fiance\w*|ex|rupture|tromp\w*|jalou\w*|crush)\b/, text: 'Les histoires de cœur, ça remue profondément. Je t\'écoute, sans jugement.' },
  { re: /\b(travail|boulot|patron|chef|bureau|collegues?|chomage|licenci\w*)\b/, text: 'Quand le travail déborde sur tout le reste, c\'est épuisant. C\'est noté, ici.' },
  { re: /\b(argent|dette|dettes|loyer|payer|factures?|depenses?)\b/, text: 'Les soucis d\'argent empêchent de souffler. Merci de l\'avoir posé ici.' },
  { re: /\b(examen|exam|ecole|fac|universite|etudes|bac|concours|memoire)\b/, text: 'La pression des études, ça prend toute la place. Je lis, prends ton temps.' },
  { re: /\b(dors|dormir|sommeil|insomnie|fatigue|fatiguee?|epuise\w*)\b/, text: 'Quand le corps est à bout, tout devient plus lourd. Je suis là.' },
  { re: /\b(seule?|solitude|personne ne|isole\w*)\b/, text: 'La solitude, c\'est dur. Ici, tu ne la portes plus sans personne.' },
];

function norm(t: string): string {
  return t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

export function ackFor(entryCount: number, text = ''): string {
  const t = norm(text);
  const theme = t ? THEMES.find(x => x.re.test(t)) : undefined;
  if (theme) return theme.text;
  return ACKS[(Math.max(1, entryCount) - 1) % ACKS.length];
}

type NewItem = ConfierItem extends infer T ? (T extends ConfierItem ? Omit<T, 'id'> & { id?: string } : never) : never;

function add(s: ConfierState, item: NewItem): ConfierState {
  const seq = s.seq + 1;
  const items = [...s.items, { ...item, id: item.id ?? `c${seq}` } as ConfierItem];
  return { ...s, seq, items: items.slice(-MAX_ITEMS) };
}

export const entries = (s: ConfierState) => s.items.filter((i): i is Extract<ConfierItem, { kind: 'entry' }> => i.kind === 'entry');
const liveEntries = (s: ConfierState) => entries(s).filter(e => e.status === 'saved');

/** La personne dépose un texte : il part au journal ; Dr Lô accuse réception (ou sort du silence si crise). */
export function deposit(s: ConfierState, text: string, now = Date.now()): { state: ConfierState; entryId: string; crisis: boolean } {
  const clean = text.trim().slice(0, MAX_ENTRY_CHARS);
  const entryId = `e${s.seq + 1}`;
  let next = add(s, { id: entryId, kind: 'entry', text: clean, at: now, journalId: null, status: 'saving' });
  const crisis = detectCrisis(clean);
  if (crisis) next = add(next, { kind: 'crisis' });
  else next = add(next, { kind: 'ack', text: ackFor(entries(next).length, clean) });
  return { state: next, entryId, crisis };
}

export function markSaved(s: ConfierState, entryId: string, journalId: string): ConfierState {
  return { ...s, items: s.items.map(i => (i.kind === 'entry' && i.id === entryId ? { ...i, journalId, status: 'saved' } : i)) };
}

export function markError(s: ConfierState, entryId: string): ConfierState {
  return { ...s, items: s.items.map(i => (i.kind === 'entry' && i.id === entryId ? { ...i, status: 'error' } : i)) };
}

export function markCancelled(s: ConfierState, entryId: string): ConfierState {
  return { ...s, items: s.items.map(i => (i.kind === 'entry' && i.id === entryId ? { ...i, status: 'cancelled' } : i)) };
}

/** Textes à soumettre à l'avis de Dr Lô : les entrées gardées, écrites depuis le dernier avis. */
export function pendingForAdvice(s: ConfierState): { text: string; lastJournalId: string | null; count: number } {
  const all = entries(s);
  const fresh = all.slice(s.advisedUpTo).filter(e => e.status === 'saved');
  return {
    text: fresh.map(e => e.text).join('\n\n').slice(-MAX_ENTRY_CHARS),
    lastJournalId: fresh.length ? fresh[fresh.length - 1].journalId : null,
    count: fresh.length,
  };
}

export function addAdvice(s: ConfierState, text: string): ConfierState {
  return { ...add(s, { kind: 'advice', text }), advisedUpTo: entries(s).length };
}

export function addNote(s: ConfierState, text: string): ConfierState {
  return add(s, { kind: 'note', text });
}

export const hasLiveEntries = (s: ConfierState) => liveEntries(s).length > 0;
