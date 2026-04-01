/**
 * guestSession.ts
 * Gestion des sessions invité (sans compte) via localStorage.
 * Permet jusqu'à 3 évaluations gratuites avant de demander l'inscription.
 */

import { ALL_SCALES } from '../data/scales';
import type { ScaleResult, UserAssessmentSession, TriggeredAlert } from '../types/assessment';

export const GUEST_MAX_TESTS = 3;

const COUNT_KEY    = 'he_guest_count';
const SESSION_PREFIX = 'he_guest_session_';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface GuestSession {
  id: string;
  scaleId: string;
  answers: Record<number, number>;
  result?: ScaleResult;
  status: 'in_progress' | 'completed';
  startedAt: string;
}

// ── Compteur ──────────────────────────────────────────────────────────────────

export function getGuestCount(): number {
  return parseInt(localStorage.getItem(COUNT_KEY) ?? '0', 10);
}

export function hasReachedGuestLimit(): boolean {
  return getGuestCount() >= GUEST_MAX_TESTS;
}

// ── CRUD localStorage ─────────────────────────────────────────────────────────

export function createGuestSession(scaleId: string): GuestSession {
  const id = `guest_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const session: GuestSession = {
    id,
    scaleId,
    answers: {},
    status: 'in_progress',
    startedAt: new Date().toISOString(),
  };
  localStorage.setItem(`${SESSION_PREFIX}${id}`, JSON.stringify(session));
  return session;
}

export function getGuestSession(id: string): GuestSession | null {
  const raw = localStorage.getItem(`${SESSION_PREFIX}${id}`);
  if (!raw) return null;
  try { return JSON.parse(raw) as GuestSession; } catch { return null; }
}

export function saveGuestAnswer(sessionId: string, itemId: number, value: number): void {
  const session = getGuestSession(sessionId);
  if (!session) return;
  session.answers[itemId] = value;
  localStorage.setItem(`${SESSION_PREFIX}${sessionId}`, JSON.stringify(session));
}

// ── Calcul du score (miroir de evaluationService — même algorithme, sans Firestore) ─────

/**
 * Reverse scoring correct pour toutes les échelles (y compris base 1).
 * Formula : (max + min) - val
 */
function reverseValue(val: number, min: number, max: number): number {
  return (max + min) - val;
}

export function computeGuestResult(sessionId: string): ScaleResult | null {
  const session = getGuestSession(sessionId);
  if (!session) return null;

  const scale = ALL_SCALES.find(s => s.id === session.scaleId);
  if (!scale) return null;

  const answers = session.answers;
  const opts = scale.items[0]?.options ?? [];
  const maxPerItem = Math.max(...opts.map(o => o.value), 3);
  const minPerItem = Math.min(...opts.map(o => o.value), 0);
  const reverseIds = new Set(scale.reverseIds ?? []);

  // ── Score total (items noScore=true exclus) ──
  let totalScore = 0;
  const scoredItems = scale.items.filter(i => !i.noScore);
  for (const item of scoredItems) {
    let val = answers[item.id] ?? minPerItem;
    const isReversed = (item.reversed === true) || reverseIds.has(item.id);
    if (isReversed) val = reverseValue(val, minPerItem, maxPerItem);
    totalScore += val;
  }

  if (scale.scoringMode === 'mean' && scoredItems.length > 0) {
    totalScore = Math.round((totalScore / scoredItems.length) * 100) / 100;
  }

  // ── Sous-scores (UNIQUEMENT sub.reverseIds, pas les reverseIds globaux) ──
  const subscaleScores: Record<string, number> = {};
  if (scale.subscales) {
    for (const sub of scale.subscales) {
      const subReverseIds = new Set(sub.reverseIds ?? []);
      let subScore = 0;
      for (const itemId of sub.itemIds) {
        let val = answers[itemId] ?? minPerItem;
        if (subReverseIds.has(itemId)) val = reverseValue(val, minPerItem, maxPerItem);
        subScore += val;
      }
      if (sub.scoringMode === 'mean' && sub.itemIds.length > 0) {
        subScore = Math.round((subScore / sub.itemIds.length) * 100) / 100;
      }
      subscaleScores[sub.key] = subScore;
    }
  }

  // ── Interprétation ──
  const interpretation =
    scale.interpretation.find(r => totalScore >= r.min && totalScore <= r.max) ??
    scale.interpretation[scale.interpretation.length - 1];

  // ── Alertes spécifiques par item ──
  const alertsTriggered: TriggeredAlert[] = [];
  if (scale.alertItems) {
    for (const alertItem of scale.alertItems) {
      const val = answers[alertItem.itemId];
      if (val !== undefined && val >= alertItem.minValue) {
        alertsTriggered.push({
          itemId: alertItem.itemId,
          value: val,
          alertLevel: alertItem.alertLevel,
          message: alertItem.message,
        });
      }
    }
  }

  const interpretationAlert = interpretation.alertLevel ?? 0;
  const itemsAlert = alertsTriggered.length > 0
    ? Math.max(...alertsTriggered.map(a => a.alertLevel))
    : 0;
  const alertLevel = Math.max(interpretationAlert, itemsAlert) as 0 | 1 | 2 | 3;

  const result: ScaleResult = {
    scaleId: scale.id,
    totalScore,
    subscaleScores: Object.keys(subscaleScores).length > 0 ? subscaleScores : undefined,
    interpretation,
    completedAt: new Date(),
    alertLevel: alertLevel > 0 ? alertLevel : undefined,
    alertsTriggered: alertsTriggered.length > 0 ? alertsTriggered : undefined,
  };

  session.result  = result;
  session.status  = 'completed';
  localStorage.setItem(`${SESSION_PREFIX}${sessionId}`, JSON.stringify(session));

  const newCount = getGuestCount() + 1;
  localStorage.setItem(COUNT_KEY, String(newCount));

  return result;
}

// ── Récupérer tous les résultats invité (pour le profil) ─────────────────────

export function getAllGuestResults(): Record<string, ScaleResult> {
  const results: Record<string, ScaleResult> = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key?.startsWith(SESSION_PREFIX)) continue;
    try {
      const session = JSON.parse(localStorage.getItem(key) ?? '') as GuestSession;
      if (session.result && session.status === 'completed') {
        results[session.scaleId] = session.result;
      }
    } catch { /* ignore */ }
  }
  return results;
}

// ── Convertir GuestSession → UserAssessmentSession ────────────────────────────

export function guestToUserSession(g: GuestSession): UserAssessmentSession {
  return {
    id: g.id,
    userId: '',
    selectedScaleIds: [g.scaleId],
    status: g.status === 'completed' ? 'completed' : 'in_progress',
    currentScaleIndex: 0,
    answers: { [g.scaleId]: g.answers },
    scores: g.result ? { [g.scaleId]: g.result } : {},
    startedAt: new Date(g.startedAt),
    alertDetected: (g.result?.alertLevel ?? 0) >= 2,
  };
}
