/**
 * boxService.ts — la boîte à questions anonyme (fonction serveur drlo-box).
 * Dépôt sans compte ; lecture et décisions réservées à l'espace Dr Lô.
 */
import { authedFetch } from '../utils/authedFetch';

const URL = '/.netlify/functions/drlo-box';

export interface BoxAnswer { id: string; question: string; answer: string; at: number; topic: string }
export interface BoxTopic { id: string; label: string }
export type BoxStatus = 'new' | 'site' | 'video' | 'skipped';
export interface BoxItem { id: string; text: string; crisis: boolean; status: BoxStatus; createdAt: number; publicText: string; answer: string; note: string }
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
export const adminBoxDecide = (id: string, d: { status: BoxStatus; publicText?: string; answer?: string; note?: string }) => admin<{ ok: boolean }>({ action: 'decide', id, ...d });
export const adminBoxRemove = (id: string) => admin<{ ok: boolean }>({ action: 'remove', id });
