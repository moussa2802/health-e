/**
 * boxService.ts — la boîte à questions anonyme (fonction serveur drlo-box).
 * Dépôt sans compte ; lecture et décisions réservées à l'espace Dr Lô.
 */
import { authedFetch } from '../utils/authedFetch';

const URL = '/.netlify/functions/drlo-box';

export interface BoxAnswer { id: string; question: string; answer: string; at: number }
export type BoxStatus = 'new' | 'site' | 'video' | 'skipped';
export interface BoxItem { id: string; text: string; crisis: boolean; status: BoxStatus; createdAt: number; publicText: string; answer: string; note: string }

export async function getBoxAnswers(): Promise<BoxAnswer[]> {
  const res = await fetch(URL);
  if (!res.ok) throw new Error('Erreur');
  return ((await res.json()) as { answers: BoxAnswer[] }).answers ?? [];
}

/** Dépose une question, sans compte. `website` est un piège à robots : il reste vide. */
export async function sendBoxQuestion(text: string): Promise<{ support: boolean }> {
  let res: Response;
  try { res = await fetch(URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'send', text, website: '' }) }); }
  catch { throw new Error('Pas de connexion. Vérifie ton réseau et réessaie.'); }
  const data = await res.json().catch(() => null) as { error?: string; support?: boolean } | null;
  if (!res.ok || !data) throw new Error(data?.error ?? 'La boîte ne répond pas pour le moment. Réessaie dans un instant.');
  return { support: !!data.support };
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
