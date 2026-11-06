/**
 * motService — « Ton mot du jour » (fonction serveur mot-du-jour).
 * Le mot du jour est aussi gardé sur ce téléphone : il s'affiche tout de suite à la 2e ouverture.
 */
import { authedFetch } from '../utils/authedFetch';

export interface Mot { day: string; text: string; kind?: string | null; kept?: boolean }

async function call<T>(body: object): Promise<T> {
  const res = await authedFetch('/.netlify/functions/mot-du-jour', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error ?? 'Erreur');
  return data as T;
}

const KEY = 'he_mot_du_jour';
/** Le jour à Dakar (comme le serveur). */
export const motDay = () => new Date().toISOString().slice(0, 10);

export function cachedMot(uid: string): Mot | null {
  try {
    const c = JSON.parse(localStorage.getItem(KEY) || 'null') as (Mot & { uid: string }) | null;
    return c && c.uid === uid && c.day === motDay() ? c : null;
  } catch { return null; }
}

export async function getMot(uid: string): Promise<Mot> {
  const m = await call<Mot>({ action: 'today' });
  try { localStorage.setItem(KEY, JSON.stringify({ ...m, uid })); } catch { /* ignore */ }
  return m;
}

export async function keepMot(uid: string, m: Mot): Promise<void> {
  await call({ action: 'keep', text: m.text });
  try { localStorage.setItem(KEY, JSON.stringify({ ...m, kept: true, uid })); } catch { /* ignore */ }
}
