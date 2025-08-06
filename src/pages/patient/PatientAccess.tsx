import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  User,
  ArrowLeft,
  Brain,
  Heart,
  ArrowRight,
  ShieldCheck,
  Clock,
  Users,
  AlertCircle,
  Mail,
  Phone,
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import "react-phone-number-input/style.css";
import PhoneInput, { isValidPhoneNumber } from "react-phone-number-input";
import { usePhoneAuth } from "../../hooks/usePhoneAuth";
import { useEmailVerification } from "../../hooks/useEmailVerification";
import CooldownMessage from "../../components/ui/CooldownMessage";

const PatientAccess: React.FC = () => {
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
  const [registerMethod, setRegisterMethod] = useState<"email" | "phone">(
    "email"
  );

  const { login, register, loginWithPhone, createUserWithPhone } = useAuth();
  const { isAuthenticated, currentUser } = useAuth();
  const navigate = useNavigate();
  const {
    sendVerificationCodeForLogin,
    sendVerificationCodeForRegister,
    verifyLoginCode,
    verifyRegisterCode,
    cooldownTime,
    isInCooldown,
    loading: phoneAuthLoading,
  } = usePhoneAuth();

  const {
    loading: emailVerificationLoading,
    error: emailVerificationError,
    success: emailVerificationSent,
    cooldownTime: emailCooldownTime,
    isInCooldown: emailIsInCooldown,
  } = useEmailVerification();

  useEffect(() => {
    if (isAuthenticated && currentUser?.type === "patient") {
      navigate("/patient/dashboard");
    }
  }, [isAuthenticated, currentUser, navigate]);

  // Gérer la connexion
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!loginEmail || !loginPassword) {
      setLoginError("Veuillez remplir tous les champs");
      return;
    }

    try {
      setLoginError("");
      setIsLoggingIn(true);
      await login(loginEmail, loginPassword, "patient");

      // Redirection vers le tableau de bord patient
      navigate("/patient/dashboard");
    } catch (err) {
      if (err instanceof Error) {
        setLoginError(err.message);
      } else {
        setLoginError("Identifiants incorrects");
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Gérer la vérification du code
  const handleVerifyCode = async () => {
    if (!verificationCode) {
      setLoginError("Veuillez entrer le code de vérification");
      return;
    }

    console.log("🔄 Tentative de vérification du code pour login");
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

        try {
          await loginWithPhone(
            userCredential.user.uid,
            userCredential.user.phoneNumber || ""
          );
          console.log("✅ Connexion réussie, redirection vers le dashboard");
          navigate("/patient/dashboard");
        } catch (loginError) {
          console.error("❌ Erreur lors de la connexion:", loginError);
          if (loginError instanceof Error) {
            setLoginError(loginError.message);
          } else {
            setLoginError("Erreur lors de la connexion");
          }
        }
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

      console.log("🔄 Vérification du code d'inscription:", verificationCode);
      const userCredential = await verifyRegisterCode(verificationCode);

      if (userCredential) {
        const isNewUser = (
          userCredential as { additionalUserInfo?: { isNewUser?: boolean } }
        ).additionalUserInfo?.isNewUser;
        console.log("✅ Vérification réussie, nouvel utilisateur:", isNewUser);

        // Créer le profil utilisateur seulement si c'est un nouvel utilisateur
        // Pour les numéros de test, isNewUser peut être undefined, donc on crée toujours le profil
        if (isNewUser || isNewUser === undefined) {
          console.log(
            "👤 Création du profil Firestore pour le nouvel utilisateur"
          );
          try {
            await createUserWithPhone(
              registerName || "Utilisateur",
              userCredential.user.phoneNumber || ""
            );
            console.log("✅ Profil utilisateur créé avec succès");
          } catch (profileError) {
            console.error(
              "❌ Erreur lors de la création du profil:",
              profileError
            );
            // Ne pas bloquer la connexion si la création du profil échoue
            console.warn(
              "⚠️ Échec de création du profil, mais connexion maintenue"
            );
          }
        } else {
          console.log(
            "✅ Utilisateur existant, pas de création de profil nécessaire"
          );
        }

        // Seulement après la création du profil, on tente la connexion
        console.log("🔓 Connexion après création du profil");
        try {
          await loginWithPhone(
            userCredential.user.uid,
            userCredential.user.phoneNumber || ""
          );
          navigate("/patient/dashboard");
        } catch (loginError) {
          console.error("❌ Erreur lors de la connexion:", loginError);
          if (loginError instanceof Error) {
            setRegisterError(loginError.message);
          } else {
            setRegisterError("Erreur lors de la connexion");
          }
        }
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

  // Gérer l'inscription
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      registerMethod === "email" &&
      (!registerName || !registerEmail || !registerPassword)
    ) {
      setRegisterError("Veuillez remplir tous les champs");
      return;
    }

    if (registerMethod === "phone" && !registerPhone) {
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

    if (registerMethod === "phone") {
      try {
        setRegisterError("");
        setIsRegistering(true);

        // ✅ Stocker les infos nécessaires avant d’envoyer le code
        console.log(
          "💾 [PATIENT REGISTER DEBUG] Storing userType in localStorage BEFORE register call"
        );
        localStorage.setItem("pending-user-type", "patient");
        console.log(
          "💾 [PATIENT REGISTER DEBUG] Stored userType:",
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

      // ✅ Fin propre : retour après l'envoi du SMS
      return;
    }

    try {
      setRegisterError("");
      setIsRegistering(true);

      // Ajoute ceci AVANT la navigation
      localStorage.setItem("pending-user-type", "patient");
      localStorage.setItem("pending-user-name", registerName);
      localStorage.setItem("pending-user-email", registerEmail);

      await register(registerName, registerEmail, registerPassword, "patient");

      // Redirection vers la page de vérification d'e-mail
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
  };

  // Remplir les identifiants de démo
  const fillDemoCredentials = () => {
    setLoginEmail("patient@demo.com");
    setLoginPassword("demo123");
    setLoginError("");
  };

  return (
    <>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-teal-400 py-6">
          <div className="container mx-auto px-4">
            <div className="flex justify-between items-center">
              <Link to="/" className="text-white flex items-center">
                <ArrowLeft className="h-5 w-5 mr-2" />
                Retour à l'accueil
              </Link>
              <h1 className="text-white text-xl font-bold">Espace Patient</h1>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-12">
          <div className="max-w-4xl mx-auto">
            {/* Welcome Section */}
            <div className="text-center mb-12">
              <div className="bg-blue-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                <User className="h-10 w-10 text-blue-500" />
              </div>
              <h2 className="text-3xl font-bold text-gray-800 mb-4">
                Bienvenue dans l'espace patient
              </h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                Consultez des professionnels de santé qualifiés en ligne, en
                toute confidentialité et discrétion.
              </p>
            </div>

            {/* Login and Register Forms */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
              {/* Login Form */}
              <div className="bg-white rounded-xl shadow-md overflow-hidden">
                <div className="p-6 relative">
                  <h3 className="text-xl font-semibold mb-4 flex items-center">
                    Se connecter
                  </h3>

                  {/* Login Method Tabs */}
                  <div className="flex border-b border-gray-200 mb-6">
                    <button
                      className={`flex items-center py-2 px-4 border-b-2 ${
                        loginMethod === "email"
                          ? "border-blue-500 text-blue-600"
                          : "border-transparent text-gray-500 hover:text-gray-700"
                      }`}
                      onClick={() => setLoginMethod("email")}
                    >
                      <Mail className="w-4 h-4 mr-2" />
                      Email
                    </button>
                    <button
                      className={`flex items-center py-2 px-4 border-b-2 ${
                        loginMethod === "phone"
                          ? "border-blue-500 text-blue-600"
                          : "border-transparent text-gray-500 hover:text-gray-700"
                      }`}
                      onClick={() => setLoginMethod("phone")}
                    >
                      <Phone className="w-4 h-4 mr-2" />
                      Téléphone
                    </button>
                  </div>

                  {loginError && (
                    <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg flex items-center">
                      <AlertCircle className="h-5 w-5 mr-2" />
                      <span>{loginError}</span>
                    </div>
                  )}

                  {loginMethod === "email" ? (
                    <>
                      {/* Demo Credentials Info - MASQUÉ */}
                      {/* 
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                        <div className="flex items-start">
                          <User className="h-5 w-5 text-blue-400 mt-0.5 mr-3 flex-shrink-0" />
                          <div className="flex-1">
                            <h3 className="text-sm font-medium text-blue-800 mb-2">
                              Compte de démonstration
                            </h3>
                            <div className="flex justify-between items-center">
                              <span className="text-xs text-blue-700">
                                patient@demo.com / demo123
                              </span>
                              <button
                                type="button"
                                onClick={fillDemoCredentials}
                                className="text-blue-600 hover:text-blue-800 underline ml-2 text-xs"
                              >
                                Utiliser
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                      */}

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
                            className="w-full px-4 py-3 rounded-xl border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 transition-colors"
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
                            className="w-full px-4 py-3 rounded-xl border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 transition-colors"
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
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <label
                              htmlFor="remember-me"
                              className="ml-2 block text-sm text-gray-900"
                            >
                              Se souvenir de moi
                            </label>
                          </div>

                          <div className="text-sm">
                            <a
                              href="#"
                              className="font-medium text-blue-500 hover:text-blue-400"
                            >
                              Mot de passe oublié ?
                            </a>
                          </div>
                        </div>

                        {loginMethod === "email" ? (
                          <button
                            type="submit"
                            disabled={
                              isLoggingIn || !loginEmail || !loginPassword
                            }
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-3 rounded-xl shadow transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {isLoggingIn
                              ? "Connexion en cours..."
                              : "Se connecter"}
                          </button>
                        ) : (
                          <button
                            type="submit"
                            disabled={
                              isLoggingIn || !loginPhone || isInCooldown
                            }
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-3 rounded-xl shadow transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {isLoggingIn
                              ? "Envoi en cours..."
                              : isInCooldown
                              ? `Attendre ${cooldownTime}s`
                              : "Recevoir un code"}
                          </button>
                        )}

                        <CooldownMessage
                          cooldownTime={cooldownTime}
                          isInCooldown={isInCooldown}
                          showInContext={true}
                        />

                        {!isInCooldown && emailVerificationSent && (
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                await sendVerificationCodeForRegister(
                                  registerPhone
                                );
                              } catch (err) {
                                console.error(
                                  "❌ Erreur lors du renvoi du code:",
                                  err
                                );
                              }
                            }}
                            className="w-full text-blue-500 py-2 px-4 rounded-md hover:bg-blue-50 transition-colors font-medium mt-2"
                          >
                            Renvoyer le code
                          </button>
                        )}

                        {/* Cooldown messages moved to specific sections */}

                        {!isInCooldown && emailVerificationSent && (
                          <button
                            type="button"
                            onClick={() =>
                              sendVerificationCodeForLogin(loginPhone)
                            }
                            className="w-full text-blue-500 py-2 px-4 rounded-md hover:bg-blue-50 transition-colors font-medium mt-2"
                          >
                            Renvoyer le code
                          </button>
                        )}
                      </form>
                    </>
                  ) : (
                    <>
                      {showLoginVerificationInput ? (
                        <form
                          onSubmit={(e) => {
                            e.preventDefault();
                            handleVerifyCode();
                          }}
                          className="space-y-4"
                        >
                          <div>
                            <label
                              htmlFor="verification-code"
                              className="block text-sm font-medium text-gray-700 mb-1"
                            >
                              Code de vérification
                            </label>
                            <input
                              id="verification-code"
                              type="text"
                              value={verificationCode}
                              onChange={(e) =>
                                setVerificationCode(e.target.value)
                              }
                              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                              placeholder="Entrez le code reçu par SMS"
                              required
                            />
                            <p className="mt-1 text-sm text-gray-500">
                              Un code a été envoyé au {loginPhone}
                            </p>
                          </div>

                          <button
                            type="submit"
                            disabled={isLoggingIn || !verificationCode}
                            className="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {isLoggingIn
                              ? "Vérification..."
                              : "Vérifier le code"}
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setShowLoginVerificationInput(false);
                              setVerificationCode("");
                            }}
                            className="w-full text-blue-500 py-2 px-4 rounded-md hover:bg-blue-50 transition-colors font-medium"
                          >
                            Retour
                          </button>

                          <CooldownMessage
                            cooldownTime={cooldownTime}
                            isInCooldown={isInCooldown}
                            showInContext={true}
                          />
                        </form>
                      ) : (
                        <form
                          onSubmit={(e) => {
                            e.preventDefault();
                            sendVerificationCodeForLogin(loginPhone)
                              .then((result) => {
                                if (result.success) {
                                  console.log(
                                    "✅ Affichage du formulaire de vérification pour login"
                                  );
                                  setShowLoginVerificationInput(true);
                                } else {
                                  console.log(
                                    "❌ Échec de l'envoi du code - pas de redirection"
                                  );
                                  if (result.error) {
                                    setLoginError(result.error);
                                  }
                                }
                              })
                              .catch((err) => {
                                console.error(
                                  "❌ Erreur lors de l'envoi du code:",
                                  err
                                );

                                // Gestion spécifique des erreurs
                                if (err instanceof Error) {
                                  const errorMessage = err.message;
                                  if (
                                    errorMessage.includes("Trop de tentatives")
                                  ) {
                                    setLoginError(
                                      "Trop de tentatives pour ce numéro. Veuillez attendre 5 minutes avant de réessayer."
                                    );
                                    console.log(
                                      "⏱️ Cooldown activé - pas de redirection"
                                    );
                                  } else {
                                    setLoginError(
                                      "Erreur lors de l'envoi du code. Veuillez réessayer."
                                    );
                                    console.log(
                                      "❌ Erreur générale - pas de redirection"
                                    );
                                  }
                                } else {
                                  setLoginError(
                                    "Erreur lors de l'envoi du code. Veuillez réessayer."
                                  );
                                  console.log(
                                    "❌ Erreur inconnue - pas de redirection"
                                  );
                                }
                              });
                          }}
                          className="space-y-4"
                        >
                          <div>
                            <label
                              htmlFor="login-phone"
                              className="block text-sm font-medium text-gray-700 mb-1"
                            >
                              Numéro de téléphone
                            </label>
                            <PhoneInput
                              international
                              defaultCountry="SN"
                              value={loginPhone}
                              onChange={(value) => setLoginPhone(value || "")}
                              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                              placeholder="Votre numéro de téléphone"
                            />
                            <p className="mt-1 text-sm text-gray-500">
                              Vous recevrez un code par SMS pour vous connecter
                            </p>
                          </div>

                          <button
                            type="submit"
                            disabled={isLoggingIn || !loginPhone}
                            className="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {isLoggingIn
                              ? "Envoi en cours..."
                              : "Recevoir un code"}
                          </button>

                          <CooldownMessage
                            cooldownTime={cooldownTime}
                            isInCooldown={isInCooldown}
                            showInContext={true}
                          />
                        </form>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Register Form */}
              <div className="bg-white rounded-xl shadow-md overflow-hidden">
                <div className="p-6 relative">
                  <h3 className="text-xl font-semibold mb-4 flex items-center">
                    Créer un compte
                  </h3>

                  {/* Register Method Tabs */}
                  <div className="flex border-b border-gray-200 mb-6">
                    <button
                      className={`flex items-center py-2 px-4 border-b-2 ${
                        registerMethod === "email"
                          ? "border-blue-500 text-blue-600"
                          : "border-transparent text-gray-500 hover:text-gray-700"
                      }`}
                      onClick={() => setRegisterMethod("email")}
                    >
                      <Mail className="w-4 h-4 mr-2" />
                      Email
                    </button>
                    <button
                      className={`flex items-center py-2 px-4 border-b-2 ${
                        registerMethod === "phone"
                          ? "border-blue-500 text-blue-600"
                          : "border-transparent text-gray-500 hover:text-gray-700"
                      }`}
                      onClick={() => setRegisterMethod("phone")}
                    >
                      <Phone className="w-4 h-4 mr-2" />
                      Téléphone
                    </button>
                  </div>

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

                  {registerMethod === "email" && (
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
                          className="w-full px-4 py-3 rounded-xl border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 transition-colors"
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
                          className="w-full px-4 py-3 rounded-xl border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 transition-colors"
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
                          className="w-full px-4 py-3 rounded-xl border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 transition-colors"
                          placeholder="Créez un mot de passe"
                          required
                        />
                      </div>

                      <div className="flex items-center">
                        <input
                          id="terms"
                          name="terms"
                          type="checkbox"
                          checked={termsAccepted}
                          onChange={(e) => setTermsAccepted(e.target.checked)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
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
                            className="font-medium text-blue-500 hover:text-blue-400"
                          >
                            conditions d'utilisation
                          </Link>
                          ,{" "}
                          <Link
                            to="/confidentialite"
                            target="_blank"
                            className="font-medium text-blue-500 hover:text-blue-400"
                          >
                            la politique de confidentialité
                          </Link>{" "}
                          et les{" "}
                          <Link
                            to="/ethique"
                            target="_blank"
                            className="font-medium text-blue-500 hover:text-blue-400"
                          >
                            règles d'éthique
                          </Link>
                        </label>
                      </div>

                      <button
                        type="submit"
                        disabled={isRegistering || emailVerificationLoading}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-3 rounded-xl shadow transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isRegistering || emailVerificationLoading
                          ? "Création en cours..."
                          : "Créer un compte"}
                      </button>
                    </form>
                  )}

                  {registerMethod === "phone" &&
                    showRegisterVerificationInput && (
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          handleVerifyRegisterCode();
                        }}
                        className="space-y-4"
                      >
                        <div>
                          <label
                            htmlFor="verification-code-register"
                            className="block text-sm font-medium text-gray-700 mb-1"
                          >
                            Code de vérification
                          </label>
                          <input
                            id="verification-code-register"
                            type="text"
                            value={verificationCode}
                            onChange={(e) =>
                              setVerificationCode(e.target.value)
                            }
                            className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            placeholder="Entrez le code reçu par SMS"
                            required
                          />
                          <p className="mt-1 text-sm text-gray-500">
                            Un code a été envoyé au {registerPhone}
                          </p>
                        </div>

                        <button
                          type="submit"
                          disabled={
                            isRegistering ||
                            !verificationCode ||
                            phoneAuthLoading
                          }
                          className="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isRegistering || phoneAuthLoading
                            ? "Vérification..."
                            : "Vérifier le code"}
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setShowRegisterVerificationInput(false);
                            setVerificationCode("");
                          }}
                          className="w-full text-blue-500 py-2 px-4 rounded-md hover:bg-blue-50 transition-colors font-medium"
                        >
                          Retour
                        </button>
                      </form>
                    )}

                  {registerMethod === "phone" &&
                    !showRegisterVerificationInput && (
                      <form onSubmit={handleRegister} className="space-y-4">
                        <div>
                          <label
                            htmlFor="register-name"
                            className="block text-sm font-medium text-gray-700 mb-1"
                          >
                            Nom et prénom
                          </label>
                          <input
                            id="register-name"
                            type="text"
                            value={registerName}
                            onChange={(e) => setRegisterName(e.target.value)}
                            className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            placeholder="Votre nom complet"
                            required
                          />
                        </div>

                        <div>
                          <label
                            htmlFor="register-phone"
                            className="block text-sm font-medium text-gray-700 mb-1"
                          >
                            Numéro de téléphone
                          </label>
                          <PhoneInput
                            international
                            defaultCountry="SN"
                            value={registerPhone}
                            onChange={(value) => setRegisterPhone(value || "")}
                            className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            placeholder="Votre numéro de téléphone"
                          />
                          <p className="mt-1 text-sm text-gray-500">
                            Vous recevrez un code par SMS pour vérifier votre
                            numéro
                          </p>
                          {registerError && (
                            <p className="mt-1 text-sm text-red-600">
                              {registerError}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center">
                          <input
                            id="terms-phone-register"
                            name="terms-phone-register"
                            type="checkbox"
                            checked={termsAccepted}
                            onChange={(e) => setTermsAccepted(e.target.checked)}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            required
                          />
                          <label
                            htmlFor="terms-phone-register"
                            className="ml-2 block text-sm text-gray-900"
                          >
                            J'accepte les{" "}
                            <Link
                              to="/conditions"
                              target="_blank"
                              className="font-medium text-blue-500 hover:text-blue-400"
                            >
                              conditions d'utilisation
                            </Link>
                            ,{" "}
                            <Link
                              to="/confidentialite"
                              target="_blank"
                              className="font-medium text-blue-500 hover:text-blue-400"
                            >
                              la politique de confidentialité
                            </Link>{" "}
                            et les{" "}
                            <Link
                              to="/ethique"
                              target="_blank"
                              className="font-medium text-blue-500 hover:text-blue-400"
                            >
                              règles d'éthique
                            </Link>
                          </label>
                        </div>

                        <button
                          type="button"
                          disabled={
                            isRegistering || !registerPhone || isInCooldown
                          }
                          onClick={async () => {
                            // Vérifier si c'est un numéro de test
                            const testNumbers = [
                              "+1 450-516-8884",
                              "+14505168884",
                              "+1 450 516 8884",
                            ];
                            const isTestNumber =
                              testNumbers.includes(registerPhone);

                            if (isTestNumber) {
                              console.log(
                                "🧪 Mode test détecté - pas d'envoi de SMS"
                              );
                            }
                            if (!registerPhone) {
                              setRegisterError(
                                "Veuillez entrer un numéro de téléphone valide au format international (ex: +1 450 516 8884)"
                              );
                              return;
                            }

                            try {
                              setRegisterError("");
                              setIsRegistering(true);
                              const result =
                                await sendVerificationCodeForRegister(
                                  registerPhone
                                );
                              if (result.success) {
                                console.log(
                                  "✅ Code envoyé avec succès, affichage du formulaire de vérification"
                                );
                                setShowRegisterVerificationInput(true);
                              } else {
                                if (result.error) {
                                  setRegisterError(result.error);
                                } else {
                                  setRegisterError(
                                    "Erreur lors de l'envoi du code"
                                  );
                                }
                              }
                            } catch (err) {
                              console.error(
                                "❌ Erreur lors de l'envoi du code:",
                                err
                              );
                              setRegisterError(
                                err instanceof Error
                                  ? err.message
                                  : "Erreur lors de l'envoi du code"
                              );
                            } finally {
                              setIsRegistering(false);
                            }
                          }}
                          className="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isRegistering
                            ? "Envoi en cours..."
                            : isInCooldown
                            ? `Attendre ${cooldownTime}s`
                            : "Recevoir un code"}
                        </button>

                        <CooldownMessage
                          cooldownTime={cooldownTime}
                          isInCooldown={isInCooldown}
                        />
                      </form>
                    )}
                </div>
              </div>
            </div>

            {/* Categories */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
              <Link
                to="/professionals/mental"
                className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg hover:scale-105 transition-all duration-300 flex flex-col"
              >
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4 p-3">
                  <Brain className="h-8 w-8 text-blue-500" />
                </div>
                <h3 className="text-xl font-bold mb-2">Santé mentale</h3>
                <p className="text-gray-600 mb-4">
                  Consultez des psychologues et psychiatres qualifiés pour votre
                  bien-être mental.
                </p>
                <div className="mt-auto pt-4 border-t border-gray-100 flex justify-between items-center">
                  <span className="text-sm text-gray-500">
                    Psychologues, Psychiatres
                  </span>
                  <ArrowRight className="h-5 w-5 text-blue-500" />
                </div>
              </Link>

              <Link
                to="/professionals/sexual"
                className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg hover:scale-105 transition-all duration-300 flex flex-col"
              >
                <div className="w-16 h-16 bg-pink-100 rounded-full flex items-center justify-center mb-4 p-3">
                  <Heart className="h-8 w-8 text-pink-500" />
                </div>
                <h3 className="text-xl font-bold mb-2">Santé sexuelle</h3>
                <p className="text-gray-600 mb-4">
                  Échangez avec des gynécologues, sexologues et urologues
                  expérimentés dans un cadre sécurisé.
                </p>
                <div className="mt-auto pt-4 border-t border-gray-100 flex justify-between items-center">
                  <span className="text-sm text-gray-500">
                    Gynécologues, Sexologues, Urologues
                  </span>
                  <ArrowRight className="h-5 w-5 text-pink-500" />
                </div>
              </Link>
            </div>

            {/* Benefits */}
            <div className="bg-gray-50 rounded-xl shadow-md p-6 mb-12">
              <h3 className="text-xl font-semibold mb-6 text-center">
                Pourquoi choisir Health-e ?
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4 p-3">
                    <ShieldCheck className="h-6 w-6 text-blue-500" />
                  </div>
                  <h4 className="font-medium mb-2">Confidentialité</h4>
                  <p className="text-gray-600 text-sm">
                    Vos consultations et données sont protégées et sécurisées
                  </p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4 p-3">
                    <Clock className="h-6 w-6 text-blue-500" />
                  </div>
                  <h4 className="font-medium mb-2">Flexibilité</h4>
                  <p className="text-gray-600 text-sm">
                    Consultez depuis chez vous, à l'heure qui vous convient
                  </p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4 p-3">
                    <Users className="h-6 w-6 text-blue-500" />
                  </div>
                  <h4 className="font-medium mb-2">Professionnels qualifiés</h4>
                  <p className="text-gray-600 text-sm">
                    Des experts vérifiés et certifiés dans leur domaine
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default PatientAccess;
