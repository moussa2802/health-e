import type { OnboardingProfile } from '../types/onboarding';

const PROFILE_KEY = 'he_onboarding_profile';

export function getOnboardingProfile(): OnboardingProfile | null {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as OnboardingProfile;
  } catch {
    return null;
  }
}

export function saveOnboardingProfile(profile: OnboardingProfile): void {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

export function isOnboardingComplete(): boolean {
  return getOnboardingProfile() !== null;
}

export function clearOnboardingProfile(): void {
  localStorage.removeItem(PROFILE_KEY);
}

/**
 * Returns the list of scale IDs to HIDE based on the onboarding profile.
 * Returns [] if all scales should be shown.
 */
export function getHiddenScaleIds(profile: OnboardingProfile): string[] {
  const hidden: string[] = [];

  // PG-13 (deuil prolongé) uniquement si la personne a vécu un deuil
  if (profile.deuil === 'non') hidden.push('pg13');

  // PCL-5 (TSPT) uniquement si événement traumatisant déclaré
  if (profile.evenement_traumatisant === 'non') hidden.push('pcl5');

  // ACE (traumas enfance) — toujours affiché (collecte universelle)
  return hidden;
}

/**
 * Build the demographique object to pass to the Claude API.
 */
export function buildDemographique(profile: OnboardingProfile): Record<string, string> {
  const labels: Record<string, string> = {
    homme: 'Homme', femme: 'Femme', autre: 'Autre', non_specifie: '',
    celibataire: 'Célibataire', en_couple: 'En couple', marie: 'Marié(e)',
    polygamie: 'En situation de polygamie', separe_divorce: 'Séparé(e)/Divorcé(e)',
    veuf: 'Veuf(ve)', complique: "Situation complexe",
  };

  return {
    prenom: profile.prenom,
    age: profile.age,
    genre: labels[profile.genre] ?? profile.genre,
    situation_relationnelle: labels[profile.situation_relationnelle] ?? profile.situation_relationnelle,
    deuil: profile.deuil !== 'non' ? 'Oui' : '',
    evenement_traumatisant: profile.evenement_traumatisant === 'oui' ? 'Oui' : '',
  };
}
