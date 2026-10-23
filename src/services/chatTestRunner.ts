/**
 * chatTestRunner.ts — Branche le test « dans la conversation » sur EXACTEMENT
 * les mêmes fonctions que la page de test classique :
 *  - invité : sessions localStorage (guestSession.ts), limite de 3 tests, même calcul ;
 *  - compte : 1 Kori (ou reprise gratuite après 30 j), session Firestore, saveAnswer,
 *    computeAndSaveScaleResult, finalizeSession, archive + profil.
 * Rien de nouveau côté serveur, aucun tarif changé.
 */
import {
  createGuestSession, getGuestInProgressSession, getGuestSession, saveGuestAnswer,
  computeGuestResult, hasReachedGuestLimit, replaceGuestAnswers,
} from '../utils/guestSession';
import {
  createSession, saveAnswer, computeAndSaveScaleResult, finalizeSession,
  saveScaleResultToProfile, getInProgressSessions, getOrCreateUserProfile,
} from './evaluationService';
import { archiveCurrentResult } from './testManagementService';
import { spendKorisForTest } from './korisService';
import { getScaleById, getAdaptedScaleById } from '../data/scales';
import { getSexualHealthFilter } from '../utils/sexualHealthFilter';
import { resolveScaleGender } from '../utils/gender';
import { getOnboardingProfile } from '../utils/onboardingProfile';
import { getScaleCategory } from '../utils/scaleMeta';
import { signatureFrom, cleanAnswers, type ActiveTest } from '../utils/chatTest';
import type { AssessmentScale, ScaleResult } from '../types/assessment';

export type { ActiveTest };

export type StartOutcome =
  | { ok: true; test: ActiveTest; resumed: boolean }
  | { ok: false; reason: 'guest_limit' | 'needs_account' | 'needs_page' | 'no_koris' | 'unknown_scale' | 'error'; required?: number };

/** L'échelle telle que la page de test l'affiche (adaptation intime + accord au genre). */
export function loadScale(scaleId: string): AssessmentScale | null {
  const raw = getAdaptedScaleById(scaleId, getSexualHealthFilter()?.experienceProfile) ?? getScaleById(scaleId);
  if (!raw) return null;
  return resolveScaleGender(raw, getOnboardingProfile()?.genre ?? 'homme');
}

export async function startChatTest(
  scaleId: string,
  userId: string | null,
  lastTakenAt: unknown,
): Promise<StartOutcome> {
  if (!getScaleById(scaleId)) return { ok: false, reason: 'unknown_scale' };
  const category = getScaleCategory(scaleId);

  // ── Invité ──
  if (!userId) {
    if (category !== 'mental') return { ok: false, reason: 'needs_account' };
    const inProgress = getGuestInProgressSession(scaleId);
    if (inProgress) {
      return { ok: true, resumed: true, test: { scaleId, sessionId: inProgress.id, guest: true, answers: { ...inProgress.answers }, askedItemId: null } };
    }
    if (hasReachedGuestLimit()) return { ok: false, reason: 'guest_limit' };
    const gs = createGuestSession(scaleId);
    return { ok: true, resumed: false, test: { scaleId, sessionId: gs.id, guest: true, answers: {}, askedItemId: null } };
  }

  // ── Compte : la vie intime passe par sa porte d'accès dédiée (page classique) ──
  if (category === 'sexual') return { ok: false, reason: 'needs_page' };

  try {
    const ips = await getInProgressSessions(userId);
    const ip = ips.find(s => s.selectedScaleIds.length === 1 && s.selectedScaleIds[0] === scaleId);
    if (ip) {
      return { ok: true, resumed: true, test: { scaleId, sessionId: ip.id, guest: false, answers: { ...(ip.answers?.[scaleId] ?? {}) }, askedItemId: null } };
    }
  } catch { /* on démarre une nouvelle session */ }

  try {
    const spend = await spendKorisForTest({ [scaleId]: (lastTakenAt ?? null) as string | Date | null });
    if (!spend.ok) return { ok: false, reason: 'no_koris', required: spend.required };
    let session;
    try { session = await createSession(userId, [scaleId]); }
    catch {
      await new Promise(r => setTimeout(r, 3000)); // même nouvelle tentative que la page de test
      session = await createSession(userId, [scaleId]);
    }
    return { ok: true, resumed: false, test: { scaleId, sessionId: session.id, guest: false, answers: {}, askedItemId: null } };
  } catch {
    return { ok: false, reason: 'error' };
  }
}

export async function recordAnswer(t: ActiveTest, itemId: number, value: number): Promise<void> {
  try {
    if (t.guest) saveGuestAnswer(t.sessionId, itemId, value);
    else await saveAnswer(t.sessionId, t.scaleId, itemId, value);
  } catch { /* silencieux, comme la page de test */ }
}

export async function finishChatTest(
  t: ActiveTest,
  scale: AssessmentScale,
  userId: string | null,
): Promise<{ result: ScaleResult; resultsPath: string }> {
  if (t.guest) {
    // Les réponses d'items devenus invisibles ne comptent pas
    if (getGuestSession(t.sessionId)) replaceGuestAnswers(t.sessionId, cleanAnswers(scale, t.answers));
    const result = computeGuestResult(t.sessionId);
    if (!result) throw new Error('Erreur lors du calcul du résultat.');
    return { result, resultsPath: `/assessment/results/${t.sessionId}?guest=true` };
  }
  const answers = cleanAnswers(scale, t.answers);
  const result = await computeAndSaveScaleResult(t.sessionId, t.scaleId, answers);
  await finalizeSession(t.sessionId);
  if (userId) {
    try {
      await getOrCreateUserProfile(userId, getOnboardingProfile()?.prenom ?? ''); // un compte tout neuf n'a pas encore de profil
      try { await archiveCurrentResult(userId, t.scaleId, {}); } catch { /* premier passage */ }
      await saveScaleResultToProfile(userId, t.scaleId, result, signatureFrom(scale, answers));
    } catch { /* silencieux */ }
  }
  return { result, resultsPath: `/assessment/results/${t.sessionId}` };
}
