import { getAuth, deleteUser, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestoreInstance, ensureFirestoreReady } from "./firebase";
import { collection, doc, getDoc } from "firebase/firestore";

/**
 * 🔧 Utilitaire de nettoyage des comptes orphelins
 * 
 * Problème : Un utilisateur s'inscrit mais ne confirme pas son email/numéro.
 * Firebase Auth crée le compte mais Firestore ne l'a jamais créé.
 * L'utilisateur ne peut plus s'inscrire avec le même identifiant.
 * 
 * Solution : Détecter et nettoyer ces comptes orphelins
 */

export interface OrphanedAccountInfo {
  exists: boolean;
  isOrphaned: boolean;
  needsCleanup: boolean;
  firebaseUid?: string;
}

/**
 * Vérifie si un compte existe dans Firebase Auth mais pas dans Firestore
 */
export async function checkOrphanedAccount(
  email: string,
  password: string
): Promise<OrphanedAccountInfo> {
  try {
    const auth = getAuth();
    
    // Essayer de se connecter pour vérifier si le compte existe
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const firebaseUser = userCredential.user;
    
    // Se déconnecter immédiatement
    await auth.signOut();
    
    // Vérifier si le compte existe dans Firestore
    await ensureFirestoreReady();
    const db = getFirestoreInstance();
    
    if (!db) {
      return {
        exists: true,
        isOrphaned: false,
        needsCleanup: false,
        firebaseUid: firebaseUser.uid
      };
    }
    
    // Vérifier dans la collection users
    const userDocRef = doc(db, "users", firebaseUser.uid);
    const userDoc = await getDoc(userDocRef);
    
    if (userDoc.exists()) {
      // Le compte existe dans Firestore, pas orphelin
      return {
        exists: true,
        isOrphaned: false,
        needsCleanup: false,
        firebaseUid: firebaseUser.uid
      };
    } else {
      // Le compte existe dans Firebase Auth mais pas dans Firestore = ORPHELIN
      return {
        exists: true,
        isOrphaned: true,
        needsCleanup: true,
        firebaseUid: firebaseUser.uid
      };
    }
    
  } catch (error: any) {
    // Si l'erreur est "user-not-found", le compte n'existe pas
    if (error.code === "auth/user-not-found") {
      return {
        exists: false,
        isOrphaned: false,
        needsCleanup: false
      };
    }
    
    // Si l'erreur est "wrong-password", le compte existe mais mauvais mot de passe
    if (error.code === "auth/wrong-password") {
      // On ne peut pas vérifier Firestore sans le bon mot de passe
      // On considère qu'il faut nettoyer par précaution
      return {
        exists: true,
        isOrphaned: true,
        needsCleanup: true
      };
    }
    
    // Autre erreur
    console.warn("Erreur lors de la vérification du compte orphelin:", error);
    return {
      exists: false,
      isOrphaned: false,
      needsCleanup: false
    };
  }
}

/**
 * Nettoie un compte orphelin en supprimant le compte Firebase Auth
 */
export async function cleanupOrphanedAccount(
  email: string,
  password: string
): Promise<boolean> {
  try {
    const auth = getAuth();
    
    // Se connecter pour pouvoir supprimer le compte
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const firebaseUser = userCredential.user;
    
    // Supprimer le compte Firebase Auth
    await deleteUser(firebaseUser);
    
    console.log("✅ Compte orphelin supprimé:", email);
    return true;
    
  } catch (error: any) {
    console.error("❌ Erreur lors du nettoyage du compte orphelin:", error);
    
    // Si on ne peut pas se connecter (mauvais mot de passe), on ne peut pas nettoyer
    if (error.code === "auth/wrong-password") {
      console.warn("⚠️ Impossible de nettoyer le compte orphelin - mauvais mot de passe");
      return false;
    }
    
    return false;
  }
}

/**
 * Fonction principale pour gérer les comptes orphelins
 * Retourne true si le compte peut être utilisé pour l'inscription
 */
export async function handleOrphanedAccount(
  email: string,
  password: string
): Promise<boolean> {
  try {
    console.log("🔍 Vérification du compte orphelin pour:", email);
    
    const accountInfo = await checkOrphanedAccount(email, password);
    
    if (!accountInfo.exists) {
      // Le compte n'existe pas, on peut s'inscrire
      console.log("✅ Compte disponible pour l'inscription");
      return true;
    }
    
    if (accountInfo.isOrphaned && accountInfo.needsCleanup) {
      console.log("🧹 Compte orphelin détecté, nettoyage en cours...");
      
      const cleanupSuccess = await cleanupOrphanedAccount(email, password);
      
      if (cleanupSuccess) {
        console.log("✅ Compte orphelin nettoyé, inscription possible");
        return true;
      } else {
        console.warn("⚠️ Échec du nettoyage, inscription bloquée");
        return false;
      }
    }
    
    if (!accountInfo.isOrphaned) {
      // Le compte existe et n'est pas orphelin
      console.log("❌ Compte déjà existant et valide");
      return false;
    }
    
    return false;
    
  } catch (error) {
    console.error("❌ Erreur lors de la gestion du compte orphelin:", error);
    return false;
  }
}
