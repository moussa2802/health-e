/**
 * resultsCache — les résultats de tests du compte, gardés sur ce téléphone (localStorage).
 * Sert à afficher l'accueil et le compagnon tout de suite, pendant que la version du compte arrive.
 * Une seule personne à la fois (la dernière connectée sur ce téléphone).
 */
import { Timestamp } from 'firebase/firestore';
import type { ScaleResult } from '../types/assessment';

/** Les résultats du compte, gardés sur ce téléphone pour afficher la discussion sans attendre le réseau. */
const RES_CACHE = 'he_results_cache_v1';
export function reviveDates<T>(v: T): T {
  if (Array.isArray(v)) return v.map(reviveDates) as unknown as T;
  if (v && typeof v === 'object') {
    // Un Timestamp Firestore gardé en JSON ({ seconds, nanoseconds }) redevient un Timestamp
    const t = v as { seconds?: unknown; nanoseconds?: unknown };
    if (typeof t.seconds === 'number' && typeof t.nanoseconds === 'number') return new Timestamp(t.seconds, t.nanoseconds) as unknown as T;
    const o: Record<string, unknown> = {};
    for (const [k, x] of Object.entries(v as Record<string, unknown>)) {
      o[k] = typeof x === 'string' && /At$/.test(k) && /^\d{4}-\d{2}-\d{2}T/.test(x) ? new Date(x) : reviveDates(x);
    }
    return o as T;
  }
  return v;
}
export function readResultsCache(uid: string): { results: Record<string, ScaleResult>; totem: string | null } | null {
  try {
    const c = JSON.parse(localStorage.getItem(RES_CACHE) || 'null');
    if (!c || c.uid !== uid || !c.results) return null;
    return { results: reviveDates(c.results), totem: c.totem ?? null };
  } catch { return null; }
}
export function writeResultsCache(uid: string, results: Record<string, ScaleResult>, totem: string | null) {
  try {
    // Timestamp → { seconds, nanoseconds } ; Date → texte ISO (reviveDates fait l'inverse)
    localStorage.setItem(RES_CACHE, JSON.stringify({ uid, results, totem }));
  } catch { /* plein ou navigation privée : on lira le réseau */ }
}

/** À la déconnexion : rien ne reste sur le téléphone. */
export function clearResultsCache() { try { localStorage.removeItem(RES_CACHE); } catch { /* ignore */ } }
