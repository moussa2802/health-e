/**
 * drloQuestionService.ts — client de la fonction serveur drlo-question
 * (paliers, file par vagues, parrainage, questions à Dr Lô).
 */
import { authedFetch } from '../utils/authedFetch';
import type { ThreadEntry, VoiceClip } from './drloBroadcastService';

export interface Palier { key: 'decouverte' | 'reguliere' | 'cercle'; label: string; detail: string; done: boolean; progress?: number; goal?: number }
export interface MyQuestion { id: string; text: string; status: 'pending' | 'answered' | 'referred'; anonymous: boolean; share: string; createdAt: number; answer: { text: string; at: number } | null; seen: boolean;
  thread: ThreadEntry[]; closed: boolean; canReply: boolean; news: number }
export interface DrloStatus {
  paliers: { steps: Palier[]; remaining: number; unlocked: boolean };
  notedDays: number;
  ask: { ok: boolean; reason?: 'pending' | 'wait'; nextAt?: number };
  queue: { canSubmit: boolean; inQueue: boolean; position: number | null; nextWave: number };
  referral: { code: string; count: number; goal: number };
  questions: MyQuestion[];
  cap: number;
}
export interface SubmitInput { text: string; anonymous: boolean; share: 'none' | 'totem' | 'results'; includeIntime: boolean; includeJournal: boolean; videoConsent: boolean }

async function call<T>(body: Record<string, unknown>): Promise<T> {
  const res = await authedFetch('/.netlify/functions/drlo-question', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error((data as { error?: string }).error ?? 'Erreur'), { status: res.status, data });
  return data as T;
}

export const getDrloStatus = () => call<DrloStatus>({ action: 'status' });
export const joinDrloQueue = () => call<DrloStatus>({ action: 'join_queue' });
export const submitDrloQuestion = (q: SubmitInput) => call<{ ok: boolean }>({ action: 'submit', ...q });
export const getMyThreads = () => call<{ items: MyQuestion[]; news: number }>({ action: 'my_threads' });
export const followUpQuestion = (id: string, text: string) => call<{ ok: boolean; published: boolean; support?: boolean }>({ action: 'followup', id, text });
export const markDrloAnswersSeen = () => call<{ ok: boolean }>({ action: 'mark_seen' });

// ── Parrainage : ?ref=CODE sur le lien d'invitation ──
const REF_KEY = 'he_ref';
export function captureReferral(search: string): void {
  try {
    const ref = new URLSearchParams(search).get('ref');
    if (ref && /^[A-Za-z2-9]{6}$/.test(ref)) localStorage.setItem(REF_KEY, ref.toUpperCase());
  } catch { /* ignore */ }
}
export async function registerReferralIfAny(): Promise<void> {
  let ref: string | null = null;
  try { ref = localStorage.getItem(REF_KEY); } catch { /* ignore */ }
  if (!ref) return;
  try { await call({ action: 'referral', ref }); localStorage.removeItem(REF_KEY); } catch { /* réessaiera */ }
}
export const inviteLink = (code: string) => `https://health-e.sn/?ref=${code}`;

// ── Espace Dr Lô (rôle staff/{uid}.drlo, séparé de l'admin) ──
export type AdminEntry = ThreadEntry & { index: number };
export interface AdminQuestion { id: string; text: string; status: string; anonymous: boolean; videoConsent: boolean; snapshot: Record<string, unknown>; createdAt: number; answer: { text: string; at: number } | null; closed: boolean; lastUserAt: number; thread: AdminEntry[] }
export const adminListQuestions = () => call<{ items: AdminQuestion[]; week: { used: number; cap: number; queued: number } }>({ action: 'drlo_list' });
export const adminAnswerQuestion = (id: string, answer: string, status: 'answered' | 'referred', audio?: VoiceClip) => call<{ ok: boolean }>({ action: 'drlo_answer', id, answer, status, audio });
export const adminEditEntry = (id: string, index: number, edit: { text: string; audio?: VoiceClip; removeAudio?: boolean }) => call<{ ok: boolean }>({ action: 'drlo_entry_edit', id, index, ...edit });
export const adminDeleteEntry = (id: string, index: number) => call<{ ok: boolean }>({ action: 'drlo_entry_delete', id, index });
export const adminCloseQuestion = (id: string, closed: boolean) => call<{ ok: boolean }>({ action: 'drlo_close', id, closed });
