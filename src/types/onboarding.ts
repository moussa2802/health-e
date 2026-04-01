export type AgeRange = '18-25' | '26-35' | '36-45' | '46-55' | '55+';

// ── Profil santé sexuelle ─────────────────────────────────────────────────────
export type SexualExperienceProfile =
  | 'no_experience'       // Profil A — aucune relation sexuelle
  | 'partial_experience'  // Profil B — expériences sans pénétration
  | 'full_experience'     // Profil C — rapports avec pénétration
  | 'prefer_not_answer';  // Profil D — préfère ne pas répondre

export interface SexualHealthFilter {
  experienceProfile: SexualExperienceProfile;
  reasonForAbsence?: 'choice' | 'religion' | 'circumstance' | 'prefer_not';
  feelDesire?: 'regularly' | 'sometimes' | 'rarely' | 'unknown';
  completedAt: string;
}
export type Genre = 'homme' | 'femme';
export type SituationRelationnelle =
  | 'celibataire' | 'en_couple' | 'marie' | 'polygamie'
  | 'separe_divorce' | 'veuf' | 'complique';
export type DeuilVecu = 'recent' | 'ancien' | 'non';
export type EvenementDifficile = 'oui' | 'non' | 'np';
export type SituationMariage = 'actuellement' | 'plus_maintenant' | 'jamais';
export type SituationEnfants = 'oui' | 'non' | 'perte';

export interface OnboardingProfile {
  prenom: string;
  age: AgeRange;
  genre: Genre;
  situation_relationnelle: SituationRelationnelle;
  deuil: DeuilVecu;
  evenement_traumatisant: EvenementDifficile;
  situation_mariage: SituationMariage;
  enfants: SituationEnfants;
  completedAt: string;
}
