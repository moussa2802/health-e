import { useState, useRef, useEffect } from "react";
import { FirebaseError } from "firebase/app";
import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  ConfirmationResult,
  UserCredential,
} from "firebase/auth";
import { auth } from "../utils/firebase";

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

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verificationSent, setVerificationSent] = useState(false);

  const [cooldownTime, setCooldownTime] = useState(0);
  const [isInCooldown, setIsInCooldown] = useState(false);

  const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null);
  const cooldownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const initLockRef = useRef(false);

  useEffect(() => {
    return () => {
      if (cooldownTimerRef.current) clearInterval(cooldownTimerRef.current);
      try {
        window.__heRecaptchaVerifier?.clear();
      } catch {}
      window.__heRecaptchaVerifier = null;
      if (window.__heRecaptchaWidgetId != null && window.grecaptcha) {
        try {
          window.grecaptcha.reset(window.__heRecaptchaWidgetId);
        } catch {}
      }
      const el = document.getElementById("recaptcha-container");
      if (el) el.innerHTML = "";
    };
  }, []);

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
    if (window.__heRecaptchaVerifier) {
      recaptchaVerifierRef.current = window.__heRecaptchaVerifier!;
      return;
    }
    if (initLockRef.current) return;
    initLockRef.current = true;

    try {
      let container = document.getElementById("recaptcha-container");
      if (!container) {
        container = document.createElement("div");
        container.id = "recaptcha-container";
        container.style.position = "fixed";
        container.style.left = "-9999px";
        container.style.top = "-9999px";
        document.body.appendChild(container);
      } else {
        container.style.position = "fixed";
        container.style.left = "-9999px";
        container.style.top = "-9999px";
        container.style.width = "1px";
        container.style.height = "1px";
      }

      const verifier = new RecaptchaVerifier(auth, "recaptcha-container", {
        size: "invisible",
        callback: () => {},
        "expired-callback": () => {},
      });

      const widgetId = await verifier.render();

      window.__heRecaptchaVerifier = verifier;
      window.__heRecaptchaWidgetId = widgetId;
      recaptchaVerifierRef.current = verifier;
    } catch (e: any) {
      if (String(e?.message || "").includes("already been rendered")) {
        try {
          if (window.grecaptcha && window.__heRecaptchaWidgetId != null) {
            window.grecaptcha.reset(window.__heRecaptchaWidgetId);
            recaptchaVerifierRef.current = window.__heRecaptchaVerifier!;
            return;
          }
        } catch (resetErr) {
          // Silent fail
        }
      }
      cleanupRecaptcha();
      throw new Error("reCAPTCHA indisponible");
    } finally {
      initLockRef.current = false;
    }
  };

  // ——— Envoi du SMS ———
  const sendVerificationCode = async (
    phoneNumber: string
  ): Promise<ConfirmationResult> => {
    try {
      setLoading(true);
      setError(null);

      if (isInCooldown) {
        const m = Math.floor(cooldownTime / 60);
        const s = cooldownTime % 60;
        throw new Error(`Veuillez attendre ${m ? `${m}m ` : ""}${s}s`);
      }

      if (!phoneNumber || phoneNumber.length < 10) {
        throw new Error("Entrez un numéro en format international (+221…).");
      }

      let formatted = phoneNumber.trim();
      if (!formatted.startsWith("+")) formatted = `+${formatted}`;

      // Numéros de test Firebase (facultatif)
      const testNumbers = ["+14505168884", "+15551234567"];
      if (testNumbers.includes(formatted)) {
        console.log("🧪 Numéro de test détecté:", formatted);
      }

      await ensureRecaptcha();
      if (!recaptchaVerifierRef.current)
        throw new Error("reCAPTCHA indisponible");

      const confirmation = await signInWithPhoneNumber(
        auth,
        formatted,
        recaptchaVerifierRef.current
      );

      // Si confirmation est null, c'est une erreur
      if (!confirmation) {
        const error = new Error("signInWithPhoneNumber a retourné null");
        (error as any).code = "auth/internal-error";
        throw error;
      }

      setVerificationSent(true);
      setLoginConfirmation(confirmation);
      startCooldown(60);
      return confirmation;
    } catch (err: any) {
      // 🔍 LOGGER EXACTEMENT TOUTES LES INFORMATIONS D'ERREUR
      console.error("❌ [PHONE_AUTH] ===== ERREUR DÉTAILLÉE signInWithPhoneNumber =====");
      console.error("❌ [PHONE_AUTH] error.code:", err?.code);
      console.error("❌ [PHONE_AUTH] error.message:", err?.message);
      console.error("❌ [PHONE_AUTH] error.customData:", err?.customData);
      console.error("❌ [PHONE_AUTH] error.stack:", err?.stack);
      console.error("❌ [PHONE_AUTH] error complet:", err);
      
      // Essayer de logger la réponse réseau si disponible
      if (err?.serverResponse) {
        console.error("❌ [PHONE_AUTH] error.serverResponse:", err.serverResponse);
      }
      if (err?.response) {
        console.error("❌ [PHONE_AUTH] error.response:", err.response);
      }
      if (err?.details) {
        console.error("❌ [PHONE_AUTH] error.details:", err.details);
      }

      // Gestion spéciale pour certaines erreurs reCAPTCHA (réinitialisation)
      if (err?.message?.includes("reCAPTCHA has already been rendered")) {
        if (window.grecaptcha && window.__heRecaptchaWidgetId != null) {
          window.grecaptcha.reset(window.__heRecaptchaWidgetId);
        } else {
          cleanupRecaptcha();
        }
      } else if (err?.message?.includes("captcha-check-failed")) {
        if (window.grecaptcha && window.__heRecaptchaWidgetId != null) {
          window.grecaptcha.reset(window.__heRecaptchaWidgetId);
        } else {
          cleanupRecaptcha();
        }
      }

      const code = (err as FirebaseError)?.code || "unknown-error";
      const errorMessage = err?.message || "Erreur lors de l'envoi du code";
      
      // Construire le message d'erreur avec le code
      const finalMessage = code !== "unknown-error" 
        ? `[${code}] ${errorMessage}`
        : errorMessage;
      
      setError(finalMessage);
      
      // Renvoyer une exception avec le code inclus dans le message
      const enhancedError = new Error(finalMessage);
      (enhancedError as any).code = code;
      (enhancedError as any).originalError = err;
      throw enhancedError;
    } finally {
      setLoading(false);
    }
  };

  const verifyLoginCode = async (
    code: string
  ): Promise<UserCredential | null> => {
    if (!loginConfirmation) {
      throw new Error("Aucun code envoyé.");
    }

    try {
      const result = await loginConfirmation.confirm(code);
      return result;
    } catch (err: any) {
      throw err;
    }
  };

  return {
    sendVerificationCode,
    verifyLoginCode,
    verificationSent,
    loading,
    error,
    cooldownTime,
    isInCooldown,
  };
};
