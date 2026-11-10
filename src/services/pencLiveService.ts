/**
 * pencLiveService — le direct de Pénc mi (fonction serveur penc-live) : aperçu public, questions, commentaires, images.
 */
import { authedFetch } from '../utils/authedFetch';
import type { IdentityMode } from './drloBroadcastService';

export interface PencPreview {
  id: string; title: string; description: string; startAt: number; durationMin: number; status: 'scheduled' | 'live' | 'ended';
  access: 'all' | 'channel' | 'paid'; price: number; channelName: string | null; host: { name: string; title: string }; registeredCount: number;
}
export interface PencQuestion { id: string; text: string; name: string; votes: number; at: number; status: 'open' | 'answered'; pinned: boolean; voted: boolean; mine: boolean; animal?: string }
export interface LiveState { questions: PencQuestion[]; pinned: PencQuestion | null; slides: (string | null)[]; slideIndex: number | null; isMod: boolean }
export interface ChatMessage { cid: string; who: string; n: string; t: string; h: number; at: number; /** animal intérieur (photo de profil) */ a?: string }

const FN = '/.netlify/functions/penc-live';

async function call<T>(body: Record<string, unknown>): Promise<T> {
  const res = await authedFetch(FN, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error((data as { error?: string }).error ?? `Erreur ${res.status}`), { status: res.status });
  return data as T;
}

/** Sans compte : pour la page ouverte depuis le lien partagé. */
export async function previewPenc(id: string): Promise<PencPreview> {
  const res = await fetch(FN, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'preview', id }) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error ?? 'Pénc introuvable');
  return (data as { penc: PencPreview }).penc;
}

export const liveState = (id: string) => call<LiveState>({ action: 'state', id });
export const askQuestion = (id: string, text: string, mode: IdentityMode, pseudo?: string) => call<{ ok: boolean; crisis?: boolean }>({ action: 'ask', id, text, mode, pseudo });
export const voteQuestion = (id: string, qid: string, on: boolean) => call<{ ok: boolean }>({ action: 'vote', id, qid, on });
export const sendChat = (id: string, text: string) => call<{ ok: boolean; crisis?: boolean; cid?: string }>({ action: 'chat', id, text });
// Animateur
export const pinQuestion = (id: string, qid: string | null) => call<{ ok: boolean }>({ action: 'pin', id, qid });
export const answerQuestion = (id: string, qid: string) => call<{ ok: boolean }>({ action: 'answer', id, qid });
export const hideQuestion = (id: string, qid: string) => call<{ ok: boolean }>({ action: 'hide', id, qid });
export const hideChat = (id: string, cid: string) => call<{ ok: boolean }>({ action: 'chat_hide', id, cid });
export const showSlide = (id: string, index: number | null) => call<{ ok: boolean }>({ action: 'slide_show', id, index });
export const removeSlide = (id: string, index: number) => call<{ ok: boolean }>({ action: 'slide_remove', id, index });

/** Réduit l'image (1600 px au plus, JPEG) avant l'envoi : rapide sur un réseau mobile. */
async function shrink(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((ok, ko) => { const i = new Image(); i.onload = () => ok(i); i.onerror = ko; i.src = url; });
    const k = Math.min(1, 1600 / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement('canvas');
    c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k);
    const ctx = c.getContext('2d');
    if (!ctx) throw new Error('Image illisible');
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, c.width, c.height);
    ctx.drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL('image/jpeg', 0.85);
  } finally { URL.revokeObjectURL(url); }
}
export async function addSlide(id: string, file: File) {
  if (!/^image\/(jpeg|png|webp|heic|heif)$/.test(file.type) && !/\.(jpe?g|png|webp|heic)$/i.test(file.name)) throw new Error('Choisis une image (photo, capture d\'écran).');
  return call<{ ok: boolean; count: number }>({ action: 'slide_add', id, image: await shrink(file) });
}

/** Le lien à partager : court, et lisible dans WhatsApp. */
export const pencLink = (id: string) => `${window.location.origin}/p/${id}`;
export async function sharePenc(id: string, title: string): Promise<'shared' | 'copied' | 'none'> {
  const url = pencLink(id);
  const text = `Pénc mi : ${title}`;
  try {
    if (navigator.share) { await navigator.share({ title: text, text, url }); return 'shared'; }
  } catch { return 'none'; }
  try { await navigator.clipboard.writeText(`${text}\n${url}`); return 'copied'; } catch { return 'none'; }
}
