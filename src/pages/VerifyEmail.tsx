import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Mail,
  CheckCircle2,
  RefreshCw,
  ArrowLeft,
  AlertCircle,
  Lightbulb,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useTerms } from "../contexts/TermsContext";
import { getAuth } from "firebase/auth";
import { useEmailVerification } from "../hooks/useEmailVerification";
import {
  createDefaultPatientProfile,
  createDefaultProfessionalProfile,
} from "../services/profileService";
import {
  doc,
  setDoc,
  serverTimestamp,
  getFirestore,
  collection,
} from "firebase/firestore";

const VerifyEmail: React.FC = () => {
  const [checkingVerification, setCheckingVerification] = useState(false);
  const { currentUser, refreshUser } = useAuth();
  const { hasAgreedToTerms, setShowTermsModal } = useTerms();
  const navigate = useNavigate();
  const auth = getAuth();
  const {
    sendVerificationEmail,
    loading: isResending,
    error,
    success: emailSent,
    cooldownTime,
    isInCooldown,
  } = useEmailVerification();

  // Debug function to check localStorage

  // Check verification status periodically
  useEffect(() => {
    if (!auth.currentUser) return;

    const interval = setInterval(async () => {
      try {
        await auth.currentUser?.reload();

        if (auth.currentUser?.emailVerified) {
          // Éviter de traiter plusieurs fois la même vérification
          if (checkingVerification) {
            return;
          }

          setCheckingVerification(true);

          const uid = localStorage.getItem("pending-user-id");
          const email = localStorage.getItem("pending-user-email");
          const name = localStorage.getItem("pending-user-name");
          const userType = localStorage.getItem("pending-user-type") as
            | "patient"
            | "professional";
          const serviceType =
            localStorage.getItem("pending-service-type") || "mental";
          // ✅ Vérifier que primarySpecialty n'est pas vide avant de l'utiliser
          const primarySpecialtyRaw = localStorage.getItem(
            "pending-primary-specialty"
          );
          const primarySpecialty =
            primarySpecialtyRaw && primarySpecialtyRaw.trim() !== ""
              ? primarySpecialtyRaw
              : undefined;
          const category =
            (localStorage.getItem("pending-category") as
              | "mental-health"
              | "sexual-health"
              | null) || undefined;

          if (uid && email && name && userType) {
            console.log(
              "[VERIFY DEBUG] All required data found, creating Firestore documents..."
            );
            console.log("[VERIFY DEBUG] Specialty data:", {
              serviceType,
              primarySpecialty,
              category,
            });
            const db = getFirestore();
            const userRef = doc(collection(db, "users"), uid);

            try {
              console.log("[VERIFY DEBUG] Creating user document...");
              await setDoc(userRef, {
                id: uid,
                name,
                email,
                type: userType,
                ...(userType === "professional" && serviceType
                  ? { serviceType }
                  : {}),
                isActive: true,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
              });
              if (userType === "patient") {
                await createDefaultPatientProfile(uid, name, email);
              } else {
                // Passer la spécialité choisie et la catégorie à createDefaultProfessionalProfile
                await createDefaultProfessionalProfile(
                  uid,
                  name,
                  email,
                  serviceType as "mental" | "sexual",
                  primarySpecialty, // ✅ 5ème paramètre : customSpecialty
                  category // ✅ 6ème paramètre : customCategory
                );
              }
            } catch (error) {
              console.error("Firestore creation error:", error);
            }
          } else {
            console.error("Missing required data for account setup");
          }

          // Force reload the current user to update the auth context
          try {
            await auth.currentUser?.reload();
          } catch (reloadError) {
            console.warn("Could not reload user:", reloadError);
          }

          // Force refresh the auth context
          try {
            await refreshUser();
          } catch (refreshError) {
            console.warn("Could not refresh auth context:", refreshError);
          }

          // Wait a bit for currentUser to update
          await new Promise((resolve) => setTimeout(resolve, 3000));

          // Determine user type for redirection
          let finalUserType: string | null = null;

          // Utiliser directement le userType du localStorage (plus fiable)
          finalUserType = userType;

          console.log(
            "[VERIFY DEBUG] userType from localStorage:",
            userType
          );
          console.log("[VERIFY DEBUG] finalUserType:", finalUserType);

          let dashboardPath = "/";

          if (finalUserType === "patient") {
            dashboardPath = "/assessment";
            console.log("[VERIFY DEBUG] Patient → Healt-e 2.0 assessment");
          } else if (finalUserType === "professional") {
            dashboardPath = "/professional/dashboard";
            console.log("[VERIFY DEBUG] Professional dashboard selected");
          } else if (finalUserType === "admin") {
            dashboardPath = "/admin/dashboard";
            console.log("[VERIFY DEBUG] Admin dashboard selected");
          } else {
            console.warn(
              "[VERIFY DEBUG] Unknown user type, defaulting to home"
            );
          }

          console.log("[VERIFY DEBUG] Final redirect path:", dashboardPath);

          // Déclencher le modal de consentement si l'utilisateur n'a pas encore accepté les conditions
          if (!hasAgreedToTerms) {
            console.log(
              "[VERIFY DEBUG] User hasn't agreed to terms, showing modal..."
            );
            try {
              setShowTermsModal(true);
            } catch (modalError) {
              console.error("Error showing terms modal:", modalError);
            }
          }

          // Navigate after handling terms modal
          console.log("[VERIFY DEBUG] Navigating to dashboard...");
          navigate(dashboardPath);

          // Clean up localStorage AFTER navigation and stop the interval
          clearInterval(interval);
          setTimeout(() => {
            console.log("[VERIFY DEBUG] Cleaning up localStorage...");
            localStorage.removeItem("pending-user-id");
            localStorage.removeItem("pending-user-email");
            localStorage.removeItem("pending-user-name");
            localStorage.removeItem("pending-user-type");
            localStorage.removeItem("pending-service-type");
            console.log("[VERIFY DEBUG] localStorage cleaned up");
          }, 1000);
        }
      } catch (error) {
        console.error("[VERIFY DEBUG] Error in verification check:", error);
      }
    }, 2000); // Check every 2 seconds

    return () => {
      console.log("[VERIFY DEBUG] Cleaning up interval");
      clearInterval(interval);
    };
  }, [
    currentUser,
    navigate,
    auth.currentUser,
    checkingVerification,
    hasAgreedToTerms,
    setShowTermsModal,
    refreshUser,
  ]);

  const handleResendEmail = async () => {
    if (!auth.currentUser) {
      return;
    }

    await sendVerificationEmail(auth.currentUser);
  };

  const userEmail = auth.currentUser?.email || "";

  return (
    <div className="flex min-h-screen items-center justify-center bg-paper px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8 rounded-block border border-line bg-card p-8 shadow-lift">
        <div className="text-center">
          <div
            className={`mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full ${
              checkingVerification ? "bg-ok/10" : "bg-sage-soft"
            }`}
          >
            {checkingVerification ? (
              <CheckCircle2 className="h-10 w-10 text-ok" />
            ) : (
              <Mail className="h-10 w-10 text-sage" />
            )}
          </div>

          <h2 className="font-display mb-2 text-3xl font-bold text-ink">
            {checkingVerification
              ? "E-mail vérifié !"
              : "Vérifiez votre e-mail"}
          </h2>

          {checkingVerification ? (
            <p className="text-ink-soft">
              Configuration de votre compte en cours...
            </p>
          ) : (
            <>
              <p className="mb-4 text-ink-soft">
                Nous avons envoyé un lien de vérification à :
              </p>
              <p className="mb-6 font-medium text-ink">{userEmail}</p>
              <p className="text-ink-soft">
                Cliquez sur le lien dans l'e-mail pour activer votre compte.
              </p>

              <div className="mt-4 flex gap-2 rounded-card border border-line bg-sage-soft p-4 text-left">
                <Lightbulb className="mt-0.5 h-5 w-5 flex-shrink-0 text-sage" />
                <p className="text-sm text-ink-soft">
                  <strong className="text-ink">Conseil :</strong> Après avoir
                  cliqué sur le lien de vérification dans votre email, cette
                  page se mettra à jour automatiquement et vous serez
                  redirigé vers votre tableau de bord.
                </p>
              </div>
            </>
          )}
        </div>

        {!checkingVerification && (
          <div className="space-y-4">
            {emailSent && (
              <div className="flex items-center gap-2 rounded-card border border-ok/30 bg-ok/10 px-4 py-3 text-ok">
                <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
                <span>E-mail de vérification renvoyé avec succès</span>
              </div>
            )}

            {error && (
              <div className="flex items-center gap-2 rounded-card border border-danger/30 bg-danger/10 px-4 py-3 text-danger">
                <AlertCircle className="h-5 w-5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-4 text-center">
              <p className="text-sm text-ink-soft">
                Vous n'avez pas reçu l'e-mail ? Vérifiez votre dossier spam ou
              </p>

              <button
                onClick={handleResendEmail}
                disabled={isResending || isInCooldown}
                className="inline-flex items-center rounded-pill bg-sage-soft px-4 py-2 text-sm font-medium text-sage transition-colors hover:bg-sage/20 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isResending ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Envoi en cours...
                  </>
                ) : isInCooldown ? (
                  <>
                    <Mail className="mr-2 h-4 w-4" />
                    Attendre {cooldownTime}s
                  </>
                ) : (
                  <>
                    <Mail className="mr-2 h-4 w-4" />
                    Renvoyer l'e-mail
                  </>
                )}
              </button>

              {isInCooldown && (
                <p className="mt-2 text-center text-sm text-muted">
                  Vous pourrez renvoyer un e-mail dans {cooldownTime} secondes
                </p>
              )}
            </div>

            <div className="text-center">
              <Link
                to="/"
                className="inline-flex items-center text-sm text-ink-soft transition-colors hover:text-ink"
              >
                <ArrowLeft className="mr-1 h-4 w-4" />
                Retour à l'accueil
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VerifyEmail;
