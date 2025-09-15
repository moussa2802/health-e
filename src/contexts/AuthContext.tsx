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

interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
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
    phone: string,
    userType: "patient" | "professional"
  ) => Promise<void>;
  verifyPhoneCode: (verificationId: string, code: string) => Promise<void>;
}

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
          // Ne récupérer serviceType et specialty que pour les professionnels
          const userType = userData.type || null;
          const userEmail = userData.email || firebaseUser.email || "";

          console.log("✅ [AUTH] User data retrieved from Firestore:", {
            id: firebaseUser.uid,
            name: userData.name || "",
            email: userEmail,
            type: userType,
            hasEmail: !!userEmail,
            emailFromFirestore: userData.email,
            emailFromFirebase: firebaseUser.email,
          });

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
          // User exists in Auth but not in Firestore - check if it's a demo admin
          console.warn(
            "User exists in Auth but not in Firestore:",
            firebaseUser.uid
          );

          // Check if this is the demo admin account
          if (firebaseUser.email === "admin@demo.com") {
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

              // Admin user document created successfully
            } catch (error) {
              setCurrentUser(null);
            }
          } else {
            setCurrentUser(null);
          }
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

      console.log("⚠️ [AUTH] Using fallback user data:", {
        id: fallbackUser.id,
        name: fallbackUser.name,
        email: fallbackUser.email,
        hasEmail: !!fallbackUser.email,
      });

      setCurrentUser(fallbackUser);
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

  // ✅ SYNC: Listen for real-time name updates from profile changes
  useEffect(() => {
    const handleNameUpdate = (event: CustomEvent) => {
      const { userId, newName } = event.detail;

      // Only update if this is the current user
      if (currentUser && currentUser.id === userId) {
        console.log("🔄 [AUTH DEBUG] Real-time name update received:", newName);
        setCurrentUser((prev) => (prev ? { ...prev, name: newName } : null));

        // Also update localStorage
        const savedUser = localStorage.getItem("health-e-user");
        if (savedUser) {
          const userData = JSON.parse(savedUser);
          userData.name = newName;
          localStorage.setItem("health-e-user", JSON.stringify(userData));
        }

        console.log("✅ [AUTH DEBUG] Name updated in real-time:", newName);
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

        // Check if this is a Firebase Auth error with specific error codes
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
              // Approche intelligente sans dépendre de Firestore
              // Vérification simple du format d'email
              const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
              if (!emailRegex.test(email)) {
                throw new Error(
                  "Format d'email invalide. Vérifiez votre adresse email."
                );
              }

              // Si l'email a un format valide mais l'authentification échoue,
              // c'est probablement que l'email n'existe pas ou le mot de passe est incorrect
              // On donne un message plus utile
              throw new Error(
                "Email ou mot de passe incorrect. Vérifiez vos identifiants ou créez un compte si vous n'en avez pas."
              );
            default:
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
                        console.log(
                          "✅ Admin user - no additional profile needed"
                        );
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
        } else {
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
    email: string, // ✅ Premier paramètre
    password: string, // ✅ Deuxième paramètre
    userType: "patient" | "professional", // ✅ Troisième paramètre
    additionalData?: any // ✅ Quatrième paramètre (optionnel)
  ): Promise<void> => {
    console.log(
      "🚀 [REGISTER] Début de l'inscription pour:",
      email,
      "Type:",
      userType
    );

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
        console.log(
          "✅ [REGISTER] Nouveau compte Firebase Auth créé avec UID:",
          user.uid
        );
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
            console.log(
              "✅ [REGISTER] Connexion réussie avec l'utilisateur existant, UID:",
              user.uid
            );
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

      console.log("📝 [REGISTER] Données utilisateur préparées:", userData);

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
    } catch (error) {
      throw error;
    } finally {
      // Reset registration flag
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

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        loading,
        isAuthenticated: !!currentUser?.id,
        login,
        register,
        resetPassword,
        logout,
        refreshUser,
        createUserWithPhone,
        verifyPhoneCode: () => {
          // This function is not implemented in the original file,
          // but it's part of the AuthContextType.
          // For now, we'll return a placeholder.
          console.warn("verifyPhoneCode not implemented yet.");
        },
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
