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

// tout en haut du hook
declare global {
  interface Window {
    __heRecaptchaVerifier?: RecaptchaVerifier | null;
    __heRecaptchaWidgetId?: number | null;
    grecaptcha?: any;
  }
}

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
  const initLockRef = useRef(false);

  const startCooldown = (duration = 60) => {
    setIsInCooldown(true);
    setCooldownTime(duration);
    if (cooldownTimerRef.current) clearInterval(cooldownTimerRef.current);
    cooldownTimerRef.current = setInterval(() => {
      setCooldownTime((prev) => {
        if (prev <= 1) {
          setIsInCooldown(false);
          clearInterval(cooldownTimerRef.current!);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const cleanupRecaptcha = () => {
    try {
      window.__heRecaptchaVerifier?.clear();
    } catch {}
    window.__heRecaptchaVerifier = null;
    window.__heRecaptchaWidgetId = null;
    const el = document.getElementById("recaptcha-container");
    if (el) el.innerHTML = "";
  };

  const ensureRecaptcha = async () => {
    // réutilise si existant
    if (window.__heRecaptchaVerifier) {
      recaptchaVerifierRef.current = window.__heRecaptchaVerifier!;
      return;
    }
    if (initLockRef.current) return;
    initLockRef.current = true;
    try {
      // garantir le conteneur
      let container = document.getElementById("recaptcha-container");
      if (!container) {
        container = document.createElement("div");
        container.id = "recaptcha-container";
        container.style.position = "fixed";
        container.style.left = "-9999px";
        container.style.top = "-9999px";
        document.body.appendChild(container);
      } else {
        // NE PAS faire display:none
        container.style.position = "fixed";
        container.style.left = "-9999px";
        container.style.top = "-9999px";
        container.style.width = "1px";
        container.style.height = "1px";
      }

      // crée l'instance et REND le widget (obligatoire)
      const verifier = new RecaptchaVerifier(auth, "recaptcha-container", {
        size: "invisible",
        callback: () => console.log("✅ reCAPTCHA solved"),
        "expired-callback": () => console.log("⏰ reCAPTCHA expired"),
      });

      const widgetId = await verifier.render(); // ← évite "already rendered"
      window.__heRecaptchaVerifier = verifier;
      window.__heRecaptchaWidgetId = widgetId;

      recaptchaVerifierRef.current = verifier;
    } catch (e: any) {
      // Si "already rendered", on reset le widget au lieu de recréer
      if (String(e?.message || "").includes("already been rendered")) {
        try {
          if (window.grecaptcha && window.__heRecaptchaWidgetId != null) {
            window.grecaptcha.reset(window.__heRecaptchaWidgetId);
            recaptchaVerifierRef.current = window.__heRecaptchaVerifier!;
            return;
          }
        } catch {}
      }
      console.error("❌ [RECAPTCHA] init error:", e);
      cleanupRecaptcha();
      throw new Error("reCAPTCHA indisponible");
    } finally {
      initLockRef.current = false;
    }
  };

  // ——— Vérif Firestore existant ———
  const isPhoneNumberAlreadyRegistered = async (phoneNumber: string) => {
    try {
      await ensureFirestoreReady();
      const db = getFirestoreInstance();
      if (!db) return false;

      const qUsers = query(
        collection(db, "users"),
        where("phoneNumber", "==", phoneNumber),
        where("type", "==", "patient"),
        limit(1)
      );
      if (!(await getDocs(qUsers)).empty) return true;

      const qPatients = query(
        collection(db, "patients"),
        where("phone", "==", phoneNumber),
        limit(1)
      );
      if (!(await getDocs(qPatients)).empty) return true;

      return false;
    } catch (e) {
      console.warn("⚠️ Firestore check error (on continue):", e);
      return false;
    }
  };

  // ——— Envoi du SMS ———
  const sendVerificationCode = async (
    phoneNumber: string
  ): Promise<ConfirmationResult | null> => {
    try {
      console.log("🚀 [SMS] Début de sendVerificationCode pour:", phoneNumber);
      setLoading(true);
      setError(null);

      if (isInCooldown) {
        const m = Math.floor(cooldownTime / 60);
        const s = cooldownTime % 60;
        console.log("⏰ [SMS] En cooldown:", cooldownTime, "secondes");
        throw new Error(`Veuillez attendre ${m ? `${m}m ` : ""}${s}s`);
      }

      if (!phoneNumber || phoneNumber.length < 10) {
        console.log("❌ [SMS] Numéro invalide:", phoneNumber);
        throw new Error("Entrez un numéro en format international (+221…).");
      }

      let formatted = phoneNumber.trim();
      if (!formatted.startsWith("+")) formatted = `+${formatted}`;
      console.log("📱 [SMS] Numéro formaté:", formatted);

      // Numéros de test Firebase (pour le développement)
      const testNumbers = ["+14505168884", "+15551234567"];
      if (testNumbers.includes(formatted)) {
        console.log("🧪 [SMS] Numéro de test détecté:", formatted);
      }

      console.log("🔧 [SMS] Initialisation reCAPTCHA...");
      await ensureRecaptcha();
      if (!recaptchaVerifierRef.current) {
        throw new Error("reCAPTCHA indisponible");
      }
      const confirmation = await signInWithPhoneNumber(
        auth,
        formatted,
        recaptchaVerifierRef.current
      );
      console.log(
        "📞 [SMS] signInWithPhoneNumber terminé, confirmation:",
        !!confirmation
      );

      console.log(
        "✅ [SMS] SMS envoyé avec succès, confirmation reçue:",
        !!confirmation
      );
      setVerificationSent(true);
      startCooldown(60);
      console.log("✅ [SMS] Code envoyé et cooldown démarré");
      return confirmation;
    } catch (err: any) {
      console.error("Erreur envoi code", err);
      let msg = "Erreur lors de l'envoi du code";
      const code = (err as FirebaseError)?.code;

      if (err?.message?.includes("reCAPTCHA has already been rendered")) {
        if (window.grecaptcha && window.__heRecaptchaWidgetId != null) {
          window.grecaptcha.reset(window.__heRecaptchaWidgetId);
        } else {
          cleanupRecaptcha();
        }
        msg = "reCAPTCHA ré-initialisé, réessayez.";
      } else if (err?.message?.includes("captcha-check-failed")) {
        if (window.grecaptcha && window.__heRecaptchaWidgetId != null) {
          window.grecaptcha.reset(window.__heRecaptchaWidgetId);
        } else {
          cleanupRecaptcha();
        }
        msg = "Vérification reCAPTCHA échouée, réessayez.";
      } else {
        switch (code) {
          case "auth/too-many-requests":
            startCooldown(300);
            cleanupRecaptcha();
            msg = "Trop de tentatives. Réessayez dans quelques minutes.";
            break;
          case "auth/invalid-phone-number":
            msg = "Numéro invalide.";
            break;
          case "auth/quota-exceeded":
            msg = "Quota SMS dépassé. Réessayez plus tard.";
            break;
          case "auth/invalid-app-credential":
            msg = "App Check/enforcement ou reCAPTCHA non configuré pour Auth.";
            break;
          default:
            msg = err?.message || msg;
        }
      }
      setError(msg);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const sendVerificationCodeForLogin = async (phoneNumber: string) => {
    try {
      console.log("🔄 [LOGIN] Début de l'envoi du code pour:", phoneNumber);
      console.log("🔄 [LOGIN] Appel de sendVerificationCode...");

      const c = await sendVerificationCode(phoneNumber);
      console.log("🔄 [LOGIN] Résultat de sendVerificationCode:", !!c);

      if (!c) {
        console.log("❌ [LOGIN] Échec de l'envoi du code");
        return { success: false, error: "Échec de l'envoi du code" };
      }

      console.log(
        "✅ [LOGIN] Code envoyé avec succès, configuration de la confirmation"
      );
      setLoginConfirmation(c);
      // pas de startCooldown ici (déjà fait dans sendVerificationCode)
      return { success: true };
    } catch (error) {
      console.error(
        "❌ [LOGIN] Erreur dans sendVerificationCodeForLogin:",
        error
      );
      return { success: false, error: (error as Error).message };
    }
  };

  const sendVerificationCodeForRegister = async (phoneNumber: string) => {
    const used = await isPhoneNumberAlreadyRegistered(phoneNumber);
    if (used) {
      const msg = "Ce numéro est déjà associé à un compte existant.";
      setError(msg);
      return { success: false, error: msg };
    }
    const c = await sendVerificationCode(phoneNumber);
    if (!c) return { success: false, error: "Échec de l'envoi du code" };
    setRegisterConfirmation(c);
    return { success: true };
  };

  const verifyLoginCode = async (
    code: string
  ): Promise<UserCredential | null> => {
    if (!loginConfirmation) throw new Error("Aucun code envoyé.");
    return loginConfirmation.confirm(code);
  };

  const verifyRegisterCode = async (
    code: string
  ): Promise<UserCredential | null> => {
    if (!registerConfirmation)
      throw new Error("Aucun code d'inscription envoyé.");
    return registerConfirmation.confirm(code);
  };

  return {
    // exposés
    sendVerificationCode,
    sendVerificationCodeForLogin,
    sendVerificationCodeForRegister,
    verifyLoginCode,
    verifyRegisterCode,
    isPhoneNumberAlreadyRegistered,

    // state
    verificationSent,
    loading,
    error,
    cooldownTime,
    isInCooldown,
  };
};
