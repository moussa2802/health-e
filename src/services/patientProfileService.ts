/**
 * Patient profile service — extrait de profileService.ts
 *
 * Utilisation recommandée pour le nouveau code :
 *   import { getPatientProfile, updatePatientProfile } from './patientProfileService';
 *
 * Les exports de profileService.ts sont maintenus pour la compatibilité.
 */
export type { PatientProfile } from "./profileService";

export {
  createDefaultPatientProfile,
  getPatientProfile,
  getOrCreatePatientProfile,
  subscribeToPatientProfile,
  updatePatientProfile,
  validatePatientProfile,
} from "./profileService";
