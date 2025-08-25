import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Stethoscope,
  ArrowLeft,
  Calendar,
  Users,
  ShieldCheck,
  AlertCircle,
  Mail,
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { useLanguage } from "../../contexts/LanguageContext";
import { getAuth } from "firebase/auth";
import { useEmailVerification } from "../../hooks/useEmailVerification";
import { usePhoneAuth } from "../../hooks/usePhoneAuth";
import "react-phone-number-input/style.css";
import PhoneInput, { isValidPhoneNumber } from "react-phone-number-input";
import CooldownMessage from "../../components/ui/CooldownMessage";

const ProfessionalAccess: React.FC = () => {
  // États pour le formulaire de connexion
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginPhone, setLoginPhone] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [showLoginVerificationInput, setShowLoginVerificationInput] =
    useState(false);
  const [showRegisterVerificationInput, setShowRegisterVerificationInput] =
    useState(false);
  const [loginError, setLoginError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginMethod, setLoginMethod] = useState<"email" | "phone">("email");

  // États pour le formulaire d'inscription
  const [registerName, setRegisterName] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPhone, setRegisterPhone] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [registerError, setRegisterError] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [serviceType, setServiceType] = useState<"mental" | "sexual">("mental");
  const [registerMethod, setRegisterMethod] = useState<"email" | "phone">(
    "email"
  );

  const { login, register, loginWithPhone, createUserWithPhone } = useAuth();
  const { language } = useLanguage();
  const { isAuthenticated, currentUser } = useAuth();
  const navigate = useNavigate();
  const {
    sendVerificationEmail,
    loading: emailVerificationLoading,
    error: emailVerificationError,
    success: emailVerificationSent,
    cooldownTime: emailCooldownTime,
    isInCooldown: emailIsInCooldown,
  } = useEmailVerification();
  const {
    sendVerificationCodeForLogin,
    sendVerificationCodeForRegister,
    verifyLoginCode,
    verifyRegisterCode,
    cooldownTime,
    isInCooldown,
    loading: phoneAuthLoading,
    error: phoneAuthError,
  } = usePhoneAuth();

  // Rediriger si déjà connecté
  if (isAuthenticated && currentUser?.type === "professional") {
    navigate("/professional/dashboard");
    return null;
  }

  // Gérer la vérification du code pour la connexion
  const handleVerifyCode = async () => {
    if (!verificationCode) {
      setLoginError("Veuillez entrer le code de vérification");
      return;
    }

    console.log(
      "🔄 Tentative de vérification du code pour login professionnel"
    );
    try {
      setLoginError("");
      setIsLoggingIn(true);

      const userCredential = await verifyLoginCode(verificationCode);

      console.log(
        "✅ Vérification du code réussie, userCredential:",
        userCredential ? "obtenu" : "null"
      );
      if (userCredential) {
        const isNewUser = (
          userCredential as { additionalUserInfo?: { isNewUser?: boolean } }
        ).additionalUserInfo?.isNewUser;
        console.log("✅ isNewUser:", isNewUser);

        await loginWithPhone(
          userCredential.user.uid,
          userCredential.user.phoneNumber || ""
        );
        console.log("✅ Connexion réussie, redirection vers le dashboard");
        navigate("/professional/dashboard");
      }
    } catch (err) {
      console.error("❌ Erreur dans handleVerifyCode:", err);
      if (err instanceof Error) {
        setLoginError(err.message);
      } else {
        setLoginError("Code de vérification incorrect");
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Gérer la vérification du code pour l'inscription
  const handleVerifyRegisterCode = async () => {
    if (!verificationCode) {
      setRegisterError("Veuillez entrer le code de vérification");
      return;
    }

    try {
      setRegisterError("");
      setIsRegistering(true);

      console.log(
        "🔄 Vérification du code d'inscription professionnel:",
        verificationCode
      );
      const userCredential = await verifyRegisterCode(verificationCode);

      if (userCredential) {
        const isNewUser = (
          userCredential as { additionalUserInfo?: { isNewUser?: boolean } }
        ).additionalUserInfo?.isNewUser;
        console.log("✅ Vérification réussie, nouvel utilisateur:", isNewUser);

        // Toujours créer le profil utilisateur, qu'il soit nouveau ou non
        console.log("👨‍⚕️ Création du profil professionnel Firestore");
        try {
          await createUserWithPhone(
            registerName || "Professionnel",
            userCredential.user.phoneNumber || ""
          );
          console.log("✅ Profil professionnel créé avec succès");
        } catch (profileError) {
          console.error(
            "❌ Erreur lors de la création du profil:",
            profileError
          );
          throw new Error("Erreur lors de la création du profil professionnel");
        }

        // Seulement après la création du profil, on tente la connexion
        console.log("🔓 Connexion après création du profil");
        await loginWithPhone(
          userCredential.user.uid,
          userCredential.user.phoneNumber || ""
        );

        navigate("/professional/dashboard");
      }
    } catch (err) {
      console.error(
        "❌ Erreur lors de la vérification du code d'inscription:",
        err
      );
      if (err instanceof Error) {
        setRegisterError(err.message);
      } else {
        setRegisterError("Code de vérification incorrect");
      }
    } finally {
      setIsRegistering(false);
    }
  };

  // Gérer la connexion
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (loginMethod === "email") {
      if (!loginEmail || !loginPassword) {
        setLoginError("Veuillez remplir tous les champs");
        return;
      }

      try {
        setLoginError("");
        setIsLoggingIn(true);
        await login(loginEmail, loginPassword, "professional");

        // Redirection vers le tableau de bord professionnel
        navigate("/professional/dashboard");
      } catch (err) {
        if (err instanceof Error) {
          setLoginError(err.message);
        } else {
          setLoginError("Identifiants incorrects");
        }
      } finally {
        setIsLoggingIn(false);
      }
    }
  };

  // Gérer l'inscription
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (registerMethod === "email") {
      if (!registerName || !registerEmail || !registerPassword) {
        setRegisterError("Veuillez remplir tous les champs");
        return;
      }

      if (!termsAccepted) {
        setRegisterError("Vous devez accepter les conditions d'utilisation");
        return;
      }

      try {
        setRegisterError("");
        setIsRegistering(true);

        // Préparer les données supplémentaires
        const additionalData = {
          name: registerName,
          phone: "", // À remplir plus tard
          serviceType: serviceType,
          specialty: "", // À remplir plus tard
          profileImage: "",
          consultationFee: 0,
          isActive: false,
          adminApproved: false,
        };

        console.log(
          "📝 [PROFESSIONAL ACCESS] Données supplémentaires:",
          additionalData
        );

        // ✅ CORRECTION : Appel correct avec le bon ordre des paramètres
        await register(
          registerEmail,
          registerPassword,
          "professional",
          additionalData
        );

        // Redirection vers la page de vérification
        navigate("/verify-email");
      } catch (err) {
        if (err instanceof Error) {
          setRegisterError(err.message);
        } else {
          setRegisterError("Erreur lors de l'inscription");
        }
      } finally {
        setIsRegistering(false);
      }
    } else if (registerMethod === "phone") {
      if (!registerPhone) {
        setRegisterError("Veuillez entrer un numéro de téléphone valide");
        return;
      }

      if (registerPhone && !isValidPhoneNumber(registerPhone)) {
        setRegisterError(
          "Veuillez entrer un numéro de téléphone valide avec le code pays (ex: +1 450 516 8884)"
        );
        return;
      }

      if (!termsAccepted) {
        setRegisterError("Vous devez accepter les conditions d'utilisation");
        return;
      }

      try {
        setRegisterError("");
        setIsRegistering(true);

        // Stocker les infos nécessaires avant d'envoyer le code
        console.log(
          "💾 [PROFESSIONAL REGISTER DEBUG] Storing userType in localStorage BEFORE register call"
        );
        localStorage.setItem("pending-user-type", "professional");
        localStorage.setItem("pending-service-type", serviceType);
        console.log(
          "💾 [PROFESSIONAL REGISTER DEBUG] Stored userType:",
          localStorage.getItem("pending-user-type")
        );

        const success = await sendVerificationCodeForRegister(registerPhone);
        if (!success) {
          throw new Error("Erreur lors de l'envoi du code de vérification");
        }

        setShowRegisterVerificationInput(true);
      } catch (err) {
        if (err instanceof Error) {
          setRegisterError(err.message);
        } else {
          setRegisterError("Erreur lors de l'envoi du code de vérification");
        }
      } finally {
        setIsRegistering(false);
      }

      return;
    }
  };

  // Remplir les identifiants de démo
  const fillDemoCredentials = () => {
    setLoginEmail("professional@demo.com");
    setLoginPassword("demo123");
    setLoginError("");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div
        className="bg-gradient-to-r from-teal-500 to-emerald-400 py-6"
        style={{
          backdropFilter: "blur(12px)",
          backgroundColor: "rgba(255, 255, 255, 0.1)",
          borderBottomLeftRadius: "12px",
          borderBottomRightRadius: "12px",
        }}
      >
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center">
            <Link to="/" className="text-white flex items-center">
              <ArrowLeft className="h-5 w-5 mr-2" />
              Retour à l'accueil
            </Link>
            <h1 className="text-white text-xl font-bold">
              Espace Professionnel
            </h1>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          {/* Welcome Section */}
          <div className="text-center mb-12">
            <div className="bg-teal-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
              <Stethoscope className="h-10 w-10 text-teal-500" />
            </div>
            <h2 className="text-3xl font-bold text-gray-800 mb-4">
              Bienvenue dans l'espace professionnel
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Rejoignez notre réseau de professionnels de santé et proposez des
              consultations en ligne à vos patients.
            </p>
          </div>

          {/* Login and Register Forms */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
            {/* Login Form */}
            <div className="bg-white rounded-xl shadow-md overflow-hidden">
              <div className="p-6">
                <h3 className="text-xl font-semibold mb-4">Se connecter</h3>

                {loginError && (
                  <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg flex items-center">
                    <AlertCircle className="h-5 w-5 mr-2" />
                    <span>{loginError}</span>
                  </div>
                )}

                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <label
                      htmlFor="login-email"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Adresse email
                    </label>
                    <input
                      id="login-email"
                      type="email"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      className="w-full border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500"
                      style={{
                        padding: "12px 16px",
                        borderRadius: "12px",
                        border: "1px solid #d1d5db",
                        transition: "all 0.2s ease-in-out",
                      }}
                      placeholder="Votre email"
                      required
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="login-password"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Mot de passe
                    </label>
                    <input
                      id="login-password"
                      type="password"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 transition-colors"
                      placeholder="Votre mot de passe"
                      required
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <input
                        id="remember-me"
                        name="remember-me"
                        type="checkbox"
                        className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded"
                      />
                      <label
                        htmlFor="remember-me"
                        className="ml-2 block text-sm text-gray-900"
                      >
                        Se souvenir de moi
                      </label>
                    </div>

                    <div className="text-sm">
                      <Link
                        to="/professional/forgot-password"
                        className="font-medium text-teal-500 hover:text-teal-400"
                      >
                        Mot de passe oublié ?
                      </Link>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoggingIn}
                    className="w-full text-white font-semibold px-4 py-3 disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{
                      backgroundColor: "#0d9488",
                      borderRadius: "12px",
                      boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                      transition: "all 0.2s ease-in-out",
                    }}
                    onMouseEnter={(e) => {
                      if (!isLoggingIn) {
                        e.currentTarget.style.backgroundColor = "#0f766e";
                        e.currentTarget.style.boxShadow =
                          "0 10px 15px -3px rgba(0, 0, 0, 0.1)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isLoggingIn) {
                        e.currentTarget.style.backgroundColor = "#0d9488";
                        e.currentTarget.style.boxShadow =
                          "0 4px 6px -1px rgba(0, 0, 0, 0.1)";
                      }
                    }}
                  >
                    {isLoggingIn ? "Connexion en cours..." : "Se connecter"}
                  </button>
                </form>
              </div>
            </div>

            {/* Register Form */}
            <div className="bg-white rounded-xl shadow-md overflow-hidden">
              <div className="p-6">
                <h3 className="text-xl font-semibold mb-4">Créer un compte</h3>

                {registerError && (
                  <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg flex items-center">
                    <AlertCircle className="h-5 w-5 mr-2" />
                    <span>{registerError}</span>
                  </div>
                )}

                {/* Email verification success message */}
                {emailVerificationSent && (
                  <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded-lg flex items-center">
                    <Mail className="h-5 w-5 mr-2" />
                    <span>
                      E-mail de vérification envoyé avec succès.
                      {emailIsInCooldown &&
                        ` Vous pourrez renvoyer un autre e-mail dans ${emailCooldownTime} secondes.`}
                    </span>
                  </div>
                )}

                {/* Email verification error message */}
                {emailVerificationError && (
                  <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg flex items-center">
                    <AlertCircle className="h-5 w-5 mr-2" />
                    <span>{emailVerificationError}</span>
                  </div>
                )}

                <form onSubmit={handleRegister} className="space-y-4">
                  <div>
                    <label
                      htmlFor="register-name"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Nom complet
                    </label>
                    <input
                      id="register-name"
                      type="text"
                      value={registerName}
                      onChange={(e) => setRegisterName(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 transition-colors"
                      placeholder="Votre nom et prénom"
                      required
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="register-email"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Adresse email
                    </label>
                    <input
                      id="register-email"
                      type="email"
                      value={registerEmail}
                      onChange={(e) => setRegisterEmail(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 transition-colors"
                      placeholder="Votre email"
                      required
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="register-password"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Mot de passe
                    </label>
                    <input
                      id="register-password"
                      type="password"
                      value={registerPassword}
                      onChange={(e) => setRegisterPassword(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 transition-colors"
                      placeholder="Créez un mot de passe"
                      required
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="service-type"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Type de service
                    </label>
                    <div className="flex flex-wrap gap-4">
                      <label className="inline-flex items-center">
                        <input
                          type="radio"
                          className="form-radio h-5 w-5 text-teal-600"
                          name="serviceType"
                          value="mental"
                          checked={serviceType === "mental"}
                          onChange={() => setServiceType("mental")}
                        />
                        <span className="ml-2 text-gray-700">
                          Santé mentale
                        </span>
                      </label>
                      <label className="inline-flex items-center">
                        <input
                          type="radio"
                          className="form-radio h-5 w-5 text-teal-600"
                          name="serviceType"
                          value="sexual"
                          checked={serviceType === "sexual"}
                          onChange={() => setServiceType("sexual")}
                        />
                        <span className="ml-2 text-gray-700">
                          Santé sexuelle
                        </span>
                      </label>
                    </div>
                  </div>

                  <div className="flex items-center">
                    <input
                      id="terms"
                      name="terms"
                      type="checkbox"
                      checked={termsAccepted}
                      onChange={(e) => setTermsAccepted(e.target.checked)}
                      className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded"
                      required
                    />
                    <label
                      htmlFor="terms"
                      className="ml-2 block text-sm text-gray-900"
                    >
                      J'accepte les{" "}
                      <Link
                        to="/conditions"
                        target="_blank"
                        className="font-medium text-teal-500 hover:text-teal-400"
                      >
                        conditions d'utilisation
                      </Link>
                      ,{" "}
                      <Link
                        to="/confidentialite"
                        target="_blank"
                        className="font-medium text-teal-500 hover:text-teal-400"
                      >
                        la politique de confidentialité
                      </Link>{" "}
                      et les{" "}
                      <Link
                        to="/ethique"
                        target="_blank"
                        className="font-medium text-teal-500 hover:text-teal-400"
                      >
                        règles d'éthique
                      </Link>
                    </label>
                  </div>

                  <button
                    type="submit"
                    disabled={isRegistering || emailVerificationLoading}
                    className="w-full bg-teal-500 hover:bg-teal-600 text-white font-semibold rounded-xl px-4 py-3 shadow transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isRegistering || emailVerificationLoading
                      ? "Création en cours..."
                      : "Créer un compte"}
                  </button>
                </form>
              </div>
            </div>
          </div>

          {/* Benefits */}
          <div className="bg-gray-50 rounded-xl shadow-md p-6 mb-12">
            <h3 className="text-xl font-semibold mb-6 text-center">
              Avantages pour les professionnels
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center bg-white rounded-xl p-6 shadow-sm hover:shadow-lg transition-all duration-200">
                <div className="w-12 h-12 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Calendar className="h-6 w-6 text-teal-500" />
                </div>
                <h4 className="font-medium mb-2">Flexibilité</h4>
                <p className="text-gray-600 text-sm">
                  Gérez votre emploi du temps et vos disponibilités selon vos
                  besoins
                </p>
              </div>
              <div className="text-center bg-white rounded-xl p-6 shadow-sm hover:shadow-lg transition-all duration-200">
                <div className="w-12 h-12 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="h-6 w-6 text-teal-500" />
                </div>
                <h4 className="font-medium mb-2">
                  Élargissez votre patientèle
                </h4>
                <p className="text-gray-600 text-sm">
                  Touchez de nouveaux patients au-delà de votre zone
                  géographique
                </p>
              </div>
              <div className="text-center bg-white rounded-xl p-6 shadow-sm hover:shadow-lg transition-all duration-200">
                <div className="w-12 h-12 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <ShieldCheck className="h-6 w-6 text-teal-500" />
                </div>
                <h4 className="font-medium mb-2">Plateforme sécurisée</h4>
                <p className="text-gray-600 text-sm">
                  Consultations et données protégées par un chiffrement de bout
                  en bout
                </p>
              </div>
            </div>
          </div>

          {/* How it works */}
          <div className="bg-white rounded-xl shadow-md p-6 border-t border-gray-100 pt-10">
            <h3 className="text-xl font-semibold mb-6 text-center">
              Comment ça marche ?
            </h3>
            <div className="space-y-6">
              <div className="flex items-start">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-4 flex-shrink-0">
                  <span className="font-bold text-blue-800">1</span>
                </div>
                <div>
                  <h4 className="font-medium mb-1">
                    Créez votre compte professionnel
                  </h4>
                  <p className="text-gray-600 text-sm">
                    Inscrivez-vous et complétez votre profil avec vos
                    qualifications et spécialités
                  </p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-4 flex-shrink-0">
                  <span className="font-bold text-blue-800">2</span>
                </div>
                <div>
                  <h4 className="font-medium mb-1">
                    Définissez vos disponibilités
                  </h4>
                  <p className="text-gray-600 text-sm">
                    Configurez votre calendrier et vos créneaux horaires selon
                    votre emploi du temps
                  </p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-4 flex-shrink-0">
                  <span className="font-bold text-blue-800">3</span>
                </div>
                <div>
                  <h4 className="font-medium mb-1">
                    Recevez et gérez vos consultations
                  </h4>
                  <p className="text-gray-600 text-sm">
                    Acceptez les demandes de rendez-vous et effectuez vos
                    consultations en ligne
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfessionalAccess;
