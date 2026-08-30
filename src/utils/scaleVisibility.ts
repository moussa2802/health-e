import type { OnboardingProfile, SexualHealthFilter } from '../types/onboarding';

export interface GreyedInfo {
  reason: string;
  intakeField: 'situation_relationnelle' | 'evenement_traumatisant' | 'deuil' | 'experienceProfile';
  unlockPrompt: string;
  options: Array<{ value: string; label: string }>;
}

const COUPLE_SCALE_IDS = ['pair', 'griss_base', 'nsss'];
const TRAUMA_SCALE_IDS = ['pcl5', 'tsi_base'];
const HAS_PARTNER = new Set(['en_couple', 'marie', 'polygamie', 'complique']);

export function getGenderHiddenIds(profile: OnboardingProfile): string[] {
  if (profile.genre === 'homme') return ['fsfi'];
  if (profile.genre === 'femme') return ['iief'];
  return [];
}

export function getGreyedScales(
  profile: OnboardingProfile,
  sexualFilter: SexualHealthFilter | null,
): Record<string, GreyedInfo> {
  const greyed: Record<string, GreyedInfo> = {};

  if (!HAS_PARTNER.has(profile.situation_relationnelle)) {
    for (const id of COUPLE_SCALE_IDS) {
      greyed[id] = {
        reason: 'Ce test concerne les personnes en couple',
        intakeField: 'situation_relationnelle',
        unlockPrompt: 'Ta situation a changé ?',
        options: [
          { value: 'en_couple', label: 'En couple' },
          { value: 'marie', label: 'Marié(e)' },
          { value: 'polygamie', label: 'En situation de polygamie' },
          { value: 'complique', label: "C'est compliqué" },
        ],
      };
    }
  }

  if (profile.evenement_traumatisant === 'non') {
    for (const id of TRAUMA_SCALE_IDS) {
      if (!greyed[id]) {
        greyed[id] = {
          reason: "Tu as indiqué ne pas avoir vécu d'événement traumatisant",
          intakeField: 'evenement_traumatisant',
          unlockPrompt: 'Ta situation a changé ?',
          options: [
            { value: 'oui', label: "Oui, j'ai vécu un événement difficile" },
            { value: 'np', label: 'Je préfère ne pas répondre' },
          ],
        };
      }
    }
  }

  if (profile.deuil === 'non') {
    greyed['pg13'] = {
      reason: "Tu as indiqué ne pas avoir vécu de deuil",
      intakeField: 'deuil',
      unlockPrompt: 'Ta situation a changé ?',
      options: [
        { value: 'recent', label: "Oui, et c'est encore récent" },
        { value: 'ancien', label: "Oui, mais c'était il y a longtemps" },
      ],
    };
  }

  if (sexualFilter) {
    const exp = sexualFilter.experienceProfile;
    if (exp === 'no_experience' || exp === 'prefer_not_answer') {
      for (const id of ['fsfi', 'iief', 'nsss', 'griss_base', 'pair']) {
        if (!greyed[id]) {
          greyed[id] = {
            reason: 'Ce test concerne les personnes ayant eu une activité sexuelle',
            intakeField: 'experienceProfile',
            unlockPrompt: 'Ton expérience a évolué ?',
            options: [
              { value: 'partial_experience', label: "J'ai eu des expériences sans pénétration" },
              { value: 'full_experience', label: "J'ai eu des rapports avec pénétration" },
            ],
          };
        }
      }
    } else if (exp === 'partial_experience') {
      if (!greyed['griss_base']) {
        greyed['griss_base'] = {
          reason: 'Ce test concerne les personnes ayant eu des rapports avec pénétration',
          intakeField: 'experienceProfile',
          unlockPrompt: 'Ton expérience a évolué ?',
          options: [
            { value: 'full_experience', label: "J'ai eu des rapports avec pénétration" },
          ],
        };
      }
    }
  }

  return greyed;
}

export function hasPartnerStatus(situation: string): boolean {
  return HAS_PARTNER.has(situation);
}
