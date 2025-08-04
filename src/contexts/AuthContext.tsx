import React, {
  createContext,
  useState,
  useContext,
  ReactNode,
  useEffect,
  useRef,
} from "react";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendEmailVerification,
  User as FirebaseUser,
} from "firebase/auth";
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
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { app } from "../utils/firebase";
import { useNavigate } from "react-router-dom";

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

type AuthContextType = {
  currentUser: User | null;
  userType: UserType;
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: (email: string, password: string, userType: UserType) => Promise<void>;
  loginWithPhone: (userId: string, phoneNumber: string) => Promise<void>;
  register: (
    name: string,
    email: string,
    password: string,
    userType: UserType,
    serviceType?: "mental" | "sexual"
  ) => Promise<void>;
  createUserWithPhone: (name: string, phoneNumber: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

type AuthProviderProps = {
  children: ReactNode;
};

// Initialize Firebase Auth
const auth = getAuth(app);

// Demo accounts for development - these will be used as fallbacks if auth fails
const demoAccounts: Record<string, User> = {
  "patient@demo.com": {
    id: "FYostm61DLbrax729IYT6OBHSuA3",
    name: "Marie Dupont",
    email: "patient@demo.com",
    type: "patient",
  },
  "professional@demo.com": {
    id: "demo-professional-1",
    name: "Dr. Jean Martin",
    email: "professional@demo.com",
    type: "professional",
    serviceType: "mental",
    specialty: "Psychologue clinicien",
    offersFreeConsultations: true,
    isAvailableNow: true,
  },
  "admin@demo.com": {
    id: "FYostm61DLbrax729IYT6OBHSuA3",
    name: "Admin User",
    email: "admin@demo.com",
    type: "admin",
  },
};

const demoPasswords: Record<string, string> = {
  "patient@demo.com": "demo123",
  "professional@demo.com": "demo123",
  "admin@demo.com": "admin123",
};

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
  const [authInitialized, setAuthInitialized] = useState(false);
  const resetAttemptedRef = useRef<number>(0);
  const registrationInProgressRef = useRef<boolean>(false);
  const RESET_COOLDOWN_MS = 5000; // 5 seconds cooldown between resets
  const navigate = useNavigate();

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
          setCurrentUser({
            id: firebaseUser.uid,
            name: userData.name || "",
            email: userData.email || firebaseUser.email || "",
            type: userData.type || null,
            profileImage: userData.profileImage,
            serviceType: userData.serviceType,
            specialty: userData.specialty,
          });
        } else {
          // User exists in Auth but not in Firestore - check if it's a demo admin
          console.warn(
            "User exists in Auth but not in Firestore:",
            firebaseUser.uid
          );

          // Check if this is the demo admin account
          if (firebaseUser.email === "admin@demo.com") {
            console.log("🔧 Creating admin user document for demo account");

            // Create admin user document
            try {
              await retryFirestoreOperation(async () => {
                await setDoc(doc(db, "users", firebaseUser.uid), {
                  id: firebaseUser.uid,
                  name: "Admin User",
                  email: "admin@demo.com",
                  type: "admin",
                  isActive: true,
                  createdAt: serverTimestamp(),
                  updatedAt: serverTimestamp(),
                });
              });

              // Set current user as admin
              setCurrentUser({
                id: firebaseUser.uid,
                name: "Admin User",
                email: "admin@demo.com",
                type: "admin",
              });

              console.log("✅ Admin user document created successfully");
            } catch (error) {
              console.error("❌ Failed to create admin user document:", error);
              setCurrentUser(null);
            }
          } else {
            setCurrentUser(null);
          }
        }
      }
    } catch (firestoreError) {
      console.error("Error fetching user data from Firestore:", firestoreError);

      // Check if this is a Firestore internal error and we haven't already retried
      if (!isRetry && isFirestoreInternalError(firestoreError)) {
        const now = Date.now();
        const timeSinceLastReset = now - resetAttemptedRef.current;

        // Only attempt reset if enough time has passed since last reset
        if (timeSinceLastReset > RESET_COOLDOWN_MS) {
          console.log(
            "🔄 Attempting to reset Firestore connection due to internal error..."
          );
          resetAttemptedRef.current = now;

          try {
            await resetFirestoreConnection();

            // Retry the operation once after reset
            console.log("🔄 Retrying user data fetch after Firestore reset...");
            await fetchUserDataWithRetry(firebaseUser, true);
            return;
          } catch (resetError) {
            console.error(
              "❌ Failed to reset Firestore connection:",
              resetError
            );
          }
        } else {
          console.log("⏳ Skipping Firestore reset due to cooldown period");
        }
      }

      // Fallback to basic user info from Firebase Auth
      setCurrentUser({
        id: firebaseUser.uid,
        name: firebaseUser.displayName || "",
        email: firebaseUser.email || "",
        type: null,
      });
    }
  };

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      async (firebaseUser: FirebaseUser | null) => {
        setAuthInitialized(true);

        if (firebaseUser) {
          try {
            // User is signed in, get their data from Firestore with retry mechanism
            await fetchUserDataWithRetry(firebaseUser);
          } catch (error) {
            console.error("Error in auth state change handler:", error);
            setCurrentUser(null);
          }
        } else {
          // User is signed out
          setCurrentUser(null);
        }
        setLoading(false);
      }
    );

    // Check for saved user in localStorage (fallback for demo mode)
    const savedUser = localStorage.getItem("health-e-user");
    if (savedUser && !currentUser) {
      setCurrentUser(JSON.parse(savedUser));
    }

    return () => unsubscribe();
  }, []);

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

        // Check if email is verified (skip for admin account and professionals)
        if (
          !firebaseUser.emailVerified &&
          firebaseUser.email !== "admin@demo.com" &&
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
        console.warn(
          "Firebase Auth login failed, falling back to demo accounts:",
          authError
        );

        // Fall back to demo accounts if in development mode
        const demoUser = demoAccounts[email];
        if (
          demoUser &&
          demoPasswords[email] === password &&
          demoUser.type === userType
        ) {
          setCurrentUser(demoUser);
          localStorage.setItem("health-e-user", JSON.stringify(demoUser));

          // Create Firestore documents for demo users if they don't exist
          try {
            await ensureFirestoreReady();
            await ensureRequiredCollectionsExist();

            const db = getFirestoreInstance();

            if (db) {
              // Check if user document exists
              const userRef = doc(db, "users", demoUser.id);
              const userDoc = await getDoc(userRef);

              if (!userDoc.exists()) {
                // Create user document with retry mechanism
                await retryFirestoreOperation(async () => {
                  await setDoc(userRef, {
                    id: demoUser.id,
                    name: demoUser.name,
                    email: demoUser.email,
                    type: demoUser.type,
                    isActive: true,
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                  });
                });

                console.log(
                  "✅ Created user document for demo user:",
                  demoUser.id
                );

                // Create profile document based on user type (skip for admin)
                if (demoUser.type === "patient") {
                  await createDefaultPatientProfile(
                    demoUser.id,
                    demoUser.name,
                    demoUser.email
                  );
                } else if (demoUser.type === "professional") {
                  await createDefaultProfessionalProfile(
                    demoUser.id,
                    demoUser.name,
                    demoUser.email || "",
                    demoUser.serviceType as "mental" | "sexual"
                  );
                } else if (demoUser.type === "admin") {
                  console.log("✅ Admin user - no additional profile needed");
                }
              }
            }
          } catch (error) {
            console.warn(
              "⚠️ Could not create Firestore documents for demo user:",
              error
            );
            // Continue anyway, as this is just for demo purposes
          }

          return;
        } else {
          throw new Error("Identifiants incorrects");
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
      console.log("📱 Connexion avec le numéro:", phoneNumber);

      // Vérifier si l'utilisateur existe dans Firestore
      await ensureFirestoreReady();
      const db = getFirestoreInstance();

      if (!db) {
        throw new Error("Firestore non disponible");
      }

      try {
        // Vérifier si l'utilisateur existe dans la collection patients
        const patientDoc = await getDoc(doc(db, "patients", userId));

        if (patientDoc.exists()) {
          console.log("✅ Utilisateur trouvé dans la collection patients");
          const patientData = patientDoc.data();

          // Get user document to ensure it exists
          const userDoc = await getDoc(doc(db, "users", userId));

          // If user document doesn't exist, create it
          if (!userDoc.exists()) {
            console.log(
              "⚠️ Document utilisateur manquant, création automatique"
            );
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

          setCurrentUser({
            id: userId,
            name: patientData.name || "",
            email: patientData.email || "",
            type: "patient",
            profileImage: patientData.profileImage,
            phoneNumber: phoneNumber,
          });

          // Save to localStorage as fallback
          localStorage.setItem(
            "health-e-user",
            JSON.stringify({
              id: userId,
              name: patientData.name || "",
              email: patientData.email || "",
              type: "patient",
              profileImage: patientData.profileImage,
              phoneNumber: phoneNumber,
            })
          );

          return;
        }
      } catch (firestoreError) {
        console.error(
          "❌ Erreur lors de la vérification du profil patient:",
          firestoreError
        );

        // Si l'erreur est que le document n'existe pas, on crée un profil par défaut
        if (
          firestoreError instanceof Error &&
          (firestoreError.message.includes("not found") ||
            firestoreError.message.includes("does not exist"))
        ) {
          console.log("🔄 Création automatique d'un profil patient par défaut");

          // Créer un profil patient par défaut
          try {
            await createDefaultPatientProfile(
              userId,
              "Utilisateur", // Nom par défaut
              "", // Email vide
              phoneNumber // Numéro de téléphone
            );

            console.log("✅ Profil patient créé avec succès");

            // Définir l'utilisateur courant
            setCurrentUser({
              id: userId,
              name: "Utilisateur",
              type: "patient",
              phoneNumber: phoneNumber,
            });

            return;
          } catch (createError) {
            console.error(
              "❌ Erreur lors de la création du profil par défaut:",
              createError
            );
            throw new Error(
              "Erreur lors de la création de votre profil. Veuillez réessayer."
            );
          }
        }

        throw firestoreError;
      }

      // Si on arrive ici, c'est que l'utilisateur n'existe pas dans la collection patients
      console.warn(
        "⚠️ Utilisateur non trouvé dans la collection patients:",
        userId
      );
      throw new Error(
        "Ce numéro n'est pas lié à un compte. Veuillez vous inscrire."
      );
    } catch (error) {
      console.error("Login with phone error:", error);
      throw error;
    }
  };

  const register = async (
    name: string,
    email: string,
    password: string,
    userType: UserType,
    serviceType?: "mental" | "sexual"
  ): Promise<void> => {
    try {
      // Prevent multiple simultaneous registrations
      if (registrationInProgressRef.current) {
        console.warn(
          "⚠️ Registration already in progress, preventing duplicate submission"
        );
        throw new Error("Inscription déjà en cours. Veuillez patienter.");
      }

      registrationInProgressRef.current = true;

      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      const firebaseUser = userCredential.user;

      await sendEmailVerification(firebaseUser);
      console.log("✅ Email de vérification envoyé");

      // Stocker les données temporairement en local
      localStorage.setItem("pending-user-id", userCredential.user.uid);
      localStorage.setItem("pending-user-email", email);
      localStorage.setItem("pending-user-name", name);
      localStorage.setItem("pending-user-type", userType as string);
      if (serviceType) {
        localStorage.setItem("pending-service-type", serviceType);
      }

      // Rediriger vers la page de vérification
      navigate("/verify-email");
      return;
    } catch (error) {
      let errorMessage = "Erreur lors de l'inscription";

      if (error instanceof Error) {
        const errorCode = (error as { code?: string }).code;

        if (errorCode === "auth/email-already-in-use") {
          errorMessage = "Cette adresse email est déjà utilisée";
        } else if (errorCode === "auth/invalid-email") {
          errorMessage = "Adresse email invalide";
        } else if (errorCode === "auth/weak-password") {
          errorMessage = "Le mot de passe est trop faible";
        } else {
          errorMessage = error.message;
        }
      }

      throw new Error(errorMessage);
    } finally {
      registrationInProgressRef.current = false;
    }
  };

  // Create user with phone number
  const createUserWithPhone = async (
    name: string,
    phoneNumber: string
  ): Promise<void> => {
    try {
      // Prevent multiple simultaneous registrations
      if (registrationInProgressRef.current) {
        console.warn(
          "⚠️ Registration already in progress, preventing duplicate submission"
        );
        throw new Error("Inscription déjà en cours. Veuillez patienter.");
      }

      registrationInProgressRef.current = true;

      // Get the current user from auth (should be authenticated with phone)
      const firebaseUser = auth.currentUser;

      // Numéros de test pour développement
      const testPhoneNumbers: string[] = [
        "+1 450-516-8884",
        "+14505168884",
        "+1 450 516 8884",
      ];
      const isTestNumber = testPhoneNumbers.includes(phoneNumber);

      if (!firebaseUser && !isTestNumber) {
        throw new Error("Utilisateur non authentifié");
      }

      // Utiliser l'uid de Firebase Auth même pour les numéros de test
      // car l'utilisateur est maintenant authentifié via signInWithPhoneNumber
      const userId = firebaseUser
        ? firebaseUser.uid
        : `test-user-${Date.now()}`;

      // Create Firestore documents
      await ensureFirestoreReady();
      await ensureRequiredCollectionsExist();

      const db = getFirestoreInstance();
      if (!db) {
        throw new Error("Firestore non disponible");
      }

      // Create user document
      const userRef = doc(db, "users", userId);
      await retryFirestoreOperation(async () => {
        await setDoc(userRef, {
          id: userId,
          name: name,
          phoneNumber: phoneNumber,
          type: "patient",
          isActive: true,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      });

      // Create patient profile
      await createDefaultPatientProfile(userId, name, "", phoneNumber);

      console.log("✅ Profil utilisateur créé avec succès");
    } catch (error) {
      console.error("Error creating user with phone:", error);
      throw error;
    } finally {
      // Reset registration flag
      registrationInProgressRef.current = false;
    }
  };

  const refreshUser = async (): Promise<void> => {
    console.log("🔄 [AUTH DEBUG] Refreshing user data...");
    const firebaseUser = auth.currentUser;

    if (firebaseUser) {
      try {
        await fetchUserDataWithRetry(firebaseUser);
        console.log("✅ [AUTH DEBUG] User data refreshed successfully");
      } catch (error) {
        console.error("❌ [AUTH DEBUG] Error refreshing user data:", error);
      }
    } else {
      console.warn("⚠️ [AUTH DEBUG] No Firebase user to refresh");
    }
  };

  const logout = () => {
    console.log("🔄 [AUTH DEBUG] Starting logout process");

    // Clean up all Firestore listeners BEFORE signing out
    try {
      // Import cleanup functions dynamically to avoid circular dependencies
      // Note: Using dynamic imports instead of require() to satisfy linter
      import("../hooks/useProfessionals")
        .then(({ cleanupAllProfessionalsListeners }) => {
          cleanupAllProfessionalsListeners();
        })
        .catch(() => {
          console.warn("Could not cleanup professionals listeners");
        });

      import("../hooks/useBookings")
        .then(({ cleanupAllBookingListeners }) => {
          cleanupAllBookingListeners();
        })
        .catch(() => {
          console.warn("Could not cleanup booking listeners");
        });

      import("../services/messageService")
        .then(({ cleanupAllMessageListeners, clearMessageCaches }) => {
          cleanupAllMessageListeners();
          clearMessageCaches();
        })
        .catch(() => {
          console.warn("Could not cleanup message listeners");
        });

      import("../services/notificationService")
        .then(({ cleanupAllNotificationListeners }) => {
          cleanupAllNotificationListeners();
        })
        .catch(() => {
          console.warn("Could not cleanup notification listeners");
        });

      console.log("🧹 [AUTH DEBUG] Cleaning up all listeners before logout");
    } catch (error) {
      console.warn(
        "⚠️ [AUTH DEBUG] Error cleaning up listeners during logout:",
        error
      );
    }

    // Clear current user state BEFORE Firebase signOut
    setCurrentUser(null);
    localStorage.removeItem("health-e-user");

    // Sign out from Firebase Auth
    signOut(auth).catch((error: unknown) => {
      console.error("❌ [AUTH DEBUG] Error signing out from Firebase:", error);
    });

    // Clean browser storage only on logout, not on initialization
    cleanAllFirebaseStorage();

    console.log("✅ [AUTH DEBUG] Logout process completed");
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        userType: currentUser?.type || null,
        isAuthenticated: currentUser !== null,
        isAdmin: currentUser?.type === "admin",
        login,
        loginWithPhone,
        register,
        createUserWithPhone,
        logout,
        refreshUser,
      }}
    >
      {!loading || authInitialized ? (
        children
      ) : (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-4 text-lg text-gray-600">Chargement...</p>
          </div>
        </div>
      )}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
