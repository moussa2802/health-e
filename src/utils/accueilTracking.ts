/**
 * accueilTracking.ts — Événements Firebase Analytics de la conversation d'accueil.
 * Aucune donnée personnelle ni texte saisi n'est envoyé : seulement l'étape et le test.
 *
 * Entonnoir : accueil_view → accueil_start → accueil_prescription → accueil_test_click → accueil_test_done
 * Garde-fous : accueil_crisis, accueil_minor (comptage seulement).
 *
 * Les mêmes événements partent aussi vers NOTRE suivi (fonction « track », voir netlify/functions/_stats.js),
 * par petits paquets, pour les statistiques de la page admin. Jamais de texte écrit, jamais de résultat.
 */
import { getAnalytics, logEvent } from 'firebase/analytics';
import { app } from './firebase';
import { auth } from './firebase';

export type AccueilEvent =
  | 'view' | 'start' | 'prescription' | 'test_click' | 'test_done'
  | 'crisis' | 'minor' | 'free_chat' | 'reset'
  | 'mood_open' | 'mood' | 'mood_cancel' | 'breath' | 'exercise' | 'exercise_done' | 'vocal_play' | 'mic' | 'route' | 'go'
  | 'test_start' | 'test_pause'
  | 'confier_open' | 'confier_entry' | 'confier_cancel' | 'confier_advice'
  | 'signup_open' | 'signup_start' | 'signup_done' | 'account_linked'
  | 'cycle_set' | 'cycle_period' | 'mood_erase_all' | 'espace_view'
  | 'question_sent' | 'queue_join' | 'invite_share'
  | 'programme_offer' | 'programme_proposed' | 'programme_start' | 'programme_open' | 'programme_bilan' | 'programme_end'
  | 'reminders_offer' | 'result_share' | 'home_view' | 'page';

// ── Notre suivi : file d'attente envoyée toutes les 8 s, et quand on quitte la page ──
type Ev = { e: string; p?: Record<string, string | number | boolean> };
let queue: Ev[] = [];
let timer: number | null = null;
const ANON_KEY = 'he_anon';
function anonId(): string {
  try {
    let a = localStorage.getItem(ANON_KEY);
    if (!a || !/^[a-z0-9]{8,40}$/.test(a)) { a = Math.random().toString(36).slice(2) + Date.now().toString(36); localStorage.setItem(ANON_KEY, a); }
    return a;
  } catch { return ''; }
}
function flush(leaving = false) {
  if (timer) { window.clearTimeout(timer); timer = null; }
  if (!queue.length) return;
  const events = queue.slice(0, 60);
  queue = queue.slice(60);
  const body = JSON.stringify({ anon: anonId(), events });
  // Connecté : avec le jeton (pour compter les comptes actifs) ; invité : sans
  const send = (token?: string) => fetch('/.netlify/functions/track', {
    method: 'POST', keepalive: leaving, body,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  }).catch(() => {});
  const u = auth?.currentUser;
  if (u) u.getIdToken().then(send).catch(() => send()); else void send();
  if (queue.length) flush(leaving);
}
function enqueue(ev: Ev) {
  if (typeof window === 'undefined' || window.location.hostname === 'localhost') return;
  queue.push(ev);
  if (queue.length >= 40) { flush(); return; }
  if (!timer) timer = window.setTimeout(() => flush(), 8000);
}
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flush(true); });
}

/** La rubrique visitée (accueil, compagnon, tests, moi…), pour savoir ce qui est le plus utilisé. */
export function trackPage(section: string): void {
  if (section) enqueue({ e: 'page', p: { s: section } });
}

export function trackAccueil(event: AccueilEvent, params: Record<string, string | number | boolean> = {}): void {
  // Seulement des étiquettes courtes (identifiant de test, destination…), jamais de texte
  const p: Record<string, string | number | boolean> = {};
  for (const [k, v] of Object.entries(params)) if (typeof v !== 'string' || v.length <= 40) p[k] = v;
  enqueue({ e: event, p });
  try {
    // Même règle que utils/firebase.ts : pas d'Analytics en local
    if (typeof window === 'undefined' || window.location.hostname === 'localhost') {
      if (import.meta.env.DEV) console.debug('[accueil]', event, params);
      return;
    }
    logEvent(getAnalytics(app), `accueil_${event}`, params);
  } catch { /* analytics indisponible (bloqueur) */ }
}

/** Test prescrit en attente : lu par la page de résultats pour proposer « Revenir à Dr Lô ». */
export const ACCUEIL_PRESCRIBED_KEY = 'he_accueil_prescribed';

export function getAccueilPrescribed(): string | null {
  try { return localStorage.getItem(ACCUEIL_PRESCRIBED_KEY); } catch { return null; }
}
export function setAccueilPrescribed(scaleId: string | null): void {
  try {
    if (scaleId) localStorage.setItem(ACCUEIL_PRESCRIBED_KEY, scaleId);
    else localStorage.removeItem(ACCUEIL_PRESCRIBED_KEY);
  } catch { /* stockage indisponible */ }
}
