import {
  createContext,
  useState,
  useContext,
  ReactNode,
  useEffect,
  useRef,
  useMemo,
} from "react";
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendEmailVerification,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  User as FirebaseUser,
} from "firebase/auth";
import { FirebaseError } from "firebase/app";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { getFirestore } from "firebase/firestore";
import {
  createDefaultPatientProfile,
  createDefaultProfessionalProfile,
} from "../services/profileService";
import {
  getFirestoreInstance,
  ensureFirestoreReady,
  ensureRequiredCollectionsExist,
  retryFirestoreOperation,
  cleanAllFirebaseStorage,
  resetFirestoreConnection,
} from "../utils/firebase";
import { canUserRegister } from "../utils/accountCleanup";
import { app } from "../utils/firebase";

export type UserType = "patient" | "professional" | "admin" | null;

interface User {
  id: string;
  name: string;
  email?: string;
  type: UserType;
  profileImage?: string;
  serviceType?: "mental" | "sexual";
  specialty?: string;
  offersFreeConsultations?: boolean;
  isAvailableNow?: boolean;
  phoneNumber?: string;
}

interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  authReady: boolean; // Firebase prêt ?
  loadingUserData: boolean; // Firestore profil prêt ?
  isAuthenticated: boolean;
  login: (email: string, password: string, userType: UserType) => Promise<void>;
  logout: () => Promise<void>;
  register: (
    email: string,
    password: string,
    userType: "patient" | "professional",
    additionalData?: any
  ) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  refreshUser: () => Promise<void>;
  createUserWithPhone: (
    name: string,
    phoneNumber: string,
    additionalData?: any
  ) => Promise<void>;
  loginWithPhone: (userId: string, phoneNumber: string) => Promise<void>;
  verifyPhoneCode: (verificationId: string, code: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

type AuthProviderProps = {
  children: ReactNode;
};

// Initialize Firebase Auth
const auth = getAuth(app);


// Helper function to check if error is a Firestore internal error
const isFirestoreInternalError = (error: unknown): boolean => {
  const errorMessage = error instanceof Error ? error.message : "";
  return (
    errorMessage.includes("Target ID already exists") ||
    errorMessage.includes("internal error") ||
    errorMessage.includes("INTERNAL") ||
    (error as { code?: string })?.code === "internal"
  );
};

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authReady, setAuthReady] = useState(false);
  const [loadingUserData, setLoadingUserData] = useState(true);
  const resetAttemptedRef = useRef<number>(0);
  const registrationInProgressRef = useRef<boolean>(false);
  const RESET_COOLDOWN_MS = 5000; // 5 seconds cooldown between resets

  // Function to fetch user data with retry mechanism
  const fetchUserDataWithRetry = async (
    firebaseUser: FirebaseUser,
    isRetry: boolean = false
  ): Promise<void> => {
    try {
      await ensureFirestoreReady();
      const db = getFirestoreInstance();

      if (db) {
        const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));

        if (userDoc.exists()) {
          const userData = userDoc.data();
          // Ne récupérer serviceType et specialty que pour les professionnels
          const userType = userData.type || null;
          const userEmail = userData.email || firebaseUser.email || "";

    
          setCurrentUser({
            id: firebaseUser.uid,
            name: userData.name || "",
            email: userEmail,
            type: userType,
            profileImage: userData.profileImage,
            // Seuls les professionnels ont besoin de serviceType et specialty
            ...(userType === "professional" && {
              serviceType: userData.serviceType,
              specialty: userData.specialty,
            }),
          });
        } else {
          setCurrentUser(null);
        }
      }
    } catch (firestoreError) {
      // Check if this is a Firestore internal error and we haven't already retried
      if (!isRetry && isFirestoreInternalError(firestoreError)) {
        const now = Date.now();
        const timeSinceLastReset = now - resetAttemptedRef.current;

        // Only attempt reset if enough time has passed since last reset
        if (timeSinceLastReset > RESET_COOLDOWN_MS) {
          resetAttemptedRef.current = now;

          try {
            await resetFirestoreConnection();

            // Retry the operation once after reset
            await fetchUserDataWithRetry(firebaseUser, true);
            return;
          } catch (resetError) {
            // Handle reset error silently
          }
        }
      }

      // Fallback to basic user info from Firebase Auth
      const fallbackUser = {
        id: firebaseUser.uid,
        name: firebaseUser.displayName || "",
        email: firebaseUser.email || "",
        type: null,
      };


      setCurrentUser(fallbackUser);
    }
  };

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      async (firebaseUser: FirebaseUser | null) => {
        setAuthReady(true);

        if (firebaseUser) {
          setLoadingUserData(true);
          try {
            // User is signed in, get their data from Firestore with retry mechanism
            await fetchUserDataWithRetry(firebaseUser);
          } catch (error) {
            setCurrentUser(null);
          } finally {
            setLoadingUserData(false);
          }
        } else {
          // User is signed out
          setCurrentUser(null);
          setLoadingUserData(false);
        }
        setLoading(false);
      }
    );

    // ⚠️ Supprimé le bloc localStorage pour éviter les conflits avec la garde
    // La garde doit attendre que Firebase ET Firestore soient prêts

    return () => unsubscribe();
  }, []);

  // ✅ SYNC: Listen for real-time name updates from profile changes
  useEffect(() => {
    const handleNameUpdate = (event: CustomEvent) => {
      const { userId, newName } = event.detail;

      // Only update if this is the current user
      if (currentUser && currentUser.id === userId) {
        setCurrentUser((prev) => (prev ? { ...prev, name: newName } : null));

        // Also update localStorage
        const savedUser = localStorage.getItem("health-e-user");
        if (savedUser) {
          const userData = JSON.parse(savedUser);
          userData.name = newName;
          localStorage.setItem("health-e-user", JSON.stringify(userData));
        }

      }
    };

    // Add event listener for real-time name updates
    window.addEventListener(
      "user-name-updated",
      handleNameUpdate as EventListener
    );

    return () => {
      window.removeEventListener(
        "user-name-updated",
        handleNameUpdate as EventListener
      );
    };
  }, [currentUser]);

  const login = async (
    email: string,
    password: string,
    userType: UserType
  ): Promise<void> => {
    try {
      // First try Firebase Authentication
      try {
        const userCredential = await signInWithEmailAndPassword(
          auth,
          email,
          password
        );
        const firebaseUser = userCredential.user;

        // Check if email is verified (skip for professionals)
        if (
          !firebaseUser.emailVerified &&
          userType !== "professional"
        ) {
          console.warn("E-mail non vérifié, bloquant la connexion.");
          await signOut(auth);
          throw new Error(
            "Veuillez confirmer votre e-mail avant de vous connecter. Vérifiez votre boîte de réception."
          );
        }

        // Verify user type matches
        await ensureFirestoreReady();
        const db = getFirestoreInstance();

        if (db) {
          const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));

          if (!userDoc.exists()) {
            console.warn(
              "🔥 Utilisateur Auth existe, mais Firestore est manquant."
            );
            await signOut(auth);
            throw new Error(
              "Votre compte n'est pas encore activé. Veuillez cliquer sur le lien dans votre e-mail pour finaliser l'inscription."
            );
          }

          const userData = userDoc.data();

          if (userData.type !== userType) {
            await signOut(auth);
            throw new Error(
              `Ce compte est enregistré comme ${userData.type}, pas comme ${userType}`
            );
          }

          setCurrentUser({
            id: firebaseUser.uid,
            name: userData.name || "",
            email: userData.email || firebaseUser.email || "",
            type: userData.type,
            profileImage: userData.profileImage,
            serviceType: userData.serviceType,
            specialty: userData.specialty,
          });

          // Save to localStorage as fallback
          localStorage.setItem(
            "health-e-user",
            JSON.stringify({
              id: firebaseUser.uid,
              name: userData.name || "",
              email: userData.email || firebaseUser.email || "",
              type: userData.type,
              profileImage: userData.profileImage,
              serviceType: userData.serviceType,
              specialty: userData.specialty,
            })
          );

          return;
        }
      } catch (authError) {
        if (
          authError &&
          typeof authError === "object" &&
          "code" in (authError as any)
        ) {
          const errorCode = (authError as any).code;
          switch (errorCode) {
            case "auth/user-not-found":
              throw new Error(
                "Aucun compte trouvé avec cet email. Vérifiez votre adresse email ou créez un compte."
              );
            case "auth/wrong-password":
              throw new Error(
                "Mot de passe incorrect. Vérifiez votre mot de passe."
              );
            case "auth/user-disabled":
              throw new Error(
                "Ce compte a été désactivé. Contactez le support."
              );
            case "auth/too-many-requests":
              throw new Error(
                "Trop de tentatives de connexion. Réessayez plus tard."
              );
            case "auth/invalid-email":
              throw new Error(
                "Format d'email invalide. Vérifiez votre adresse email."
              );
            case "auth/invalid-credential":
              throw new Error(
                "Email ou mot de passe incorrect. Vérifiez vos identifiants ou créez un compte si vous n'en avez pas."
              );
            default:
              throw new Error("Erreur de connexion. Veuillez réessayer.");
          }
        } else {
          throw authError;
        }
      }
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    }
  };

  // Login with phone number
  const loginWithPhone = async (
    userId: string,
    phoneNumber: string
  ): Promise<void> => {
    try {
      await ensureFirestoreReady();
      const db = getFirestoreInstance();

      if (!db) throw new Error("Firestore non disponible");

      try {
        const patientDoc = await getDoc(doc(db, "patients", userId));

        if (patientDoc.exists()) {
          const patientData = patientDoc.data();
          const userDoc = await getDoc(doc(db, "users", userId));

          if (!userDoc.exists()) {
            await setDoc(doc(db, "users", userId), {
              id: userId,
              name: patientData.name,
              phoneNumber: phoneNumber,
              type: "patient",
              isActive: true,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
          }

          const user = {
            id: userId,
            name: patientData.name || "",
            email: patientData.email || "",
            type: "patient" as const,
            profileImage: patientData.profileImage,
            phoneNumber: phoneNumber,
          };
          setCurrentUser(user);
          localStorage.setItem("health-e-user", JSON.stringify(user));
          return;
        }
      } catch (firestoreError) {
        if (
          firestoreError instanceof Error &&
          (firestoreError.message.includes("not found") ||
            firestoreError.message.includes("does not exist"))
        ) {
          try {
            await createDefaultPatientProfile(userId, "Utilisateur", "", phoneNumber);
            setCurrentUser({ id: userId, name: "Utilisateur", type: "patient", phoneNumber });
            return;
          } catch (createError) {
            console.error("Erreur création profil:", createError);
            throw new Error("Erreur lors de la création de votre profil. Veuillez réessayer.");
          }
        }
        throw firestoreError;
      }

      throw new Error("Ce numéro n'est pas lié à un compte. Veuillez vous inscrire.");
    } catch (error) {
      console.error("Login with phone error:", error);
      throw error;
    }
  };

  const register = async (
    email: string,
    password: string,
    userType: "patient" | "professional",
    additionalData?: any
  ): Promise<void> => {

    try {
      // Prevent multiple simultaneous registrations
      if (registrationInProgressRef.current) {
        console.log("❌ [REGISTER] Inscription déjà en cours");
        throw new Error(
          "Une inscription est déjà en cours. Veuillez patienter."
        );
      }

      registrationInProgressRef.current = true;

      // Vérifier si l'email existe déjà dans Firestore
      console.log(
        "🔍 [REGISTER] Vérification de la possibilité d'inscription..."
      );
      const canRegister = await canUserRegister(email);
      console.log("🔍 [REGISTER] Résultat de la vérification:", canRegister);

      if (!canRegister) {
        console.log("❌ [REGISTER] Inscription bloquée");
        throw new Error(
          "Cette adresse email est déjà utilisée par un compte actif. Si vous avez oublié votre mot de passe, utilisez la fonction 'Mot de passe oublié'."
        );
      }

      console.log(
        "✅ [REGISTER] Inscription autorisée, création du compte Firebase Auth..."
      );

      let user;

      try {
        // Essayer de créer un nouveau compte Firebase Auth
        const userCredential = await createUserWithEmailAndPassword(
          auth,
          email,
          password
        );
        user = userCredential.user;
        console.log("✅ [REGISTER] Nouveau compte Firebase Auth créé");
      } catch (firebaseError) {
        if (
          firebaseError instanceof FirebaseError &&
          firebaseError.code === "auth/email-already-in-use"
        ) {
          console.log(
            "⚠️ [REGISTER] Email existe déjà dans Firebase Auth, tentative de connexion..."
          );

          // L'email existe dans Firebase Auth mais pas dans Firestore
          // On va essayer de se connecter pour récupérer l'utilisateur existant
          try {
            const signInResult = await signInWithEmailAndPassword(
              auth,
              email,
              password
            );
            user = signInResult.user;
            console.log("✅ [REGISTER] Connexion réussie avec l'utilisateur existant");
          } catch (signInError) {
            console.log(
              "❌ [REGISTER] Échec de la connexion avec l'utilisateur existant"
            );
            throw new Error(
              "Cet email est déjà utilisé. Si c'est votre compte, connectez-vous. Si vous avez oublié votre mot de passe, utilisez 'Mot de passe oublié'."
            );
          }
        } else {
          throw firebaseError;
        }
      }

      // Envoi de l'email de vérification
      console.log("📧 [REGISTER] Envoi de l'email de vérification...");
      await sendEmailVerification(user);
      console.log("✅ [REGISTER] Email de vérification envoyé");

      // Préparation des données utilisateur
      const userData = {
        uid: user.uid,
        email: user.email,
        userType: userType,
        createdAt: serverTimestamp(),
        emailVerified: false,
        ...additionalData,
      };

      // Données utilisateur préparées (log supprimé — contient email/uid)

      // Sauvegarde dans Firestore
      console.log("💾 [REGISTER] Sauvegarde dans Firestore...");
      const db = getFirestore();
      await setDoc(doc(db, "users", user.uid), userData);
      console.log("✅ [REGISTER] Utilisateur sauvegardé dans Firestore");

      // Sauvegarde dans la collection spécifique
      const collectionName =
        userType === "patient" ? "patients" : "professionals";
      console.log(
        "💾 [REGISTER] Sauvegarde dans la collection:",
        collectionName
      );
      await setDoc(doc(db, collectionName, user.uid), userData);
      console.log("✅ [REGISTER] Utilisateur sauvegardé dans", collectionName);

      // Stockage temporaire pour la suite du processus
      localStorage.setItem("pending-user-id", user.uid);
      localStorage.setItem("pending-user-email", email);
      localStorage.setItem("pending-user-name", additionalData?.name || "");
      localStorage.setItem("pending-user-type", userType);
      if (additionalData?.serviceType) {
        localStorage.setItem(
          "pending-service-type",
          additionalData.serviceType
        );
      }
      // Stocker la spécialité choisie pour les professionnels
      // ✅ Vérifier que primarySpecialty n'est pas vide avant de le stocker
      if (
        userType === "professional" &&
        additionalData?.primarySpecialty &&
        additionalData.primarySpecialty.trim() !== ""
      ) {
        localStorage.setItem(
          "pending-primary-specialty",
          additionalData.primarySpecialty
        );
        console.log(
          "✅ [REGISTER] Spécialité stockée:",
          additionalData.primarySpecialty
        );
      } else if (userType === "professional") {
        console.warn(
          "⚠️ [REGISTER] Aucune spécialité fournie ou spécialité vide pour professionnel"
        );
      }
      if (userType === "professional" && additionalData?.category) {
        localStorage.setItem("pending-category", additionalData.category);
      }

      console.log("🎉 [REGISTER] Inscription terminée avec succès!");
    } catch (error) {
      console.error("🚨 [REGISTER] Erreur lors de l'inscription:", error);

      if (error instanceof FirebaseError) {
        console.log("🔍 [REGISTER] Code d'erreur Firebase:", error.code);

        switch (error.code) {
          case "auth/email-already-in-use":
            console.log("❌ [REGISTER] Email déjà utilisé dans Firebase Auth");
            throw new Error(
              'Un compte avec cet email existe déjà. Connectez-vous ou utilisez "Mot de passe oublié" si votre compte n\'est pas finalisé.'
            );

          case "auth/weak-password":
            console.log("❌ [REGISTER] Mot de passe trop faible");
            throw new Error(
              "Le mot de passe doit contenir au moins 6 caractères."
            );

          case "auth/invalid-email":
            console.log("❌ [REGISTER] Format d'email invalide");
            throw new Error("Format d'email invalide.");

          default:
            console.log("❌ [REGISTER] Erreur Firebase non gérée:", error.code);
            throw new Error(`Erreur lors de l'inscription: ${error.message}`);
        }
      }

      console.log("❌ [REGISTER] Erreur non-Firebase:", error);
      throw error;
    } finally {
      registrationInProgressRef.current = false;
    }
  };

  // Create user with phone number
  const createUserWithPhone = async (
    name: string,
    phoneNumber: string,
    additionalData?: any
  ): Promise<void> => {
    try {
      if (registrationInProgressRef.current) {
        throw new Error("Inscription déjà en cours. Veuillez patienter.");
      }

      registrationInProgressRef.current = true;

      const firebaseUser = auth.currentUser;
      const testPhoneNumbers = ["+1 450-516-8884", "+14505168884", "+1 450 516 8884"];
      const isTestNumber = testPhoneNumbers.includes(phoneNumber);

      if (!firebaseUser && !isTestNumber) {
        throw new Error("Utilisateur non authentifié");
      }

      const userId = firebaseUser ? firebaseUser.uid : `test-user-${Date.now()}`;

      await ensureFirestoreReady();
      await ensureRequiredCollectionsExist();

      const db = getFirestoreInstance();
      if (!db) throw new Error("Firestore non disponible");

      const userRef = doc(db, "users", userId);
      await retryFirestoreOperation(async () => {
        await setDoc(userRef, {
          id: userId,
          name,
          phoneNumber,
          type: "patient",
          isActive: true,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          ...additionalData,
        });
      });

      await createDefaultPatientProfile(userId, name, "", phoneNumber, additionalData);

      try {
        const db2 = getFirestore();
        await setDoc(
          doc(db2, "phone_index", phoneNumber),
          { exists: true, type: "patient", userId, updatedAt: serverTimestamp() },
          { merge: true }
        );
      } catch {
        // non-blocking
      }
    } catch (error) {
      console.error("createUserWithPhone error:", error);
      throw error;
    } finally {
      registrationInProgressRef.current = false;
    }
  };

  // Réinitialisation de mot de passe
  const resetPassword = async (email: string): Promise<void> => {
    try {
      const auth = getAuth();
      await sendPasswordResetEmail(auth, email);
    } catch (error: any) {
      if (error.code === "auth/user-not-found") {
        throw new Error(
          "Aucun compte trouvé avec cet email. Vérifiez votre adresse email."
        );
      } else if (error.code === "auth/invalid-email") {
        throw new Error(
          "Format d'email invalide. Vérifiez votre adresse email."
        );
      } else if (error.code === "auth/too-many-requests") {
        throw new Error(
          "Trop de demandes de réinitialisation. Réessayez plus tard."
        );
      } else {
        throw new Error(
          "Erreur lors de l'envoi de l'email de réinitialisation. Réessayez plus tard."
        );
      }
    }
  };

  const refreshUser = async (): Promise<void> => {
    const firebaseUser = auth.currentUser;

    if (firebaseUser) {
      try {
        await fetchUserDataWithRetry(firebaseUser);
      } catch (error) {
        // Error refreshing user data
      }
    }
  };

  const logout = () => {
    // Clean up all Firestore listeners BEFORE signing out
    try {
      // Import cleanup functions dynamically to avoid circular dependencies
      // Note: Using dynamic imports instead of require() to satisfy linter
      import("../hooks/useProfessionals")
        .then(({ cleanupAllProfessionalsListeners }) => {
          cleanupAllProfessionalsListeners();
        })
        .catch(() => {
          // Could not cleanup professionals listeners
        });

      import("../hooks/useBookings")
        .then(({ cleanupAllBookingListeners }) => {
          cleanupAllBookingListeners();
        })
        .catch(() => {
          // Could not cleanup booking listeners
        });

      import("../services/messageService")
        .then(({ cleanupAllMessageListeners, clearMessageCaches }) => {
          cleanupAllMessageListeners();
          clearMessageCaches();
        })
        .catch(() => {
          // Could not cleanup message listeners
        });

      import("../services/notificationService")
        .then(({ cleanupAllNotificationListeners }) => {
          cleanupAllNotificationListeners();
        })
        .catch(() => {
          // Could not cleanup notification listeners
        });
    } catch (error) {
      // Error cleaning up listeners during logout
    }

    // Clear current user state BEFORE Firebase signOut
    setCurrentUser(null);
    localStorage.removeItem("health-e-user");

    // Sign out from Firebase Auth
    signOut(auth).catch((error: unknown) => {
      // Error signing out from Firebase
    });

    // Clean browser storage only on logout, not on initialization
    cleanAllFirebaseStorage();
  };

  // Mémoriser le value pour éviter les re-renders constants
  const contextValue = useMemo(
    () => ({
      currentUser,
      loading,
      authReady,
      loadingUserData,
      isAuthenticated: !!currentUser?.id,
      login,
      register,
      resetPassword,
      logout,
      refreshUser,
      createUserWithPhone,
      loginWithPhone,
      verifyPhoneCode: () => {
        // This function is not implemented in the original file,
        // but it's part of the AuthContextType.
        // For now, we'll return a placeholder.
        console.warn("verifyPhoneCode not implemented yet.");
      },
    }),
    [
      currentUser,
      loading,
      authReady,
      loadingUserData,
      login,
      register,
      resetPassword,
      logout,
      refreshUser,
      createUserWithPhone,
      loginWithPhone,
    ]
  );

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
