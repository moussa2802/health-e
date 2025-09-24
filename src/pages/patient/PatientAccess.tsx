import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, User, AlertCircle } from "lucide-react";
import PhoneInput, { isValidPhoneNumber } from "react-phone-number-input";
import "react-phone-number-input/style.css";

import { useAuth } from "../../contexts/AuthContext";
import { useTerms } from "../../contexts/TermsContext";
import { usePhoneAuth } from "../../hooks/usePhoneAuth";

import { getFirestore, doc, getDoc } from "firebase/firestore";
import { getAuth } from "firebase/auth";

type Step = "enterPhone" | "verify" | "completeProfile";

const toE164 = (v: string) => (v?.startsWith("+") ? v : `+${(v || "").trim()}`);

// plus aucune pré-vérification côté client

const PatientAccess: React.FC = () => {
  const navigate = useNavigate();

  const { isAuthenticated, currentUser, createUserWithPhone, loginWithPhone } =
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

  // Profil (si nécessaire)
  const [fullName, setFullName] = useState<string>("");
  const [gender, setGender] = useState<"homme" | "femme" | "">("");

  const [loading, setLoading] = useState<boolean>(false);
  const [err, setErr] = useState<string>("");

  // Redirect si déjà loggé
  useEffect(() => {
    if (isAuthenticated && currentUser?.type === "patient") {
      navigate("/patient/dashboard");
    }
  }, [isAuthenticated, currentUser, navigate]);

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
      const confirmation = await sendVerificationCode(e164);
      if (!confirmation) {
        console.log("❌ [PATIENT] Confirmation null, échec de l'envoi");
        throw new Error("Envoi du code échoué");
      }
      console.log("✅ [PATIENT] Code envoyé, passage à l'étape verify");
      setStep("verify");
    } catch (e: any) {
      console.log("❌ [PATIENT] ===== ERREUR ON SUBMIT PHONE =====");
      console.error("❌ [PATIENT] Erreur complète:", e);
      console.error("❌ [PATIENT] Message:", e?.message);
      setErr(e?.message || "Erreur lors de l'envoi du code.");
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
      console.log("🚀 [PATIENT] Redirection vers dashboard");
      navigate("/patient/dashboard");
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
        console.log("🚀 [PATIENT] Redirection vers dashboard");
        navigate("/patient/dashboard");
      } else {
        console.log(
          "📝 [PATIENT] Profil inexistant, passage à completeProfile"
        );
        setStep("completeProfile");
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-500 to-teal-400 py-6">
        <div className="container mx-auto px-4 flex justify-between items-center">
          <Link to="/" className="text-white flex items-center">
            <ArrowLeft className="h-5 w-5 mr-2" />
            Retour à l'accueil
          </Link>
          <h1 className="text-white text-xl font-bold">Espace Patient</h1>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        <div className="max-w-xl mx-auto bg-white rounded-2xl shadow-md p-8">
          <div className="text-center mb-6">
            <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <User className="h-8 w-8 text-blue-500" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800">
              Accès patient par téléphone
            </h2>
            <p className="text-gray-600 mt-1">
              On vous envoie un code par SMS. Après vérification, on détecte si
              un compte existe déjà.
            </p>
          </div>

          {(err || phoneError) && (
            <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded-lg flex items-center">
              <AlertCircle className="h-5 w-5 mr-2" />
              <span>{err || phoneError}</span>
            </div>
          )}

          {/* STEP 1: téléphone */}
          {step === "enterPhone" && (
            <form onSubmit={onSubmitPhone} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Numéro de téléphone
                </label>
                <PhoneInput
                  international
                  defaultCountry="SN"
                  value={phone}
                  onChange={(v) => setPhone(v || "")}
                  className="w-full rounded-xl border border-gray-300 px-3 py-3 focus:border-blue-500 focus:ring-blue-500"
                  placeholder="Ex: +221 77 123 45 67"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Format international requis (ex: +221…).
                </p>
              </div>

              <button
                type="submit"
                disabled={
                  loading ||
                  phoneLoading ||
                  !phone ||
                  !isValidPhoneNumber(toE164(phone)) ||
                  isInCooldown
                }
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-3 rounded-xl shadow disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading || phoneLoading
                  ? "Vérification…"
                  : isInCooldown
                  ? `Réessayez dans ${cooldownTime}s`
                  : "Continuer"}
              </button>
            </form>
          )}

          {/* STEP 3: profil (si nécessaire) */}
          {step === "completeProfile" && (
            <form onSubmit={onSubmitProfile} className="space-y-5">
              <div className="text-sm text-gray-600 mb-2">
                Vous n'avez pas encore de compte. Complétez votre profil pour
                finaliser votre inscription.
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nom et prénom
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 focus:border-blue-500 focus:ring-blue-500"
                  placeholder="Votre nom complet"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Genre
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setGender("homme")}
                    className={`px-4 py-3 rounded-xl border ${
                      gender === "homme"
                        ? "border-blue-600 bg-blue-50 text-blue-700"
                        : "border-gray-300 text-gray-700"
                    }`}
                  >
                    Homme
                  </button>
                  <button
                    type="button"
                    onClick={() => setGender("femme")}
                    className={`px-4 py-3 rounded-xl border ${
                      gender === "femme"
                        ? "border-blue-600 bg-blue-50 text-blue-700"
                        : "border-gray-300 text-gray-700"
                    }`}
                  >
                    Femme
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <input
                    id="terms"
                    type="checkbox"
                    checked={hasAgreedToTerms}
                    readOnly
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="terms" className="ml-2 text-sm text-gray-700">
                    J'accepte les conditions et la politique de confidentialité
                  </label>
                </div>
                <button
                  type="button"
                  onClick={() => setShowTermsModal(true)}
                  className="text-blue-600 hover:text-blue-500 text-sm underline"
                >
                  Lire et accepter
                </button>
              </div>

              <button
                type="submit"
                disabled={
                  loading || phoneLoading || !fullName.trim() || !gender
                }
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-3 rounded-xl shadow disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading || phoneLoading ? "Création…" : "Créer mon compte"}
              </button>

              <button
                type="button"
                onClick={() => setStep("enterPhone")}
                className="w-full text-gray-600 font-medium mt-2"
              >
                Changer de numéro
              </button>
            </form>
          )}

          {/* STEP 3: vérification du code */}
          {step === "verify" && (
            <form onSubmit={onVerifyCode} className="space-y-5">
              <div className="text-sm text-gray-600">
                Un code a été envoyé au{" "}
                <span className="font-medium">{toE164(phone)}</span>.
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Code de vérification
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 focus:border-blue-500 focus:ring-blue-500"
                  placeholder="Ex: 123456"
                />
              </div>

              <button
                type="submit"
                disabled={loading || phoneLoading || !code.trim()}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-3 rounded-xl shadow disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading || phoneLoading ? "Vérification…" : "Continuer"}
              </button>

              <button
                type="button"
                onClick={() => {
                  setCode("");
                  setStep("enterPhone");
                }}
                className="w-full text-gray-600 font-medium mt-2"
              >
                Modifier
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default PatientAccess;
