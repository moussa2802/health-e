/**
 * drloQuestionService.ts — client de la fonction serveur drlo-question
 * (paliers, file par vagues, parrainage, questions au vrai Dr Lô).
 */
import { authedFetch } from '../utils/authedFetch';

export interface Palier { key: 'decouverte' | 'reguliere' | 'cercle'; label: string; detail: string; done: boolean; progress?: number; goal?: number }
export interface MyQuestion { id: string; text: string; status: 'pending' | 'answered' | 'referred'; anonymous: boolean; share: string; createdAt: number; answer: { text: string; at: number } | null; seen: boolean }
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
export interface AdminQuestion { id: string; text: string; status: string; anonymous: boolean; videoConsent: boolean; snapshot: Record<string, unknown>; createdAt: number; answer: { text: string; at: number } | null }
export const adminListQuestions = () => call<{ items: AdminQuestion[]; week: { used: number; cap: number; queued: number } }>({ action: 'drlo_list' });
export const adminAnswerQuestion = (id: string, answer: string, status: 'answered' | 'referred') => call<{ ok: boolean }>({ action: 'drlo_answer', id, answer, status });
