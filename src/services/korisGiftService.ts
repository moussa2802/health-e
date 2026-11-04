/**
 * korisGiftService — les étincelles offertes : cadeau du jour et parrainage (fonction serveur koris-gift).
 */
import { authedFetch } from '../utils/authedFetch';

export interface GiftStatus {
  daily: { available: boolean; amount: number };
  referral: { code: string; link: string; joined: number; rewarded: number; reward: number; cap: number };
}

async function call<T>(action: string): Promise<T> {
  const res = await authedFetch('/.netlify/functions/koris-gift', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error ?? 'Erreur');
  return data as T;
}

let cache: { at: number; p: Promise<GiftStatus> } | null = null;
/** Partagé entre l'accueil et « Moi » (30 s) : un seul appel quand on passe de l'un à l'autre. */
export function getGiftStatus(fresh = false): Promise<GiftStatus> {
  if (!fresh && cache && Date.now() - cache.at < 30_000) return cache.p;
  const p = call<GiftStatus>('status');
  cache = { at: Date.now(), p };
  p.catch(() => { cache = null; });
  return p;
}

export async function claimDailyGift(): Promise<{ ok: boolean; credited?: number; balance?: number }> {
  cache = null;
  return call('daily');
}

const REWARD_KEY = 'he_ref_reward_done';
/** La personne invitée a fait un test : on tente la récompense une fois (le serveur vérifie tout). */
export async function claimReferralRewardOnce(): Promise<number> {
  try { if (localStorage.getItem(REWARD_KEY)) return 0; } catch { /* ignore */ }
  const r = await call<{ ok: boolean; credited?: number; reason?: string }>('referral_reward');
  // « pas encore de test » : on réessaiera ; tout le reste est définitif
  if (r.ok || r.reason !== 'no_test') { try { localStorage.setItem(REWARD_KEY, '1'); } catch { /* ignore */ } }
  return r.ok ? (r.credited ?? 0) : 0;
}

/** Le message prêt à envoyer sur WhatsApp. */
export function inviteMessage(link: string): string {
  return `Je fais les tests de Health-e (Dr Lô) : anxiété, couple, personnalité… et à la fin tu découvres ton animal intérieur. C'est privé et en wolof-français. Essaie avec mon lien, on reçoit chacun des étincelles : ${link}`;
}
