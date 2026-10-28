/**
 * drloChannelService.ts — client de la fonction serveur drlo-channels (« Chaînes » de Dr Lô).
 */
import { authedFetch } from '../utils/authedFetch';
import type { Counts, Level, Reaction } from './drloBroadcastService';

export interface ChannelRules { tests?: { scaleId: string; levels?: Level[] }[]; totems?: string[]; minAge?: number }
/** Ce qui manque à une personne pour entrer (calculé par le serveur). */
export type Missing =
  | { kind: 'test'; scaleId: string; levels?: Level[] }
  | { kind: 'level'; scaleId: string; levels: Level[] }
  | { kind: 'totem'; totems: string[]; known: boolean }
  | { kind: 'age'; minAge: number; known: boolean }
  | { kind: 'balance'; need: number; have: number };

export interface AdminChannel {
  id: string; name: string; description: string; price: number; framingText: string; requireFramingAck: boolean;
  rules: ChannelRules; status: 'active' | 'archived'; memberCount: number; createdAt: number; photoUrl: string | null;
}
export interface Channel {
  id: string; name: string; description: string; price: number; rules: ChannelRules; archived: boolean; memberCount: number; photoUrl: string | null;
  member: boolean; joinedAt: number | null; muted: boolean; eligible: boolean; missing: Missing[];
  requireFramingAck: boolean; hasFraming: boolean; framingText?: string;
  /** Nouveautés pour un membre : publications pas encore ouvertes, réponses de Dr Lô à ses commentaires. */
  news?: { posts: number; replies: number };
}
export interface ChannelsNews { badge: number; byChannel: Record<string, { posts: number; replies: number }> }
export interface ChannelsActivity { badge: number; distress: number; byChannel: Record<string, { members: number; comments: number; replies: number }> }
export interface ChannelInput {
  id?: string; name?: string; description?: string; price?: number; framingText?: string; requireFramingAck?: boolean;
  rules?: ChannelRules; status?: 'active' | 'archived'; photo?: { data: string; mime: string }; removePhoto?: boolean;
}

async function call<T>(body: Record<string, unknown>): Promise<T> {
  const res = await authedFetch('/.netlify/functions/drlo-channels', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const fallback = res.status === 413 ? 'La photo est trop lourde.' : `Erreur ${res.status}`;
    throw Object.assign(new Error((data as { error?: string }).error ?? fallback), { status: res.status, data });
  }
  return data as T;
}

// Espace Dr Lô
export const listAdminChannels = () => call<{ items: AdminChannel[] }>({ action: 'drlo_list' });
export const saveChannel = (c: ChannelInput) => call<{ ok: boolean; channel: AdminChannel }>({ action: 'drlo_save', ...c });

// Personne connectée
export const listChannels = () => call<{ items: Channel[]; balance: number; badge?: number }>({ action: 'list' });
export const getChannelNews = () => call<ChannelsNews>({ action: 'news' });
export const muteChannel = (id: string, muted: boolean) => call<{ ok: boolean; muted: boolean }>({ action: 'mute', id, muted });
export const getChannelActivity = () => call<ChannelsActivity>({ action: 'drlo_activity' });
export const markChannelsSeen = () => call<{ ok: boolean }>({ action: 'drlo_seen' });
export const getChannel = (id: string) => call<{ channel: Channel; balance: number }>({ action: 'detail', id });
export const joinChannel = (id: string, ack: boolean) => call<{ ok: boolean; paid: number }>({ action: 'join', id, ack });
export const leaveChannel = (id: string) => call<{ ok: boolean }>({ action: 'leave', id });

// ───────── Publications (fonction drlo-channel-posts) ─────────
export interface VoiceClip { data: string; mime: string; durationSec: number }
export interface AdminPost {
  id: string; channelId: string; title: string; text: string; hasAudio: boolean; audioSec: number; audioUrl: string | null; preview: boolean; commentsOpen: boolean; createdAt: number;
  stats: { views: number; listens: number; reactions: Counts; comments: number };
}
/** Une publication côté personne : verrouillée = ni texte ni lien d'écoute. */
export interface ChannelPost {
  id: string; at: number; preview: boolean; locked: boolean; hasAudio: boolean; audioSec: number; commentsOpen: boolean; counts: Counts; comments: number;
  mine: Reaction | null; seen: boolean; title?: string; text?: string; audioUrl?: string | null;
}
export type AudienceKind = 'all' | 'seen' | 'listened' | 'unseen';
export interface MemberRow { name: string; at: number }

async function callPosts<T>(body: Record<string, unknown>): Promise<T> {
  const res = await authedFetch('/.netlify/functions/drlo-channel-posts', {
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
export const createPost = (p: { channelId: string; title?: string; text?: string; audio?: VoiceClip; preview?: boolean; commentsOpen?: boolean; notify?: boolean }) => callPosts<{ ok: boolean; post: AdminPost }>({ action: 'post_create', ...p });
export const listPosts = (channelId: string) => callPosts<{ items: AdminPost[] }>({ action: 'post_list', channelId });
export const updatePost = (id: string, p: { title?: string; text?: string; preview?: boolean; commentsOpen?: boolean }) => callPosts<{ ok: boolean; post: AdminPost }>({ action: 'post_update', id, ...p });
export const deletePost = (id: string) => callPosts<{ ok: boolean }>({ action: 'post_delete', id });
export const getMembers = (channelId: string, o: { postId?: string; kind?: AudienceKind; after?: string | null; q?: string } = {}) =>
  callPosts<{ items: MemberRow[]; next: string | null }>({ action: 'audience', channelId, kind: o.kind ?? 'all', postId: o.postId, after: o.after ?? undefined, q: o.q || undefined });

// Personne connectée
export const getFeed = (channelId: string) => callPosts<{ member: boolean; posts: ChannelPost[] }>({ action: 'feed', channelId });
export const markPostsSeen = (channelId: string, ids: string[]) => callPosts<{ ok: boolean }>({ action: 'seen', channelId, ids });
export const markPostListened = (id: string) => callPosts<{ ok: boolean }>({ action: 'listen', id });
export const reactToPost = (id: string, reaction: Reaction | null) => callPosts<{ ok: boolean; reaction: Reaction | null; counts: Counts }>({ action: 'react', id, reaction });

// ───────── Commentaires (fonction drlo-channel-comments) ─────────
import type { AdminComment, IdentityMode, PublicComment } from './drloBroadcastService';
async function callComments<T>(body: Record<string, unknown>): Promise<T> {
  const res = await authedFetch('/.netlify/functions/drlo-channel-comments', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const fallback = res.status === 413 ? 'Le vocal est trop lourd pour être envoyé. Fais-en un plus court.' : `Erreur ${res.status}`;
    throw Object.assign(new Error((data as { error?: string }).error ?? fallback), { status: res.status });
  }
  return data as T;
}
// Membre
export const getPostComments = (postId: string) => callComments<{ open: boolean; items: PublicComment[] }>({ action: 'comments', postId });
export const addPostComment = (postId: string, text: string, mode: IdentityMode, pseudo?: string) =>
  callComments<{ ok: boolean; published: boolean; support?: boolean }>({ action: 'comment_add', postId, text, mode, pseudo });
export const reportPostComment = (commentId: string) => callComments<{ ok: boolean }>({ action: 'comment_report', commentId });
export const deletePostComment = (commentId: string) => callComments<{ ok: boolean }>({ action: 'comment_delete', commentId });
export const followUpPostComment = (commentId: string, text: string) =>
  callComments<{ ok: boolean; published: boolean; support?: boolean }>({ action: 'comment_followup', commentId, text });
// Espace Dr Lô
export const adminPostComments = (postId: string) => callComments<{ items: AdminComment[] }>({ action: 'comments_list', postId });
export const adminPostCommentAct = (commentId: string, action: 'hide' | 'pin' | 'close', value: boolean) =>
  callComments<{ ok: boolean }>({ action: `comment_${action}`, commentId, ...(action === 'hide' ? { hidden: value } : action === 'pin' ? { pinned: value } : { closed: value }) });
export const replyPostComment = (commentId: string, text: string, audio?: VoiceClip) => callComments<{ ok: boolean }>({ action: 'comment_reply', commentId, text, audio });
export const editPostReply = (commentId: string, index: number, edit: { text: string; audio?: VoiceClip; removeAudio?: boolean }) =>
  callComments<{ ok: boolean }>({ action: 'comment_edit', commentId, index, ...edit });
