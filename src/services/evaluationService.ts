import {
  collection, doc, setDoc, getDoc, updateDoc, query,
  where, orderBy, getDocs, serverTimestamp, Timestamp
} from 'firebase/firestore';
import { db } from '../utils/firebase';
import type {
  UserAssessmentSession, ScaleResult, UserProfile, TriggeredAlert
} from '../types/assessment';
import { ALL_SCALES, MENTAL_HEALTH_SCALES, SEXUAL_HEALTH_SCALES } from '../data/scales';
import { generateMentalCompatibilityId, generateSexualCompatibilityId } from '../utils/idGenerator';

const SESSIONS_COL = 'assessmentSessions';
const PROFILES_COL = 'userProfiles';

// ── Profil utilisateur ──────────────────────────────────────────────

export async function getOrCreateUserProfile(uid: string, displayName: string): Promise<UserProfile> {
  const ref = doc(db, PROFILES_COL, uid);
  const snap = await getDoc(ref);
  if (snap.exists()) return snap.data() as UserProfile;

  const profile: UserProfile = {
    uid,
    compatibilityIdMental: null,
    compatibilityIdSexual: null,
    displayName,
    assessmentHistory: [],
    scaleResults: {},
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  await setDoc(ref, { ...profile, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  return profile;
}

export async function getUserProfileByCompatibilityId(id: string): Promise<UserProfile | null> {
  const field = id.startsWith('SM-') ? 'compatibilityIdMental' : 'compatibilityIdSexual';
  const q = query(collection(db, PROFILES_COL), where(field, '==', id));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return snap.docs[0].data() as UserProfile;
}

// ── Sessions d'évaluation ───────────────────────────────────────────

export async function createSession(
  userId: string,
  selectedScaleIds: string[]
): Promise<UserAssessmentSession> {
  if (selectedScaleIds.length < 1 || selectedScaleIds.length > 10) {
    throw new Error('Choisissez entre 2 et 10 évaluations.');
  }
  const invalidIds = selectedScaleIds.filter(id => !ALL_SCALES.find(s => s.id === id));
  if (invalidIds.length > 0) {
    throw new Error(`Évaluations inconnues : ${invalidIds.join(', ')}`);
  }

  const sessionRef = doc(collection(db, SESSIONS_COL));
  const session: UserAssessmentSession = {
    id: sessionRef.id,
    userId,
    selectedScaleIds,
    status: 'in_progress',
    currentScaleIndex: 0,
    answers: {},
    scores: {},
    startedAt: new Date(),
    alertDetected: false,
  };
  await setDoc(sessionRef, { ...session, startedAt: serverTimestamp() });
  return session;
}

export async function saveAnswer(
  sessionId: string,
  scaleId: string,
  itemId: number,
  value: number
): Promise<void> {
  const ref = doc(db, SESSIONS_COL, sessionId);
  await updateDoc(ref, {
    [`answers.${scaleId}.${itemId}`]: value,
  });
}

// ── Calcul du score ─────────────────────────────────────────────────

/**
 * Reverse scoring correct pour toutes les échelles (y compris base 1).
 * Formula : (max + min) - val  →  0-3 : 3-val, 1-4 : 5-val, 1-7 : 8-val, 1-5 : 6-val
 */
function reverseValue(val: number, min: number, max: number): number {
  return (max + min) - val;
}

export function computeScaleScore(
  scaleId: string,
  answers: Record<number, number>
): ScaleResult {
  const scale = ALL_SCALES.find(s => s.id === scaleId);
  if (!scale) throw new Error(`Scale ${scaleId} introuvable`);

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

  // Mode moyenne (ex: BRS)
  if (scale.scoringMode === 'mean' && scoredItems.length > 0) {
    totalScore = Math.round((totalScore / scoredItems.length) * 100) / 100;
  }

  // ── Sous-scores ──
  // IMPORTANT: les subscales utilisent UNIQUEMENT sub.reverseIds, PAS les reverseIds globaux.
  // Cela évite les doubles-inversions (ex: Big Five neuroticism item 4).
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

  // Niveau d'alerte global (le plus élevé entre interpretation.alertLevel et alertItems)
  const interpretationAlert = interpretation.alertLevel ?? 0;
  const itemsAlert = alertsTriggered.length > 0
    ? Math.max(...alertsTriggered.map(a => a.alertLevel))
    : 0;
  const alertLevel = Math.max(interpretationAlert, itemsAlert) as 0 | 1 | 2 | 3;

  return {
    scaleId,
    totalScore,
    subscaleScores: Object.keys(subscaleScores).length > 0 ? subscaleScores : undefined,
    interpretation,
    completedAt: new Date(),
    alertLevel: alertLevel > 0 ? alertLevel : undefined,
    alertsTriggered: alertsTriggered.length > 0 ? alertsTriggered : undefined,
  };
}

export async function computeAndSaveScaleResult(
  sessionId: string,
  scaleId: string,
  answers: Record<number, number>
): Promise<ScaleResult> {
  const result = computeScaleScore(scaleId, answers);
  const alertDetected = result.interpretation.referralRequired || (result.alertLevel ?? 0) >= 2;

  // Strip undefined fields — Firestore rejects them
  const resultForFirestore: Record<string, unknown> = {
    scaleId: result.scaleId,
    totalScore: result.totalScore,
    subscaleScores: result.subscaleScores ?? null,
    interpretation: result.interpretation,
    completedAt: result.completedAt,
    alertLevel: result.alertLevel ?? null,
    alertsTriggered: result.alertsTriggered ?? null,
  };

  await updateDoc(doc(db, SESSIONS_COL, sessionId), {
    [`scores.${scaleId}`]: resultForFirestore,
    alertDetected,
  });

  return result;
}

export async function finalizeSession(sessionId: string): Promise<void> {
  await updateDoc(doc(db, SESSIONS_COL, sessionId), {
    status: 'completed',
    completedAt: serverTimestamp(),
  });
}

export async function getSession(sessionId: string): Promise<UserAssessmentSession | null> {
  const snap = await getDoc(doc(db, SESSIONS_COL, sessionId));
  return snap.exists() ? (snap.data() as UserAssessmentSession) : null;
}

export async function getUserSessions(userId: string): Promise<UserAssessmentSession[]> {
  const q = query(
    collection(db, SESSIONS_COL),
    where('userId', '==', userId),
    orderBy('startedAt', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => d.data() as UserAssessmentSession);
}

export async function saveClaudeInterpretation(sessionId: string, text: string): Promise<void> {
  await updateDoc(doc(db, SESSIONS_COL, sessionId), { claudeInterpretation: text });
}

export async function saveDrLoAnalysis(userId: string, analysis: string): Promise<void> {
  await updateDoc(doc(db, PROFILES_COL, userId), {
    drLoAnalysis: analysis,
    drLoUpdatedAt: serverTimestamp(),
  });
}

export async function saveDrLoSynthesis(userId: string, synthesis: string): Promise<void> {
  await updateDoc(doc(db, PROFILES_COL, userId), {
    drLoSynthesis: synthesis,
    drLoSynthesisUpdatedAt: serverTimestamp(),
  });
}

export async function saveOnboardingToProfile(userId: string, profile: Record<string, string>): Promise<void> {
  await updateDoc(doc(db, PROFILES_COL, userId), { onboardingProfile: profile });
}

export async function resetUserProfile(userId: string): Promise<void> {
  const ref = doc(db, PROFILES_COL, userId);
  await updateDoc(ref, {
    scaleResults: {},
    compatibilityIdMental: null,
    compatibilityIdSexual: null,
    drLoAnalysis: null,
    drLoSynthesis: null,
    drLoUpdatedAt: null,
    drLoSynthesisUpdatedAt: null,
    lastAssessmentDate: null,
    updatedAt: serverTimestamp(),
  });
}

export const TOTAL_MENTAL_SCALES = MENTAL_HEALTH_SCALES.length;
export const TOTAL_SEXUAL_SCALES = SEXUAL_HEALTH_SCALES.length;
export const TOTAL_SCALES = ALL_SCALES.length;

export async function saveScaleResultToProfile(
  userId: string,
  scaleId: string,
  result: ScaleResult
): Promise<void> {
  const ref = doc(db, PROFILES_COL, userId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;

  const existing: Record<string, ScaleResult> = snap.data().scaleResults ?? {};
  const updated = { ...existing, [scaleId]: result };

  const updateData: Record<string, unknown> = {
    [`scaleResults.${scaleId}`]: {
      scaleId: result.scaleId,
      totalScore: result.totalScore,
      subscaleScores: result.subscaleScores ?? null,
      interpretation: result.interpretation,
      completedAt: serverTimestamp(),
      alertLevel: result.alertLevel ?? null,
    },
    updatedAt: serverTimestamp(),
    lastAssessmentDate: serverTimestamp(),
  };

  // Generate mental code when all mental scales are done
  const mentalDone = MENTAL_HEALTH_SCALES.every(s => !!updated[s.id]);
  if (mentalDone && !snap.data().compatibilityIdMental) {
    updateData.compatibilityIdMental = generateMentalCompatibilityId();
  }

  // Generate sexual code when all sexual scales are done
  const sexualDone = SEXUAL_HEALTH_SCALES.every(s => !!updated[s.id]);
  if (sexualDone && !snap.data().compatibilityIdSexual) {
    updateData.compatibilityIdSexual = generateSexualCompatibilityId();
  }

  await updateDoc(ref, updateData);
}

export async function getProfileProgress(userId: string): Promise<{
  scaleResults: Record<string, ScaleResult>;
  completedCount: number;
  totalCount: number;
  isComplete: boolean;
  compatibilityIdMental: string | null;
  compatibilityIdSexual: string | null;
  mentalCompletedCount: number;
  sexualCompletedCount: number;
  isMentalComplete: boolean;
  isSexualComplete: boolean;
  remaining: number;
  drLoAnalysis: string | null;
  drLoSynthesis: string | null;
  onboardingProfile: Record<string, string> | null;
}> {
  const ref = doc(db, PROFILES_COL, userId);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    return {
      scaleResults: {},
      completedCount: 0,
      totalCount: TOTAL_SCALES,
      isComplete: false,
      compatibilityIdMental: null,
      compatibilityIdSexual: null,
      mentalCompletedCount: 0,
      sexualCompletedCount: 0,
      isMentalComplete: false,
      isSexualComplete: false,
      remaining: TOTAL_SCALES,
      drLoAnalysis: null,
      drLoSynthesis: null,
      onboardingProfile: null,
    };
  }
  const data = snap.data();
  const scaleResults: Record<string, ScaleResult> = data.scaleResults ?? {};
  const completedCount = Object.keys(scaleResults).length;
  const mentalCompletedCount = MENTAL_HEALTH_SCALES.filter(s => !!scaleResults[s.id]).length;
  const sexualCompletedCount = SEXUAL_HEALTH_SCALES.filter(s => !!scaleResults[s.id]).length;
  const isMentalComplete = mentalCompletedCount >= TOTAL_MENTAL_SCALES;
  const isSexualComplete = sexualCompletedCount >= TOTAL_SEXUAL_SCALES;
  const isComplete = isMentalComplete || isSexualComplete;
  return {
    scaleResults,
    completedCount,
    totalCount: TOTAL_SCALES,
    isComplete,
    compatibilityIdMental: (data.compatibilityIdMental as string | null) ?? null,
    compatibilityIdSexual: (data.compatibilityIdSexual as string | null) ?? null,
    mentalCompletedCount,
    sexualCompletedCount,
    isMentalComplete,
    isSexualComplete,
    remaining: Math.max(0, TOTAL_SCALES - completedCount),
    drLoAnalysis: (data.drLoAnalysis as string | null) ?? null,
    drLoSynthesis: (data.drLoSynthesis as string | null) ?? null,
    onboardingProfile: (data.onboardingProfile as Record<string, string> | null) ?? null,
  };
}

/** A profile is "complete" for a given code type if the code exists in Firestore */
export async function isProfileCompleteById(id: string): Promise<boolean> {
  const profile = await getUserProfileByCompatibilityId(id);
  return profile !== null;
}
