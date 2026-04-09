import {
  getProfileProgress,
  saveDrLoAnalysis,
  saveDrLoMentalAnalysis,
  saveDrLoSexualAnalysis,
  saveDrLoSynthesis,
} from '../services/evaluationService';
import { buildDemographique, getOnboardingProfile } from './onboardingProfile';
import { ALL_SCALES, MENTAL_HEALTH_SCALES, SEXUAL_HEALTH_SCALES, BONUS_SCALES } from '../data/scales';
import { getScaleMeta } from './scaleMeta';

/** IDs des scales par catégorie */
const MENTAL_IDS = new Set(MENTAL_HEALTH_SCALES.map(s => s.id));
const SEXUAL_IDS = new Set(SEXUAL_HEALTH_SCALES.map(s => s.id));
const BONUS_IDS = new Set(BONUS_SCALES.map(s => s.id));

/**
 * Résout le profil démographique de l'utilisateur.
 * Source 1 : Firestore (progress.onboardingProfile — labels lisibles)
 * Source 2 : localStorage via buildDemographique()
 */
function resolveProfile(
  firestoreProfile: Record<string, string> | null
): { prenom: string; age: string; genre: string; situation_relationnelle: string } {
  if (firestoreProfile && firestoreProfile.prenom) {
    return {
      prenom: firestoreProfile.prenom || '',
      age: firestoreProfile.age || '',
      genre: firestoreProfile.genre || '',
      situation_relationnelle: firestoreProfile.situation_relationnelle || '',
    };
  }
  const local = getOnboardingProfile();
  if (local) {
    const demo = buildDemographique(local);
    return {
      prenom: demo.prenom || '',
      age: demo.age || '',
      genre: demo.genre || '',
      situation_relationnelle: demo.situation_relationnelle || '',
    };
  }
  return { prenom: '', age: '', genre: '', situation_relationnelle: '' };
}

/** Construit la liste des bonus tests complétés pour enrichir le contexte Dr Lo */
function buildBonusCompletes(scaleResults: Record<string, { totalScore: number; interpretation?: { label?: string }; alertLevel?: number }>) {
  return Object.entries(scaleResults)
    .filter(([scaleId]) => BONUS_IDS.has(scaleId))
    .map(([scaleId, result]) => {
      const meta = getScaleMeta(scaleId);
      const scale = ALL_SCALES.find(s => s.id === scaleId);
      return {
        nom: meta.label,
        niveau: result.interpretation?.label || 'N/A',
        score: `${result.totalScore}/${scale?.scoreRange.max ?? '?'}`,
      };
    });
}

// ── Analyse Santé Mentale ─────────────────────────────────────────────────────

/**
 * Déclenche l'analyse Dr Lo SANTÉ MENTALE uniquement.
 * N'envoie que les items mentaux complétés — jamais les items sexuels.
 */
export async function triggerDrLoMentalHealth(userId: string): Promise<void> {
  const progress = await getProfileProgress(userId);
  if (progress.mentalCompletedCount === 0) return;

  const { prenom, age, genre, situation_relationnelle } = resolveProfile(
    progress.onboardingProfile
  );

  const items_completes = Object.entries(progress.scaleResults)
    .filter(([scaleId]) => MENTAL_IDS.has(scaleId))
    .map(([scaleId, result]) => {
      const scale = ALL_SCALES.find(s => s.id === scaleId);
      return {
        scaleId,
        scaleName: scale?.shortName || scaleId.toUpperCase(),
        totalScore: result.totalScore,
        scoreMax: scale?.scoreRange.max ?? null,
        label: result.interpretation?.label || 'N/A',
        severity: result.interpretation?.severity || '',
        alertLevel: result.alertLevel ?? 0,
      };
    });

  if (items_completes.length === 0) return;

  const completedMentalIds = new Set(items_completes.map(i => i.scaleId));
  const items_restants = MENTAL_HEALTH_SCALES
    .filter(s => !completedMentalIds.has(s.id))
    .map(s => s.shortName);

  const bonus_completes = buildBonusCompletes(progress.scaleResults);

  const response = await fetch('/.netlify/functions/dr-lo-analysis', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prenom,
      age,
      genre,
      situation_relationnelle,
      bloc: 'mental',
      items_completes,
      items_restants,
      nombre_items_faits: items_completes.length,
      nombre_items_total: MENTAL_HEALTH_SCALES.length,
      bonus_completes,
    }),
  });

  if (!response.ok) return;
  const data = await response.json();
  if (data.analysis) {
    await saveDrLoMentalAnalysis(userId, data.analysis);
  }
}

// ── Analyse Santé Sexuelle ────────────────────────────────────────────────────

/**
 * Déclenche l'analyse Dr Lo SANTÉ SEXUELLE uniquement.
 * N'envoie que les items sexuels complétés — jamais les items mentaux.
 */
export async function triggerDrLoSexualHealth(userId: string): Promise<void> {
  const progress = await getProfileProgress(userId);
  if (progress.sexualCompletedCount === 0) return;

  const { prenom, age, genre, situation_relationnelle } = resolveProfile(
    progress.onboardingProfile
  );

  const items_completes = Object.entries(progress.scaleResults)
    .filter(([scaleId]) => SEXUAL_IDS.has(scaleId))
    .map(([scaleId, result]) => {
      const scale = ALL_SCALES.find(s => s.id === scaleId);
      return {
        scaleId,
        scaleName: scale?.shortName || scaleId.toUpperCase(),
        totalScore: result.totalScore,
        scoreMax: scale?.scoreRange.max ?? null,
        label: result.interpretation?.label || 'N/A',
        severity: result.interpretation?.severity || '',
        alertLevel: result.alertLevel ?? 0,
      };
    });

  if (items_completes.length === 0) return;

  const completedSexualIds = new Set(items_completes.map(i => i.scaleId));
  const items_restants = SEXUAL_HEALTH_SCALES
    .filter(s => !completedSexualIds.has(s.id))
    .map(s => s.shortName);

  const bonus_completes = buildBonusCompletes(progress.scaleResults);

  const response = await fetch('/.netlify/functions/dr-lo-analysis', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prenom,
      age,
      genre,
      situation_relationnelle,
      bloc: 'sexual',
      experience_profile: (progress.sexualHealthFilter?.experienceProfile as string | undefined) ?? null,
      items_completes,
      items_restants,
      nombre_items_faits: items_completes.length,
      nombre_items_total: SEXUAL_HEALTH_SCALES.length,
      bonus_completes,
    }),
  });

  if (!response.ok) return;
  const data = await response.json();
  if (data.analysis) {
    await saveDrLoSexualAnalysis(userId, data.analysis);
  }
}

// ── Synthèse courte (bulle home page) ────────────────────────────────────────

/**
 * Génère la synthèse courte 5-6 phrases pour le panneau droit de la home page.
 * Peut combiner les deux catégories pour donner une vue d'ensemble rapide.
 */
export async function triggerDrLoSynthesis(userId: string): Promise<void> {
  const progress = await getProfileProgress(userId);
  if (progress.completedCount === 0) return;

  const { prenom, genre } = resolveProfile(progress.onboardingProfile);

  const items_completes = Object.entries(progress.scaleResults).map(([scaleId, result]) => {
    const scale = ALL_SCALES.find(s => s.id === scaleId);
    const meta = getScaleMeta(scaleId);
    return {
      scaleId,
      nom: meta.label,
      outil: scale?.shortName || scaleId.toUpperCase(),
      score: `${result.totalScore}/${scale?.scoreRange.max ?? '?'}`,
      niveau: result.interpretation?.label || 'N/A',
      severity: result.interpretation?.severity || '',
      alertLevel: result.alertLevel ?? 0,
    };
  });

  const response = await fetch('/.netlify/functions/dr-lo-synthesis', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prenom,
      genre,
      items_completes,
      nombre_items_faits: progress.completedCount,
      nombre_items_total: progress.totalCount,
    }),
  });

  if (!response.ok) return;
  const data = await response.json();
  if (data.synthesis) {
    await saveDrLoSynthesis(userId, data.synthesis);
  }
}

// ── Rétrocompatibilité (ancienne fonction globale) ────────────────────────────

/**
 * @deprecated Utiliser triggerDrLoMentalHealth + triggerDrLoSexualHealth à la place.
 * Conservé pour éviter les erreurs de compilation dans les pages non encore migrées.
 */
export async function triggerDrLoAnalysis(userId: string): Promise<void> {
  const progress = await getProfileProgress(userId);
  if (progress.completedCount === 0) return;

  const { prenom, age, genre, situation_relationnelle } = resolveProfile(
    progress.onboardingProfile
  );

  const items_completes = Object.entries(progress.scaleResults).map(([scaleId, result]) => {
    const scale = ALL_SCALES.find(s => s.id === scaleId);
    return {
      scaleId,
      scaleName: scale?.shortName || scaleId.toUpperCase(),
      totalScore: result.totalScore,
      scoreMax: scale?.scoreRange.max ?? null,
      label: result.interpretation?.label || 'N/A',
      severity: result.interpretation?.severity || '',
      alertLevel: result.alertLevel ?? 0,
    };
  });

  const response = await fetch('/.netlify/functions/dr-lo-analysis', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prenom, age, genre, situation_relationnelle, bloc: 'mental',
      items_completes, items_restants: [],
      nombre_items_faits: progress.completedCount,
      nombre_items_total: progress.totalCount,
    }),
  });

  if (!response.ok) return;
  const data = await response.json();
  if (data.analysis) {
    await saveDrLoAnalysis(userId, data.analysis);
  }
}
