import {
  collection, doc, setDoc, getDoc, updateDoc, query,
  where, orderBy, getDocs, serverTimestamp, Timestamp
} from 'firebase/firestore';
import { db } from '../utils/firebase';
import type {
  UserAssessmentSession, ScaleResult, UserProfile
} from '../types/assessment';
import { ALL_SCALES } from '../data/scales';
import { generateCompatibilityId } from '../utils/idGenerator';

const SESSIONS_COL = 'assessmentSessions';
const PROFILES_COL = 'userProfiles';

// ── Profil utilisateur ──────────────────────────────────────────────

export async function getOrCreateUserProfile(uid: string, displayName: string): Promise<UserProfile> {
  const ref = doc(db, PROFILES_COL, uid);
  const snap = await getDoc(ref);
  if (snap.exists()) return snap.data() as UserProfile;

  const profile: UserProfile = {
    uid,
    compatibilityId: generateCompatibilityId(),
    displayName,
    assessmentHistory: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  await setDoc(ref, { ...profile, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  return profile;
}

export async function getUserProfileByCompatibilityId(compatibilityId: string): Promise<UserProfile | null> {
  const q = query(collection(db, PROFILES_COL), where('compatibilityId', '==', compatibilityId));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return snap.docs[0].data() as UserProfile;
}

// ── Sessions d'évaluation ───────────────────────────────────────────

export async function createSession(
  userId: string,
  selectedScaleIds: string[]
): Promise<UserAssessmentSession> {
  if (selectedScaleIds.length < 2 || selectedScaleIds.length > 10) {
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

export async function computeAndSaveScaleResult(
  sessionId: string,
  scaleId: string,
  answers: Record<number, number>
): Promise<ScaleResult> {
  const scale = ALL_SCALES.find(s => s.id === scaleId);
  if (!scale) throw new Error(`Scale ${scaleId} introuvable`);

  // Calcul du score total
  let totalScore = 0;
  const reverseIds = new Set(scale.reverseIds ?? []);
  const maxPerItem = Math.max(...(scale.items[0]?.options?.map(o => o.value) ?? [3]));

  for (const item of scale.items) {
    let val = answers[item.id] ?? 0;
    const isReversed = (item.reversed === true) || reverseIds.has(item.id);
    if (isReversed) val = maxPerItem - val;
    totalScore += val;
  }

  // Calcul des sous-scores
  const subscaleScores: Record<string, number> = {};
  if (scale.subscales) {
    for (const sub of scale.subscales) {
      const subReverseIds = new Set(sub.reverseIds ?? []);
      let subScore = 0;
      const subMaxPerItem = Math.max(...(scale.items[0]?.options?.map(o => o.value) ?? [3]));
      for (const itemId of sub.itemIds) {
        let val = answers[itemId] ?? 0;
        if (subReverseIds.has(itemId) || reverseIds.has(itemId)) val = subMaxPerItem - val;
        subScore += val;
      }
      subscaleScores[sub.key] = subScore;
    }
  }

  // Interprétation
  const interpretation =
    scale.interpretation.find(r => totalScore >= r.min && totalScore <= r.max) ??
    scale.interpretation[scale.interpretation.length - 1];

  const result: ScaleResult = {
    scaleId,
    totalScore,
    subscaleScores: Object.keys(subscaleScores).length > 0 ? subscaleScores : undefined,
    interpretation,
    completedAt: new Date(),
  };

  const alertDetected = interpretation.referralRequired;

  await updateDoc(doc(db, SESSIONS_COL, sessionId), {
    [`scores.${scaleId}`]: result,
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
