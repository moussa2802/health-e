import React, { useEffect, useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, AlertCircle } from "lucide-react";
import PhoneInput, { isValidPhoneNumber } from "react-phone-number-input";
import "react-phone-number-input/style.css";

import { useAuth } from "../../contexts/AuthContext";
import { useTerms } from "../../contexts/TermsContext";
import { usePhoneAuth } from "../../hooks/usePhoneAuth";

import { getFirestore, doc, getDoc } from "firebase/firestore";
import { getAuth } from "firebase/auth";

type Step =
  | "enterPhone"
  | "verify"
  | "completeProfile"
  | "alreadyAuthenticated";

const toE164 = (v: string) => (v?.startsWith("+") ? v : `+${(v || "").trim()}`);

// plus aucune pré-vérification côté client

const PatientAccess: React.FC = () => {
  const navigate = useNavigate();
  const [hasProcessedPendingRegistration, setHasProcessedPendingRegistration] =
    useState(false);

  const { isAuthenticated, currentUser, createUserWithPhone, loginWithPhone, signInWithGoogle } =
    useAuth();
  const { hasAgreedToTerms, setShowTermsModal } = useTerms();

  const {
    sendVerificationCode,
    verifyLoginCode,
    loading: phoneLoading,
    error: phoneError,
    isInCooldown,
    cooldownTime,
  } = usePhoneAuth();

  // UI state
  const [step, setStep] = useState<Step>("enterPhone");
  const [phone, setPhone] = useState<string>("");
  const [code, setCode] = useState<string>("");
  const [showSmsForm, setShowSmsForm] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // Profil (si nécessaire)
  const [fullName, setFullName] = useState<string>("");
  const [gender, setGender] = useState<"homme" | "femme" | "">("");

  const [loading, setLoading] = useState<boolean>(false);
  const [err, setErr] = useState<string>("");

  // Ref pour éviter les tentatives multiples d'inscription
  const registrationAlreadyAttemptedRef = useRef<boolean>(false);

  // Fonction pour vérifier si l'inscription est autorisée (action explicite)
  const getPendingGroupTherapySessionId = (): string | null => {
    const pendingFlag = sessionStorage.getItem(
      "pendingGroupTherapyRegistration"
    );
    if (pendingFlag === "1") {
      return sessionStorage.getItem("pendingGroupTherapySessionId");
    }
    return null;
  };

  // Fonction pour gérer l'inscription après authentification
  const handlePostAuthGroupTherapyRegistration = async (sessionId: string) => {
    // Garde principal : ne pas autoriser l'inscription sans action explicite
    const pendingSessionId = getPendingGroupTherapySessionId();
    if (!pendingSessionId || pendingSessionId !== sessionId) {
      console.warn("Group registration not allowed - no explicit user action");
      return;
    }

    // Gardes : vérifier les préconditions
    if (!sessionId) {
      console.warn("No session ID provided");
      return;
    }

    const auth = getAuth();
    const userId = auth.currentUser?.uid;

    if (!userId) {
      console.warn("No user ID available");
      return;
    }

    // Éviter les tentatives multiples
    if (registrationAlreadyAttemptedRef.current) {
      console.warn("Registration already attempted");
      return;
    }

    // Marquer comme tenté
    registrationAlreadyAttemptedRef.current = true;
    setLoading(true);
    setErr("");

    try {
      const { registerUserToSession } = await import(
        "../../services/groupTherapyService"
      );

      // Inscrire l'utilisateur (retourne { status: "registered" } ou { status: "alreadyRegistered" })
      console.log(
        `🔄 [PATIENT] Inscription à la thérapie de groupe: sessionId=${sessionId}, userId=${userId}`
      );
      const result = await registerUserToSession(sessionId, userId);

      // Nettoyer sessionStorage après inscription
      sessionStorage.removeItem("pendingGroupTherapySessionId");
      sessionStorage.removeItem("pendingGroupTherapyRegistration");

      if (result.status === "alreadyRegistered") {
        console.log(
          `ℹ️ [PATIENT] Utilisateur déjà inscrit à la session ${sessionId}`
        );
        // Rediriger quand même vers la page de réunion
        navigate(`/group-therapy/${sessionId}/meeting`, {
          state: { registered: true, alreadyRegistered: true },
        });
        return;
      }

      console.log(`✅ [PATIENT] Inscription réussie à la session ${sessionId}`);
      // Rediriger vers la page de réunion SEULEMENT après succès
      navigate(`/group-therapy/${sessionId}/meeting`, {
        state: { registered: true },
      });
    } catch (error: unknown) {
      console.error("Error registering to group therapy:", error);

      // Réinitialiser le flag en cas d'erreur pour permettre une nouvelle tentative
      registrationAlreadyAttemptedRef.current = false;

      // Afficher l'erreur et rediriger vers la page de détails
      const errorMessage =
        error instanceof Error ? error.message : "Erreur lors de l'inscription";
      setErr(errorMessage);
      // Ne pas naviguer automatiquement, laisser l'utilisateur voir l'erreur
    } finally {
      setLoading(false);
    }
  };

  // Gérer l'affichage si l'utilisateur est déjà authentifié
  useEffect(() => {
    const pendingSessionId = getPendingGroupTherapySessionId();
    // Also check for group therapy session saved before Google redirect
    const googlePendingGroup = localStorage.getItem("he_google_pending_group_session");

    if (
      isAuthenticated &&
      currentUser &&
      pendingSessionId &&
      step === "enterPhone"
    ) {
      // Afficher l'écran "déjà authentifié" pour demander confirmation
      setStep("alreadyAuthenticated");
    } else if (
      isAuthenticated &&
      currentUser &&
      googlePendingGroup &&
      !hasProcessedPendingRegistration
    ) {
      // Returning from Google redirect with a pending group therapy session
      localStorage.removeItem("he_google_pending_group_session");
      setHasProcessedPendingRegistration(true);
      handlePostAuthGroupTherapyRegistration(googlePendingGroup);
    } else if (
      isAuthenticated &&
      currentUser?.type === "patient" &&
      !pendingSessionId
    ) {
      // Si authentifié sans pendingSessionId, rediriger vers Healt-e 2.0
      navigate("/assessment");
    }
  }, [isAuthenticated, currentUser, step, navigate]);

  // ---- Google Sign-In (redirect — page will reload after Google auth) ----
  const onGoogleSignIn = async () => {
    setErr("");
    setGoogleLoading(true);
    try {
      // Store pending group therapy info so it survives the redirect
      const pendingSessionId = getPendingGroupTherapySessionId();
      if (pendingSessionId) {
        localStorage.setItem("he_google_pending_group_session", pendingSessionId);
      }
      await signInWithGoogle();
      // signInWithRedirect navigates away — code below won't execute
    } catch (e: any) {
      setErr(e?.message || "Erreur lors de la connexion Google.");
      setGoogleLoading(false);
    }
  };

  // ---- Étape 1: envoi du SMS ----
  const onSubmitPhone = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");

    console.log("📱 [PATIENT] ===== DÉBUT ON SUBMIT PHONE =====");
    console.log("📱 [PATIENT] Téléphone saisi:", phone);

    const e164 = toE164(phone);
    console.log("📱 [PATIENT] Téléphone E164:", e164);
    console.log("📱 [PATIENT] Téléphone valide:", isValidPhoneNumber(e164));

    if (!e164 || !isValidPhoneNumber(e164)) {
      console.log("❌ [PATIENT] Numéro invalide");
      setErr("Saisissez un numéro valide au format international (ex: +221…).");
      return;
    }

    try {
      console.log("🔄 [PATIENT] Début de l'envoi du code...");
      setLoading(true);
      await sendVerificationCode(e164);
      // sendVerificationCode throw une exception en cas d'erreur, donc si on arrive ici, c'est un succès
      console.log("✅ [PATIENT] Code envoyé, passage à l'étape verify");
      setStep("verify");
    } catch (e: unknown) {
      console.log("❌ [PATIENT] ===== ERREUR ON SUBMIT PHONE =====");
      console.error("❌ [PATIENT] Erreur complète:", e);
      const error = e as {
        code?: string;
        message?: string;
        originalError?: unknown;
      };
      console.error("❌ [PATIENT] Code d'erreur:", error?.code);
      console.error("❌ [PATIENT] Message:", error?.message);
      console.error("❌ [PATIENT] Erreur originale:", error?.originalError);
      // Le message d'erreur contient déjà le code (format: [code] message)
      setErr(error?.message || "Erreur lors de l'envoi du code.");
    } finally {
      console.log("🏁 [PATIENT] Fin de onSubmitPhone, loading = false");
      setLoading(false);
    }
  };

  // ---- Étape 3: création du profil (si nécessaire) ----
  const onSubmitProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");

    console.log("📝 [PATIENT] ===== DÉBUT ON SUBMIT PROFILE =====");
    console.log("👤 [PATIENT] Nom complet:", fullName);
    console.log("⚧ [PATIENT] Genre:", gender);
    console.log("📋 [PATIENT] Terms acceptés:", hasAgreedToTerms);

    if (!fullName.trim()) {
      console.log("❌ [PATIENT] Nom manquant");
      return setErr("Veuillez renseigner votre nom et prénom.");
    }
    if (!gender) {
      console.log("❌ [PATIENT] Genre manquant");
      return setErr("Veuillez sélectionner votre genre.");
    }
    if (!hasAgreedToTerms) {
      console.log("❌ [PATIENT] Terms non acceptés");
      setShowTermsModal(true);
      return setErr(
        "Vous devez accepter les conditions d'utilisation et la politique de confidentialité."
      );
    }

    try {
      console.log("🔄 [PATIENT] Début de la création du profil...");
      setLoading(true);
      const uid = getAuth().currentUser?.uid;
      if (!uid) {
        console.log("❌ [PATIENT] UID manquant");
        throw new Error("Utilisateur non authentifié.");
      }
      const e164 = toE164(getAuth().currentUser?.phoneNumber || phone);
      console.log("👤 [PATIENT] UID:", uid);
      console.log("📱 [PATIENT] E164:", e164);

      console.log(
        "📝 [PATIENT] Création du profil avec createUserWithPhone..."
      );
      await createUserWithPhone(fullName.trim(), e164, {
        type: "patient",
        gender,
      });
      console.log("✅ [PATIENT] Profil créé, connexion...");

      await loginWithPhone(uid, e164);
      console.log("🚀 [PATIENT] Connexion réussie");

      // Si on vient d'une thérapie de groupe, inscrire l'utilisateur (si intent autorisé)
      const pendingSessionId = getPendingGroupTherapySessionId();
      if (pendingSessionId && !hasProcessedPendingRegistration) {
        setHasProcessedPendingRegistration(true);
        await handlePostAuthGroupTherapyRegistration(pendingSessionId);
      } else {
        localStorage.setItem('he_new_account', 'true');
        navigate("/assessment");
      }
    } catch (e: any) {
      console.log("❌ [PATIENT] ===== ERREUR ON SUBMIT PROFILE =====");
      console.error("❌ [PATIENT] Erreur complète:", e);
      console.error("❌ [PATIENT] Message:", e?.message);
      setErr(e?.message || "Erreur lors de la création du profil.");
    } finally {
      console.log("🏁 [PATIENT] Fin de onSubmitProfile, loading = false");
      setLoading(false);
    }
  };

  // ---- Étape 2: vérification du code ----
  const onVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");

    console.log("🔐 [PATIENT] ===== DÉBUT ON VERIFY CODE =====");
    console.log("🔢 [PATIENT] Code saisi:", code);

    if (!code.trim()) {
      console.log("❌ [PATIENT] Code vide");
      setErr("Veuillez saisir le code reçu par SMS.");
      return;
    }

    try {
      console.log("🔄 [PATIENT] Début de la vérification du code...");
      setLoading(true);
      const cred = await verifyLoginCode(code);
      if (!cred?.user) {
        console.log("❌ [PATIENT] Credential ou user manquant");
        throw new Error("Code invalide ou expiré.");
      }

      const uid = cred.user.uid;
      const e164 = toE164(cred.user.phoneNumber || phone);
      console.log("👤 [PATIENT] UID:", uid);
      console.log("📱 [PATIENT] E164:", e164);

      console.log("🔍 [PATIENT] Vérification de l'existence du profil...");
      const db = getFirestore();
      let profileExists = false;
      try {
        const snap = await getDoc(doc(db, "users", uid));
        profileExists = snap.exists();
        console.log("📋 [PATIENT] Profil existe:", profileExists);
      } catch (err: any) {
        console.log("⚠️ [PATIENT] Erreur lecture Firestore:", err);
        // Si la lecture est refusée, on bascule en création de profil
        if (err?.code === "permission-denied") {
          console.log(
            "🔒 [PATIENT] Permission refusée, considère profil inexistant"
          );
          profileExists = false;
        } else {
          throw err;
        }
      }

      if (profileExists) {
        console.log("✅ [PATIENT] Profil existant, connexion...");
        await loginWithPhone(uid, e164);
        console.log("🚀 [PATIENT] Connexion réussie");

        // Si on vient d'une thérapie de groupe, inscrire l'utilisateur (si intent autorisé)
        const pendingSessionId = getPendingGroupTherapySessionId();
        if (pendingSessionId && !hasProcessedPendingRegistration) {
          setHasProcessedPendingRegistration(true);
          await handlePostAuthGroupTherapyRegistration(pendingSessionId);
        } else {
          navigate("/assessment");
        }
      } else {
        // Nouvel utilisateur - créer automatiquement avec un nom par défaut
        console.log("🆕 [PATIENT] Nouvel utilisateur, création automatique...");

        // Vérifier si les termes sont acceptés
        if (!hasAgreedToTerms) {
          console.log(
            "⚠️ [PATIENT] Terms non acceptés, passage à completeProfile"
          );
          setStep("completeProfile");
          return;
        }

        try {
          // Créer un nom par défaut basé sur le numéro de téléphone
          const defaultName = `Patient ${e164.slice(-4)}`;

          await createUserWithPhone(defaultName, e164, {
            type: "patient",
            gender: "homme", // Genre par défaut
          });

          console.log("✅ [PATIENT] Compte créé automatiquement");

          // Se connecter
          await loginWithPhone(uid, e164);
          console.log("🚀 [PATIENT] Connexion réussie");

          // Si on vient d'une thérapie de groupe, inscrire l'utilisateur (si intent autorisé)
          const pendingSessionId = getPendingGroupTherapySessionId();
          if (pendingSessionId && !hasProcessedPendingRegistration) {
            setHasProcessedPendingRegistration(true);
            await handlePostAuthGroupTherapyRegistration(pendingSessionId);
          } else {
            localStorage.setItem('he_new_account', 'true');
            navigate("/assessment");
          }
        } catch (createError: any) {
          console.error(
            "❌ [PATIENT] Erreur création automatique:",
            createError
          );
          // En cas d'erreur, passer à l'étape de création manuelle
          setStep("completeProfile");
        }
      }
    } catch (e: any) {
      console.log("❌ [PATIENT] ===== ERREUR ON VERIFY CODE =====");
      console.error("❌ [PATIENT] Erreur complète:", e);
      console.error("❌ [PATIENT] Message:", e?.message);
      setErr(e?.message || "La vérification a échoué.");
    } finally {
      console.log("🏁 [PATIENT] Fin de onVerifyCode, loading = false");
      setLoading(false);
    }
  };

  /* ── Step index for progress dots ── */
  const stepIndex =
    step === "enterPhone" ? 0
    : step === "verify" ? 1
    : step === "completeProfile" ? 2
    : 0;

  const gradientBtn =
    "w-full text-white font-semibold px-4 py-3 rounded-xl shadow disabled:opacity-50 disabled:cursor-not-allowed transition-opacity";

  const inputCls =
    "w-full rounded-xl border border-white/40 bg-white/60 px-4 py-3 text-gray-800 placeholder-gray-400 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-200 backdrop-blur-sm";

  return (
    <div
      className="min-h-screen relative overflow-hidden"
      style={{ background: "#F8FAFF" }}
    >
      {/* ── Gradient blobs (same as homepage) ── */}
      <div
        style={{
          position: "absolute", top: "-15%", right: "-10%",
          width: 500, height: 500, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(59,130,246,0.10) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute", bottom: "-10%", left: "-5%",
          width: 400, height: 400, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(45,212,191,0.09) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      {/* ── Back link ── */}
      <div className="relative z-10 pt-6 px-6">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour à l'accueil
        </Link>
      </div>

      {/* ── Main card ── */}
      <div className="relative z-10 flex items-center justify-center px-4 py-10 min-h-[calc(100vh-64px)]">
        <div
          className="w-full max-w-md rounded-3xl p-8"
          style={{
            background: "rgba(255,255,255,0.82)",
            backdropFilter: "blur(18px)",
            WebkitBackdropFilter: "blur(18px)",
            border: "1.5px solid rgba(255,255,255,0.6)",
            boxShadow: "0 8px 40px rgba(59,130,246,0.10), 0 1.5px 8px rgba(0,0,0,0.04)",
          }}
        >
          {/* ── Dr. Lô avatar (compact) ── */}
          <div className="flex flex-col items-center mb-7">
            <div className="relative mb-4" style={{ width: 80, height: 80 }}>
              {/* Gradient ring */}
              <div
                style={{
                  position: "absolute", inset: 0, borderRadius: "50%",
                  padding: 3,
                  background: "linear-gradient(135deg,#3B82F6,#2DD4BF)",
                }}
              >
                <div style={{ borderRadius: "50%", width: "100%", height: "100%", background: "white" }} />
              </div>
              <img
                src="/dr-lo.png"
                alt="Dr. Lô"
                style={{
                  position: "absolute", inset: 5,
                  width: "calc(100% - 10px)", height: "calc(100% - 10px)",
                  borderRadius: "50%", objectFit: "cover", objectPosition: "top center",
                }}
              />
              {/* Badge */}
              <div
                style={{
                  position: "absolute", bottom: 2, right: 0,
                  background: "linear-gradient(135deg,#3B82F6,#2DD4BF)",
                  borderRadius: "50%", width: 22, height: 22,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 11, border: "2px solid white",
                }}
              >
                🧠
              </div>
            </div>

            <h1
              className="text-2xl font-bold text-center"
              style={{
                background: "linear-gradient(135deg,#3B82F6,#2DD4BF)",
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
              }}
            >
              Espace Patient
            </h1>
            <p className="text-sm text-gray-500 mt-1 text-center">
              {step === "enterPhone" && "Connectez-vous en un clic avec Google ou par SMS."}
              {step === "verify" && "Entrez le code reçu par SMS."}
              {step === "completeProfile" && "Finalisez votre inscription."}
              {step === "alreadyAuthenticated" && "Vous êtes déjà connecté(e)."}
            </p>

            {/* Step progress dots */}
            {step !== "alreadyAuthenticated" && (
              <div className="flex gap-2 mt-4">
                {[0, 1, 2].map(i => (
                  <div
                    key={i}
                    style={{
                      width: i === stepIndex ? 22 : 8,
                      height: 8,
                      borderRadius: 4,
                      background: i === stepIndex
                        ? "linear-gradient(135deg,#3B82F6,#2DD4BF)"
                        : i < stepIndex ? "rgba(59,130,246,0.4)" : "rgba(0,0,0,0.10)",
                      transition: "all 0.3s ease",
                    }}
                  />
                ))}
              </div>
            )}
          </div>

          {/* ── Error banner ── */}
          {(err || phoneError) && (
            <div className="mb-5 p-3 rounded-xl flex items-center gap-2 text-sm text-red-700"
              style={{ background: "rgba(254,226,226,0.8)", border: "1px solid rgba(252,165,165,0.5)" }}>
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{err || phoneError}</span>
            </div>
          )}

          {/* ── STEP 1: Google + téléphone ── */}
          {step === "enterPhone" && (
            <div className="space-y-5">
              {/* ── Google Sign-In (Primary) ── */}
              <button
                type="button"
                onClick={onGoogleSignIn}
                disabled={googleLoading || loading || phoneLoading}
                className="w-full flex items-center justify-center gap-3 px-4 py-3.5 rounded-xl font-semibold text-sm transition-all"
                style={{
                  background: "white",
                  border: "1.5px solid rgba(0,0,0,0.12)",
                  color: "#1E293B",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                  opacity: googleLoading ? 0.6 : 1,
                  cursor: googleLoading ? "not-allowed" : "pointer",
                }}
              >
                {googleLoading ? (
                  <span>Connexion Google...</span>
                ) : (
                  <>
                    <svg width="20" height="20" viewBox="0 0 48 48">
                      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                    </svg>
                    <span>Continuer avec Google</span>
                  </>
                )}
              </button>

              {/* ── Divider ── */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px" style={{ background: "rgba(0,0,0,0.10)" }} />
                <span className="text-xs text-gray-400 font-medium">ou</span>
                <div className="flex-1 h-px" style={{ background: "rgba(0,0,0,0.10)" }} />
              </div>

              {/* ── SMS toggle / form ── */}
              {!showSmsForm ? (
                <button
                  type="button"
                  onClick={() => setShowSmsForm(true)}
                  className="w-full text-sm text-gray-500 hover:text-gray-700 font-medium py-2.5 rounded-xl transition-colors"
                  style={{
                    background: "rgba(0,0,0,0.03)",
                    border: "1px solid rgba(0,0,0,0.07)",
                  }}
                >
                  Continuer par SMS
                </button>
              ) : (
                <form onSubmit={onSubmitPhone} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1.5">
                      Numero de telephone
                    </label>
                    <PhoneInput
                      international
                      defaultCountry="SN"
                      value={phone}
                      onChange={(v) => setPhone(v || "")}
                      className="w-full rounded-xl border border-white/40 bg-white/60 px-3 py-3 focus:border-blue-400 focus:ring-blue-200"
                      placeholder="Ex: +221 77 123 45 67"
                    />
                    <p className="text-xs text-gray-400 mt-1.5">
                      Format international requis (ex: +221...).
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={
                      loading || phoneLoading || !phone ||
                      !isValidPhoneNumber(toE164(phone)) || isInCooldown
                    }
                    className={gradientBtn}
                    style={{ background: "linear-gradient(135deg,#3B82F6,#2DD4BF)" }}
                  >
                    {loading || phoneLoading
                      ? "Envoi du code..."
                      : isInCooldown
                      ? `Reessayez dans ${cooldownTime}s`
                      : "Recevoir le code"}
                  </button>
                </form>
              )}
            </div>
          )}

          {/* ── STEP 2: vérification du code ── */}
          {step === "verify" && (
            <form onSubmit={onVerifyCode} className="space-y-5">
              <div
                className="text-sm text-center rounded-xl py-2 px-4"
                style={{ background: "rgba(59,130,246,0.07)", color: "#2563EB" }}
              >
                Code envoyé au <span className="font-semibold">{toE164(phone)}</span>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1.5">
                  Code de vérification
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className={inputCls}
                  placeholder="123456"
                />
              </div>

              <button
                type="submit"
                disabled={loading || phoneLoading || !code.trim()}
                className={gradientBtn}
                style={{ background: "linear-gradient(135deg,#3B82F6,#2DD4BF)" }}
              >
                {loading || phoneLoading ? "Vérification…" : "Vérifier →"}
              </button>

              <button
                type="button"
                onClick={() => { setCode(""); setStep("enterPhone"); }}
                className="w-full text-sm text-gray-500 hover:text-gray-700 font-medium pt-1"
              >
                ← Modifier le numéro
              </button>
            </form>
          )}

          {/* ── STEP 3: profil (si nécessaire) ── */}
          {step === "completeProfile" && (
            <form onSubmit={onSubmitProfile} className="space-y-5">
              <p className="text-sm text-gray-500 text-center -mt-2 mb-1">
                Complétez votre profil pour finaliser l'inscription.
              </p>

              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1.5">
                  Nom et prénom
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className={inputCls}
                  placeholder="Votre nom complet"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1.5">
                  Genre
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {(["homme", "femme"] as const).map(g => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setGender(g)}
                      className="px-4 py-3 rounded-xl text-sm font-medium transition-all"
                      style={{
                        border: gender === g
                          ? "1.5px solid #3B82F6"
                          : "1.5px solid rgba(0,0,0,0.12)",
                        background: gender === g
                          ? "rgba(59,130,246,0.08)"
                          : "rgba(255,255,255,0.5)",
                        color: gender === g ? "#2563EB" : "#4B5563",
                      }}
                    >
                      {g === "homme" ? "👨 Homme" : "👩 Femme"}
                    </button>
                  ))}
                </div>
              </div>

              <div
                className="flex items-center justify-between rounded-xl p-3"
                style={{ background: "rgba(0,0,0,0.03)", border: "1px solid rgba(0,0,0,0.07)" }}
              >
                <div className="flex items-center gap-2">
                  <input
                    id="terms"
                    type="checkbox"
                    checked={hasAgreedToTerms}
                    readOnly
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                  />
                  <label htmlFor="terms" className="text-xs text-gray-600">
                    J'accepte les conditions & confidentialité
                  </label>
                </div>
                <button
                  type="button"
                  onClick={() => setShowTermsModal(true)}
                  className="text-blue-500 hover:text-blue-600 text-xs font-medium underline ml-2 flex-shrink-0"
                >
                  Lire
                </button>
              </div>

              <button
                type="submit"
                disabled={loading || phoneLoading || !fullName.trim() || !gender}
                className={gradientBtn}
                style={{ background: "linear-gradient(135deg,#3B82F6,#2DD4BF)" }}
              >
                {loading || phoneLoading ? "Création…" : "Créer mon compte →"}
              </button>

              <button
                type="button"
                onClick={() => setStep("enterPhone")}
                className="w-full text-sm text-gray-500 hover:text-gray-700 font-medium pt-1"
              >
                ← Changer de numéro
              </button>
            </form>
          )}

          {/* ── STEP: Déjà authentifié ── */}
          {step === "alreadyAuthenticated" && getPendingGroupTherapySessionId() && (
            <div className="space-y-5">
              <p className="text-sm text-gray-600 text-center">
                Vous êtes déjà connecté(e). Confirmez pour rejoindre la session de thérapie de groupe.
              </p>

              <button
                type="button"
                onClick={() => {
                  const pendingSessionId = getPendingGroupTherapySessionId();
                  if (pendingSessionId && !hasProcessedPendingRegistration) {
                    setHasProcessedPendingRegistration(true);
                    handlePostAuthGroupTherapyRegistration(pendingSessionId);
                  }
                }}
                disabled={loading}
                className={gradientBtn}
                style={{ background: "linear-gradient(135deg,#3B82F6,#2DD4BF)" }}
              >
                {loading ? "Inscription en cours…" : "Rejoindre la session →"}
              </button>

              <button
                type="button"
                onClick={() => navigate("/patient/dashboard")}
                className="w-full text-sm text-gray-500 hover:text-gray-700 font-medium pt-1"
              >
                ← Retour au tableau de bord
              </button>
            </div>
          )}

          {/* recaptcha anchor */}
          <div id="recaptcha-container" />
        </div>
      </div>
    </div>
  );
};

export default PatientAccess;
