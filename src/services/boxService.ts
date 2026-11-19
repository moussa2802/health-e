/**
 * boxService.ts — la boîte à questions anonyme (fonction serveur drlo-box).
 * Dépôt sans compte ; lecture et décisions réservées à l'espace Dr Lô.
 */
import { authedFetch } from '../utils/authedFetch';

const URL = '/.netlify/functions/drlo-box';

/** vues, utile, moi : déjà arrondis par le serveur (« 120+ ») et absents (null) sous le seuil ; « pas clair » n'est jamais public */
export interface BoxAnswer { id: string; question: string; answer: string; at: number; topic: string; vues?: string | null; utile?: string | null; moi?: string | null }
export type Reaction = 'utile' | 'moi' | 'pasclair';
export interface BoxTopic { id: string; label: string }
export type BoxStatus = 'new' | 'site' | 'video' | 'skipped';
export interface BoxItem { vues?: number; reactions?: { utile: number; moi: number; pasclair: number }; id: string; text: string; crisis: boolean; status: BoxStatus; createdAt: number; publicText: string; answer: string; note: string; topic?: string; topicAuto?: string }
export type MineState = 'waiting' | 'answered' | 'video' | 'closed' | 'gone';
export interface MineStatus { id: string; state: MineState; question?: string; answer?: string; at?: number; topic?: string }
/** Une question déposée depuis cet appareil : seul son texte reste ici, jamais sur un compte. */
export interface MyQuestion { id: string; text: string; at: number }

export async function getBox(): Promise<{ answers: BoxAnswer[]; topics: BoxTopic[]; waiting: number | null }> {
  const res = await fetch(URL);
  if (!res.ok) throw new Error('Erreur');
  const d = await res.json() as { answers?: BoxAnswer[]; topics?: BoxTopic[]; waiting?: number | null };
  return { answers: d.answers ?? [], topics: d.topics ?? [], waiting: typeof d.waiting === 'number' ? d.waiting : null };
}

/** Dépose une question, sans compte. `website` est un piège à robots : il reste vide. */
export async function sendBoxQuestion(text: string): Promise<{ support: boolean; id: string | null }> {
  let res: Response;
  try { res = await fetch(URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'send', text, website: '' }) }); }
  catch { throw new Error('Pas de connexion. Vérifie ton réseau et réessaie.'); }
  const data = await res.json().catch(() => null) as { error?: string; support?: boolean; id?: string } | null;
  if (!res.ok || !data) throw new Error(data?.error ?? 'La boîte ne répond pas pour le moment. Réessaie dans un instant.');
  return { support: !!data.support, id: data.id ?? null };
}

/** L'état des questions de cet appareil (en attente, répondue, en vidéo, sans réponse écrite). */
export async function getMineStatus(ids: string[]): Promise<MineStatus[]> {
  if (!ids.length) return [];
  const res = await fetch(URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'mine', ids }) });
  if (!res.ok) throw new Error('Erreur');
  return ((await res.json()) as { items?: MineStatus[] }).items ?? [];
}

// Un identifiant tiré au hasard dans CE navigateur (pas un compte) : le serveur ne garde que son empreinte, pour qu'une personne n'ait qu'une réaction par réponse
const VID_KEY = 'healthe.box.vid';
function visiteurId(): string {
  try {
    let v = localStorage.getItem(VID_KEY);
    if (!v || !/^[A-Za-z0-9-]{16,64}$/.test(v)) { v = (crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}abcdefgh`).replace(/[^A-Za-z0-9-]/g, ''); if (v.length < 16) v = v.padEnd(16, 'a'); localStorage.setItem(VID_KEY, v); }
    return v;
  } catch { return ''; }
}
const REAC_KEY = 'healthe.box.reactions';
export function readReactions(): Record<string, Reaction> { try { const r = JSON.parse(localStorage.getItem(REAC_KEY) || '{}'); return r && typeof r === 'object' ? r : {}; } catch { return {}; } }
function writeReaction(id: string, kind: Reaction | null) { try { const r = readReactions(); if (kind) r[id] = kind; else delete r[id]; localStorage.setItem(REAC_KEY, JSON.stringify(r)); } catch { /* la page marche sans */ } }
/** Ta réaction à une réponse (une seule ; la même touche l'annule). « pasclair » reste privé : seul Dr Lô le voit. */
export async function reagir(id: string, kind: Reaction | null): Promise<void> {
  const vid = visiteurId(); if (!vid) throw new Error('Ton navigateur ne permet pas de réagir.');
  const res = await fetch(URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'react', id, kind, visiteurId: vid }) });
  if (!res.ok) throw new Error(((await res.json().catch(() => ({}))) as { error?: string }).error ?? 'Erreur');
  writeReaction(id, kind);
}
const VUES_KEY = 'healthe.box.vues';
/** Une réponse ouverte compte une vue, une seule par navigateur (le serveur dédoublonne aussi). Silencieux en cas d'erreur. */
export function compterVue(id: string): void {
  const vid = visiteurId(); if (!vid) return;
  try { const vus = new Set<string>(JSON.parse(localStorage.getItem(VUES_KEY) || '[]')); if (vus.has(id)) return; vus.add(id); localStorage.setItem(VUES_KEY, JSON.stringify([...vus].slice(-600))); } catch { /* on envoie quand même */ }
  void fetch(URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'view', id, visiteurId: vid }) }).catch(() => {});
}

const MINE_KEY = 'healthe.box.mine';
const MINE_MAX = 10;
export function readMyQuestions(): MyQuestion[] {
  try {
    const raw = JSON.parse(localStorage.getItem(MINE_KEY) || '[]') as MyQuestion[];
    return Array.isArray(raw) ? raw.filter(q => q && typeof q.id === 'string' && typeof q.text === 'string').slice(0, MINE_MAX) : [];
  } catch { return []; }
}
function writeMyQuestions(list: MyQuestion[]) { try { localStorage.setItem(MINE_KEY, JSON.stringify(list.slice(0, MINE_MAX))); } catch { /* stockage indisponible : la page marche sans */ } }
export function rememberMyQuestion(q: MyQuestion): MyQuestion[] {
  const list = [q, ...readMyQuestions().filter(x => x.id !== q.id)].slice(0, MINE_MAX);
  writeMyQuestions(list);
  return list;
}
export function forgetMyQuestion(id: string): MyQuestion[] {
  const list = readMyQuestions().filter(x => x.id !== id);
  writeMyQuestions(list);
  return list;
}

async function admin<T>(body: Record<string, unknown>): Promise<T> {
  const res = await authedFetch(URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error ?? 'Erreur');
  return data as T;
}
export const adminBoxList = () => admin<{ items: BoxItem[] }>({ action: 'list' });
export const adminBoxDecide = (id: string, d: { status: BoxStatus; publicText?: string; answer?: string; note?: string; topic?: string }) => admin<{ ok: boolean }>({ action: 'decide', id, ...d });
export const adminBoxRemove = (id: string) => admin<{ ok: boolean }>({ action: 'remove', id });
