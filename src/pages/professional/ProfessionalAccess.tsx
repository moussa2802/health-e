import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Stethoscope,
  ArrowLeft,
  Calendar,
  Users,
  ShieldCheck,
  AlertCircle,
  Mail,
  Eye,
  EyeOff,
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { useLanguage } from "../../contexts/LanguageContext";
import { useTerms } from "../../contexts/TermsContext";
import { validateEmail } from "../../utils/emailValidation";
import EmailInput from "../../components/auth/EmailInput";
import {
  CATEGORIES,
  SPECIALTIES,
  getSpecialtiesByCategory,
  getCategoryLabel,
  getSpecialtyLabel,
  type Category,
} from "../../constants/specialties";
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
  const [registerPasswordConfirm, setRegisterPasswordConfirm] = useState("");
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showRegisterPasswordConfirm, setShowRegisterPasswordConfirm] =
    useState(false);
  const [registerError, setRegisterError] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);

  const [selectedCategory, setSelectedCategory] =
    useState<Category>("mental-health");
  const [selectedPrimarySpecialty, setSelectedPrimarySpecialty] =
    useState<string>("");
  const [registerMethod, setRegisterMethod] = useState<"email" | "phone">(
    "email"
  );

  const { login, register, loginWithPhone, createUserWithPhone } = useAuth();
  const { language } = useLanguage();
  const { isAuthenticated, currentUser } = useAuth();
  const { hasAgreedToTerms, setShowTermsModal } = useTerms();
  const navigate = useNavigate();

  // Vérifier si l'utilisateur doit accepter les conditions lors de la première visite
  useEffect(() => {
    if (isAuthenticated && !hasAgreedToTerms) {
      setShowTermsModal(true);
    }
  }, [isAuthenticated, hasAgreedToTerms, setShowTermsModal]);
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
      "Tentative de vérification du code pour login professionnel"
    );
    try {
      setLoginError("");
      setIsLoggingIn(true);

      const userCredential = await verifyLoginCode(verificationCode);

      console.log(
        "Vérification du code réussie, userCredential:",
        userCredential ? "obtenu" : "null"
      );
      if (userCredential) {
        const isNewUser = (
          userCredential as { additionalUserInfo?: { isNewUser?: boolean } }
        ).additionalUserInfo?.isNewUser;
        console.log("isNewUser:", isNewUser);

        await loginWithPhone(
          userCredential.user.uid,
          userCredential.user.phoneNumber || ""
        );
        console.log("Connexion réussie, redirection vers le dashboard");
        navigate("/professional/dashboard");
      }
    } catch (err) {
      console.error("Erreur dans handleVerifyCode:", err);
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
        "Vérification du code d'inscription professionnel:",
        verificationCode
      );
      const userCredential = await verifyRegisterCode(verificationCode);

      if (userCredential) {
        const isNewUser = (
          userCredential as { additionalUserInfo?: { isNewUser?: boolean } }
        ).additionalUserInfo?.isNewUser;
        console.log("Vérification réussie, nouvel utilisateur:", isNewUser);

        // Toujours créer le profil utilisateur, qu'il soit nouveau ou non
        console.log("Création du profil professionnel Firestore");
        try {
          await createUserWithPhone(
            registerName || "Professionnel",
            userCredential.user.phoneNumber || ""
          );
          console.log("Profil professionnel créé avec succès");
        } catch (profileError) {
          console.error(
            "Erreur lors de la création du profil:",
            profileError
          );
          throw new Error("Erreur lors de la création du profil professionnel");
        }

        // Seulement après la création du profil, on tente la connexion
        console.log("Connexion après création du profil");
        await loginWithPhone(
          userCredential.user.uid,
          userCredential.user.phoneNumber || ""
        );

        navigate("/professional/dashboard");
      }
    } catch (err) {
      console.error(
        "Erreur lors de la vérification du code d'inscription:",
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
      const emailCheck = validateEmail(loginEmail);
      if (!emailCheck.valid) {
        setLoginError(emailCheck.error!);
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
      if (
        !registerName ||
        !registerEmail ||
        !registerPassword ||
        !registerPasswordConfirm
      ) {
        setRegisterError("Veuillez remplir tous les champs");
        return;
      }

      const emailCheck = validateEmail(registerEmail);
      if (!emailCheck.valid) {
        setRegisterError(emailCheck.error!);
        return;
      }

      if (registerPassword !== registerPasswordConfirm) {
        setRegisterError("Les mots de passe ne correspondent pas");
        return;
      }

      if (!hasAgreedToTerms) {
        setShowTermsModal(true);
        setRegisterError(
          "Vous devez accepter les conditions d'utilisation et la politique de confidentialité"
        );
        return;
      }

      if (!selectedPrimarySpecialty) {
        setRegisterError("Veuillez sélectionner votre spécialité principale");
        return;
      }

      try {
        setRegisterError("");
        setIsRegistering(true);

        // Préparer les données supplémentaires
        const additionalData = {
          name: registerName,
          phone: "", // À remplir plus tard
          // Legacy fields for backward compatibility
          serviceType:
            selectedCategory === "mental-health" ? "mental" : "sexual",
          specialty: selectedPrimarySpecialty,
          // New fields
          category: selectedCategory,
          primarySpecialty: selectedPrimarySpecialty,
          specialties: [selectedPrimarySpecialty], // Array with single specialty for now
          profileImage: "",
          consultationFee: 0,
          isActive: false,
          adminApproved: false,
        };

        console.log(
          "[PROFESSIONAL ACCESS] Données supplémentaires:",
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

      if (!hasAgreedToTerms) {
        setShowTermsModal(true);
        setRegisterError(
          "Vous devez accepter les conditions d'utilisation et la politique de confidentialité"
        );
        return;
      }

      try {
        setRegisterError("");
        setIsRegistering(true);

        // Stocker les infos nécessaires avant d'envoyer le code
        console.log(
          "[PROFESSIONAL REGISTER DEBUG] Storing userType in localStorage BEFORE register call"
        );
        localStorage.setItem("pending-user-type", "professional");
        localStorage.setItem(
          "pending-service-type",
          selectedCategory === "mental-health" ? "mental" : "sexual"
        );
        console.log(
          "[PROFESSIONAL REGISTER DEBUG] Stored userType:",
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
    <div className="min-h-screen bg-paper">
      {/* Header */}
      <div className="bg-ink py-6">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center">
            <Link to="/" className="text-paper flex items-center">
              <ArrowLeft className="h-5 w-5 mr-2" />
              Retour à l'accueil
            </Link>
            <h1 className="text-paper text-xl font-display font-bold">
              Espace Professionnel
            </h1>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          {/* Welcome Section */}
          <div className="text-center mb-12">
            <div className="bg-sage-soft w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
              <Stethoscope className="h-10 w-10 text-sage" />
            </div>
            <h2 className="text-3xl font-display font-bold text-ink mb-4">
              Bienvenue dans l'espace professionnel
            </h2>
            <p className="text-lg text-ink-soft max-w-2xl mx-auto">
              Rejoignez notre réseau de professionnels de santé et proposez des
              consultations en ligne à vos patients.
            </p>
          </div>

          {/* Login and Register Forms */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
            {/* Login Form */}
            <div className="bg-card border border-line rounded-block shadow-soft overflow-hidden">
              <div className="p-6">
                <h3 className="text-xl font-display font-semibold text-ink mb-4">
                  Se connecter
                </h3>

                {loginError && (
                  <div className="mb-4 p-3 bg-danger/10 border border-danger/30 text-danger rounded-card flex items-center">
                    <AlertCircle className="h-5 w-5 mr-2" />
                    <span>{loginError}</span>
                  </div>
                )}

                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <label
                      htmlFor="login-email"
                      className="block text-sm font-medium text-ink-soft mb-1"
                    >
                      Adresse email
                    </label>
                    <EmailInput
                      id="login-email"
                      value={loginEmail}
                      onChange={setLoginEmail}
                      className="w-full px-4 py-3 rounded-card border border-line focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition-colors"
                      placeholder="Votre email"
                      required
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="login-password"
                      className="block text-sm font-medium text-ink-soft mb-1"
                    >
                      Mot de passe
                    </label>
                    <input
                      id="login-password"
                      type="password"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      className="w-full px-4 py-3 rounded-card border border-line focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition-colors"
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
                        className="h-4 w-4 text-accent focus:ring-accent border-line rounded"
                      />
                      <label
                        htmlFor="remember-me"
                        className="ml-2 block text-sm text-ink"
                      >
                        Se souvenir de moi
                      </label>
                    </div>

                    <div className="text-sm">
                      <Link
                        to="/professional/forgot-password"
                        className="font-medium text-accent hover:text-accent/80"
                      >
                        Mot de passe oublié ?
                      </Link>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoggingIn}
                    className="w-full bg-ink text-paper font-semibold rounded-pill px-4 py-3 shadow-soft hover:bg-ink/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoggingIn ? "Connexion en cours..." : "Se connecter"}
                  </button>
                </form>
              </div>
            </div>

            {/* Register Form */}
            <div className="bg-card border border-line rounded-block shadow-soft overflow-hidden">
              <div className="p-6">
                <h3 className="text-xl font-display font-semibold text-ink mb-4">
                  Créer un compte
                </h3>

                {registerError && (
                  <div className="mb-4 p-3 bg-danger/10 border border-danger/30 text-danger rounded-card flex items-center">
                    <AlertCircle className="h-5 w-5 mr-2" />
                    <span>{registerError}</span>
                  </div>
                )}

                {/* Email verification success message */}
                {emailVerificationSent && (
                  <div className="mb-4 p-3 bg-ok/10 border border-ok/30 text-ok rounded-card flex items-center">
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
                  <div className="mb-4 p-3 bg-danger/10 border border-danger/30 text-danger rounded-card flex items-center">
                    <AlertCircle className="h-5 w-5 mr-2" />
                    <span>{emailVerificationError}</span>
                  </div>
                )}

                <form onSubmit={handleRegister} className="space-y-4">
                  <div>
                    <label
                      htmlFor="register-name"
                      className="block text-sm font-medium text-ink-soft mb-1"
                    >
                      Nom complet
                    </label>
                    <input
                      id="register-name"
                      type="text"
                      value={registerName}
                      onChange={(e) => setRegisterName(e.target.value)}
                      className="w-full px-4 py-3 rounded-card border border-line focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition-colors"
                      placeholder="Votre nom et prénom"
                      required
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="register-email"
                      className="block text-sm font-medium text-ink-soft mb-1"
                    >
                      Adresse email
                    </label>
                    <EmailInput
                      id="register-email"
                      value={registerEmail}
                      onChange={setRegisterEmail}
                      className="w-full px-4 py-3 rounded-card border border-line focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition-colors"
                      placeholder="Votre email"
                      required
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="register-password"
                      className="block text-sm font-medium text-ink-soft mb-1"
                    >
                      Mot de passe
                    </label>
                    <div className="relative">
                      <input
                        id="register-password"
                        type={showRegisterPassword ? "text" : "password"}
                        value={registerPassword}
                        onChange={(e) => setRegisterPassword(e.target.value)}
                        className="w-full px-4 py-3 pr-12 rounded-card border border-line focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition-colors"
                        placeholder="Créez un mot de passe"
                        required
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setShowRegisterPassword(!showRegisterPassword)
                        }
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted hover:text-ink-soft focus:outline-none"
                      >
                        {showRegisterPassword ? (
                          <EyeOff className="h-5 w-5" />
                        ) : (
                          <Eye className="h-5 w-5" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="register-password-confirm"
                      className="block text-sm font-medium text-ink-soft mb-1"
                    >
                      Confirmer le mot de passe
                    </label>
                    <div className="relative">
                      <input
                        id="register-password-confirm"
                        type={showRegisterPasswordConfirm ? "text" : "password"}
                        value={registerPasswordConfirm}
                        onChange={(e) =>
                          setRegisterPasswordConfirm(e.target.value)
                        }
                        className="w-full px-4 py-3 pr-12 rounded-card border border-line focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition-colors"
                        placeholder="Confirmez votre mot de passe"
                        required
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setShowRegisterPasswordConfirm(
                            !showRegisterPasswordConfirm
                          )
                        }
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted hover:text-ink-soft focus:outline-none"
                      >
                        {showRegisterPasswordConfirm ? (
                          <EyeOff className="h-5 w-5" />
                        ) : (
                          <Eye className="h-5 w-5" />
                        )}
                      </button>
                    </div>
                    {registerPasswordConfirm &&
                      registerPassword !== registerPasswordConfirm && (
                        <p className="text-danger text-sm mt-1">
                          Les mots de passe ne correspondent pas
                        </p>
                      )}
                  </div>

                  <div>
                    <label
                      htmlFor="category"
                      className="block text-sm font-medium text-ink-soft mb-1"
                    >
                      Catégorie de service
                    </label>
                    <div className="flex flex-wrap gap-4">
                      {CATEGORIES.map((category) => (
                        <label
                          key={category}
                          className="inline-flex items-center"
                        >
                          <input
                            type="radio"
                            className="h-5 w-5 text-accent focus:ring-accent"
                            name="category"
                            value={category}
                            checked={selectedCategory === category}
                            onChange={() => {
                              setSelectedCategory(category);
                              setSelectedPrimarySpecialty(""); // Reset primary specialty when category changes
                            }}
                          />
                          <span className="ml-2 text-ink-soft">
                            {getCategoryLabel(category, language)}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {selectedCategory && (
                    <div>
                      <label
                        htmlFor="primarySpecialty"
                        className="block text-sm font-medium text-ink-soft mb-1"
                      >
                        Spécialité principale
                      </label>
                      <div className="bg-accent-soft border-l-4 border-accent p-3 mb-3 rounded-card">
                        <p className="text-accent text-sm">
                          <strong>Note :</strong> Vous pourrez ajouter d'autres
                          spécialités après votre inscription en modifiant votre
                          profil.
                        </p>
                      </div>
                      <div className="max-h-48 overflow-y-auto border border-line rounded-card p-2 space-y-2">
                        {getSpecialtiesByCategory(selectedCategory).map(
                          (specialty) => (
                            <label
                              key={specialty.key}
                              className="flex items-center space-x-2 cursor-pointer hover:bg-paper p-2 rounded-card"
                            >
                              <input
                                type="radio"
                                name="primarySpecialty"
                                value={specialty.key}
                                checked={
                                  selectedPrimarySpecialty === specialty.key
                                }
                                onChange={(e) => {
                                  setSelectedPrimarySpecialty(e.target.value);
                                }}
                                className="h-4 w-4 text-accent focus:ring-accent"
                              />
                              <span className="text-sm text-ink-soft">
                                {specialty.labels[language]}
                              </span>
                            </label>
                          )
                        )}
                      </div>
                      {!selectedPrimarySpecialty && (
                        <p className="text-danger text-sm mt-1">
                          Veuillez sélectionner votre spécialité principale
                        </p>
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <input
                        id="terms"
                        name="terms"
                        type="checkbox"
                        checked={hasAgreedToTerms}
                        readOnly
                        className="h-4 w-4 text-accent focus:ring-accent border-line rounded"
                      />
                      <label
                        htmlFor="terms"
                        className="ml-2 block text-sm text-ink"
                      >
                        J'accepte les conditions d'utilisation et la politique
                        de confidentialité de Health-e
                      </label>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowTermsModal(true)}
                      className="text-accent hover:text-accent/80 text-sm underline"
                    >
                      Lire et accepter
                    </button>
                  </div>

                  <button
                    type="submit"
                    disabled={isRegistering || emailVerificationLoading}
                    className="w-full bg-accent hover:bg-accent/90 text-paper font-semibold rounded-pill px-4 py-3 shadow-soft transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
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
          <div className="bg-card border border-line rounded-block shadow-soft p-6 mb-12">
            <h3 className="text-xl font-display font-semibold text-ink mb-6 text-center">
              Avantages pour les professionnels
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center bg-paper rounded-card p-6 border border-line hover:shadow-soft transition-all duration-200">
                <div className="w-12 h-12 bg-sage-soft rounded-full flex items-center justify-center mx-auto mb-4">
                  <Calendar className="h-6 w-6 text-sage" />
                </div>
                <h4 className="font-medium text-ink mb-2">Flexibilité</h4>
                <p className="text-ink-soft text-sm">
                  Gérez votre emploi du temps et vos disponibilités selon vos
                  besoins
                </p>
              </div>
              <div className="text-center bg-paper rounded-card p-6 border border-line hover:shadow-soft transition-all duration-200">
                <div className="w-12 h-12 bg-sage-soft rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="h-6 w-6 text-sage" />
                </div>
                <h4 className="font-medium text-ink mb-2">
                  Élargissez votre patientèle
                </h4>
                <p className="text-ink-soft text-sm">
                  Touchez de nouveaux patients au-delà de votre zone
                  géographique
                </p>
              </div>
              <div className="text-center bg-paper rounded-card p-6 border border-line hover:shadow-soft transition-all duration-200">
                <div className="w-12 h-12 bg-sage-soft rounded-full flex items-center justify-center mx-auto mb-4">
                  <ShieldCheck className="h-6 w-6 text-sage" />
                </div>
                <h4 className="font-medium text-ink mb-2">Plateforme sécurisée</h4>
                <p className="text-ink-soft text-sm">
                  Consultations et données protégées par un chiffrement de bout
                  en bout
                </p>
              </div>
            </div>
          </div>

          {/* How it works */}
          <div className="bg-card border border-line rounded-block shadow-soft p-6 pt-10">
            <h3 className="text-xl font-display font-semibold text-ink mb-6 text-center">
              Comment ça marche ?
            </h3>
            <div className="space-y-6">
              <div className="flex items-start">
                <div className="w-8 h-8 bg-accent-soft rounded-full flex items-center justify-center mr-4 flex-shrink-0">
                  <span className="font-bold text-accent">1</span>
                </div>
                <div>
                  <h4 className="font-medium text-ink mb-1">
                    Créez votre compte professionnel
                  </h4>
                  <p className="text-ink-soft text-sm">
                    Inscrivez-vous et complétez votre profil avec vos
                    qualifications et spécialités
                  </p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="w-8 h-8 bg-accent-soft rounded-full flex items-center justify-center mr-4 flex-shrink-0">
                  <span className="font-bold text-accent">2</span>
                </div>
                <div>
                  <h4 className="font-medium text-ink mb-1">
                    Définissez vos disponibilités
                  </h4>
                  <p className="text-ink-soft text-sm">
                    Configurez votre calendrier et vos créneaux horaires selon
                    votre emploi du temps
                  </p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="w-8 h-8 bg-accent-soft rounded-full flex items-center justify-center mr-4 flex-shrink-0">
                  <span className="font-bold text-accent">3</span>
                </div>
                <div>
                  <h4 className="font-medium text-ink mb-1">
                    Recevez et gérez vos consultations
                  </h4>
                  <p className="text-ink-soft text-sm">
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
