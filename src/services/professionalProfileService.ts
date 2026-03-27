/**
 * Professional profile service — extrait de profileService.ts
 *
 * Utilisation recommandée pour le nouveau code :
 *   import { getProfessionalProfile } from './professionalProfileService';
 *
 * Les exports de profileService.ts sont maintenus pour la compatibilité.
 */
export type { ProfessionalProfile, AvailabilitySlot, ProfessionalSettings } from "./profileService";

export {
  createDefaultProfessionalProfile,
  getProfessionalProfile,
  getOrCreateProfessionalProfile,
  subscribeToProfessionalProfile,
  updateProfessionalProfile,
  validateProfessionalProfile,
  getProfessionalCategory,
  getProfessionalPrimarySpecialty,
  getProfessionalSpecialties,
  getProfessionalSpecialtyLabel,
  getProfessionalSpecialtyLabels,
  getProfessionalCategoryLabel,
  updateProfessionalEmailPreferences,
  getProfessionalEmailPreferences,
  generateTimeSlots,
  ensureAvailabilityFormat,
  migrateAvailabilityData,
  migrateAllProfessionalsAvailability,
} from "./profileService";
