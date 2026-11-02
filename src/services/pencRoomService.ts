/**
 * pencRoomService — la salle d'écoute de Pénc mi (fonction serveur penc-room). Le jeton donne l'écoute seule ;
 * la parole est ouverte par le serveur, sur invitation de l'hôte et acceptation de la personne.
 */
import { authedFetch } from '../utils/authedFetch';
import type { IdentityMode } from './drloBroadcastService';

export interface RoomTicket { url: string; token: string; identity: string; isHost: boolean; isMod: boolean; name: string }

async function call<T>(body: Record<string, unknown>): Promise<T> {
  const res = await authedFetch('/.netlify/functions/penc-room', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error((data as { error?: string }).error ?? `Erreur ${res.status}`), { status: res.status });
  return data as T;
}

export const joinRoom = (pencId: string, mode: IdentityMode, pseudo?: string) => call<RoomTicket>({ action: 'join', pencId, mode, pseudo });
export const acceptStage = (pencId: string) => call<{ ok: boolean }>({ action: 'accept', pencId });
export const declineStage = (pencId: string) => call<{ ok: boolean }>({ action: 'decline', pencId });
export const leaveStage = (pencId: string) => call<{ ok: boolean }>({ action: 'leave_stage', pencId });
export const inviteToStage = (pencId: string, identity: string) => call<{ ok: boolean }>({ action: 'invite', pencId, identity });
export const removeFromStage = (pencId: string, identity: string) => call<{ ok: boolean }>({ action: 'remove', pencId, identity });
export const muteSpeaker = (pencId: string, identity: string, trackSid: string) => call<{ ok: boolean }>({ action: 'mute', pencId, identity, trackSid });
export const kickFromPenc = (pencId: string, identity: string) => call<{ ok: boolean }>({ action: 'kick', pencId, identity });
