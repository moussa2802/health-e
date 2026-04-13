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
  codeType: 'mental' | 'sexual' | 'merged';
  mentalCode?: string;
  intimateCode?: string;
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
  codeType: 'mental' | 'sexual' | 'merged',
  result: CompatibilityResult,
  partnerPrenom?: string,
  mentalCode?: string,
  intimateCode?: string,
): Promise<void> {
  const ref = doc(collection(db, HISTORY_COL));
  await setDoc(ref, {
    userId,
    relationshipType,
    partnerCode,
    partnerPrenom: partnerPrenom ?? null,
    codeType,
    mentalCode: mentalCode ?? null,
    intimateCode: intimateCode ?? null,
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
      codeType: data.codeType ?? 'mental',
      mentalCode: data.mentalCode ?? undefined,
      intimateCode: data.intimateCode ?? undefined,
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
  if (id.startsWith('HE-MNT-')) return 'mental';
  if (id.startsWith('HE-SEX-')) return 'sexual';
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
    throw new Error("Format de code invalide. Utilisez un code HE-MNT-XXXX (profil mental) ou HE-SEX-XXXX (profil intime).");
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

// ── Scale & dimension constants ─────────────────────────────────────────────

const MENTAL_SCALE_IDS = ['ecr_r', 'rses', 'brs', 'big_five', 'pss10', 'gad7', 'phq9', 'ace', 'pcl5', 'ceca_q'];
const SEXUAL_SCALE_IDS = ['nsss', 'sdi2', 'sis_ses', 'fsfi', 'iief', 'griss_base', 'pair', 'sise', 'tsi_base', 'social_pressure_sex'];
const BONUS_SCALE_IDS = ['npi', 'daq', 'hsp', 'tdah', 'hpi', 'gse', 'pdq', 'mach', 'mbi', 'mjs', 'wleis'];

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

// ── Helpers ─────────────────────────────────────────────────────────────────

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

function computeDimensionScores(
  s1: Record<string, ScaleResult>,
  s2: Record<string, ScaleResult>,
  codeType: 'mental' | 'sexual'
): Record<string, number> {
  const dimensions = codeType === 'mental' ? MENTAL_DIMENSIONS : SEXUAL_DIMENSIONS;
  const scores: Record<string, number> = {};
  for (const [dim, scaleIds] of Object.entries(dimensions)) {
    const commonScales = scaleIds.filter(id => s1[id] && s2[id]);
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

function avgScore(scores: Record<string, number>): number {
  const vals = Object.values(scores);
  if (vals.length === 0) return 0;
  return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
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

// ── Single-code computation (non-romantic or single code) ───────────────────

export async function computeCompatibility(requestId: string): Promise<CompatibilityResult> {
  const reqSnap = await getDoc(doc(db, COL, requestId));
  if (!reqSnap.exists()) throw new Error('Demande introuvable');
  const req = reqSnap.data() as CompatibilityRequest;

  const partner = await getUserProfileByCompatibilityId(req.partnerCompatibilityId);
  if (!partner) throw new Error('Profil partenaire introuvable');

  const [initiatorProfile, partnerProfile] = await Promise.all([
    getProfileProgress(req.initiatorUserId),
    getProfileProgress(partner.uid),
  ]);

  if (!initiatorProfile || !partnerProfile) {
    throw new Error('Les deux profils doivent avoir complété au moins une évaluation.');
  }

  const codeType = getCodeType(req.partnerCompatibilityId) ?? 'mental';
  const dimensionScores = computeDimensionScores(initiatorProfile.scaleResults, partnerProfile.scaleResults, codeType);
  const globalScore = avgScore(dimensionScores);

  const relevantIds = codeType === 'mental' ? MENTAL_SCALE_IDS : SEXUAL_SCALE_IDS;
  const scaleResults1 = filterScales(initiatorProfile.scaleResults, relevantIds);
  const scaleResults2 = filterScales(partnerProfile.scaleResults, relevantIds);
  const bonusResults1 = extractBonus(initiatorProfile.scaleResults);
  const bonusResults2 = extractBonus(partnerProfile.scaleResults);

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
        prenom1, prenom2, genre1, genre2,
        codeType,
        relationshipType: req.relationshipType,
        scaleResults1, scaleResults2,
        bonusResults1, bonusResults2,
        dimensionScores, globalScore,
      }),
    });
    if (aiResponse.ok) {
      const aiData = await aiResponse.json();
      claudeNarrative = aiData.narrative ?? '';
    }
  } catch {
    // AI narrative is optional
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

  await updateDoc(doc(db, COL, requestId), { status: 'completed', result });
  return result;
}

// ── Merged computation (romantic — both mental + intimate) ──────────────────

export async function computeMergedCompatibility(
  initiatorUserId: string,
  relationshipType: string,
  mentalCode: string | null,
  intimateCode: string | null,
): Promise<CompatibilityResult> {
  // At least one code required
  const primaryCode = mentalCode || intimateCode;
  if (!primaryCode) throw new Error('Au moins un code est requis.');

  // Resolve partner UID from whichever code we have
  const partner = await getUserProfileByCompatibilityId(primaryCode);
  if (!partner) throw new Error('Profil partenaire introuvable');

  // If we have a second code, verify it points to the same person
  if (mentalCode && intimateCode) {
    const partner2 = await getUserProfileByCompatibilityId(intimateCode);
    if (!partner2 || partner2.uid !== partner.uid) {
      throw new Error('Les deux codes doivent appartenir à la même personne.');
    }
  }

  // Verify initiator has matching codes
  const initiatorSnap = await getDoc(doc(db, 'userProfiles', initiatorUserId));
  if (!initiatorSnap.exists()) throw new Error('Profil introuvable.');
  const initiatorData = initiatorSnap.data();
  if (mentalCode && !initiatorData.compatibilityIdMental) {
    throw new Error("Tu dois compléter les évaluations du profil psychologique avant de comparer.");
  }
  if (intimateCode && !initiatorData.compatibilityIdSexual) {
    throw new Error("Tu dois compléter les évaluations de vie intime avant de comparer.");
  }

  const [initiatorProfile, partnerProfile] = await Promise.all([
    getProfileProgress(initiatorUserId),
    getProfileProgress(partner.uid),
  ]);

  if (!initiatorProfile || !partnerProfile) {
    throw new Error('Les deux profils doivent avoir complété au moins une évaluation.');
  }

  const hasMental = !!mentalCode;
  const hasIntimate = !!intimateCode;
  const isPartialResult = !(hasMental && hasIntimate);

  // Compute dimension scores for each available profile type
  let mentalDimensionScores: Record<string, number> = {};
  let intimateDimensionScores: Record<string, number> = {};
  const allDimensionScores: Record<string, number> = {};

  if (hasMental) {
    mentalDimensionScores = computeDimensionScores(initiatorProfile.scaleResults, partnerProfile.scaleResults, 'mental');
    Object.assign(allDimensionScores, mentalDimensionScores);
  }
  if (hasIntimate) {
    intimateDimensionScores = computeDimensionScores(initiatorProfile.scaleResults, partnerProfile.scaleResults, 'sexual');
    Object.assign(allDimensionScores, intimateDimensionScores);
  }

  const mentalScore = hasMental ? avgScore(mentalDimensionScores) : undefined;
  const intimateScore = hasIntimate ? avgScore(intimateDimensionScores) : undefined;

  // Global score: average of mental and intimate if both, otherwise the one available
  let globalScore: number;
  if (mentalScore !== undefined && intimateScore !== undefined) {
    globalScore = Math.round((mentalScore + intimateScore) / 2);
  } else {
    globalScore = mentalScore ?? intimateScore ?? 0;
  }

  // Build scale data for AI
  const mentalScales1 = hasMental ? filterScales(initiatorProfile.scaleResults, MENTAL_SCALE_IDS) : {};
  const mentalScales2 = hasMental ? filterScales(partnerProfile.scaleResults, MENTAL_SCALE_IDS) : {};
  const intimateScales1 = hasIntimate ? filterScales(initiatorProfile.scaleResults, SEXUAL_SCALE_IDS) : {};
  const intimateScales2 = hasIntimate ? filterScales(partnerProfile.scaleResults, SEXUAL_SCALE_IDS) : {};
  const bonusResults1 = extractBonus(initiatorProfile.scaleResults);
  const bonusResults2 = extractBonus(partnerProfile.scaleResults);

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
        prenom1, prenom2, genre1, genre2,
        codeType: hasMental && hasIntimate ? 'merged' : (hasMental ? 'mental' : 'sexual'),
        relationshipType,
        // For merged: send both profile types
        mentalScaleResults1: mentalScales1,
        mentalScaleResults2: mentalScales2,
        intimateScaleResults1: intimateScales1,
        intimateScaleResults2: intimateScales2,
        // Legacy fields for backward compat with single-type calls
        scaleResults1: { ...mentalScales1, ...intimateScales1 },
        scaleResults2: { ...mentalScales2, ...intimateScales2 },
        bonusResults1,
        bonusResults2,
        dimensionScores: allDimensionScores,
        mentalDimensionScores: hasMental ? mentalDimensionScores : undefined,
        intimateDimensionScores: hasIntimate ? intimateDimensionScores : undefined,
        globalScore,
        mentalScore,
        intimateScore,
        isPartialResult,
      }),
    });
    if (aiResponse.ok) {
      const aiData = await aiResponse.json();
      claudeNarrative = aiData.narrative ?? '';
    }
  } catch {
    // AI narrative is optional
  }

  const result: CompatibilityResult = {
    globalScore,
    dimensionScores: allDimensionScores,
    mentalScore,
    intimateScore,
    mentalDimensionScores: hasMental ? mentalDimensionScores : undefined,
    intimateDimensionScores: hasIntimate ? intimateDimensionScores : undefined,
    isPartialResult,
    strengths: extractStrengths(allDimensionScores),
    tensions: extractTensions(allDimensionScores),
    recommendations: [],
    claudeNarrative,
    computedAt: new Date(),
  };

  // Store in compatibilityRequests collection
  const ref = doc(collection(db, COL));
  await setDoc(ref, {
    id: ref.id,
    initiatorUserId,
    partnerCompatibilityId: primaryCode,
    relationshipType,
    status: 'completed',
    result,
    createdAt: serverTimestamp(),
  });

  return result;
}

// ── Migration: merge existing separate history entries ──────────────────────

export async function migrateExistingCompatibilityHistory(userId: string): Promise<number> {
  const entries = await getCompatibilityHistory(userId);
  if (entries.length === 0) return 0;

  // Group by partnerPrenom + relationshipType + close dates (within 5 min)
  const merged: Map<string, { mental?: CompatibilityHistoryEntry; sexual?: CompatibilityHistoryEntry }> = new Map();

  for (const entry of entries) {
    if (entry.codeType === 'merged') continue; // already merged
    const key = `${entry.partnerPrenom || 'unknown'}_${entry.relationshipType}`;

    // Find matching entry within 5 minutes
    for (const [existingKey, group] of merged.entries()) {
      if (!existingKey.startsWith(key)) continue;
      const existingEntry = group.mental || group.sexual;
      if (!existingEntry) continue;
      const timeDiff = Math.abs(entry.createdAt.getTime() - existingEntry.createdAt.getTime());
      if (timeDiff <= 5 * 60 * 1000) {
        // Same group
        if (entry.codeType === 'mental' && !group.mental) group.mental = entry;
        else if (entry.codeType === 'sexual' && !group.sexual) group.sexual = entry;
        break;
      }
    }

    // No match found — create new group
    const groupKey = `${key}_${entry.createdAt.getTime()}`;
    if (!merged.has(groupKey)) {
      merged.set(groupKey, { [entry.codeType]: entry });
    }
  }

  let migratedCount = 0;

  for (const group of merged.values()) {
    if (!group.mental || !group.sexual) continue; // only merge pairs

    const mentalResult = group.mental.result;
    const sexualResult = group.sexual.result;
    const globalScore = Math.round((mentalResult.globalScore + sexualResult.globalScore) / 2);

    const mergedResult: CompatibilityResult = {
      globalScore,
      dimensionScores: { ...mentalResult.dimensionScores, ...sexualResult.dimensionScores },
      mentalScore: mentalResult.globalScore,
      intimateScore: sexualResult.globalScore,
      mentalDimensionScores: mentalResult.dimensionScores,
      intimateDimensionScores: sexualResult.dimensionScores,
      isPartialResult: false,
      strengths: [...mentalResult.strengths, ...sexualResult.strengths],
      tensions: [...mentalResult.tensions, ...sexualResult.tensions],
      recommendations: [],
      claudeNarrative: [mentalResult.claudeNarrative, sexualResult.claudeNarrative].filter(Boolean).join('\n\n---\n\n'),
      computedAt: group.mental.createdAt,
    };

    // Save merged entry
    await saveCompatibilityHistory(
      group.mental.userId,
      group.mental.relationshipType,
      group.mental.partnerCode,
      'merged',
      mergedResult,
      group.mental.partnerPrenom,
      group.mental.partnerCode,
      group.sexual.partnerCode,
    );

    // Delete old separate entries
    await deleteCompatibilityHistory(group.mental.id);
    await deleteCompatibilityHistory(group.sexual.id);
    migratedCount++;
  }

  return migratedCount;
}
