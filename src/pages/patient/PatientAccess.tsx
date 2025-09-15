import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, User, AlertCircle } from "lucide-react";
import PhoneInput, { isValidPhoneNumber } from "react-phone-number-input";
import "react-phone-number-input/style.css";

import { useAuth } from "../../contexts/AuthContext";
import { useTerms } from "../../contexts/TermsContext";
import { usePhoneAuth } from "../../hooks/usePhoneAuth";
import { functions } from "../../utils/firebase";

import {
  getFirestore,
  doc,
  getDoc,
  collection,
  query,
  where,
  limit,
  getDocs,
} from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { httpsCallable } from "firebase/functions";

type Step = "enterPhone" | "collectProfile" | "verify";
type Mode = "login" | "register";

const toE164 = (v: string) => (v?.startsWith("+") ? v : `+${(v || "").trim()}`);

// Fonction pour vérifier l'existence du numéro via Cloud Function
async function phoneExistsInFirestore(e164: string): Promise<boolean> {
  try {
    const checkPhoneIndex = httpsCallable(functions, "checkPhoneIndex");
    const { data } = await checkPhoneIndex({ phone: e164 });
    return Boolean((data as any)?.exists);
  } catch (error) {
    console.error("❌ Erreur lors de la vérification du numéro:", error);
    return false; // En cas d'erreur, on considère que le numéro n'existe pas
  }
}

const PatientAccess: React.FC = () => {
  const navigate = useNavigate();

  const { isAuthenticated, currentUser, createUserWithPhone, loginWithPhone } =
    useAuth();
  const { hasAgreedToTerms, setShowTermsModal } = useTerms();

  const {
    sendVerificationCodeForLogin,
    sendVerificationCodeForRegister,
    verifyLoginCode,
    verifyRegisterCode,
    loading: phoneLoading,
    error: phoneError,
    isInCooldown,
    cooldownTime,
  } = usePhoneAuth();

  // UI state
  const [step, setStep] = useState<Step>("enterPhone");
  const [mode, setMode] = useState<Mode>("login"); // défini après pré-check
  const [phone, setPhone] = useState<string>("");
  const [code, setCode] = useState<string>("");

  // Profil (si register)
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

  // ---- Étape 1: pré-check Firestore AVANT envoi du code ----
  const onSubmitPhone = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");

    const e164 = toE164(phone);
    if (!e164 || !isValidPhoneNumber(e164)) {
      setErr("Saisissez un numéro valide au format international (ex: +221…).");
      return;
    }

    try {
      setLoading(true);

      const exists = await phoneExistsInFirestore(e164);

      if (exists) {
        // Mode LOGIN → envoie directement le code
        setMode("login");
        const { success, error } = await sendVerificationCodeForLogin(e164);
        if (!success) throw new Error(error || "Envoi du code échoué");
        setStep("verify");
      } else {
        // Mode REGISTER → demande d'abord Nom/Genre (PAS d'envoi de code ici)
        setMode("register");
        setStep("collectProfile");
      }
    } catch (e: any) {
      setErr(e?.message || "Erreur lors de la vérification du numéro.");
    } finally {
      setLoading(false);
    }
  };

  // ---- Étape 2 (register): collecte profil PUIS envoi du code ----
  const onSubmitProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");

    if (!fullName.trim())
      return setErr("Veuillez renseigner votre nom et prénom.");
    if (!gender) return setErr("Veuillez sélectionner votre genre.");
    if (!hasAgreedToTerms) {
      setShowTermsModal(true);
      return setErr(
        "Vous devez accepter les conditions d'utilisation et la politique de confidentialité."
      );
    }

    try {
      setLoading(true);
      const e164 = toE164(phone);
      // Maintenant qu'on a le profil, on peut envoyer le code en mode REGISTER
      const { success, error } = await sendVerificationCodeForRegister(e164);
      if (!success) throw new Error(error || "Envoi du code échoué");
      setStep("verify");
    } catch (e: any) {
      setErr(e?.message || "Erreur lors de l'envoi du code.");
    } finally {
      setLoading(false);
    }
  };

  // ---- Étape 3: vérification du code ----
  const onVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");

    if (!code.trim()) {
      setErr("Veuillez saisir le code reçu par SMS.");
      return;
    }

    try {
      setLoading(true);

      const cred =
        mode === "login"
          ? await verifyLoginCode(code) // utilise loginConfirmation
          : await verifyRegisterCode(code); // utilise registerConfirmation
      if (!cred?.user) throw new Error("Code invalide ou expiré.");

      const uid = cred.user.uid;
      const e164 = toE164(cred.user.phoneNumber || phone);

      if (mode === "login") {
        // profil déjà existant → login direct
        await loginWithPhone(uid, e164);
        navigate("/patient/dashboard");
      } else {
        // register → créer le profil APRES vérification du code
        await createUserWithPhone(fullName.trim(), e164, {
          type: "patient",
          gender,
        });
        await loginWithPhone(uid, e164);
        navigate("/patient/dashboard");
      }
    } catch (e: any) {
      setErr(e?.message || "La vérification a échoué.");
    } finally {
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
              On vérifie d’abord si vous avez déjà un compte, puis on envoie le
              code.
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

          {/* STEP 2: profil (pour register) */}
          {step === "collectProfile" && (
            <form onSubmit={onSubmitProfile} className="space-y-5">
              <div className="text-sm text-gray-600 mb-2">
                Vous n'avez pas encore de compte. Complétez votre profil, puis
                nous enverrons le code de vérification.
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
                {loading || phoneLoading ? "Préparation…" : "Envoyer le code"}
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
                  // Si on était en login, retourner à enterPhone ; si register, revenir à collectProfile
                  setStep(mode === "login" ? "enterPhone" : "collectProfile");
                  // Optionnel: reset des confirmations pour éviter les conflits
                  // resetRecaptcha();
                  // resetConfirmations();
                }}
                className="w-full text-gray-600 font-medium mt-2"
              >
                Modifier
              </button>
            </form>
          )}
        </div>
      </div>

      {/* IMPORTANT : conteneur reCAPTCHA doit exister dans le DOM global (App.tsx) */}
    </div>
  );
};

export default PatientAccess;
