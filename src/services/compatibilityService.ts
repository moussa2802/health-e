import { collection, doc, setDoc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../utils/firebase';
import type { CompatibilityRequest, CompatibilityResult, UserAssessmentSession } from '../types/assessment';
import { getUserProfileByCompatibilityId, getUserSessions } from './evaluationService';

const COL = 'compatibilityRequests';

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
        ? "Tu dois compléter toutes les évaluations de santé mentale avant de comparer un profil mental."
        : "Tu dois compléter toutes les évaluations de santé sexuelle avant de comparer un profil sexuel."
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

  // Récupérer les dernières sessions complètes des deux utilisateurs
  const [initiatorSessions, partnerSessions] = await Promise.all([
    getUserSessions(req.initiatorUserId),
    getUserSessions(partner.uid),
  ]);

  const lastInitiator = initiatorSessions.find(s => s.status === 'completed');
  const lastPartner = partnerSessions.find(s => s.status === 'completed');

  if (!lastInitiator || !lastPartner) {
    throw new Error('Les deux profils doivent avoir complété au moins une évaluation.');
  }

  const codeType = getCodeType(req.partnerCompatibilityId) ?? 'mental';
  const dimensionScores = computeDimensionScores(lastInitiator, lastPartner, codeType);
  const globalScore = Math.round(
    Object.values(dimensionScores).reduce((a, b) => a + b, 0) / Object.values(dimensionScores).length
  );

  const result: CompatibilityResult = {
    globalScore,
    dimensionScores,
    strengths: extractStrengths(dimensionScores),
    tensions: extractTensions(dimensionScores),
    recommendations: [],
    claudeNarrative: '',
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
  s1: UserAssessmentSession,
  s2: UserAssessmentSession,
  codeType: 'mental' | 'sexual'
): Record<string, number> {
  const dimensions = codeType === 'mental' ? MENTAL_DIMENSIONS : SEXUAL_DIMENSIONS;

  const scores: Record<string, number> = {};
  for (const [dim, scaleIds] of Object.entries(dimensions)) {
    const commonScales = scaleIds.filter(
      id => s1.scores[id] && s2.scores[id]
    );
    if (commonScales.length === 0) continue;

    let dimScore = 0;
    for (const scaleId of commonScales) {
      const r1 = s1.scores[scaleId].interpretation.severity;
      const r2 = s2.scores[scaleId].interpretation.severity;
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
