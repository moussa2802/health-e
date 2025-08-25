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
      console.warn("⚠️ Firestore non disponible, autorisation de l'inscription par précaution");
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
    return {
      exists: false,
      canRegister: true,
      reason: "Email disponible pour l'inscription"
    };
    
  } catch (error: any) {
    console.warn("⚠️ Erreur lors de la vérification Firestore:", error);
    
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
    console.log("🔍 Vérification de l'email pour l'inscription:", email);
    
    const accountInfo = await checkExistingAccount(email);
    
    if (accountInfo.canRegister) {
      console.log("✅ Inscription autorisée:", accountInfo.reason);
      return true;
    } else {
      console.log("❌ Inscription bloquée:", accountInfo.reason);
      return false;
    }
    
  } catch (error) {
    console.error("❌ Erreur lors de la vérification:", error);
    // En cas d'erreur, on autorise l'inscription par précaution
    return true;
  }
}
