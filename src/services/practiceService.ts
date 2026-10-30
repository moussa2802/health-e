/**
 * practiceService.ts — client de la fonction serveur « practices » (exercices guidés, techniques, carnets de Dr Lô).
 */
import { authedFetch } from '../utils/authedFetch';
import type { VoiceClip } from './drloChannelService';

export type PracticeType = 'guided' | 'technique' | 'carnet';
export type FieldKind = 'scale' | 'check' | 'text' | 'choice';
export type Feeling = 'mieux' | 'pareil' | 'moins';
export interface CarnetField { id: string; kind: FieldKind; label: string; options?: string[]; low?: string | null; high?: string | null }

export const PRACTICE_TYPES: { id: PracticeType; label: string; hint: string }[] = [
  { id: 'guided', label: 'Exercice guidé (audio)', hint: 'Ta voix guide la personne pas à pas (ex. scan corporel).' },
  { id: 'technique', label: 'Technique à apprendre', hint: 'Des étapes simples, audio facultatif (ex. respiration 4-7-8).' },
  { id: 'carnet', label: 'Carnet à remplir chaque jour', hint: 'Tu choisis les lignes à remplir (ex. carnet du plaisir).' },
];
export const PRACTICE_THEMES: { id: string; label: string }[] = [
  { id: 'stress', label: 'Stress' }, { id: 'humeur', label: 'Humeur' }, { id: 'sommeil', label: 'Sommeil' }, { id: 'emotions', label: 'Émotions' },
  { id: 'estime', label: 'Estime de soi' }, { id: 'couple', label: 'Couple' }, { id: 'sexualite', label: 'Sexualité' }, { id: 'corps', label: 'Corps' }, { id: 'autre', label: 'Autre' },
];
export const typeLabel = (t: PracticeType) => (t === 'guided' ? 'Exercice guidé' : t === 'technique' ? 'Technique' : 'Carnet');

export interface AdminPractice {
  id: string; type: PracticeType; title: string; summary: string; theme: string; minutes: number; price: number; freeForMembers: boolean;
  steps: string[]; fields: CarnetField[]; script: string; source: string; cautions: string; status: 'draft' | 'published' | 'retired';
  audioSec: number; audioUrl: string | null; channelIds: string[]; createdAt: number;
  stats: { unlocks?: number; runs?: number; mieux?: number; pareil?: number; moins?: number; stops?: number; logs?: number; earned?: number };
}
export interface PracticeInput {
  id?: string; type?: PracticeType; title?: string; summary?: string; theme?: string; minutes?: number; price?: number; freeForMembers?: boolean;
  steps?: string[]; fields?: Partial<CarnetField>[]; script?: string; source?: string; cautions?: string; status?: AdminPractice['status'];
  audio?: { data: string; mime: string; durationSec: number }; removeAudio?: boolean;
}
export interface Practice {
  id: string; type: PracticeType; title: string; summary: string; theme: string; minutes: number; price: number; free: boolean; unlocked: boolean;
  hasAudio: boolean; source: string; cautions: string; stepCount: number; steps?: string[]; fields?: CarnetField[]; audioUrl?: string | null;
}
export interface CarnetDay { day: string; values: Record<string, number | boolean | string> }

async function call<T>(body: Record<string, unknown>): Promise<T> {
  const res = await authedFetch('/.netlify/functions/practices', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const fallback = res.status === 413 ? 'L\'audio est trop lourd pour être envoyé.' : `Erreur ${res.status}`;
    throw Object.assign(new Error((data as { error?: string }).error ?? fallback), { status: res.status, data });
  }
  return data as T;
}

// Espace Dr Lô
export const listAdminPractices = () => call<{ items: AdminPractice[] }>({ action: 'drlo_list' });
/** Supprime une pratique que personne n'a débloquée (sinon le serveur refuse : utiliser « Retirer »). */
export const deletePractice = (id: string) => call<{ ok: boolean; removedFromPosts: number }>({ action: 'drlo_delete', id });
export const savePractice = (p: PracticeInput) => call<{ ok: boolean; practice: AdminPractice }>({ action: 'drlo_save', ...p });

// Personne connectée
export const listPractices = (ids: string[]) => call<{ items: Practice[] }>({ action: 'list', ids });
export const getPractice = (id: string) => call<{ practice: Practice; logs: CarnetDay[] }>({ action: 'get', id });
export const unlockPractice = (id: string) => call<{ ok: boolean; paid: number; already?: boolean }>({ action: 'unlock', id });
export const finishPractice = (id: string, feeling: Feeling) => call<{ ok: boolean }>({ action: 'finish', id, feeling });
export const stopPractice = (id: string) => call<{ ok: boolean }>({ action: 'stop', id });
export const logCarnet = (id: string, day: string, values: CarnetDay['values']) => call<{ ok: boolean; values: CarnetDay['values'] }>({ action: 'log', id, day, values });

/** Jour local « AAAA-MM-JJ » (décalé de n jours). */
export function localDay(offset = 0): string {
  const d = new Date(); d.setDate(d.getDate() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
export type { VoiceClip };
