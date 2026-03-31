import { getProfileProgress, saveDrLoAnalysis, saveDrLoSynthesis } from '../services/evaluationService';
import { getOnboardingProfile, buildDemographique } from './onboardingProfile';
import { ALL_SCALES } from '../data/scales';
import { getScaleMeta } from './scaleMeta';

/**
 * Résout le profil démographique de l'utilisateur.
 * Source 1 (priorité) : onboardingProfile stocké dans Firestore (progress.onboardingProfile)
 * Source 2 (fallback) : localStorage via getOnboardingProfile()
 * Si aucune source n'est disponible, les champs restent vides — la fonction Netlify
 * les gère avec des valeurs par défaut.
 */
function resolveProfile(
  firestoreProfile: Record<string, string> | null
): { prenom: string; age: string; genre: string; situation_relationnelle: string } {
  // Source 1 : Firestore (format labels lisibles, ex: "Marié(e)", "Homme")
  if (firestoreProfile && firestoreProfile.prenom) {
    return {
      prenom: firestoreProfile.prenom || '',
      age: firestoreProfile.age || '',
      genre: firestoreProfile.genre || '',
      situation_relationnelle: firestoreProfile.situation_relationnelle || '',
    };
  }
  // Source 2 : localStorage — convertir les valeurs brutes en labels lisibles
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

/**
 * Triggered (non-blocking) after each scale completion.
 * Fetches the updated profile, calls the Dr. Lô Netlify function,
 * and saves the resulting analysis to Firestore.
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
      label: result.interpretation?.label || 'N/A',
      severity: result.interpretation?.severity || '',
      alertLevel: result.alertLevel ?? 0,
    };
  });

  const completedIds = new Set(Object.keys(progress.scaleResults));
  const items_restants = ALL_SCALES
    .filter(s => !completedIds.has(s.id))
    .map(s => s.shortName);

  const response = await fetch('/.netlify/functions/dr-lo-analysis', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prenom,
      age,
      genre,
      situation_relationnelle,
      items_completes,
      items_restants,
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

/**
 * Triggered (non-blocking) after each scale completion.
 * Generates a short 5-6 sentence cross-reading synthesis for the profile bubble.
 */
export async function triggerDrLoSynthesis(userId: string): Promise<void> {
  const progress = await getProfileProgress(userId);

  if (progress.completedCount === 0) return;

  const { prenom } = resolveProfile(progress.onboardingProfile);

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
