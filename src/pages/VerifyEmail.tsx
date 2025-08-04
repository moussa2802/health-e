import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Mail, CheckCircle, RefreshCw, ArrowLeft } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
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
  const debugLocalStorage = () => {
    console.log("🔍 [VERIFY DEBUG] All localStorage keys:");
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        console.log(`🔍 [VERIFY DEBUG] ${key}: ${localStorage.getItem(key)}`);
      }
    }
  };

  // Check verification status periodically
  useEffect(() => {
    console.log("🔄 [VERIFY DEBUG] useEffect started");
    console.log("🔄 [VERIFY DEBUG] auth.currentUser:", auth.currentUser?.uid);
    console.log(
      "🔄 [VERIFY DEBUG] auth.currentUser.emailVerified:",
      auth.currentUser?.emailVerified
    );

    if (!auth.currentUser) return;

    const interval = setInterval(async () => {
      console.log("🔄 [VERIFY DEBUG] Checking verification status...");
      try {
        await auth.currentUser?.reload();
        console.log(
          "🔄 [VERIFY DEBUG] User reloaded, emailVerified:",
          auth.currentUser?.emailVerified
        );

        if (auth.currentUser?.emailVerified) {
          console.log(
            "✅ [VERIFY DEBUG] Email verified! Starting account setup..."
          );

          // Éviter de traiter plusieurs fois la même vérification
          if (checkingVerification) {
            console.log(
              "⏭️ [VERIFY DEBUG] Already processing verification, skipping..."
            );
            return;
          }

          setCheckingVerification(true);

          // Debug localStorage before processing
          debugLocalStorage();

          const uid = localStorage.getItem("pending-user-id");
          const email = localStorage.getItem("pending-user-email");
          const name = localStorage.getItem("pending-user-name");
          const userType = localStorage.getItem("pending-user-type") as
            | "patient"
            | "professional";
          const serviceType =
            localStorage.getItem("pending-service-type") || "mental";

          console.log("📋 [VERIFY DEBUG] Retrieved from localStorage:");
          console.log("📋 [VERIFY DEBUG] uid:", uid);
          console.log("📋 [VERIFY DEBUG] email:", email);
          console.log("📋 [VERIFY DEBUG] name:", name);
          console.log("📋 [VERIFY DEBUG] userType:", userType);
          console.log("📋 [VERIFY DEBUG] serviceType:", serviceType);

          if (uid && email && name && userType) {
            console.log(
              "✅ [VERIFY DEBUG] All required data found, creating Firestore documents..."
            );
            const db = getFirestore();
            const userRef = doc(collection(db, "users"), uid);

            try {
              console.log("📝 [VERIFY DEBUG] Creating user document...");
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
              console.log(
                "✅ [VERIFY DEBUG] User document created successfully"
              );

              if (userType === "patient") {
                console.log("👤 [VERIFY DEBUG] Creating patient profile...");
                await createDefaultPatientProfile(uid, name, email);
                console.log("✅ [VERIFY DEBUG] Patient profile created");
              } else {
                console.log(
                  "👨‍⚕️ [VERIFY DEBUG] Creating professional profile..."
                );
                await createDefaultProfessionalProfile(
                  uid,
                  name,
                  email,
                  serviceType as "mental" | "sexual"
                );
                console.log("✅ [VERIFY DEBUG] Professional profile created");
              }

              console.log("✅ Firestore documents created");
            } catch (error) {
              console.error("❌ Firestore creation error:", error);
              console.error(
                "❌ [VERIFY DEBUG] Firestore error details:",
                error
              );
            }
          } else {
            console.error(
              "❌ [VERIFY DEBUG] Missing required data for account setup:"
            );
            console.error("❌ [VERIFY DEBUG] uid:", uid);
            console.error("❌ [VERIFY DEBUG] email:", email);
            console.error("❌ [VERIFY DEBUG] name:", name);
            console.error("❌ [VERIFY DEBUG] userType:", userType);
          }

          // Force reload the current user to update the auth context
          console.log(
            "🔄 [VERIFY DEBUG] Forcing user reload to update auth context..."
          );
          try {
            await auth.currentUser?.reload();
            console.log("✅ [VERIFY DEBUG] User reloaded successfully");
          } catch (reloadError) {
            console.warn(
              "⚠️ [VERIFY DEBUG] Could not reload user:",
              reloadError
            );
          }

          // Force refresh the auth context
          console.log("🔄 [VERIFY DEBUG] Refreshing auth context...");
          try {
            await refreshUser();
            console.log(
              "✅ [VERIFY DEBUG] Auth context refreshed successfully"
            );
          } catch (refreshError) {
            console.warn(
              "⚠️ [VERIFY DEBUG] Could not refresh auth context:",
              refreshError
            );
          }

          // Wait a bit for currentUser to update
          console.log("⏳ [VERIFY DEBUG] Waiting for currentUser to update...");
          await new Promise((resolve) => setTimeout(resolve, 3000));

          // Determine user type for redirection
          let finalUserType: string | null = null;

          // 1. Tenter depuis currentUser (contexte)
          if (currentUser?.type) {
            finalUserType = currentUser.type;
            console.log(
              "✅ [VERIFY DEBUG] Using currentUser.type:",
              finalUserType
            );
          } else if (userType) {
            // 2. Sinon, utiliser userType fourni (via localStorage plus haut)
            finalUserType = userType;
            console.log(
              "✅ [VERIFY DEBUG] Using userType from localStorage:",
              finalUserType
            );
          } else {
            // 3. En dernier recours, lire à nouveau depuis localStorage
            finalUserType = localStorage.getItem("pending-user-type");
            console.log(
              "✅ [VERIFY DEBUG] Using userType from localStorage (fallback):",
              finalUserType
            );
          }

          console.log("🎯 [VERIFY DEBUG] Determining redirect:");
          console.log(
            "🎯 [VERIFY DEBUG] currentUser?.type:",
            currentUser?.type
          );
          console.log("🎯 [VERIFY DEBUG] currentUser?.id:", currentUser?.id);

          console.log("🎯 [VERIFY DEBUG] finalUserType:", finalUserType);

          let dashboardPath = "/";

          if (finalUserType === "patient") {
            dashboardPath = "/patient/dashboard";
            console.log("👤 [VERIFY DEBUG] Patient dashboard selected");
          } else if (finalUserType === "professional") {
            dashboardPath = "/professional/dashboard";
            console.log("👨‍⚕️ [VERIFY DEBUG] Professional dashboard selected");
          } else if (finalUserType === "admin") {
            dashboardPath = "/admin/dashboard";
            console.log("👑 [VERIFY DEBUG] Admin dashboard selected");
          } else {
            console.warn(
              "⚠️ [VERIFY DEBUG] Unknown user type, defaulting to home"
            );
          }

          console.log("🔄 [VERIFY DEBUG] Final redirect path:", dashboardPath);

          // Navigate immediately
          console.log("🚀 [VERIFY DEBUG] Navigating to dashboard...");
          navigate(dashboardPath);

          // Clean up localStorage AFTER navigation and stop the interval
          clearInterval(interval);
          setTimeout(() => {
            console.log("🧹 [VERIFY DEBUG] Cleaning up localStorage...");
            localStorage.removeItem("pending-user-id");
            localStorage.removeItem("pending-user-email");
            localStorage.removeItem("pending-user-name");
            localStorage.removeItem("pending-user-type");
            localStorage.removeItem("pending-service-type");
            console.log("✅ [VERIFY DEBUG] localStorage cleaned up");
          }, 1000);
        }
      } catch (error) {
        console.error("❌ [VERIFY DEBUG] Error in verification check:", error);
      }
    }, 2000); // Check every 2 seconds

    return () => {
      console.log("🧹 [VERIFY DEBUG] Cleaning up interval");
      clearInterval(interval);
    };
  }, [currentUser, navigate, auth.currentUser]);

  const handleResendEmail = async () => {
    if (!auth.currentUser) {
      return;
    }

    await sendVerificationEmail(auth.currentUser);
  };

  const userEmail = auth.currentUser?.email || "";

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto h-20 w-20 bg-blue-100 rounded-full flex items-center justify-center mb-6">
            {checkingVerification ? (
              <CheckCircle className="h-10 w-10 text-green-500" />
            ) : (
              <Mail className="h-10 w-10 text-blue-500" />
            )}
          </div>

          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            {checkingVerification
              ? "E-mail vérifié !"
              : "Vérifiez votre e-mail"}
          </h2>

          {checkingVerification ? (
            <p className="text-gray-600">
              Configuration de votre compte en cours...
            </p>
          ) : (
            <>
              <p className="text-gray-600 mb-4">
                Nous avons envoyé un lien de vérification à :
              </p>
              <p className="font-medium text-gray-900 mb-6">{userEmail}</p>
              <p className="text-gray-600">
                Cliquez sur le lien dans l'e-mail pour activer votre compte.
              </p>
            </>
          )}
        </div>

        {!checkingVerification && (
          <div className="space-y-4">
            {emailSent && (
              <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
                <div className="flex items-center">
                  <CheckCircle className="h-5 w-5 mr-2" />
                  <span>E-mail de vérification renvoyé avec succès</span>
                </div>
              </div>
            )}

            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                <span>{error}</span>
              </div>
            )}

            <div className="text-center space-y-4">
              <p className="text-sm text-gray-600">
                Vous n'avez pas reçu l'e-mail ? Vérifiez votre dossier spam ou
              </p>

              <button
                onClick={handleResendEmail}
                disabled={isResending || isInCooldown}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-blue-600 bg-blue-100 hover:bg-blue-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isResending ? (
                  <>
                    <RefreshCw className="animate-spin h-4 w-4 mr-2" />
                    Envoi en cours...
                  </>
                ) : isInCooldown ? (
                  <>
                    <Mail className="h-4 w-4 mr-2" />
                    Attendre {cooldownTime}s
                  </>
                ) : (
                  <>
                    <Mail className="h-4 w-4 mr-2" />
                    Renvoyer l'e-mail
                  </>
                )}
              </button>

              {isInCooldown && (
                <p className="mt-2 text-center text-sm text-gray-500">
                  Vous pourrez renvoyer un e-mail dans {cooldownTime} secondes
                </p>
              )}
            </div>

            <div className="text-center">
              <Link
                to="/"
                className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
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
