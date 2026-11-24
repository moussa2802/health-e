/**
 * source — d'où arrive le visiteur : le « ?src= » des liens en bio (health-e.sn/tt → /cas-du-soir?src=tiktok).
 * Liste fermée, la même que netlify/functions/_sources.js. Gardée pour la visite (sessionStorage), comptée une fois.
 * Rien de personnel : seulement le nom du réseau.
 */
import { trackAccueil } from './accueilTracking';

const SOURCES = ['tiktok', 'instagram', 'facebook', 'whatsapp', 'youtube'] as const;
const ALIAS: Record<string, string> = { tt: 'tiktok', ig: 'instagram', insta: 'instagram', fb: 'facebook', wa: 'whatsapp', yt: 'youtube' };
const CLE = 'he_src';

export function sourceValide(v: unknown): string | null {
  const s = String(v ?? '').trim().toLowerCase().slice(0, 20);
  const x = ALIAS[s] ?? s;
  return (SOURCES as readonly string[]).includes(x) ? x : null;
}

let memoire: string | null = null;

/** À l'arrivée sur le site : lit « ?src= », le garde pour la visite et compte l'arrivée une seule fois. */
export function capterSource(search: string = typeof window !== 'undefined' ? window.location.search : ''): void {
  const src = sourceValide(new URLSearchParams(search).get('src'));
  if (!src) return;
  let deja = false;
  try { deja = sessionStorage.getItem(CLE) === src; sessionStorage.setItem(CLE, src); } catch { deja = memoire === src; }
  memoire = src;
  if (!deja) trackAccueil('arrivee', { src });
}

/** La source de cette visite (ou null). */
export function sourceDeLaVisite(): string | null {
  let gardee: string | null = null;
  try { gardee = sourceValide(sessionStorage.getItem(CLE)); } catch { /* navigateur sans stockage */ }
  if (gardee ?? memoire) return gardee ?? memoire;
  // Page d'arrivée encore ouverte (le compteur de la page peut partir avant capterSource)
  return typeof window !== 'undefined' ? sourceValide(new URLSearchParams(window.location.search).get('src')) : null;
}
