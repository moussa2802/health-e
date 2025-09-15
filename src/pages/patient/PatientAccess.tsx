import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, User, AlertCircle } from "lucide-react";
import PhoneInput, { isValidPhoneNumber } from "react-phone-number-input";
import "react-phone-number-input/style.css";

import { useAuth } from "../../contexts/AuthContext";
import { useTerms } from "../../contexts/TermsContext";
import { usePhoneAuth } from "../../hooks/usePhoneAuth";

type Step = "enterPhone" | "collectProfile";

const PatientAccess: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, currentUser, createUserWithPhone, loginWithPhone } =
    useAuth();
  const { hasAgreedToTerms, setShowTermsModal } = useTerms();

  const {
    sendVerificationCodeForLogin,
    isPhoneNumberAlreadyRegistered, // <—
  } = usePhoneAuth();

  // --- State machine ---
  const [step, setStep] = useState<Step>("enterPhone");
  const [phone, setPhone] = useState<string>("");

  // Nouveau profil (inscription)
  const [fullName, setFullName] = useState<string>("");
  const [gender, setGender] = useState<"homme" | "femme" | "">("");

  // UI
  const [loading, setLoading] = useState<boolean>(false);
  const [err, setErr] = useState<string>("");

  // Redirect si déjà loggé
  useEffect(() => {
    if (isAuthenticated && currentUser?.type === "patient") {
      navigate("/patient/dashboard");
    }
  }, [isAuthenticated, currentUser, navigate]);

  // --- Step 1: enter phone ---
  const onSubmitPhone = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");

    if (!phone || !isValidPhoneNumber(phone)) {
      setErr("Saisissez un numéro valide au format international (ex: +221…)");
      return;
    }

    try {
      setLoading(true);
      // Envoie toujours le code (login) sans vérifier Firestore
      const { success, error } = await sendVerificationCodeForLogin(phone);
      if (!success) throw new Error(error || "Envoi du code échoué");
      setStep("collectProfile");
    } catch (e: unknown) {
      setErr((e as Error)?.message || "Erreur lors de l'envoi du code");
    } finally {
      setLoading(false);
    }
  };

  // --- Step 2: collect profile for signup ---
  const onSubmitProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");

    if (!fullName.trim()) {
      setErr("Veuillez renseigner votre nom et prénom.");
      return;
    }
    if (!gender) {
      setErr("Veuillez sélectionner votre genre.");
      return;
    }
    if (!hasAgreedToTerms) {
      setShowTermsModal(true);
      setErr(
        "Vous devez accepter les conditions d'utilisation et la politique de confidentialité."
      );
      return;
    }

    try {
      setLoading(true);

      // Vérifier si l'utilisateur existe déjà (maintenant qu'on est authentifié)
      const existsInDB = await isPhoneNumberAlreadyRegistered(phone);

      if (existsInDB) {
        // Utilisateur existant → Login direct
        await loginWithPhone(phone, phone);
        navigate("/patient/dashboard");
      } else {
        // Nouvel utilisateur → Créer le compte
        await createUserWithPhone(fullName, phone, {
          type: "patient",
          gender,
        });

        // Connexion après création
        await loginWithPhone(phone, phone);
        navigate("/patient/dashboard");
      }
    } catch (e: unknown) {
      setErr(
        (e as Error)?.message ||
          "Erreur lors de la connexion/création du compte."
      );
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
              Entrez votre numéro pour commencer.
            </p>
          </div>

          {err && (
            <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded-lg flex items-center">
              <AlertCircle className="h-5 w-5 mr-2" />
              <span>{err}</span>
            </div>
          )}

          {/* STEP 1: phone */}
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
                disabled={loading || !phone || !isValidPhoneNumber(phone)}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-3 rounded-xl shadow disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Vérification..." : "Continuer"}
              </button>
            </form>
          )}

          {/* STEP 2: collect name + gender */}
          {step === "collectProfile" && (
            <form onSubmit={onSubmitProfile} className="space-y-5">
              <div className="text-sm text-gray-600 mb-4">
                Complétez votre profil pour continuer.
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
                disabled={loading || !fullName.trim() || !gender}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-3 rounded-xl shadow disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Connexion..." : "Continuer"}
              </button>

              <button
                type="button"
                onClick={() => setStep("enterPhone")}
                className="w-full text-blue-600 font-medium mt-2"
              >
                Changer de numéro
              </button>
            </form>
          )}

          {/* STEP 3: verify code */}
        </div>
      </div>

      {/* Conteneur reCAPTCHA invisible */}
      <div id="recaptcha-container" style={{ display: "none" }} />
    </div>
  );
};

export default PatientAccess;
