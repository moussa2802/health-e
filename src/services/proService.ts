/**
 * proService — l'arrivée des professionnels de santé (fonction serveur pro-access).
 * Seule l'arrivée d'un pro passe par Dr Lô ; ensuite il crée librement ses chaînes.
 */
import { authedFetch } from '../utils/authedFetch';

export type ProRole = 'owner' | 'pro' | 'none';
export type ProStatus = 'pending' | 'approved' | 'rejected' | 'suspended';
export interface ProApplication { status: ProStatus; rejectReason: string; fullName: string; profession: string; title: string; city: string; bio: string; license: string; createdAt: number }
export interface ProMe { role: ProRole; suspended: boolean; profile: { fullName: string; title: string; city: string; bio: string } | null; application: ProApplication | null }
export interface ProApplyInput { fullName: string; profession: string; title?: string; license: string; city: string; bio: string }
export interface ProRow extends ProApplication { uid: string; email: string }

export const PROFESSIONS: { id: string; label: string }[] = [
  { id: 'psychologue', label: 'Psychologue' }, { id: 'psychiatre', label: 'Psychiatre' }, { id: 'medecin', label: 'Médecin' },
  { id: 'sage_femme', label: 'Sage-femme' }, { id: 'sexologue', label: 'Sexologue' }, { id: 'infirmier', label: 'Infirmier ou infirmière' },
  { id: 'travailleur_social', label: 'Travailleur social' }, { id: 'autre', label: 'Autre profession de santé' },
];

async function call<T>(body: Record<string, unknown>): Promise<T> {
  const res = await authedFetch('/.netlify/functions/pro-access', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error((data as { error?: string }).error ?? `Erreur ${res.status}`), { status: res.status });
  return data as T;
}

export const getProMe = () => call<ProMe>({ action: 'me' });
export const applyPro = (a: ProApplyInput) => call<{ ok: boolean; status: ProStatus }>({ action: 'apply', ...a });
export const updateProProfile = (p: { title?: string; city?: string; bio?: string }) => call<{ ok: boolean }>({ action: 'profile_update', ...p });
// Dr Lô
export const listPros = () => call<{ items: ProRow[]; pending: number }>({ action: 'pros_list' });
export const approvePro = (uid: string) => call<{ ok: boolean }>({ action: 'approve', uid });
export const rejectPro = (uid: string, reason: string) => call<{ ok: boolean }>({ action: 'reject', uid, reason });
export const suspendPro = (uid: string, suspended: boolean) => call<{ ok: boolean }>({ action: 'suspend', uid, suspended });
