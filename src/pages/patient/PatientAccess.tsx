import React, { useEffect, useState, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, ArrowRight, ChevronLeft, AlertCircle, Heart, User, Eye, EyeOff, Mail } from "lucide-react";
import PhoneInput, { isValidPhoneNumber } from "react-phone-number-input";
import "react-phone-number-input/style.css";

import { useAuth } from "../../contexts/AuthContext";
import { useTerms } from "../../contexts/TermsContext";
import { usePhoneAuth } from "../../hooks/usePhoneAuth";
import { validateEmail } from "../../utils/emailValidation";
import EmailInput from "../../components/auth/EmailInput";

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
  const location = useLocation();
  // Retour vers /app si on venait de là (ex: ProtectedRoute a mémorisé state.from),
  // sinon comportement historique inchangé (toujours /assessment).
  const fromPath = (location.state as { from?: { pathname?: string } } | null)
    ?.from?.pathname;
  const postLoginPath = fromPath?.startsWith("/app") ? fromPath : "/assessment";
  const [hasProcessedPendingRegistration, setHasProcessedPendingRegistration] =
    useState(false);

  const { isAuthenticated, currentUser, createUserWithPhone, loginWithPhone, signInWithGoogle, login, register } =
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

  // Email auth state
  const [emailMode, setEmailMode] = useState<"login" | "register">("login");
  const [emailValue, setEmailValue] = useState("");
  const [passwordValue, setPasswordValue] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [emailFullName, setEmailFullName] = useState("");
  const [emailGender, setEmailGender] = useState<"homme" | "femme" | "">("");

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
        `[PATIENT] Inscription à la thérapie de groupe: sessionId=${sessionId}, userId=${userId}`
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

      console.log(`[PATIENT] Inscription réussie à la session ${sessionId}`);
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
      navigate(postLoginPath);
    }
  }, [isAuthenticated, currentUser, step, navigate, postLoginPath]);

  // ---- Google Sign-In (popup, with redirect fallback) ----
  const onGoogleSignIn = async () => {
    setErr("");
    setGoogleLoading(true);
    try {
      // Store pending group therapy info so it survives a possible redirect fallback
      const pendingSessionId = getPendingGroupTherapySessionId();
      if (pendingSessionId) {
        localStorage.setItem("he_google_pending_group_session", pendingSessionId);
      }
      await signInWithGoogle();
      // Popup succeeded — navigate directly to assessment
      navigate(postLoginPath);
    } catch (e: any) {
      setErr(e?.message || "Erreur lors de la connexion Google.");
      setGoogleLoading(false);
    }
  };

  // ---- Email login ----
  const onEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    if (!emailValue.trim() || !passwordValue) {
      setErr("Veuillez remplir tous les champs.");
      return;
    }
    const emailCheck = validateEmail(emailValue);
    if (!emailCheck.valid) {
      setErr(emailCheck.error!);
      return;
    }
    setLoading(true);
    try {
      await login(emailValue.trim(), passwordValue, "patient");
      const pendingSessionId = getPendingGroupTherapySessionId();
      if (pendingSessionId && !hasProcessedPendingRegistration) {
        setHasProcessedPendingRegistration(true);
        await handlePostAuthGroupTherapyRegistration(pendingSessionId);
      } else {
        navigate(postLoginPath);
      }
    } catch (e: any) {
      const msg = e?.message || "Erreur lors de la connexion.";
      if (msg.includes("mot de passe") || msg.includes("password") || e?.code === "auth/wrong-password" || e?.code === "auth/invalid-credential") {
        setErr("Email ou mot de passe incorrect.");
      } else if (e?.code === "auth/user-not-found") {
        setErr("Aucun compte trouvé avec cet email. Créez un compte.");
        setEmailMode("register");
      } else {
        setErr(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  // ---- Email register ----
  const onEmailRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    if (!emailValue.trim() || !passwordValue || !emailFullName.trim() || !emailGender) {
      setErr("Veuillez remplir tous les champs.");
      return;
    }
    const emailCheck = validateEmail(emailValue);
    if (!emailCheck.valid) {
      setErr(emailCheck.error!);
      return;
    }
    if (passwordValue.length < 6) {
      setErr("Le mot de passe doit contenir au moins 6 caractères.");
      return;
    }
    if (!hasAgreedToTerms) {
      setShowTermsModal(true);
      setErr("Vous devez accepter les conditions d'utilisation.");
      return;
    }
    setLoading(true);
    try {
      await register(emailValue.trim(), passwordValue, "patient", {
        name: emailFullName.trim(),
        displayName: emailFullName.trim(),
        gender: emailGender,
        type: "patient",
      });
      await login(emailValue.trim(), passwordValue, "patient");
      localStorage.setItem("he_new_account", "true");
      const pendingSessionId = getPendingGroupTherapySessionId();
      if (pendingSessionId && !hasProcessedPendingRegistration) {
        setHasProcessedPendingRegistration(true);
        await handlePostAuthGroupTherapyRegistration(pendingSessionId);
      } else {
        navigate(postLoginPath);
      }
    } catch (e: any) {
      setErr(e?.message || "Erreur lors de la création du compte.");
    } finally {
      setLoading(false);
    }
  };

  // ---- Étape 1: envoi du SMS (ancien utilisateurs seulement) ----
  const onSubmitPhone = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");

    console.log("[PATIENT] ===== DÉBUT ON SUBMIT PHONE =====");
    console.log("[PATIENT] Téléphone saisi:", phone);

    const e164 = toE164(phone);
    console.log("[PATIENT] Téléphone E164:", e164);
    console.log("[PATIENT] Téléphone valide:", isValidPhoneNumber(e164));

    if (!e164 || !isValidPhoneNumber(e164)) {
      console.log("[PATIENT] Numéro invalide");
      setErr("Saisissez un numéro valide au format international (ex: +221…).");
      return;
    }

    try {
      console.log("[PATIENT] Début de l'envoi du code...");
      setLoading(true);
      await sendVerificationCode(e164);
      // sendVerificationCode throw une exception en cas d'erreur, donc si on arrive ici, c'est un succès
      console.log("[PATIENT] Code envoyé, passage à l'étape verify");
      setStep("verify");
    } catch (e: unknown) {
      console.log("[PATIENT] ===== ERREUR ON SUBMIT PHONE =====");
      console.error("[PATIENT] Erreur complète:", e);
      const error = e as {
        code?: string;
        message?: string;
        originalError?: unknown;
      };
      console.error("[PATIENT] Code d'erreur:", error?.code);
      console.error("[PATIENT] Message:", error?.message);
      console.error("[PATIENT] Erreur originale:", error?.originalError);
      // Le message d'erreur contient déjà le code (format: [code] message)
      setErr(error?.message || "Erreur lors de l'envoi du code.");
    } finally {
      console.log("[PATIENT] Fin de onSubmitPhone, loading = false");
      setLoading(false);
    }
  };

  // ---- Étape 3: création du profil (si nécessaire) ----
  const onSubmitProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");

    console.log("[PATIENT] ===== DÉBUT ON SUBMIT PROFILE =====");
    console.log("[PATIENT] Nom complet:", fullName);
    console.log("[PATIENT] Genre:", gender);
    console.log("[PATIENT] Terms acceptés:", hasAgreedToTerms);

    if (!fullName.trim()) {
      console.log("[PATIENT] Nom manquant");
      return setErr("Veuillez renseigner votre nom et prénom.");
    }
    if (!gender) {
      console.log("[PATIENT] Genre manquant");
      return setErr("Veuillez sélectionner votre genre.");
    }
    if (!hasAgreedToTerms) {
      console.log("[PATIENT] Terms non acceptés");
      setShowTermsModal(true);
      return setErr(
        "Vous devez accepter les conditions d'utilisation et la politique de confidentialité."
      );
    }

    try {
      console.log("[PATIENT] Début de la création du profil...");
      setLoading(true);
      const uid = getAuth().currentUser?.uid;
      if (!uid) {
        console.log("[PATIENT] UID manquant");
        throw new Error("Utilisateur non authentifié.");
      }
      const e164 = toE164(getAuth().currentUser?.phoneNumber || phone);
      console.log("[PATIENT] UID:", uid);
      console.log("[PATIENT] E164:", e164);

      console.log(
        "[PATIENT] Création du profil avec createUserWithPhone..."
      );
      await createUserWithPhone(fullName.trim(), e164, {
        type: "patient",
        gender,
      });
      console.log("[PATIENT] Profil créé, connexion...");

      await loginWithPhone(uid, e164);
      console.log("[PATIENT] Connexion réussie");

      // Si on vient d'une thérapie de groupe, inscrire l'utilisateur (si intent autorisé)
      const pendingSessionId = getPendingGroupTherapySessionId();
      if (pendingSessionId && !hasProcessedPendingRegistration) {
        setHasProcessedPendingRegistration(true);
        await handlePostAuthGroupTherapyRegistration(pendingSessionId);
      } else {
        localStorage.setItem('he_new_account', 'true');
        navigate(postLoginPath);
      }
    } catch (e: any) {
      console.log("[PATIENT] ===== ERREUR ON SUBMIT PROFILE =====");
      console.error("[PATIENT] Erreur complète:", e);
      console.error("[PATIENT] Message:", e?.message);
      setErr(e?.message || "Erreur lors de la création du profil.");
    } finally {
      console.log("[PATIENT] Fin de onSubmitProfile, loading = false");
      setLoading(false);
    }
  };

  // ---- Étape 2: vérification du code ----
  const onVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");

    console.log("[PATIENT] ===== DÉBUT ON VERIFY CODE =====");
    console.log("[PATIENT] Code saisi:", code);

    if (!code.trim()) {
      console.log("[PATIENT] Code vide");
      setErr("Veuillez saisir le code reçu par SMS.");
      return;
    }

    try {
      console.log("[PATIENT] Début de la vérification du code...");
      setLoading(true);
      const cred = await verifyLoginCode(code);
      if (!cred?.user) {
        console.log("[PATIENT] Credential ou user manquant");
        throw new Error("Code invalide ou expiré.");
      }

      const uid = cred.user.uid;
      const e164 = toE164(cred.user.phoneNumber || phone);
      console.log("[PATIENT] UID:", uid);
      console.log("[PATIENT] E164:", e164);

      console.log("[PATIENT] Vérification de l'existence du profil...");
      const db = getFirestore();
      let profileExists = false;
      try {
        const snap = await getDoc(doc(db, "users", uid));
        profileExists = snap.exists();
        console.log("[PATIENT] Profil existe:", profileExists);
      } catch (err: any) {
        console.log("[PATIENT] Erreur lecture Firestore:", err);
        // Si la lecture est refusée, on bascule en création de profil
        if (err?.code === "permission-denied") {
          console.log(
            "[PATIENT] Permission refusée, considère profil inexistant"
          );
          profileExists = false;
        } else {
          throw err;
        }
      }

      if (profileExists) {
        console.log("[PATIENT] Profil existant, connexion...");
        await loginWithPhone(uid, e164);
        console.log("[PATIENT] Connexion réussie");

        // Si on vient d'une thérapie de groupe, inscrire l'utilisateur (si intent autorisé)
        const pendingSessionId = getPendingGroupTherapySessionId();
        if (pendingSessionId && !hasProcessedPendingRegistration) {
          setHasProcessedPendingRegistration(true);
          await handlePostAuthGroupTherapyRegistration(pendingSessionId);
        } else {
          navigate(postLoginPath);
        }
      } else {
        // Nouvel utilisateur - créer automatiquement avec un nom par défaut
        console.log("🆕 [PATIENT] Nouvel utilisateur, création automatique...");

        // Vérifier si les termes sont acceptés
        if (!hasAgreedToTerms) {
          console.log(
            "[PATIENT] Terms non acceptés, passage à completeProfile"
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

          console.log("[PATIENT] Compte créé automatiquement");

          // Se connecter
          await loginWithPhone(uid, e164);
          console.log("[PATIENT] Connexion réussie");

          // Si on vient d'une thérapie de groupe, inscrire l'utilisateur (si intent autorisé)
          const pendingSessionId = getPendingGroupTherapySessionId();
          if (pendingSessionId && !hasProcessedPendingRegistration) {
            setHasProcessedPendingRegistration(true);
            await handlePostAuthGroupTherapyRegistration(pendingSessionId);
          } else {
            localStorage.setItem('he_new_account', 'true');
            navigate(postLoginPath);
          }
        } catch (createError: any) {
          console.error(
            "[PATIENT] Erreur création automatique:",
            createError
          );
          // En cas d'erreur, passer à l'étape de création manuelle
          setStep("completeProfile");
        }
      }
    } catch (e: any) {
      console.log("[PATIENT] ===== ERREUR ON VERIFY CODE =====");
      console.error("[PATIENT] Erreur complète:", e);
      console.error("[PATIENT] Message:", e?.message);
      setErr(e?.message || "La vérification a échoué.");
    } finally {
      console.log("[PATIENT] Fin de onVerifyCode, loading = false");
      setLoading(false);
    }
  };

  /* ── Step index for progress dots ── */
  const stepIndex =
    step === "enterPhone" ? 0
    : step === "verify" ? 1
    : step === "completeProfile" ? 2
    : 0;

  const primaryBtnCls =
    "w-full flex items-center justify-center gap-2 text-white font-semibold px-4 py-3 rounded-pill bg-ink hover:bg-ink/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors";

  const inputCls =
    "w-full rounded-xl border border-line bg-card px-4 py-3 text-ink placeholder-muted focus:outline-none focus:border-accent transition-colors";

  const backLinkCls =
    "w-full flex items-center justify-center gap-1.5 text-sm text-ink-soft hover:text-ink font-medium pt-1 transition-colors";

  return (
    <div className="min-h-screen bg-paper">
      {/* ── Back link ── */}
      <div className="pt-6 px-6">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:text-accent/80 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour à l'accueil
        </Link>
      </div>

      {/* ── Main card ── */}
      <div className="flex items-center justify-center px-4 py-10 min-h-[calc(100vh-64px)]">
        <div className="w-full max-w-md bg-card rounded-block border border-line shadow-lift p-8">
          {/* ── Dr. Lô avatar (compact) ── */}
          <div className="flex flex-col items-center mb-7">
            <div className="relative mb-4 w-20 h-20">
              <img
                src="/dr-lo.png"
                alt="Dr. Lô"
                className="w-full h-full rounded-full object-cover object-top border-4 border-accent-soft shadow-soft"
              />
              {/* Badge */}
              <div className="absolute -bottom-0.5 -right-0.5 w-[22px] h-[22px] rounded-full bg-accent border-2 border-card flex items-center justify-center">
                <Heart className="h-3 w-3 text-white" />
              </div>
            </div>

            <h1 className="font-display text-2xl font-bold text-center text-ink">
              Espace Patient
            </h1>
            <p className="text-sm text-ink-soft mt-1 text-center">
              {step === "enterPhone" && !showSmsForm && (emailMode === "login" ? "Connectez-vous avec Google ou votre email." : "Créez votre compte en quelques secondes.")}
              {step === "enterPhone" && showSmsForm && "Connectez-vous avec votre numéro existant."}
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
                    className={`h-2 rounded-full transition-all duration-300 ${
                      i === stepIndex
                        ? "w-[22px] bg-accent"
                        : i < stepIndex
                        ? "w-2 bg-accent/40"
                        : "w-2 bg-line"
                    }`}
                  />
                ))}
              </div>
            )}
          </div>

          {/* ── Error banner ── */}
          {(err || phoneError) && (
            <div className="mb-5 p-3 rounded-xl flex items-center gap-2 text-sm text-danger bg-danger/10 border border-danger/20">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{err || phoneError}</span>
            </div>
          )}

          {/* ── STEP 1: Google + Email (primary) / SMS (legacy) ── */}
          {step === "enterPhone" && !showSmsForm && (
            <div className="space-y-5">
              {/* ── Google Sign-In ── */}
              <button
                type="button"
                onClick={onGoogleSignIn}
                disabled={googleLoading || loading || phoneLoading}
                className="w-full flex items-center justify-center gap-3 px-4 py-3.5 rounded-pill font-semibold text-sm bg-card border border-line text-ink hover:bg-paper transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
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
                <div className="flex-1 h-px bg-line" />
                <span className="text-xs text-muted font-medium">ou</span>
                <div className="flex-1 h-px bg-line" />
              </div>

              {/* ── Email login / register form ── */}
              <form onSubmit={emailMode === "login" ? onEmailLogin : onEmailRegister} className="space-y-3.5">
                {emailMode === "register" && (
                  <>
                    <div>
                      <label className="block text-xs font-semibold text-ink-soft mb-1.5">Nom et prénom</label>
                      <input
                        type="text"
                        value={emailFullName}
                        onChange={(e) => setEmailFullName(e.target.value)}
                        className={inputCls}
                        placeholder="Votre nom complet"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-ink-soft mb-1.5">Genre</label>
                      <div className="grid grid-cols-2 gap-2.5">
                        {(["homme", "femme"] as const).map(g => (
                          <button
                            key={g}
                            type="button"
                            onClick={() => setEmailGender(g)}
                            className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium border transition-colors ${
                              emailGender === g
                                ? "border-accent bg-accent-soft text-accent"
                                : "border-line bg-card text-ink-soft hover:bg-paper"
                            }`}
                          >
                            <User className="h-4 w-4" />
                            {g === "homme" ? "Homme" : "Femme"}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-xs font-semibold text-ink-soft mb-1.5">Email</label>
                  <EmailInput
                    value={emailValue}
                    onChange={setEmailValue}
                    className={inputCls}
                    placeholder="votre@email.com"
                    autoComplete="email"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ink-soft mb-1.5">Mot de passe</label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={passwordValue}
                      onChange={(e) => setPasswordValue(e.target.value)}
                      className={`${inputCls} pr-10`}
                      placeholder={emailMode === "register" ? "6 caractères minimum" : "Votre mot de passe"}
                      autoComplete={emailMode === "register" ? "new-password" : "current-password"}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink-soft transition-colors bg-transparent border-none cursor-pointer p-0"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {emailMode === "register" && (
                  <div className="flex items-center justify-between rounded-xl p-3 bg-paper border border-line">
                    <div className="flex items-center gap-2">
                      <input
                        id="terms-email"
                        type="checkbox"
                        checked={hasAgreedToTerms}
                        readOnly
                        className="h-4 w-4 text-accent border-line rounded"
                      />
                      <label htmlFor="terms-email" className="text-xs text-ink-soft">
                        J'accepte les conditions & confidentialité
                      </label>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowTermsModal(true)}
                      className="text-accent hover:text-accent/80 text-xs font-medium underline ml-2 flex-shrink-0"
                    >
                      Lire
                    </button>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || !emailValue.trim() || !passwordValue}
                  className={primaryBtnCls}
                >
                  {loading ? (emailMode === "login" ? "Connexion..." : "Création...") : (
                    <>
                      <Mail className="h-4 w-4" />
                      {emailMode === "login" ? "Se connecter" : "Créer mon compte"}
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => { setEmailMode(emailMode === "login" ? "register" : "login"); setErr(""); }}
                  className="w-full text-center text-xs text-accent hover:text-accent/80 font-medium py-1 bg-transparent border-none cursor-pointer transition-colors"
                >
                  {emailMode === "login" ? "Pas de compte ? Créer un compte" : "Déjà un compte ? Se connecter"}
                </button>
              </form>

              {/* ── Legacy SMS link ── */}
              <div className="pt-2 border-t border-line">
                <button
                  type="button"
                  onClick={() => setShowSmsForm(true)}
                  className="w-full text-xs text-muted hover:text-ink-soft font-medium py-1.5 bg-transparent border-none cursor-pointer transition-colors"
                >
                  Ancien compte SMS ? Se connecter par téléphone →
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 1b: SMS form (legacy, existing users only) ── */}
          {step === "enterPhone" && showSmsForm && (
            <div className="space-y-5">
              <div className="text-xs text-center rounded-xl py-2.5 px-4 bg-warm-amber/10 text-warm-amber border border-warm-amber/20">
                Réservé aux comptes existants. La connexion SMS sera bientôt désactivée.
              </div>

              <form onSubmit={onSubmitPhone} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-ink-soft mb-1.5">
                    Numéro de téléphone
                  </label>
                  <PhoneInput
                    international
                    defaultCountry="SN"
                    value={phone}
                    onChange={(v) => setPhone(v || "")}
                    className="w-full rounded-xl border border-line bg-card px-3 py-3 focus-within:border-accent transition-colors"
                    placeholder="Ex: +221 77 123 45 67"
                  />
                  <p className="text-xs text-muted mt-1.5">
                    Format international requis (ex: +221...).
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={
                    loading || phoneLoading || !phone ||
                    !isValidPhoneNumber(toE164(phone)) || isInCooldown
                  }
                  className={primaryBtnCls}
                >
                  {loading || phoneLoading
                    ? "Envoi du code..."
                    : isInCooldown
                    ? `Réessayez dans ${cooldownTime}s`
                    : "Recevoir le code"}
                </button>
              </form>

              <button
                type="button"
                onClick={() => setShowSmsForm(false)}
                className={backLinkCls}
              >
                <ChevronLeft className="h-4 w-4" />
                Retour à la connexion principale
              </button>
            </div>
          )}

          {/* ── STEP 2: vérification du code ── */}
          {step === "verify" && (
            <form onSubmit={onVerifyCode} className="space-y-5">
              <div className="text-sm text-center rounded-xl py-2 px-4 bg-accent-soft text-accent">
                Code envoyé au <span className="font-semibold">{toE164(phone)}</span>
              </div>
              <div>
                <label className="block text-sm font-medium text-ink-soft mb-1.5">
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
                className={primaryBtnCls}
              >
                {loading || phoneLoading ? "Vérification…" : (
                  <>
                    Vérifier
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => { setCode(""); setStep("enterPhone"); }}
                className={backLinkCls}
              >
                <ChevronLeft className="h-4 w-4" />
                Modifier le numéro
              </button>
            </form>
          )}

          {/* ── STEP 3: profil (si nécessaire) ── */}
          {step === "completeProfile" && (
            <form onSubmit={onSubmitProfile} className="space-y-5">
              <p className="text-sm text-ink-soft text-center -mt-2 mb-1">
                Complétez votre profil pour finaliser l'inscription.
              </p>

              <div>
                <label className="block text-sm font-medium text-ink-soft mb-1.5">
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
                <label className="block text-sm font-medium text-ink-soft mb-1.5">
                  Genre
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {(["homme", "femme"] as const).map(g => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setGender(g)}
                      className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium border transition-colors ${
                        gender === g
                          ? "border-accent bg-accent-soft text-accent"
                          : "border-line bg-card text-ink-soft hover:bg-paper"
                      }`}
                    >
                      <User className="h-4 w-4" />
                      {g === "homme" ? "Homme" : "Femme"}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between rounded-xl p-3 bg-paper border border-line">
                <div className="flex items-center gap-2">
                  <input
                    id="terms"
                    type="checkbox"
                    checked={hasAgreedToTerms}
                    readOnly
                    className="h-4 w-4 text-accent border-line rounded"
                  />
                  <label htmlFor="terms" className="text-xs text-ink-soft">
                    J'accepte les conditions & confidentialité
                  </label>
                </div>
                <button
                  type="button"
                  onClick={() => setShowTermsModal(true)}
                  className="text-accent hover:text-accent/80 text-xs font-medium underline ml-2 flex-shrink-0"
                >
                  Lire
                </button>
              </div>

              <button
                type="submit"
                disabled={loading || phoneLoading || !fullName.trim() || !gender}
                className={primaryBtnCls}
              >
                {loading || phoneLoading ? "Création…" : (
                  <>
                    Créer mon compte
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setStep("enterPhone")}
                className={backLinkCls}
              >
                <ChevronLeft className="h-4 w-4" />
                Changer de numéro
              </button>
            </form>
          )}

          {/* ── STEP: Déjà authentifié ── */}
          {step === "alreadyAuthenticated" && getPendingGroupTherapySessionId() && (
            <div className="space-y-5">
              <p className="text-sm text-ink-soft text-center">
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
                className={primaryBtnCls}
              >
                {loading ? "Inscription en cours…" : (
                  <>
                    Rejoindre la session
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => navigate("/patient/dashboard")}
                className={backLinkCls}
              >
                <ChevronLeft className="h-4 w-4" />
                Retour au tableau de bord
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
