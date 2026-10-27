/**
 * drloBroadcastService.ts — client de la fonction serveur drlo-broadcast
 * (« Ma communauté » : les messages de Dr Lô à ses abonnés).
 */
import { authedFetch } from '../utils/authedFetch';

export type Reaction = 'heart' | 'pray' | 'strong';
export const REACTIONS: { id: Reaction; emoji: string; label: string }[] = [
  { id: 'heart', emoji: '❤️', label: 'Ça me touche' },
  { id: 'pray', emoji: '🙏', label: 'Merci' },
  { id: 'strong', emoji: '💪', label: 'Ça me donne de la force' },
];

export type Level = 'bon' | 'leger' | 'modere' | 'eleve';
export interface Audience {
  all?: boolean;
  test?: { scaleId: string; levels: Level[] };
  totems?: string[];
  programmes?: string[];
  activity?: 'nouveaux' | 'absents' | null;
}
export interface Counts { heart: number; pray: number; strong: number }
export interface InboxItem { id: string; text: string; at: number; seen: boolean; reaction: Reaction | null; commentsOpen: boolean; audio?: { durationSec: number } | null }
export interface BroadcastRow {
  id: string; text: string; audience: Audience; audienceCount: number; status: string; hidden: boolean;
  createdAt: number; sendAt: number; stats: { views: number; reactions: Counts; comments?: number }; commentsOpen?: boolean; audio?: { durationSec: number } | null;
}

async function call<T>(body: Record<string, unknown>): Promise<T> {
  const res = await authedFetch('/.netlify/functions/drlo-broadcast', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const fallback = res.status === 413 ? 'Le vocal est trop lourd pour être envoyé. Fais-en un plus court.' : `Erreur ${res.status}`;
    throw Object.assign(new Error((data as { error?: string }).error ?? fallback), { status: res.status });
  }
  return data as T;
}

// Espace Dr Lô
export const countAudience = (audience: Audience) => call<{ count: number; minForTargeted: number; fine: boolean }>({ action: 'drlo_count', audience });
export interface VoiceClip { data: string; mime: string; durationSec: number }
export const createBroadcast = (text: string, audience: Audience, sendAt?: number, audio?: VoiceClip) =>
  call<{ ok: boolean; id: string; status: string; count: number }>({ action: 'drlo_create', text, audience, sendAt, audio });
export const listBroadcasts = () => call<{ items: BroadcastRow[] }>({ action: 'drlo_list' });
export const hideBroadcast = (id: string, hidden: boolean) => call<{ ok: boolean }>({ action: 'drlo_hide', id, hidden });

// Personne connectée
export const getInbox = () => call<{ items: InboxItem[]; unread: number }>({ action: 'inbox' });
export const openMessage = (id: string) => call<{ message: InboxItem; counts: Counts; audioUrl?: string | null }>({ action: 'open', id });
export const reactToMessage = (id: string, reaction: Reaction | null) => call<{ ok: boolean; reaction: Reaction | null; counts: Counts }>({ action: 'react', id, reaction });

// Commentaires
export type IdentityMode = 'anon' | 'prenom' | 'pseudo';
export interface PublicComment { id: string; name: string; text: string; at: number; mine: boolean; pinned: boolean; reply: { text: string; at: number } | null }
export interface AdminComment { id: string; name: string; text: string; status: 'public' | 'distress' | string; hidden: boolean; pinned: boolean; reports: number; reply: { text: string; at: number } | null; createdAt: number }
export const getComments = (id: string) => call<{ open: boolean; items: PublicComment[] }>({ action: 'comments', id });
export const addComment = (id: string, text: string, mode: IdentityMode, pseudo?: string) =>
  call<{ ok: boolean; published: boolean; support?: boolean }>({ action: 'comment_add', id, text, mode, pseudo });
export const reportComment = (commentId: string) => call<{ ok: boolean }>({ action: 'comment_report', commentId });
export const deleteComment = (commentId: string) => call<{ ok: boolean }>({ action: 'comment_delete', commentId });
export const setCommentsOpen = (id: string, open: boolean) => call<{ ok: boolean }>({ action: 'drlo_comments_open', id, open });
export const adminComments = (id: string) => call<{ items: AdminComment[] }>({ action: 'drlo_comments', id });
export const adminCommentAct = (commentId: string, action: 'hide' | 'pin', value: boolean) =>
  call<{ ok: boolean }>({ action: `drlo_comment_${action}`, commentId, ...(action === 'hide' ? { hidden: value } : { pinned: value }) });
export const replyComment = (commentId: string, text: string) => call<{ ok: boolean }>({ action: 'drlo_comment_reply', commentId, text });
