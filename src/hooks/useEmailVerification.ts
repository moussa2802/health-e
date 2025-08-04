import { useState, useEffect, useRef } from "react";
import { sendEmailVerification, User } from "firebase/auth";

export const useEmailVerification = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [cooldownTime, setCooldownTime] = useState(0);
  const [isInCooldown, setIsInCooldown] = useState(false);
  const cooldownTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup cooldown timer on unmount
  useEffect(() => {
    return () => {
      if (cooldownTimerRef.current) {
        clearInterval(cooldownTimerRef.current);
        cooldownTimerRef.current = null;
      }
    };
  }, []);

  // Start cooldown timer
  const startCooldown = () => {
    setIsInCooldown(true);
    setCooldownTime(60); // 60 seconds

    cooldownTimerRef.current = setInterval(() => {
      setCooldownTime((prev) => {
        if (prev <= 1) {
          setIsInCooldown(false);
          if (cooldownTimerRef.current) {
            clearInterval(cooldownTimerRef.current);
            cooldownTimerRef.current = null;
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const sendVerificationEmail = async (user: User): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(false);

      await sendEmailVerification(user);

      setSuccess(true);
      startCooldown(); // Start cooldown after successful send

      console.log("✅ Email de vérification envoyé avec succès");
      return true;
    } catch (err: any) {
      console.error(
        "❌ Erreur lors de l'envoi de l'e-mail de vérification:",
        err
      );

      // Handle specific Firebase errors
      if (err.code === "auth/too-many-requests") {
        setError(
          "Trop de demandes. Veuillez patienter quelques minutes avant de réessayer."
        );
      } else if (err.code === "auth/invalid-user-token") {
        setError("Session expirée. Veuillez vous reconnecter.");
      } else if (err.code === "auth/network-request-failed") {
        setError("Erreur de connexion. Vérifiez votre connexion internet.");
      } else {
        setError("Erreur lors de l'envoi de l'e-mail. Veuillez réessayer.");
      }

      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    sendVerificationEmail,
    loading,
    error,
    success,
    cooldownTime,
    isInCooldown,
  };
};
