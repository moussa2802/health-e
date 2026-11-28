/**
 * Paiement Wave en cours (porteur, 28/11/2026).
 *
 * Depuis l'app ajoutée à l'écran d'accueil (iPhone), Wave s'ouvre à part et renvoie ensuite vers Safari, qui n'a
 * pas la même connexion. L'app reste sur sa page : on note donc « paiement lancé » ici, et quand l'acheteur
 * revient dans l'app, on débloque le bouton et on recharge le solde (le crédit, lui, est fait par le webhook Wave).
 */
const KEY = 'he_wave_pending';
/** Au-delà, on oublie le paiement lancé (session Wave expirée ou abandonnée). */
export const WAVE_PENDING_MAX_MS = 45 * 60 * 1000;

export interface WavePending {
  at: number;
  balanceBefore: number;
  koris: number;
}

export function markWavePending(balanceBefore: number, koris: number, now = Date.now()): void {
  try {
    localStorage.setItem(KEY, JSON.stringify({ at: now, balanceBefore, koris }));
  } catch { /* stockage indisponible : on se contente du rechargement du solde */ }
}

export function readWavePending(now = Date.now()): WavePending | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as WavePending;
    if (typeof p?.at !== 'number' || typeof p.balanceBefore !== 'number' || now - p.at > WAVE_PENDING_MAX_MS) {
      localStorage.removeItem(KEY);
      return null;
    }
    return p;
  } catch {
    return null;
  }
}

export function clearWavePending(): void {
  try { localStorage.removeItem(KEY); } catch { /* rien */ }
}

/** Le solde a-t-il augmenté depuis le lancement du paiement ? */
export function wavePaid(p: WavePending | null, balance: number): boolean {
  return !!p && balance > p.balanceBefore;
}

/**
 * Appelle `onBack` quand l'acheteur revient sur la page (retour depuis Wave, changement d'app, page restaurée
 * par le bouton retour). Renvoie la fonction de nettoyage.
 */
export function onReturnToPage(onBack: () => void): () => void {
  const vis = () => { if (document.visibilityState === 'visible') onBack(); };
  const show = (e: PageTransitionEvent) => { if (e.persisted) onBack(); };
  document.addEventListener('visibilitychange', vis);
  window.addEventListener('pageshow', show);
  window.addEventListener('focus', onBack);
  return () => {
    document.removeEventListener('visibilitychange', vis);
    window.removeEventListener('pageshow', show);
    window.removeEventListener('focus', onBack);
  };
}
