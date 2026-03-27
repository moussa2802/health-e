/**
 * Registration check helpers — extrait de profileService.ts
 *
 * Utilisation recommandée pour le nouveau code :
 *   import { isEmailAlreadyRegistered } from './registrationChecks';
 *
 * Les exports de profileService.ts sont maintenus pour la compatibilité.
 */
export {
  isEmailAlreadyRegistered,
  isPhoneAlreadyRegistered,
  isNameAlreadyRegistered,
} from "./profileService";
