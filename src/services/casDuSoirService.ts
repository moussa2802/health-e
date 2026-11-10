/**
 * casDuSoirService — « Le cas du soir » (fonction Netlify cas-du-soir). Aucun appel à l'IA.
 * Connecté : le jeton est envoyé. Visiteur : un identifiant au hasard gardé sur ce téléphone (un vote par épisode).
 */
import { auth } from '../utils/firebase';

export interface CdsChoix { id: string; label: string }
export interface CdsEpisode { n: number; titre: string; texte: string; image: string | null; minutes: number; question: string; choix: CdsChoix[]; embranchement: boolean }
export interface CdsResultats {
  total: number;
  /** null tant qu'il y a moins de « seuil » votes */
  parChoix: Record<string, number> | null;
  seuil?: number;
  animal: { animal: string; groupe: string; choix: string; label: string } | null;
  echo?: string;
  parAnimal?: { animal: string; groupe: string; total: number; parChoix: Record<string, number> }[];
}
export interface CdsHistoire {
  id: string; titre: string; image: string | null; accroche: string; avertissement: string; total: number; parus: number; prochain: number | null; lisibles: number[]; testLie: string | null;
  testAussi: string | null; minutes: number; audio: boolean; autreFin: { mention: string } | null;
}
export interface CdsEtat { visible: boolean; histoire?: CdsHistoire; prix?: { suite: number; bonus: number; autreFin: number }; autreFin?: { achetee: boolean; possible: boolean }; decision?: number | null; connecte?: boolean; bonus?: boolean; apercu?: boolean; animal?: string | null; proprio?: boolean }
export interface CdsEpisodeReponse {
  episode: CdsEpisode; audioUrl: string | null; monChoix: string | null; resultats: CdsResultats | null;
  suite: { n: number; lisible: boolean; parution: number; avance: { ok: boolean; raison?: string } } | null;
  finLisible: boolean; apercu: boolean; autre?: boolean;
}
export interface CdsFin { titre: string; texte: string; audioUrl: string | null; quiz: { question: string; reponses: string[]; bonne: number; explication: string }[]; apresQuiz?: string; testLie: string | null; testAussi?: string | null }

export class CdsError extends Error {
  status: number; data: Record<string, unknown>;
  constructor(message: string, status: number, data: Record<string, unknown>) { super(message); this.status = status; this.data = data; }
}

const VISITEUR = 'he_cds_visiteur';
function visiteurId(): string {
  try {
    let v = localStorage.getItem(VISITEUR);
    if (!v) { v = (crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}abcdefgh`).replace(/[^A-Za-z0-9-]/g, ''); localStorage.setItem(VISITEUR, v); }
    return v;
  } catch { return ''; }
}

/** Jour simulé par le propriétaire (aperçu avant la date de départ) ; ignoré par le serveur pour les autres. */
let jourApercu: number | null = null;
export const setJourApercu = (j: number | null) => { jourApercu = j; };

async function call<T>(body: Record<string, unknown>): Promise<T> {
  // Attendre que Firebase ait restauré la session : sinon, au premier affichage, l'appel part sans jeton (vu comme visiteur)
  try { await (auth as { authStateReady?: () => Promise<void> } | null)?.authStateReady?.(); } catch { /* ignore */ }
  const user = auth?.currentUser ?? null;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (user) headers.Authorization = `Bearer ${await user.getIdToken()}`;
  const res = await fetch('/.netlify/functions/cas-du-soir', {
    method: 'POST', headers, body: JSON.stringify({ ...body, ...(jourApercu ? { jour: jourApercu } : {}), ...(user ? {} : { visiteurId: visiteurId() }) }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new CdsError((data as { error?: string }).error ?? `Erreur ${res.status}`, res.status, data as Record<string, unknown>);
  return data as T;
}

export const getEtat = () => call<CdsEtat>({ action: 'etat' });
export const getEpisode = (n: number, autre = false) => call<CdsEpisodeReponse>({ action: 'episode', n, ...(autre ? { autre: true } : {}) });
export const acheterAutreFin = () => call<{ ok: boolean }>({ action: 'autreFin' });
export const voter = (n: number, choix: string) => call<{ ok: boolean; monChoix: string; resultats: CdsResultats; apercu?: boolean }>({ action: 'vote', n, choix });
export const avancer = (n: number) => call<{ ok: boolean; paid: number }>({ action: 'avancer', n });
export const acheterBonus = () => call<{ ok: boolean }>({ action: 'bonus' });
export const getFin = () => call<CdsFin>({ action: 'fin' });

/** « Demain soir à 20 h », « ce soir à 20 h »… (heure de Dakar = UTC). */
export function quandLabel(ms: number, now = Date.now()): string {
  const d = new Date(ms);
  const day = (x: number) => Math.floor(x / 86400000);
  const h = `${String(d.getUTCHours()).padStart(2, '0')} h${d.getUTCMinutes() ? String(d.getUTCMinutes()).padStart(2, '0') : ''}`;
  const diff = day(ms) - day(now);
  if (diff <= 0) return `ce soir à ${h}`;
  if (diff === 1) return `demain soir à ${h}`;
  return `le ${d.getUTCDate()}/${d.getUTCMonth() + 1} à ${h}`;
}
