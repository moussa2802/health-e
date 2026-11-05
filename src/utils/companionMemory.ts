/**
 * companionMemory — le carnet du compagnon (patients/{uid}.drloMemory) : ce qu'il sait de la personne.
 * Il s'enrichit tout seul au fil des discussions (fonction drlo-memory) ; la personne le voit, efface,
 * ou lui dit elle-même quelque chose. Même liste de thèmes que netlify/functions/_drloMemory.js.
 */
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';

export type MemoryCat = 'vie' | 'proches' | 'pese' | 'aide' | 'envies' | 'parler' | 'suivre' | 'intime';
export interface MemoryNote { text: string; cat: MemoryCat; at?: string }

export const MEMORY_MAX = 30;
export const MEMORY_CATS: { id: MemoryCat; label: string }[] = [
  { id: 'vie', label: 'Ta vie' },
  { id: 'proches', label: 'Tes proches' },
  { id: 'pese', label: 'Ce qui te pèse' },
  { id: 'aide', label: 'Ce qui t\'aide' },
  { id: 'envies', label: 'Tes envies' },
  { id: 'parler', label: 'Comment te parler' },
  { id: 'suivre', label: 'Il te demandera des nouvelles' },
  { id: 'intime', label: 'Ta vie intime' },
];
const IDS = MEMORY_CATS.map(c => c.id) as string[];

export function normalizeNotes(raw: unknown): MemoryNote[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((n): MemoryNote | null => {
    if (typeof n === 'string') return n.trim() ? { text: n, cat: 'vie' } : null;
    if (!n || typeof n !== 'object') return null;
    const o = n as { text?: unknown; cat?: unknown; at?: unknown };
    const text = typeof o.text === 'string' ? o.text : '';
    if (!text.trim()) return null;
    return { text, cat: IDS.includes(String(o.cat)) ? (o.cat as MemoryCat) : 'vie', at: typeof o.at === 'string' ? o.at : undefined };
  }).filter((n): n is MemoryNote => !!n);
}

export async function loadMemory(uid: string): Promise<MemoryNote[]> {
  const s = await getDoc(doc(db!, 'patients', uid));
  return normalizeNotes(s.exists() ? s.data().drloMemory : null);
}

export function saveMemory(uid: string, notes: MemoryNote[]): Promise<void> {
  return setDoc(doc(db!, 'patients', uid), { drloMemory: notes.slice(0, MEMORY_MAX) }, { merge: true });
}

/** À quel point il la connaît (selon la richesse du carnet). */
export function knowLevel(count: number): { step: number; text: string } {
  if (count <= 0) return { step: 0, text: 'découvre qui tu es' };
  if (count < 5) return { step: 1, text: 'commence à te connaître' };
  if (count < 12) return { step: 2, text: 'te connaît un peu' };
  if (count < 20) return { step: 3, text: 'te connaît bien' };
  return { step: 4, text: 'te connaît vraiment bien' };
}
export const KNOW_STEPS = 4;
