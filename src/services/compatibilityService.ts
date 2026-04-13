import { collection, doc, setDoc, getDoc, updateDoc, deleteDoc, serverTimestamp, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '../utils/firebase';
import type { CompatibilityRequest, CompatibilityResult, ScaleResult } from '../types/assessment';
import { getUserProfileByCompatibilityId, getProfileProgress } from './evaluationService';

const COL = 'compatibilityRequests';
const HISTORY_COL = 'compatibilityHistory';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CompatibilityHistoryEntry {
  id: string;
  userId: string;
  relationshipType: string;
  partnerCode: string;
  partnerPrenom?: string;
  codeType: 'mental' | 'sexual';
  result: CompatibilityResult;
  createdAt: Date;
}

export interface CodeValidationResult {
  valid: boolean;
  error?: string;
  prenom?: string;
  genre?: string;
  uid?: string;
}

// ── History ───────────────────────────────────────────────────────────────────

export async function saveCompatibilityHistory(
  userId: string,
  relationshipType: string,
  partnerCode: string,
  codeType: 'mental' | 'sexual',
  result: CompatibilityResult,
  partnerPrenom?: string
): Promise<void> {
  const ref = doc(collection(db, HISTORY_COL));
  await setDoc(ref, {
    userId,
    relationshipType,
    partnerCode,
    partnerPrenom: partnerPrenom ?? null,
    codeType,
    result,
    createdAt: serverTimestamp(),
  });
}

export async function deleteCompatibilityHistory(entryId: string): Promise<void> {
  await deleteDoc(doc(db, HISTORY_COL, entryId));
}

export async function getCompatibilityHistory(userId: string): Promise<CompatibilityHistoryEntry[]> {
  const q = query(
    collection(db, HISTORY_COL),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc'),
    limit(20)
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => {
    const data = d.data();
    return {
      id: d.id,
      userId: data.userId,
      relationshipType: data.relationshipType,
      partnerCode: data.partnerCode,
      partnerPrenom: data.partnerPrenom ?? undefined,
      codeType: data.codeType,
      result: data.result,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      createdAt: (data.createdAt as any)?.toDate?.() ?? new Date(),
    } as CompatibilityHistoryEntry;
  });
}

// ── Validation de code en temps réel ──────────────────────────────────────────

export async function validateCompatibilityCode(
  code: string,
  ownUserId: string
): Promise<CodeValidationResult> {
  const trimmed = code.trim().toUpperCase();
  if (!trimmed) return { valid: false };

  // 1. Vérifier le format
  const isMentalValid = /^HE-MNT-\d{4}-[A-Z0-9]{4}$/i.test(trimmed) || /^SM-[A-Z0-9]{4}$/i.test(trimmed);
  const isSexualValid = /^HE-SEX-\d{4}-[A-Z0-9]{4}$/i.test(trimmed) || /^SE-[A-Z0-9]{4}$/i.test(trimmed);
  if (!isMentalValid && !isSexualValid) {
    return { valid: false, error: 'Format invalide' };
  }

  // 2. Vérifier que ce n'est pas son propre code
  const ownSnap = await getDoc(doc(db, 'userProfiles', ownUserId));
  if (ownSnap.exists()) {
    const ownData = ownSnap.data();
    if (trimmed === ownData.compatibilityIdMental || trimmed === ownData.compatibilityIdSexual) {
      return { valid: false, error: 'C\'est ton propre code 😄' };
    }
  }

  // 3. Chercher le profil dans la base
  const partner = await getUserProfileByCompatibilityId(trimmed);
  if (!partner) {
    return { valid: false, error: 'Aucun profil trouvé pour ce code' };
  }

  // 4. Extraire prénom et genre
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const onboarding = (partner as any).onboardingProfile as Record<string, string> | undefined;
  const prenom = onboarding?.prenom || partner.displayName || 'Utilisateur';
  const genre = onboarding?.genre || undefined;

  return { valid: true, prenom, genre, uid: partner.uid };
}

function getCodeType(id: string): 'mental' | 'sexual' | null {
  // New format: HE-MNT-YYYY-XXXX / HE-SEX-YYYY-XXXX
  if (id.startsWith('HE-MNT-')) return 'mental';
  if (id.startsWith('HE-SEX-')) return 'sexual';
  // Legacy format: SM-XXXX / SE-XXXX
  if (id.startsWith('SM-')) return 'mental';
  if (id.startsWith('SE-')) return 'sexual';
  return null;
}

export async function createCompatibilityRequest(
  initiatorUserId: string,
  partnerCompatibilityId: string,
  relationshipType: CompatibilityRequest['relationshipType']
): Promise<CompatibilityRequest> {
  const codeType = getCodeType(partnerCompatibilityId);
  if (!codeType) {
    throw new Error("Format de code invalide. Utilisez un code SM-XXXX (profil mental) ou SE-XXXX (profil sexuel).");
  }

  // Check that initiator has the matching profile type
  const initiatorSnap = await getDoc(doc(db, 'userProfiles', initiatorUserId));
  if (!initiatorSnap.exists()) throw new Error('Profil introuvable.');
  const initiatorData = initiatorSnap.data();
  const initiatorCode = codeType === 'mental'
    ? initiatorData.compatibilityIdMental
    : initiatorData.compatibilityIdSexual;
  if (!initiatorCode) {
    throw new Error(
      codeType === 'mental'
        ? "Tu dois compléter toutes les évaluations du profil psychologique avant de comparer."
        : "Tu dois compléter toutes les évaluations de vie intime avant de comparer."
    );
  }

  const partner = await getUserProfileByCompatibilityId(partnerCompatibilityId);
  if (!partner) throw new Error('Identifiant partenaire introuvable.');

  const ref = doc(collection(db, COL));
  const request: CompatibilityRequest = {
    id: ref.id,
    initiatorUserId,
    partnerCompatibilityId,
    relationshipType,
    status: 'pending',
    createdAt: new Date(),
  };
  await setDoc(ref, { ...request, createdAt: serverTimestamp() });
  return request;
}

export async function computeCompatibility(requestId: string): Promise<CompatibilityResult> {
  const reqSnap = await getDoc(doc(db, COL, requestId));
  if (!reqSnap.exists()) throw new Error('Demande introuvable');
  const req = reqSnap.data() as CompatibilityRequest;

  const partner = await getUserProfileByCompatibilityId(req.partnerCompatibilityId);
  if (!partner) throw new Error('Profil partenaire introuvable');

  // Lire les profils complets des deux utilisateurs (userProfiles — pas les sessions)
  const [initiatorProfile, partnerProfile] = await Promise.all([
    getProfileProgress(req.initiatorUserId),
    getProfileProgress(partner.uid),
  ]);

  if (!initiatorProfile || !partnerProfile) {
    throw new Error('Les deux profils doivent avoir complété au moins une évaluation.');
  }

  const codeType = getCodeType(req.partnerCompatibilityId) ?? 'mental';
  const dimensionScores = computeDimensionScores(initiatorProfile.scaleResults, partnerProfile.scaleResults, codeType);
  const globalScore = Object.keys(dimensionScores).length > 0
    ? Math.round(Object.values(dimensionScores).reduce((a, b) => a + b, 0) / Object.values(dimensionScores).length)
    : 0;

  // Build scale results filtered to the relevant code type
  const MENTAL_SCALE_IDS = ['ecr_r', 'rses', 'brs', 'big_five', 'pss10', 'gad7', 'phq9', 'ace', 'pcl5', 'ceca_q'];
  const SEXUAL_SCALE_IDS = ['nsss', 'sdi2', 'sis_ses', 'fsfi', 'iief', 'griss_base', 'pair', 'sise', 'tsi_base', 'social_pressure_sex'];
  const BONUS_SCALE_IDS = ['npi', 'daq', 'hsp', 'tdah', 'hpi', 'gse', 'pdq', 'mach', 'mbi', 'mjs', 'wleis'];

  const relevantIds = codeType === 'mental' ? MENTAL_SCALE_IDS : SEXUAL_SCALE_IDS;

  function filterScales(scaleResults: Record<string, unknown> | undefined, ids: string[]) {
    if (!scaleResults) return {};
    return Object.fromEntries(Object.entries(scaleResults).filter(([id]) => ids.includes(id)));
  }
  function extractBonus(scaleResults: Record<string, unknown> | undefined) {
    if (!scaleResults) return [];
    return Object.entries(scaleResults)
      .filter(([id]) => BONUS_SCALE_IDS.includes(id))
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map(([id, r]: [string, any]) => ({ id, nom: id, niveau: r?.interpretation?.label ?? r?.interpretation?.severity ?? 'N/A' }));
  }

  const scaleResults1 = filterScales(initiatorProfile.scaleResults, relevantIds);
  const scaleResults2 = filterScales(partnerProfile.scaleResults, relevantIds);
  const bonusResults1 = extractBonus(initiatorProfile.scaleResults);
  const bonusResults2 = extractBonus(partnerProfile.scaleResults);

  // Display names and gender — already in userProfiles (onboardingProfile) or fallback
  const prenom1: string = (initiatorProfile.onboardingProfile?.prenom as string | undefined) ?? 'Toi';
  const prenom2: string = (partnerProfile.onboardingProfile?.prenom as string | undefined) ?? 'Partenaire';
  const genre1: string = (initiatorProfile.onboardingProfile?.genre as string | undefined) ?? '';
  const genre2: string = (partnerProfile.onboardingProfile?.genre as string | undefined) ?? '';

  let claudeNarrative = '';
  try {
    const aiResponse = await fetch('/.netlify/functions/compatibility-analysis', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prenom1,
        prenom2,
        genre1,
        genre2,
        codeType,
        relationshipType: req.relationshipType,
        scaleResults1,
        scaleResults2,
        bonusResults1,
        bonusResults2,
        dimensionScores,
        globalScore,
      }),
    });
    if (aiResponse.ok) {
      const aiData = await aiResponse.json();
      claudeNarrative = aiData.narrative ?? '';
    }
  } catch {
    // AI narrative is optional — proceed without it
  }

  const result: CompatibilityResult = {
    globalScore,
    dimensionScores,
    strengths: extractStrengths(dimensionScores),
    tensions: extractTensions(dimensionScores),
    recommendations: [],
    claudeNarrative,
    computedAt: new Date(),
  };

  await updateDoc(doc(db, COL, requestId), {
    status: 'completed',
    result,
  });

  return result;
}

const MENTAL_DIMENSIONS: Record<string, string[]> = {
  'Émotionnel':    ['ecr_r', 'rses', 'brs'],
  'Psychologique': ['big_five', 'pss10'],
  'Santé mentale': ['gad7', 'phq9'],
  'Résilience':    ['brs', 'pss10'],
  'Traumatismes':  ['ace', 'pcl5', 'ceca_q'],
};

const SEXUAL_DIMENSIONS: Record<string, string[]> = {
  'Désir & excitation':  ['nsss', 'sdi2', 'sis_ses'],
  'Fonctionnement':      ['fsfi', 'iief'],
  'Communication':       ['griss_base', 'pair'],
  'Identité & image':    ['sise', 'tsi_base'],
  'Pressions sociales':  ['social_pressure_sex'],
};

function computeDimensionScores(
  s1: Record<string, ScaleResult>,
  s2: Record<string, ScaleResult>,
  codeType: 'mental' | 'sexual'
): Record<string, number> {
  const dimensions = codeType === 'mental' ? MENTAL_DIMENSIONS : SEXUAL_DIMENSIONS;

  const scores: Record<string, number> = {};
  for (const [dim, scaleIds] of Object.entries(dimensions)) {
    const commonScales = scaleIds.filter(
      id => s1[id] && s2[id]
    );
    if (commonScales.length === 0) continue;

    let dimScore = 0;
    for (const scaleId of commonScales) {
      const r1 = s1[scaleId].interpretation.severity;
      const r2 = s2[scaleId].interpretation.severity;
      dimScore += severityCompatScore(r1, r2);
    }
    scores[dim] = Math.round(dimScore / commonScales.length);
  }
  return scores;
}

function severityCompatScore(s1: string, s2: string): number {
  const order = ['none', 'minimal', 'mild', 'moderate', 'severe', 'alert'];
  const i1 = order.indexOf(s1);
  const i2 = order.indexOf(s2);
  const diff = Math.abs(i1 - i2);
  if (diff === 0) return 100;
  if (diff === 1) return 80;
  if (diff === 2) return 60;
  if (diff === 3) return 40;
  return 20;
}

function extractStrengths(scores: Record<string, number>): string[] {
  return Object.entries(scores)
    .filter(([, v]) => v >= 75)
    .map(([k]) => `Bonne harmonie sur : ${k}`);
}

function extractTensions(scores: Record<string, number>): string[] {
  return Object.entries(scores)
    .filter(([, v]) => v < 50)
    .map(([k]) => `Zone de tension potentielle : ${k}`);
}
