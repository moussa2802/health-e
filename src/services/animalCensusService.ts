/**
 * animalCensusService — combien de personnes ont découvert chaque animal intérieur (fonction animal-census).
 * Des totaux seulement : jamais un compte, jamais un nom.
 */
export interface AnimalCensus {
  total: number;
  byAnimal: Record<string, number>;
  today: Record<string, number>;
  yesterday: Record<string, number>;
  todayTotal: number;
  yesterdayTotal: number;
  days: { d: string; n: number }[];
  computedAt: number;
}

export async function getAnimalCensus(): Promise<AnimalCensus> {
  const res = await fetch('/.netlify/functions/animal-census');
  if (!res.ok) throw new Error('Erreur');
  return res.json() as Promise<AnimalCensus>;
}

/** Nom d'un animal : au singulier ou au pluriel (« 3 Cerfs », « 2 Hiboux »). */
const NAMES: Record<string, [string, string]> = {
  lion: ['Lion', 'Lions'], aigle: ['Aigle', 'Aigles'], cheval: ['Cheval', 'Chevaux'], loup: ['Loup', 'Loups'], dauphin: ['Dauphin', 'Dauphins'],
  elephant: ['Éléphant', 'Éléphants'], cerf: ['Cerf', 'Cerfs'], hibou: ['Hibou', 'Hiboux'], panthere: ['Panthère', 'Panthères'],
  renard: ['Renard', 'Renards'], tortue: ['Tortue', 'Tortues'], ours: ['Ours', 'Ours'],
};
export const animalName = (id: string, n = 1) => (NAMES[id] ?? [id, id])[n > 1 ? 1 : 0];

/** Les nouveaux du jour, animal par animal : seulement ceux qui sont au moins deux (un seul, ça pourrait désigner quelqu'un). */
export function newByAnimal(counts: Record<string, number>, min = 2): { id: string; n: number }[] {
  return Object.entries(counts).filter(([, n]) => n >= min).sort((a, b) => b[1] - a[1]).map(([id, n]) => ({ id, n }));
}

/** La phrase du jour : aujourd'hui, sinon hier, sinon le total. */
export function censusHeadline(c: AnimalCensus): { kicker: string; text: string; counts: Record<string, number> } | null {
  if (c.total <= 0) return null;
  const people = (n: number) => `${n} personne${n > 1 ? 's' : ''}`;
  if (c.todayTotal > 0) return { kicker: "AUJOURD'HUI", text: `${people(c.todayTotal)} ${c.todayTotal > 1 ? 'ont' : 'a'} découvert leur animal intérieur`, counts: c.today };
  if (c.yesterdayTotal > 0) return { kicker: 'HIER', text: `${people(c.yesterdayTotal)} ${c.yesterdayTotal > 1 ? 'ont' : 'a'} découvert leur animal intérieur`, counts: c.yesterday };
  return { kicker: 'LA COMMUNAUTÉ', text: `${c.total} personnes ont découvert leur animal intérieur`, counts: {} };
}
