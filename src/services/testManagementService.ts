import {
  collection,
  doc,
  getDocs,
  deleteDoc,
  updateDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  writeBatch,
  getDoc,
  addDoc,
  Timestamp,
  deleteField,
} from 'firebase/firestore';
import { db } from '../utils/firebase';
import type { ScaleResult } from '../types/assessment';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ScaleResultHistoryEntry {
  id?: string;
  scaleId: string;
  totalScore: number;
  subscaleScores?: Record<string, number> | null;
  interpretation: {
    min: number;
    max: number;
    label: string;
    severity: string;
    description: string;
    referralRequired: boolean;
    recommendation: string;
    alertLevel?: number;
  };
  alertLevel?: number | null;
  alertsTriggered?: Array<{
    itemId: number;
    value: number;
    alertLevel: number;
    message: string;
  }> | null;
  answers: Record<number, number>;
  contextAnswer?: number | null;
  attemptNumber: number;
  completedAt: Date;
  archivedAt?: Date;
}

// ---------------------------------------------------------------------------
// Constantes internes
// ---------------------------------------------------------------------------

const MENTAL_REQUIRED = ['big_five', 'ecr_r', 'rses', 'gad7', 'phq9'];
const SEXUAL_REQUIRED = ['nsss', 'sdi2', 'pair'];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Convertit un Firestore Timestamp ou Date en Date JS */
function toDate(value: unknown): Date {
  if (value instanceof Timestamp) return value.toDate();
  if (value instanceof Date) return value;
  return new Date(value as string | number);
}

// ---------------------------------------------------------------------------
// Fonctions publiques
// ---------------------------------------------------------------------------

/**
 * Archive le résultat actuel d'une échelle dans l'historique,
 * puis supprime l'entrée active du profil.
 * @returns le numéro de tentative suivant (pour le nouveau résultat à enregistrer)
 */
export async function archiveCurrentResult(
  userId: string,
  scaleId: string,
  answers: Record<number, number>,
  contextAnswer?: number,
): Promise<number> {
  const profileRef = doc(db, 'userProfiles', userId);
  const profileSnap = await getDoc(profileRef);

  if (!profileSnap.exists()) {
    return 1;
  }

  const profileData = profileSnap.data();
  const currentResult = profileData?.scaleResults?.[scaleId] as
    | ScaleResult
    | undefined;

  if (!currentResult) {
    return 1;
  }

  // Compter les tentatives existantes dans l'historique
  const historyRef = collection(db, 'userProfiles', userId, 'scaleResultHistory');
  const historyQuery = query(historyRef, where('scaleId', '==', scaleId));
  const historySnap = await getDocs(historyQuery);
  const existingCount = historySnap.size;

  // Déterminer le numéro de tentative de l'entrée archivée
  const archiveAttemptNumber = existingCount + 1;

  // Ajouter le résultat actuel dans l'historique
  const historyEntry: Omit<ScaleResultHistoryEntry, 'id'> = {
    scaleId,
    totalScore: currentResult.totalScore,
    subscaleScores: currentResult.subscaleScores ?? null,
    interpretation: currentResult.interpretation as ScaleResultHistoryEntry['interpretation'],
    alertLevel: currentResult.alertLevel ?? null,
    alertsTriggered: currentResult.alertsTriggered ?? null,
    answers,
    contextAnswer: contextAnswer ?? null,
    attemptNumber: archiveAttemptNumber,
    completedAt: toDate(currentResult.completedAt),
    archivedAt: new Date(),
  };

  await addDoc(historyRef, historyEntry);

  // Supprimer le résultat actif du profil
  await updateDoc(profileRef, {
    [`scaleResults.${scaleId}`]: deleteField(),
  });

  // Le prochain résultat sera la tentative suivante
  return archiveAttemptNumber + 1;
}

/**
 * Récupère l'historique complet des tentatives pour une échelle donnée.
 * Trié par date de complétion (ascendant).
 */
export async function getTestHistory(
  userId: string,
  scaleId: string,
): Promise<ScaleResultHistoryEntry[]> {
  const historyRef = collection(db, 'userProfiles', userId, 'scaleResultHistory');
  const q = query(
    historyRef,
    where('scaleId', '==', scaleId),
    orderBy('completedAt', 'asc'),
  );
  const snap = await getDocs(q);

  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      scaleId: data.scaleId,
      totalScore: data.totalScore,
      subscaleScores: data.subscaleScores ?? null,
      interpretation: data.interpretation,
      alertLevel: data.alertLevel ?? null,
      alertsTriggered: data.alertsTriggered ?? null,
      answers: data.answers,
      contextAnswer: data.contextAnswer ?? null,
      attemptNumber: data.attemptNumber,
      completedAt: toDate(data.completedAt),
      archivedAt: data.archivedAt ? toDate(data.archivedAt) : undefined,
    } as ScaleResultHistoryEntry;
  });
}

/**
 * Compte le nombre total de tentatives pour une échelle
 * (historique + résultat actif éventuel).
 */
export async function getTestAttemptCount(
  userId: string,
  scaleId: string,
): Promise<number> {
  const historyRef = collection(db, 'userProfiles', userId, 'scaleResultHistory');
  const q = query(historyRef, where('scaleId', '==', scaleId));
  const historySnap = await getDocs(q);
  let count = historySnap.size;

  // Vérifier si un résultat actif existe
  const profileRef = doc(db, 'userProfiles', userId);
  const profileSnap = await getDoc(profileRef);
  if (profileSnap.exists()) {
    const data = profileSnap.data();
    if (data?.scaleResults?.[scaleId]) {
      count += 1;
    }
  }

  return count;
}

/**
 * Récupère le nombre total de tentatives pour chaque échelle du profil utilisateur.
 * Retourne une map scaleId → nombre de tentatives.
 */
export async function getAllTestAttemptCounts(
  userId: string,
): Promise<Record<string, number>> {
  const counts: Record<string, number> = {};

  // Récupérer tous les docs d'historique (sans filtre sur scaleId)
  const historyRef = collection(db, 'userProfiles', userId, 'scaleResultHistory');
  const historySnap = await getDocs(historyRef);
  historySnap.docs.forEach((d) => {
    const sid = d.data().scaleId as string;
    counts[sid] = (counts[sid] || 0) + 1;
  });

  // Ajouter +1 pour chaque résultat actif
  const profileRef = doc(db, 'userProfiles', userId);
  const profileSnap = await getDoc(profileRef);
  if (profileSnap.exists()) {
    const scaleResults = profileSnap.data()?.scaleResults as
      | Record<string, ScaleResult>
      | undefined;
    if (scaleResults) {
      for (const sid of Object.keys(scaleResults)) {
        counts[sid] = (counts[sid] || 0) + 1;
      }
    }
  }

  return counts;
}

/**
 * Supprime complètement un test : résultat actif + tout l'historique.
 * Met à jour les codes de compatibilité si nécessaire.
 */
export async function deleteTestResult(
  userId: string,
  scaleId: string,
): Promise<void> {
  const profileRef = doc(db, 'userProfiles', userId);

  // Supprimer le résultat actif
  const updateData: Record<string, unknown> = {
    [`scaleResults.${scaleId}`]: deleteField(),
    updatedAt: serverTimestamp(),
  };

  // Vérifier si on doit invalider un code de compatibilité
  if (MENTAL_REQUIRED.includes(scaleId)) {
    updateData['compatibilityIdMental'] = null;
  }
  if (SEXUAL_REQUIRED.includes(scaleId)) {
    updateData['compatibilityIdSexual'] = null;
  }

  await updateDoc(profileRef, updateData);

  // Supprimer tous les docs d'historique pour cette échelle (batch, max 500)
  const historyRef = collection(db, 'userProfiles', userId, 'scaleResultHistory');
  const q = query(historyRef, where('scaleId', '==', scaleId));
  const snap = await getDocs(q);

  const docs = snap.docs;
  for (let i = 0; i < docs.length; i += 500) {
    const batch = writeBatch(db);
    const chunk = docs.slice(i, i + 500);
    chunk.forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }
}

/**
 * Supprime une entrée spécifique de l'historique.
 */
export async function deleteSpecificHistoryEntry(
  userId: string,
  entryId: string,
): Promise<void> {
  const entryRef = doc(db, 'userProfiles', userId, 'scaleResultHistory', entryId);
  await deleteDoc(entryRef);
}

/**
 * Réinitialise complètement le profil d'un utilisateur :
 * résultats, analyses Dr Lô, codes de compatibilité, historique.
 */
export async function resetFullProfile(userId: string): Promise<void> {
  const profileRef = doc(db, 'userProfiles', userId);

  // Réinitialiser les champs du profil
  await updateDoc(profileRef, {
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
    updatedAt: serverTimestamp(),
  });

  // Supprimer tous les docs de l'historique (batch, boucle si > 500)
  const historyRef = collection(db, 'userProfiles', userId, 'scaleResultHistory');
  let snap = await getDocs(historyRef);

  while (snap.size > 0) {
    const batch = writeBatch(db);
    snap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
    // Re-fetch pour vérifier s'il en reste (cas > 500 docs)
    snap = await getDocs(historyRef);
  }
}

/**
 * Récupère les réponses enregistrées dans une session d'évaluation
 * pour une échelle donnée.
 */
export async function getAnswersFromSession(
  sessionId: string,
  scaleId: string,
): Promise<Record<number, number> | null> {
  const sessionRef = doc(db, 'assessmentSessions', sessionId);
  const sessionSnap = await getDoc(sessionRef);

  if (!sessionSnap.exists()) {
    return null;
  }

  const data = sessionSnap.data();
  const answers = data?.answers?.[scaleId] as Record<number, number> | undefined;
  return answers ?? null;
}
