import {
  collection, doc, setDoc, getDoc, updateDoc, query,
  where, orderBy, getDocs, serverTimestamp, Timestamp
} from 'firebase/firestore';
import { db } from '../utils/firebase';
import type {
  UserAssessmentSession, ScaleResult, UserProfile, TriggeredAlert
} from '../types/assessment';
import { ALL_SCALES, MENTAL_HEALTH_SCALES, SEXUAL_HEALTH_SCALES, BONUS_SCALES } from '../data/scales';
import { generateMentalCompatibilityId, generateSexualCompatibilityId } from '../utils/idGenerator';
import { computeTotem, TOTEM_REQUIRED_SCALES, classifyDomain, getTotemDomain } from '../utils/totemAlgorithm';
import { needsRescore, rescore } from '../utils/scaleScoring';

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
  const extra: Record<string, string> = {};
  try {
    const acqSrc = localStorage.getItem('he_acq_src');
    if (acqSrc) {
      extra.acquisition = acqSrc;
      localStorage.removeItem('he_acq_src');
    }
  } catch {}
  await setDoc(ref, { ...profile, ...extra, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  return profile;
}

export async function getUserProfileByCompatibilityId(id: string): Promise<UserProfile | null> {
  const isMentalCode = id.startsWith('HE-MNT-') || id.startsWith('SM-');
  const field = isMentalCode ? 'compatibilityIdMental' : 'compatibilityIdSexual';
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
  const minPerItem = opts.length > 0 ? Math.min(...opts.map(o => o.value)) : 0;
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
  // Cela évite les doubles-inversions (ex: Big Five emotional_stability item 4).
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
    ...(scale.scoringVersion ? { scoringVersion: scale.scoringVersion } : {}),
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
    scoringVersion: result.scoringVersion ?? null,
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

export async function getInProgressSessions(
  userId: string,
): Promise<UserAssessmentSession[]> {
  const q = query(
    collection(db, SESSIONS_COL),
    where('userId', '==', userId),
    where('status', '==', 'in_progress'),
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

export async function saveDrLoMentalAnalysis(userId: string, analysis: string): Promise<void> {
  await updateDoc(doc(db, PROFILES_COL, userId), {
    drLoMentalAnalysis: analysis,
    drLoMentalUpdatedAt: serverTimestamp(),
  });
}

export async function saveDrLoSexualAnalysis(userId: string, analysis: string): Promise<void> {
  await updateDoc(doc(db, PROFILES_COL, userId), {
    drLoSexualAnalysis: analysis,
    drLoSexualUpdatedAt: serverTimestamp(),
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

export async function saveSexualFilterToProfile(userId: string, filter: Record<string, unknown>): Promise<void> {
  await updateDoc(doc(db, PROFILES_COL, userId), { sexualHealthFilter: filter });
}

export async function resetUserProfile(userId: string): Promise<void> {
  const ref = doc(db, PROFILES_COL, userId);
  await updateDoc(ref, {
    scaleResults: {},
    compatibilityIdMental: null,
    compatibilityIdSexual: null,
    drLoAnalysis: null,
    drLoMentalAnalysis: null,
    drLoSexualAnalysis: null,
    drLoSynthesis: null,
    drLoUpdatedAt: null,
    drLoMentalUpdatedAt: null,
    drLoSexualUpdatedAt: null,
    drLoSynthesisUpdatedAt: null,
    lastAssessmentDate: null,
    totem: null,
    updatedAt: serverTimestamp(),
  });
}

export const TOTAL_MENTAL_SCALES = MENTAL_HEALTH_SCALES.length;
export const TOTAL_SEXUAL_SCALES = SEXUAL_HEALTH_SCALES.length;
// TOTAL_SCALES excludes bonus scales intentionally
export const TOTAL_SCALES = MENTAL_HEALTH_SCALES.length + SEXUAL_HEALTH_SCALES.length;

export async function saveScaleResultToProfile(
  userId: string,
  scaleId: string,
  result: ScaleResult,
  signatureValues?: { value: number; max: number }[],
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
      scoringVersion: result.scoringVersion ?? null,
    },
    updatedAt: serverTimestamp(),
    lastAssessmentDate: serverTimestamp(),
  };

  if (signatureValues?.length) {
    updateData[`signatures.${scaleId}`] = signatureValues;
  }

  // Generate compatibility codes based on count thresholds (7 mental + 5 sexual)
  const MENTAL_IDS = MENTAL_HEALTH_SCALES.map(s => s.id);
  const SEXUAL_IDS = SEXUAL_HEALTH_SCALES.map(s => s.id);
  const mentalDone = MENTAL_IDS.filter(id => !!updated[id]).length;
  const sexualDone = SEXUAL_IDS.filter(id => !!updated[id]).length;

  if (mentalDone >= 7 && !snap.data().compatibilityIdMental) {
    updateData.compatibilityIdMental = generateMentalCompatibilityId();
  }
  if (sexualDone >= 5 && !snap.data().compatibilityIdSexual) {
    updateData.compatibilityIdSexual = generateSexualCompatibilityId();
  }

  await updateDoc(ref, updateData);

  // Update completedTestsCount + lastActivityAt on patients/{userId} (non-blocking)
  try {
    const patientRef = doc(db, 'patients', userId);
    const { increment: firestoreIncrement, serverTimestamp: srvTs } = await import('firebase/firestore');
    updateDoc(patientRef, {
      completedTestsCount: firestoreIncrement(1),
      lastActivityAt: srvTs(),
    }).catch(() => {});
  } catch {
    // Non-critical
  }

  // Update aggregated evaluation stats (non-blocking)
  try {
    const { incrementTestStat } = await import('./evaluationStatsService');
    incrementTestStat(scaleId, result.alertLevel ?? 0).catch(() => {});
  } catch {
    // Stats update is non-critical
  }

  // Totem improvement detection: compare old vs new classification
  if ((TOTEM_REQUIRED_SCALES as readonly string[]).includes(scaleId) && existing[scaleId]) {
    try {
      const oldCls = classifyDomain(existing[scaleId]);
      const newCls = classifyDomain(result);
      const domain = getTotemDomain(scaleId);
      if (domain && oldCls === 'grow' && (newCls === 'force' || newCls === 'neutral')) {
        await updateDoc(ref, {
          'totem.lastImprovement': {
            scaleId,
            domainLabel: newCls === 'force' ? domain.forceLabel : domain.label,
            from: oldCls,
            to: newCls,
            at: serverTimestamp(),
          },
        });
      }
    } catch {
      // Improvement tracking is non-critical
    }
  }

  // Totem recalculation when a required test is re-completed
  if ((TOTEM_REQUIRED_SCALES as readonly string[]).includes(scaleId)) {
    try {
      const allDone = TOTEM_REQUIRED_SCALES.every(id => !!updated[id]);
      if (allDone) {
        const currentTotem = snap.data().totem as Record<string, unknown> | undefined;
        const newAnimal = computeTotem(updated as Record<string, ScaleResult>);
        if (newAnimal && currentTotem?.animal) {
          if (newAnimal !== currentTotem.animal && newAnimal !== currentTotem.pendingAnimal) {
            await updateDoc(ref, { 'totem.pendingAnimal': newAnimal, updatedAt: serverTimestamp() });
          }
        } else if (newAnimal && !currentTotem?.animal) {
          await updateDoc(ref, {
            'totem.animal': newAnimal,
            'totem.computedAt': serverTimestamp(),
            'totem.revealedAt': null,
            'totem.pendingAnimal': null,
            updatedAt: serverTimestamp(),
          });
        }
      }
    } catch {
      // Totem recalculation is non-critical
    }
  }
}

/**
 * Recalcule les résultats enregistrés avec une ancienne version d'une échelle, à partir des
 * réponses de la dernière session terminée. Met à jour le profil et la session ; si l'animal intérieur change,
 * il est proposé comme « évolution » (pendingAnimal), comme quand on refait un test.
 */
export async function rescoreOutdatedResults(
  userId: string,
  scaleResults: Record<string, ScaleResult>,
  totem: Record<string, unknown> | undefined,
): Promise<Record<string, ScaleResult>> {
  const outdated = Object.keys(scaleResults).filter(id => needsRescore(ALL_SCALES.find(x => x.id === id), scaleResults[id]));
  const fs = db;
  if (outdated.length === 0 || !fs) return scaleResults;
  const snap = await getDocs(query(
    collection(fs, SESSIONS_COL),
    where('userId', '==', userId),
    where('status', '==', 'completed'),
  ));
  const sessions = snap.docs.map(d => ({ ...(d.data() as UserAssessmentSession), id: d.id }));
  const toMs = (v: unknown): number => {
    if (!v) return 0;
    if (v instanceof Date) return v.getTime();
    const t = v as { toMillis?: () => number; seconds?: number };
    return t.toMillis ? t.toMillis() : (t.seconds ?? 0) * 1000;
  };
  const updated = { ...scaleResults };
  const profileUpdate: Record<string, unknown> = {};
  for (const id of outdated) {
    const scale = ALL_SCALES.find(x => x.id === id)!;
    const latest = sessions
      .filter(s => s.answers?.[id] && Object.keys(s.answers[id]).length > 0 && s.scores?.[id])
      .sort((a, b) => toMs(b.completedAt ?? b.startedAt) - toMs(a.completedAt ?? a.startedAt))[0];
    if (!latest) {
      // Réponses introuvables : on garde l'ancien score et on ne réessaie plus
      updated[id] = { ...scaleResults[id], rescoreSkipped: true };
      profileUpdate[`scaleResults.${id}.rescoreSkipped`] = true;
      continue;
    }
    const r = rescore(scale, scaleResults[id], latest.answers[id]);
    updated[id] = r;
    profileUpdate[`scaleResults.${id}.totalScore`] = r.totalScore;
    profileUpdate[`scaleResults.${id}.subscaleScores`] = r.subscaleScores ?? null;
    profileUpdate[`scaleResults.${id}.interpretation`] = r.interpretation;
    profileUpdate[`scaleResults.${id}.scoringVersion`] = r.scoringVersion ?? null;
    try {
      await updateDoc(doc(fs, SESSIONS_COL, latest.id), {
        [`scores.${id}.totalScore`]: r.totalScore,
        [`scores.${id}.subscaleScores`]: r.subscaleScores ?? null,
        [`scores.${id}.interpretation`]: r.interpretation,
        [`scores.${id}.scoringVersion`]: r.scoringVersion ?? null,
      });
    } catch { /* la session n'est qu'une copie */ }
  }
  // Totem : même règle que lorsqu'un test est refait
  if (outdated.some(id => (TOTEM_REQUIRED_SCALES as readonly string[]).includes(id))
      && TOTEM_REQUIRED_SCALES.every(id => !!updated[id])) {
    const newAnimal = computeTotem(updated);
    if (newAnimal && totem?.animal && newAnimal !== totem.animal && newAnimal !== totem.pendingAnimal) {
      profileUpdate['totem.pendingAnimal'] = newAnimal;
    }
  }
  if (Object.keys(profileUpdate).length > 0) {
    await updateDoc(doc(fs, PROFILES_COL, userId), { ...profileUpdate, updatedAt: serverTimestamp() });
  }
  return updated;
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
  bonusCompletedCount: number;
  isMentalComplete: boolean;
  isSexualComplete: boolean;
  remaining: number;
  drLoAnalysis: string | null;
  drLoMentalAnalysis: string | null;
  drLoSexualAnalysis: string | null;
  drLoSynthesis: string | null;
  drLoMentalUpdatedAt: Date | null;
  drLoSexualUpdatedAt: Date | null;
  onboardingProfile: Record<string, string> | null;
  sexualHealthFilter: Record<string, unknown> | null;
  signatures: Record<string, { value: number; max: number }[]>;
  totem: { animal: string; computedAt: Date; revealedAt: Date | null; pendingAnimal: string | null; lastImprovement: { scaleId: string; domainLabel: string; from: string; to: string; at: Date } | null } | null;
  archetypeId: string | null;
  activeDefis: Array<{ slug: string; titre: string; audience: string; expiresAt: Date }>;
  defiHistory: boolean;
  defiGenre: string | null;
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
      bonusCompletedCount: 0,
      isMentalComplete: false,
      isSexualComplete: false,
      remaining: TOTAL_SCALES,
      drLoAnalysis: null,
      drLoMentalAnalysis: null,
      drLoSexualAnalysis: null,
      drLoSynthesis: null,
      drLoMentalUpdatedAt: null,
      drLoSexualUpdatedAt: null,
      onboardingProfile: null,
      sexualHealthFilter: null,
      signatures: {},
      totem: null,
      archetypeId: null,
      activeDefis: [],
      defiHistory: false,
      defiGenre: null,
    };
  }
  const data = snap.data();
  let scaleResults: Record<string, ScaleResult> = data.scaleResults ?? {};
  // Résultats calculés avec une ancienne version d'une échelle (ex. ECR-R corrigé) : recalcul transparent
  if (Object.entries(scaleResults).some(([id, r]) => needsRescore(ALL_SCALES.find(x => x.id === id), r))) {
    try {
      scaleResults = await rescoreOutdatedResults(userId, scaleResults, data.totem as Record<string, unknown> | undefined);
    } catch { /* on garde les anciens scores, nouvel essai au prochain chargement */ }
  }
  const mentalCompletedCount = MENTAL_HEALTH_SCALES.filter(s => !!scaleResults[s.id]).length;
  const sexualCompletedCount = SEXUAL_HEALTH_SCALES.filter(s => !!scaleResults[s.id]).length;
  const bonusCompletedCount = BONUS_SCALES.filter(s => !!scaleResults[s.id]).length;
  // completedCount only tracks mental + sexual (not bonus) so progress bars stay accurate
  const completedCount = mentalCompletedCount + sexualCompletedCount;
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
    bonusCompletedCount,
    isMentalComplete,
    isSexualComplete,
    remaining: Math.max(0, TOTAL_SCALES - completedCount),
    drLoAnalysis: (data.drLoAnalysis as string | null) ?? null,
    drLoMentalAnalysis: (data.drLoMentalAnalysis as string | null) ?? null,
    drLoSexualAnalysis: (data.drLoSexualAnalysis as string | null) ?? null,
    drLoSynthesis: (data.drLoSynthesis as string | null) ?? null,
    drLoMentalUpdatedAt: data.drLoMentalUpdatedAt instanceof Timestamp ? data.drLoMentalUpdatedAt.toDate() : null,
    drLoSexualUpdatedAt: data.drLoSexualUpdatedAt instanceof Timestamp ? data.drLoSexualUpdatedAt.toDate() : null,
    onboardingProfile: (data.onboardingProfile as Record<string, string> | null) ?? null,
    sexualHealthFilter: (data.sexualHealthFilter as Record<string, unknown> | null) ?? null,
    signatures: (data.signatures as Record<string, { value: number; max: number }[]>) ?? {},
    totem: data.totem ? (() => {
      const t = data.totem as Record<string, unknown>;
      const li = t.lastImprovement as Record<string, unknown> | undefined;
      return {
        animal: t.animal as string,
        computedAt: t.computedAt instanceof Timestamp ? (t.computedAt as Timestamp).toDate() : new Date(),
        revealedAt: t.revealedAt instanceof Timestamp ? (t.revealedAt as Timestamp).toDate() : null,
        pendingAnimal: (t.pendingAnimal as string) ?? null,
        lastImprovement: li ? {
          scaleId: li.scaleId as string,
          domainLabel: li.domainLabel as string,
          from: li.from as string,
          to: li.to as string,
          at: li.at instanceof Timestamp ? (li.at as Timestamp).toDate() : new Date(),
        } : null,
      };
    })() : null,
    archetypeId: (data.archetypeId as string | null) ?? null,
    activeDefis: (() => {
      const now = new Date();
      const toDate = (v: unknown): Date => v instanceof Timestamp ? (v as Timestamp).toDate() : new Date(v as string);

      if (Array.isArray(data.activeDefis)) {
        return (data.activeDefis as Array<Record<string, unknown>>)
          .map(ad => ({
            slug: ad.slug as string,
            titre: (ad.titre as string) || 'Mon défi',
            audience: (ad.audience as string) || 'tous',
            expiresAt: toDate(ad.expiresAt),
          }))
          .filter(ad => ad.expiresAt > now);
      }

      if (data.activeDefi) {
        const ad = data.activeDefi as Record<string, unknown>;
        const exp = toDate(ad.expiresAt);
        if (exp > now) {
          return [{ slug: ad.slug as string, titre: 'Mon défi', audience: 'tous', expiresAt: exp }];
        }
      }

      return [];
    })(),
    defiHistory: !!(data.defiHistory || data.activeDefis?.length || data.activeDefi),
    defiGenre: (data.defiGenre as string | null) ?? null,
  };
}

/** A profile is "complete" for a given code type if the code exists in Firestore */
export async function isProfileCompleteById(id: string): Promise<boolean> {
  const profile = await getUserProfileByCompatibilityId(id);
  return profile !== null;
}

export async function saveTotem(userId: string, animal: string, archetypeId?: string): Promise<void> {
  const update: Record<string, unknown> = {
    'totem.animal': animal,
    'totem.computedAt': serverTimestamp(),
    'totem.revealedAt': null,
    updatedAt: serverTimestamp(),
  };
  if (archetypeId) update.archetypeId = archetypeId;
  await updateDoc(doc(db, PROFILES_COL, userId), update);
}

export async function revealTotem(userId: string): Promise<void> {
  await updateDoc(doc(db, PROFILES_COL, userId), {
    'totem.revealedAt': serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function acceptPendingTotem(userId: string, newAnimal: string, archetypeId?: string): Promise<void> {
  const update: Record<string, unknown> = {
    'totem.animal': newAnimal,
    'totem.pendingAnimal': null,
    'totem.computedAt': serverTimestamp(),
    'totem.revealedAt': serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  if (archetypeId) update.archetypeId = archetypeId;
  await updateDoc(doc(db, PROFILES_COL, userId), update);
}

export async function backfillArchetypeId(userId: string, archetypeId: string): Promise<void> {
  await updateDoc(doc(db, PROFILES_COL, userId), {
    archetypeId,
    updatedAt: serverTimestamp(),
  });
}
