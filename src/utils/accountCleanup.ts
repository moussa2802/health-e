import { getFirestoreInstance, ensureFirestoreReady } from "./firebase";
import { collection, query, where, getDocs } from "firebase/firestore";

/**
 * 🔧 Utilitaire de vérification des comptes existants
 * 
 * Problème : Un utilisateur s'inscrit mais ne confirme pas son email/numéro.
 * Firebase Auth crée le compte mais Firestore ne l'a jamais créé.
 * L'utilisateur ne peut plus s'inscrire avec le même identifiant.
 * 
 * Solution : Vérifier directement dans Firestore si l'utilisateur existe
 * Si pas de dossier Firestore = inscription autorisée
 */

export interface AccountInfo {
  exists: boolean;
  canRegister: boolean;
  reason?: string;
}

/**
 * Vérifie si un utilisateur existe déjà dans Firestore
 * Approche simple : si pas de dossier Firestore = inscription autorisée
 */
export async function checkExistingAccount(email: string): Promise<AccountInfo> {
  try {
    await ensureFirestoreReady();
    const db = getFirestoreInstance();
    
    if (!db) {
      return {
        exists: false,
        canRegister: true,
        reason: "Firestore non disponible"
      };
    }
    
    // Rechercher par email dans la collection users
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("email", "==", email));
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      // L'utilisateur existe déjà dans Firestore
      return {
        exists: true,
        canRegister: false,
        reason: "Compte déjà existant dans la base de données"
      };
    }
    
    // Aucun utilisateur trouvé avec cet email = inscription autorisée
    // Même si un compte Firebase Auth existe, on peut créer le document Firestore
    return {
      exists: false,
      canRegister: true,
      reason: "Email disponible pour l'inscription (aucun document Firestore trouvé)"
    };
    
  } catch (error: any) {
    // En cas d'erreur (permissions, réseau, etc.), on autorise l'inscription par précaution
    return {
      exists: false,
      canRegister: true,
      reason: "Erreur de vérification, inscription autorisée par précaution"
    };
  }
}

/**
 * Fonction principale pour vérifier si l'inscription est autorisée
 * Retourne true si l'utilisateur peut s'inscrire
 */
export async function canUserRegister(email: string): Promise<boolean> {
  try {
    const accountInfo = await checkExistingAccount(email);
    
    if (accountInfo.canRegister) {
      return true;
    } else {
      return false;
    }
    
  } catch (error) {
    // En cas d'erreur, on autorise l'inscription par précaution
    return true;
  }
}

// Fonction pour nettoyer un compte Firebase Auth orphelin
export async function cleanupOrphanedAccount(email: string): Promise<boolean> {
  try {
    // Cette fonction sera appelée si on veut nettoyer un compte orphelin
    // Pour l'instant, on retourne true pour permettre l'inscription
    // L'utilisateur devra utiliser "Mot de passe oublié" ou se connecter
    return true;
  } catch (error) {
    return false;
  }
}
