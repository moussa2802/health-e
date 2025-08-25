import { useState, useRef, useEffect } from "react";
import { FirebaseError } from "firebase/app";
import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  ConfirmationResult,
  UserCredential,
} from "firebase/auth";
import {
  auth,
  getFirestoreInstance,
  ensureFirestoreReady,
} from "../utils/firebase";
import { collection, query, where, getDocs, limit } from "firebase/firestore";

export const usePhoneAuth = () => {
  const [loginConfirmation, setLoginConfirmation] =
    useState<ConfirmationResult | null>(null);
  const [registerConfirmation, setRegisterConfirmation] =
    useState<ConfirmationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verificationSent, setVerificationSent] = useState(false);
  const [cooldownTime, setCooldownTime] = useState(0);
  const [isInCooldown, setIsInCooldown] = useState(false);
  const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null);
  const cooldownTimerRef = useRef<NodeJS.Timeout | null>(null);
  const containerIdRef = useRef<string>("recaptcha-container");
  const isInitializingRef = useRef<boolean>(false);

  // Initialize reCAPTCHA once when component mounts
  useEffect(() => {
    initializeRecaptcha();

    // Nettoyage au démontage du composant
    return () => {
      cleanupRecaptcha();
    };
  }, []);

  // Initialize reCAPTCHA with proper cleanup
  const initializeRecaptcha = () => {
    if (isInitializingRef.current) {
      console.log("🔄 reCAPTCHA initialization already in progress");
      return;
    }

    try {
      isInitializingRef.current = true;

      // Clean up any existing verifier first
      if (recaptchaVerifierRef.current) {
        try {
          recaptchaVerifierRef.current.clear();
        } catch (error) {
          console.warn("⚠️ Error clearing existing reCAPTCHA:", error);
        }
        recaptchaVerifierRef.current = null;
      }

      // Ensure container exists
      const container = document.getElementById(containerIdRef.current);
      if (!container) {
        console.error("❌ Conteneur reCAPTCHA manquant dans le DOM");
        setError("Erreur technique : reCAPTCHA non disponible.");
        return;
      }

      // Clear container completely
      container.innerHTML = "";

      // Remove any existing reCAPTCHA elements
      const existingRecaptcha = document.querySelector(".grecaptcha-badge");
      if (existingRecaptcha) {
        existingRecaptcha.remove();
      }

      if (!auth) {
        throw new Error("Firebase Auth non initialisé");
      }

      // Create new verifier
      recaptchaVerifierRef.current = new RecaptchaVerifier(
        auth,
        containerIdRef.current,
        {
          size: "invisible",
          callback: () => {
            console.log("✅ reCAPTCHA solved");
          },
          "expired-callback": () => {
            console.log("⏰ reCAPTCHA expired");
            setError("La vérification a expiré. Veuillez réessayer.");
          },
          render: "explicit",
        }
      );

      console.log("✅ reCAPTCHA initialisé avec succès");
    } catch (err) {
      console.error("❌ Erreur lors de l'initialisation de reCAPTCHA", err);
      setError("Erreur lors de l'initialisation de reCAPTCHA");
    } finally {
      isInitializingRef.current = false;
    }
  };

  const cleanupRecaptcha = () => {
    try {
      if (recaptchaVerifierRef.current) {
        recaptchaVerifierRef.current.clear();
        recaptchaVerifierRef.current = null;
      }

      // Remove reCAPTCHA elements from DOM
      const existingRecaptcha = document.querySelector(".grecaptcha-badge");
      if (existingRecaptcha) {
        existingRecaptcha.remove();
      }

      // Clear container
      const container = document.getElementById(containerIdRef.current);
      if (container) {
        container.innerHTML = "";
      }

      console.log("🧹 reCAPTCHA cleanup completed");
    } catch (error) {
      console.warn("⚠️ Error during reCAPTCHA cleanup:", error);
    }
  };

  const resetRecaptcha = async () => {
    try {
      console.log("🔄 Resetting reCAPTCHA...");
      cleanupRecaptcha();

      // Wait a bit before re-initializing
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Re-initialize
      initializeRecaptcha();

      console.log("✅ reCAPTCHA reset completed");
    } catch (error) {
      console.warn("⚠️ Error resetting global reCAPTCHA:", error);
    }
  };

  const startCooldown = (duration: number = 60) => {
    setIsInCooldown(true);
    setCooldownTime(duration);

    if (cooldownTimerRef.current) {
      clearInterval(cooldownTimerRef.current);
    }

    cooldownTimerRef.current = setInterval(() => {
      setCooldownTime((prev) => {
        if (prev <= 1) {
          setIsInCooldown(false);
          if (cooldownTimerRef.current) {
            clearInterval(cooldownTimerRef.current);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const isPhoneNumberAlreadyRegistered = async (
    phoneNumber: string
  ): Promise<boolean> => {
    try {
      console.log(
        "🔍 Vérification si le numéro est déjà utilisé:",
        phoneNumber
      );

      // Ensure Firestore is ready
      await ensureFirestoreReady();
      const db = getFirestoreInstance();
      if (!db) {
        console.warn(
          "⚠️ Firestore non disponible pour la vérification du téléphone"
        );
        return false; // En cas d'erreur, on continue quand même
      }

      // Vérifier dans la collection users
      const usersQuery = query(
        collection(db, "users"),
        where("phoneNumber", "==", phoneNumber),
        limit(1)
      );

      const usersSnapshot = await getDocs(usersQuery);

      if (!usersSnapshot.empty) {
        console.log("✅ Numéro déjà utilisé dans la collection users");
        return true;
      }

      // Vérifier dans la collection patients
      const patientsQuery = query(
        collection(db, "patients"),
        where("phone", "==", phoneNumber),
        limit(1)
      );

      const patientsSnapshot = await getDocs(patientsQuery);

      if (!patientsSnapshot.empty) {
        console.log("✅ Numéro déjà utilisé dans la collection patients");
        return true;
      }

      // Si le numéro n'existe pas dans Firestore, permettre l'inscription
      // même s'il existe dans Firebase Auth (comme pour l'email)
      console.log(
        "✅ Numéro disponible pour inscription (pas de profil Firestore)"
      );
      return false;
    } catch (error) {
      console.error("❌ Erreur lors de la vérification du numéro:", error);

      // En cas d'erreur de permissions, on continue quand même
      // (surtout en mode développement)
      console.warn("⚠️ Erreur de permissions, on continue l'inscription");
      return false;
    }
  };

  const sendVerificationCode = async (
    phoneNumber: string
  ): Promise<ConfirmationResult | null> => {
    try {
      setLoading(true);
      setError(null);

      // Vérifier si on est en cooldown
      if (isInCooldown) {
        const minutes = Math.floor(cooldownTime / 60);
        const seconds = cooldownTime % 60;
        const timeString =
          minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
        throw new Error(
          `Veuillez attendre ${timeString} avant de renvoyer un code`
        );
      }

      // Validate phone number format
      if (!phoneNumber || phoneNumber.length < 10) {
        throw new Error(
          "Numéro de téléphone invalide. Veuillez entrer un numéro complet avec le code pays."
        );
      }

      // Ensure phone number has proper format (add + if missing)
      let formattedPhone = phoneNumber;
      if (!formattedPhone.startsWith("+")) {
        formattedPhone = `+${formattedPhone}`;
      }

      console.log("📱 Numéro formaté:", formattedPhone);

      // Vérifier si c'est un numéro de test Firebase
      const testPhoneNumbers: string[] = [
        "+1 450-516-8884",
        "+14505168884",
        "+1 450 516 8884",
      ];

      const isTestNumber = testPhoneNumbers.includes(formattedPhone);
      if (isTestNumber) {
        console.log("🧪 Numéro de test détecté:", formattedPhone);
        console.log("📱 Code de test: 123456");
        console.log("🔄 Appel de signInWithPhoneNumber() pour Firebase...");
      } else {
        console.log("📱 Envoi de SMS réel pour:", formattedPhone);
      }

      // Ensure we have a valid reCAPTCHA verifier
      if (!recaptchaVerifierRef.current) {
        console.log("🔄 No reCAPTCHA verifier, initializing...");

        await new Promise<void>((resolve) => {
          initializeRecaptcha();

          // Attendre plus longtemps pour s'assurer que Firebase ait injecté le widget
          const checkInterval = setInterval(() => {
            if (recaptchaVerifierRef.current) {
              clearInterval(checkInterval);
              console.log("✅ reCAPTCHA verifier prêt");
              resolve();
            }
          }, 200);

          // Timeout après 3 secondes si toujours rien
          setTimeout(() => {
            clearInterval(checkInterval);
            if (!recaptchaVerifierRef.current) {
              console.warn("❌ Échec d'initialisation de reCAPTCHA après 3s");
            }
            resolve();
          }, 3000);
        });

        if (!recaptchaVerifierRef.current) {
          throw new Error(
            "Impossible d'initialiser reCAPTCHA. Veuillez rafraîchir la page."
          );
        }
      }

      if (!auth) {
        throw new Error("Firebase Auth non prêt");
      }

      console.log("📞 Envoi du code de vérification...");

      // Ajouter un timeout plus long pour l'envoi de SMS
      console.log("📞 Envoi du code de vérification...");
      console.log("📱 Numéro:", formattedPhone);

      // Timeout plus long pour l'environnement webcontainer
      const timeoutDuration = 60000; // 60 secondes au lieu de 30
      console.log(`⏱️ Timeout configuré: ${timeoutDuration / 1000} secondes`);

      // Option pour désactiver le timeout en développement
      const disableTimeout =
        window.location.hostname.includes("webcontainer") ||
        window.location.hostname.includes("localhost");

      let confirmation;
      if (disableTimeout) {
        console.log("🔄 Mode développement détecté, timeout désactivé");
        confirmation = await signInWithPhoneNumber(
          auth,
          formattedPhone,
          recaptchaVerifierRef.current
        );
      } else {
        confirmation = await Promise.race([
          signInWithPhoneNumber(
            auth,
            formattedPhone,
            recaptchaVerifierRef.current
          ),
          new Promise<never>((_, reject) =>
            setTimeout(
              () =>
                reject(
                  new Error(
                    `Timeout: L'envoi du SMS a pris plus de ${
                      timeoutDuration / 1000
                    } secondes`
                  )
                ),
              timeoutDuration
            )
          ),
        ]);
      }

      setVerificationSent(true);
      startCooldown(); // Start cooldown after successful send
      console.log("✅ Code de vérification envoyé avec succès");
      return confirmation;
    } catch (err) {
      console.error("Erreur envoi code", err);

      // Gestion spécifique des erreurs Firebase
      let errorMessage = "Erreur lors de l'envoi du code";

      if (err instanceof Error) {
        const errorCode = (err as FirebaseError).code;

        // Handle specific reCAPTCHA errors
        if (err.message.includes("reCAPTCHA has already been rendered")) {
          console.log("🔄 ReCAPTCHA déjà rendu, réinitialisation...");
          await resetRecaptcha();
          errorMessage = "Veuillez réessayer dans quelques secondes";
        } else if (err.message.includes("captcha-check-failed")) {
          console.log(
            "🔄 Échec de vérification reCAPTCHA, réinitialisation..."
          );
          await resetRecaptcha();
          errorMessage = "Vérification échouée. Veuillez réessayer";
        } else {
          switch (errorCode) {
            case "auth/too-many-requests":
              errorMessage =
                "Trop de tentatives pour ce numéro. Veuillez attendre 5 minutes avant de réessayer.";
              // Forcer un cooldown plus long pour cette erreur
              setIsInCooldown(true);
              setCooldownTime(300); // 5 minutes
              // Réinitialiser le reCAPTCHA pour éviter les problèmes
              await resetRecaptcha();
              break;
            case "auth/invalid-phone-number":
              errorMessage =
                "Numéro de téléphone invalide. Veuillez vérifier le format.";
              break;
            case "auth/quota-exceeded":
              errorMessage = "Quota SMS dépassé. Veuillez réessayer plus tard.";
              break;
            case "auth/network-request-failed":
              errorMessage =
                "Erreur de connexion. Vérifiez votre connexion internet.";
              break;
            default:
              // Gestion spécifique des timeouts
              if (err.message.includes("Timeout")) {
                errorMessage =
                  "L'envoi du SMS a pris plus de 60 secondes. Dans l'environnement webcontainer, cela peut prendre plus de temps. Vérifiez votre connexion et réessayez.";
                await resetRecaptcha();
              } else {
                errorMessage = `Erreur lors de l'envoi du code : ${err.message}`;
              }
          }
        }
      }

      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const sendVerificationCodeForLogin = async (
    phoneNumber: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      console.log(
        "🔄 Envoi du code de vérification pour login au numéro:",
        phoneNumber
      );
      setLoading(true);
      setError(null);

      const confirmation = await sendVerificationCode(phoneNumber);
      if (confirmation) {
        console.log("✅ Code de vérification pour login envoyé avec succès");
        setLoginConfirmation(confirmation);
        setVerificationSent(true);
        startCooldown(); // Start cooldown after successful send
        return { success: true };
      }
      return { success: false, error: "Échec de l'envoi du code" };
    } catch (err) {
      console.error("Erreur envoi code login", err);

      // Gestion spécifique des erreurs pour la connexion
      if (err instanceof Error) {
        const errorCode = (err as FirebaseError).code;
        if (errorCode === "auth/too-many-requests") {
          const errorMessage =
            "Trop de tentatives pour ce numéro. Veuillez attendre 5 minutes avant de réessayer.";
          setError(errorMessage);
          setIsInCooldown(true);
          setCooldownTime(300); // 5 minutes
          return { success: false, error: errorMessage };
        } else {
          const errorMessage =
            "Erreur lors de l'envoi du code pour la connexion.";
          setError(errorMessage);
          return { success: false, error: errorMessage };
        }
      } else {
        const errorMessage =
          "Erreur lors de l'envoi du code pour la connexion.";
        setError(errorMessage);
        return { success: false, error: errorMessage };
      }
    } finally {
      setLoading(false);
    }
  };

  const sendVerificationCodeForRegister = async (
    phoneNumber: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      console.log(
        "🔄 Envoi du code de vérification pour inscription au numéro:",
        phoneNumber
      );

      // Vérifier si le numéro est déjà utilisé dans Firestore seulement
      const isPhoneUsed = await isPhoneNumberAlreadyRegistered(phoneNumber);
      if (isPhoneUsed) {
        console.warn(
          "⚠️ Ce numéro de téléphone est déjà utilisé dans Firestore"
        );
        const errorMessage =
          "Ce numéro de téléphone est déjà associé à un compte existant.";
        setError(errorMessage);
        throw new Error(errorMessage);
      }

      setLoading(true);
      setError(null);

      const confirmation = await sendVerificationCode(phoneNumber);
      if (confirmation) {
        console.log("✅ Code de vérification pour register envoyé avec succès");
        setRegisterConfirmation(confirmation);
        setVerificationSent(true);
        startCooldown(); // Start cooldown after successful send
        return { success: true };
      }
      return { success: false, error: "Échec de l'envoi du code" };
    } catch (err) {
      console.error("Erreur envoi code register", err);

      // Gestion spécifique des erreurs pour l'inscription
      if (err instanceof Error) {
        const errorCode = (err as FirebaseError).code;
        if (errorCode === "auth/too-many-requests") {
          const errorMessage =
            "Trop de tentatives pour ce numéro. Veuillez attendre 5 minutes avant de réessayer.";
          setError(errorMessage);
          setIsInCooldown(true);
          setCooldownTime(300); // 5 minutes
          return { success: false, error: errorMessage };
        } else {
          const errorMessage =
            "Erreur lors de l'envoi du code pour l'inscription.";
          setError(errorMessage);
          return { success: false, error: errorMessage };
        }
      } else {
        const errorMessage =
          "Erreur lors de l'envoi du code pour l'inscription.";
        setError(errorMessage);
        return { success: false, error: errorMessage };
      }
    } finally {
      setLoading(false);
    }
  };

  const verifyLoginCode = async (
    code: string
  ): Promise<UserCredential | null> => {
    if (!loginConfirmation) throw new Error("Aucun code de connexion envoyé");
    return loginConfirmation.confirm(code);
  };

  const verifyRegisterCode = async (
    code: string
  ): Promise<UserCredential | null> => {
    if (!registerConfirmation)
      throw new Error("Aucun code d'inscription envoyé");
    console.log("🔄 Vérification du code pour inscription:", code);
    try {
      const result = await registerConfirmation.confirm(code);
      console.log("✅ Code d'inscription vérifié avec succès");
      return result;
    } catch (error) {
      console.error(
        "❌ Erreur lors de la vérification du code d'inscription:",
        error
      );
      throw error;
    }
  };

  return {
    sendVerificationCode,
    sendVerificationCodeForLogin,
    verifyLoginCode,
    sendVerificationCodeForRegister,
    verifyRegisterCode,
    verificationSent,
    loading,
    error,
    cooldownTime,
    isInCooldown,
    resetRecaptcha,
  };
};
