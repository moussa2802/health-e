/**
 * pencService — « Pénc mi », les discussions en direct (fonction serveur penc).
 */
import { authedFetch } from '../utils/authedFetch';

export type PencAccess = 'all' | 'channel' | 'paid';
export type PencStatus = 'scheduled' | 'live' | 'ended' | 'cancelled';
export interface Penc {
  id: string; title: string; description: string; startAt: number; durationMin: number; access: PencAccess; channelId: string | null; channelName: string | null;
  price: number; testScaleId: string | null; repeatWeekly?: boolean; status: PencStatus; host: { name: string; title: string; pro: boolean }; registeredCount: number; summary: string[];
  listeners?: number | null;
  bucket?: 'live' | 'upcoming' | 'past'; registered?: boolean; locked?: boolean; mineAsHost?: boolean;
}
export interface PencInput { id?: string; title?: string; description?: string; startAt?: number; durationMin?: number; access?: PencAccess; channelId?: string; price?: number; testScaleId?: string; repeatWeekly?: boolean }
export const DURATIONS = [15, 30, 45, 60, 90, 120];

async function call<T>(body: Record<string, unknown>): Promise<T> {
  const res = await authedFetch('/.netlify/functions/penc', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error((data as { error?: string }).error ?? `Erreur ${res.status}`), { status: res.status, data });
  return data as T;
}

export const getAgenda = () => call<{ live: Penc[]; upcoming: Penc[]; past: Penc[] }>({ action: 'agenda' });
export const getPenc = (id: string) => call<{ penc: Penc }>({ action: 'detail', id });
export const registerPenc = (id: string, on: boolean) => call<{ ok: boolean; registered: boolean; paid?: number }>({ action: 'register', id, on });
// Espace pro
export const managePencs = () => call<{ items: Penc[] }>({ action: 'manage_list' });
export const savePenc = (p: PencInput) => call<{ ok: boolean; penc: Penc }>({ action: 'save', ...p });
export const startPenc = (id: string) => call<{ ok: boolean }>({ action: 'start', id });
export const endPenc = (id: string, summary: string[]) => call<{ ok: boolean }>({ action: 'end', id, summary });
export const openPencNow = (title: string, access: 'all' | 'channel' = 'all', channelId?: string) => call<{ ok: boolean; penc: Penc }>({ action: 'open_now', title, access, channelId });
export const cancelPenc = (id: string) => call<{ ok: boolean }>({ action: 'cancel', id });
export const hidePenc = (id: string) => call<{ ok: boolean }>({ action: 'hide', id });

const DAYS = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'];
const MONTHS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
/** « SAM. » / « 8 » / « 21 h » pour la pastille de date. */
export function dateParts(t: number) {
  const d = new Date(t);
  const m = d.getMinutes();
  return { day: DAYS[d.getDay()].toUpperCase(), num: d.getDate(), month: MONTHS[d.getMonth()], time: `${d.getHours()} h${m ? String(m).padStart(2, '0') : ''}` };
}
/** « samedi 8 nov. à 21 h » */
export function whenLabel(t: number) {
  const d = new Date(t);
  const now = new Date();
  const p = dateParts(t);
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  if (d.toDateString() === now.toDateString()) return `aujourd'hui à ${p.time}`;
  if (d.toDateString() === tomorrow.toDateString()) return `demain à ${p.time}`;
  return `${d.toLocaleDateString('fr-FR', { weekday: 'long' })} ${p.num} ${p.month} à ${p.time}`;
}
