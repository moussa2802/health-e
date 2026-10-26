/**
 * accueilTracking.ts — Événements Firebase Analytics de la conversation d'accueil.
 * Aucune donnée personnelle ni texte saisi n'est envoyé : seulement l'étape et le test.
 *
 * Entonnoir : accueil_view → accueil_start → accueil_prescription → accueil_test_click → accueil_test_done
 * Garde-fous : accueil_crisis, accueil_minor (comptage seulement).
 */
import { getAnalytics, logEvent } from 'firebase/analytics';
import { app } from './firebase';

export type AccueilEvent =
  | 'view' | 'start' | 'prescription' | 'test_click' | 'test_done'
  | 'crisis' | 'minor' | 'free_chat' | 'reset'
  | 'mood_open' | 'mood' | 'mood_cancel' | 'breath' | 'mic' | 'route' | 'go'
  | 'test_start' | 'test_pause'
  | 'confier_open' | 'confier_entry' | 'confier_cancel' | 'confier_advice'
  | 'signup_open' | 'signup_start' | 'signup_done' | 'account_linked'
  | 'cycle_set' | 'cycle_period' | 'mood_erase_all' | 'espace_view'
  | 'question_sent' | 'queue_join' | 'invite_share'
  | 'programme_offer' | 'programme_proposed' | 'programme_start' | 'programme_open' | 'programme_bilan' | 'programme_end'
  | 'reminders_offer' | 'result_share';

export function trackAccueil(event: AccueilEvent, params: Record<string, string | number | boolean> = {}): void {
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
