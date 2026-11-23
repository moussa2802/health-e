/**
 * casDuSoirService — « Le cas du soir » (fonction Netlify cas-du-soir). Aucun appel à l'IA.
 * Connecté : le jeton est envoyé. Visiteur : un identifiant au hasard gardé sur ce téléphone (un vote par épisode).
 */
import { auth } from '../utils/firebase';

export interface CdsChoix { id: string; label: string }
/** Le minutage d'un audio : les phrases (t en secondes) et les images qui changent pendant l'écoute */
export interface CdsMinutage { duree: number; lignes: { t0: number; t1: number; qui: string; texte: string }[]; images?: { t: number; image: string }[] }
export interface CdsEpisode { n: number; titre: string; texte: string; image: string | null; minutage?: CdsMinutage | null; minutes: number; question: string; choix: CdsChoix[]; embranchement: boolean; /** tests proposés à la fin de l'épisode (identifiants du catalogue) */ tests?: string[] }
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
  id: string; titre: string; image: string | null; intrigue: string | null; intrigueMinutage?: CdsMinutage | null; accroche: string; avertissement: string; total: number; parus: number; prochain: number | null; lisibles: number[]; testLie: string | null;
  testAussi: string | null; minutes: number; audio: boolean; autreFin: { mention: string } | null;
  /** cas réservé aux adultes (confirmation « 18 ans ou plus » avant d'entrer) */
  adultes?: boolean;
  /** le rayon de la liste : santé mentale ou santé sexuelle */
  categorie?: 'mentale' | 'sexuelle';
  /** l'autre rayon quand le cas touche les deux (santé mentale ET santé sexuelle) */
  categorieAussi?: 'mentale' | 'sexuelle' | null;
  /** numéro de l'épisode dont le vote décide de la suite (A ou B), ou null : cas linéaire */
  embranchement?: number | null;
  /** date d'ouverture publique (ms), ou null si elle n'est pas fixée */
  ouverture?: number | null;
  /** prix pour ouvrir tout le cas tout de suite, ou null (déjà ouvert, déjà débloqué ou pas de déblocage) */
  debloquer?: number | null;
  anticipe?: boolean;
  /** ce que le public voit : un chiffre seulement au-dessus du seuil (50 lecteurs, 10 « utile »), sinon null ; déjà arrondi par le serveur (« 120+ ») */
  stats?: { lecteurs: string | null; utile: string | null };
  /** (propriétaire seulement) les chiffres bruts, et les « non » avec leur texte */
  chiffres?: CdsChiffres;
}
export interface CdsChiffres { lecteurs: number; utileOui: number; utileNon: number; non?: { texte: string; atMs: number }[] }
export interface CdsPrix { suite: Record<number, number>; bonus: number; autreFin: number }
export interface CdsEtat { visible: boolean; histoire?: CdsHistoire; prix?: CdsPrix; autreFin?: { achetee: boolean; possible: boolean }; connecte?: boolean; bonus?: boolean; apercu?: boolean; animal?: string | null; proprio?: boolean; chiffres?: CdsChiffres }
export interface CdsEpisodeReponse {
  episode: CdsEpisode; audioUrl: string | null; monChoix: string | null; resultats: CdsResultats | null;
  /** parution : l'ouverture GRATUITE de l'épisode suivant pour CE lecteur (son rythme) ; null tant que son horloge n'a pas démarré */
  suite: { n: number; lisible: boolean; parution: number | null; avance: { ok: boolean; raison?: string; prix?: number } } | null;
  finLisible: boolean; apercu: boolean; autre?: boolean;
}
export interface CdsFin { monUtile?: 'oui' | 'non' | null; utile?: string | null; titre: string; texte: string; audioUrl: string | null; minutage?: CdsMinutage | null; quiz: { question: string; reponses: string[]; bonne: number; explication: string }[]; apresQuiz?: string; testLie: string | null; testAussi?: string | null }

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
export const getJourApercu = () => jourApercu;
/** La suite (A ou B) que le propriétaire voit en aperçu (son vote ne s'enregistre pas) ; 'A' par défaut. */
let brancheApercu: 'A' | 'B' = 'A';
export const setBrancheApercu = (b: 'A' | 'B') => { brancheApercu = b; };
export const getBrancheApercu = () => brancheApercu;

/** Le cas ouvert (adresse /cas-du-soir/:id) : envoyé avec chaque demande ; null = le cas du moment. */
let histoireActive: string | null = null;
export const setHistoire = (id: string | null) => { histoireActive = id; };

async function call<T>(body: Record<string, unknown>): Promise<T> {
  // Attendre que Firebase ait restauré la session : sinon, au premier affichage, l'appel part sans jeton (vu comme visiteur)
  try { await (auth as { authStateReady?: () => Promise<void> } | null)?.authStateReady?.(); } catch { /* ignore */ }
  const user = auth?.currentUser ?? null;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (user) headers.Authorization = `Bearer ${await user.getIdToken()}`;
  const res = await fetch('/.netlify/functions/cas-du-soir', {
    method: 'POST', headers, body: JSON.stringify({ ...(histoireActive ? { histoire: histoireActive } : {}), ...body, ...(jourApercu ? { jour: jourApercu, branche: brancheApercu } : {}), ...(user ? {} : { visiteurId: visiteurId() }) }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new CdsError((data as { error?: string }).error ?? `Erreur ${res.status}`, res.status, data as Record<string, unknown>);
  return data as T;
}

export interface CdsStatCas { id: string; titre: string; categorie: 'mentale' | 'sexuelle' | null; categorieAussi?: 'mentale' | 'sexuelle' | null; cache: boolean; lecteurs: number; visiteurs: number; visiteursCompte: number; commences: number; payeurs: number; lectureFin: number; quiz: number; tests: { id: string; n: number }[]; utileOui: number; utileNon: number; episodes: { n: number; titre: string; votes: number; counts: Record<string, number>; ouverts: number; lus: number }[]; non: { texte: string; atMs: number }[] }
/** Dr Lô seul : les chiffres bruts de tous les cas (espace admin). */
export const getStatistiques = () => call<{ cas: CdsStatCas[]; boite: { reponses: number; vues: number; utile: number; moi: number; pasclair: number } }>({ action: 'statistiques', histoire: undefined });
/** Compte un geste (une fois par personne côté serveur) : la page d'un cas, un test proposé ouvert, le quiz terminé. Silencieux : ne gêne jamais la lecture. */
export const noterGeste = (kind: 'page' | 'test' | 'quiz', id?: string) => { call({ action: 'evenement', kind, ...(id ? { id } : {}) }).catch(() => {}); };
export const getEtat = () => call<CdsEtat>({ action: 'etat' });
/** L'état du cas du moment, quel que soit le cas ouvert (carte de l'accueil). */
export const getEtatDuMoment = () => call<CdsEtat>({ action: 'etat', histoire: null });
export const getListe = () => call<{ visible: boolean; histoires?: (CdsHistoire & { statut: 'bientot' | 'en_cours' | 'termine' })[]; proprio?: boolean }>({ action: 'liste' });
export interface CdsEpisodeCarte {
  n: number; titre?: string; image?: string | null; attente?: boolean;
  etat: 'lu' | 'a_lire' | 'prochain' | 'verrouille' | 'compte' | 'vote';
  parution?: number | null; avance?: { ok: boolean; raison?: string; prix?: number } | null;
}
export const getEpisodes = () => call<{ episodes: CdsEpisodeCarte[]; finie: boolean; prix: CdsPrix; autreFin: { achetee: boolean; possible: boolean }; apercu: boolean }>({ action: 'episodes' });
/** Les épisodes d'un cas précis (sans dépendre du cas ouvert) : l'accueil montre où en est la personne dans le cas du moment. */
export const getEpisodesDe = (histoire: string) => call<Awaited<ReturnType<typeof getEpisodes>>>({ action: 'episodes', histoire });
export const getEpisode = (n: number, autre = false) => call<CdsEpisodeReponse>({ action: 'episode', n, ...(autre ? { autre: true } : {}) });
export const acheterAutreFin = () => call<{ ok: boolean }>({ action: 'autreFin' });
export const voter = (n: number, choix: string) => call<{ ok: boolean; monChoix: string; resultats: CdsResultats; apercu?: boolean }>({ action: 'vote', n, choix });
export const avancer = (n: number) => call<{ ok: boolean; paid: number }>({ action: 'avancer', n });
/** Ouvrir tout le cas tout de suite (avant son ouverture publique) : un seul paiement, le prix est celui du serveur. */
export const debloquerCas = (id: string) => call<{ ok: boolean; paid?: number; deja?: boolean }>({ action: 'debloquer', histoire: id });
/** « Ce cas t'a été utile ? » : oui, ou non avec un texte facultatif (privé : Dr Lô seul le lit). Une réponse par personne, qu'on peut changer. */
export const repondreUtile = (oui: boolean, texte?: string) => call<{ ok: boolean; oui: boolean; apercu?: boolean }>({ action: 'utile', oui, ...(texte ? { texte } : {}) });
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
