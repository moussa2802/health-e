import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ShieldAlert, ArrowLeft, AlertCircle } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { useLanguage } from "../../contexts/LanguageContext";
import { getAuth } from "firebase/auth";

const AdminLogin: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const { login } = useAuth();
  const { language } = useLanguage();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      setError(
        language === "fr"
          ? "Veuillez remplir tous les champs"
          : "Please fill in all fields"
      );
      return;
    }

    try {
      setError("");
      setIsLoading(true);
      await login(email, password, "admin");

      // Redirect to admin dashboard
      navigate("/admin/dashboard");
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError(
          language === "fr" ? "Identifiants incorrects" : "Invalid credentials"
        );
      }
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const fillDemoCredentials = () => {
    setEmail("admin@demo.com");
    setPassword("admin123");
    setError("");
  };

  return (
    <div className="min-h-screen bg-paper">
      {/* Header */}
      <div className="bg-ink py-6">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center">
            <Link to="/" className="text-white flex items-center">
              <ArrowLeft className="h-5 w-5 mr-2" />
              Retour à l'accueil
            </Link>
            <h1 className="text-white text-xl font-display font-bold">
              Administration
            </h1>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        <div className="max-w-md mx-auto">
          {/* Welcome Section */}
          <div className="text-center mb-8">
            <div className="bg-ink/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
              <ShieldAlert className="h-10 w-10 text-ink" />
            </div>
            <h2 className="text-2xl font-display font-bold text-ink mb-2">
              Espace administrateur
            </h2>
            <p className="text-ink-soft">
              Connectez-vous pour accéder au tableau de bord d'administration
            </p>
          </div>

          {/* Login Form */}
          <div className="bg-card rounded-block shadow-lift overflow-hidden">
            <div className="p-6">
              {error && (
                <div
                  className="bg-danger/10 border border-danger text-danger px-4 py-3 rounded-card relative mb-4"
                  role="alert"
                >
                  <div className="flex items-center">
                    <AlertCircle className="h-5 w-5 mr-2" />
                    <span className="block sm:inline">{error}</span>
                  </div>
                </div>
              )}

              {/* Demo Credentials Info - MASQUÉ */}
              {/*
              <div className="bg-accent-soft border border-accent/30 rounded-card p-4 mb-6">
                <div className="flex items-start">
                  <ShieldAlert className="h-5 w-5 text-accent mt-0.5 mr-3 flex-shrink-0" />
                  <div className="flex-1">
                    <h3 className="text-sm font-medium text-accent mb-2">
                      Compte de démonstration
                    </h3>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-accent"><strong>Admin:</strong> admin@demo.com / admin123</span>
                      <button
                        type="button"
                        onClick={fillDemoCredentials}
                        className="text-accent hover:text-accent/80 underline ml-2 text-xs"
                      >
                        Utiliser
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              */}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label
                    htmlFor="email-address"
                    className="block text-sm font-medium text-ink-soft mb-1"
                  >
                    Adresse email
                  </label>
                  <input
                    id="email-address"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="appearance-none rounded-card relative block w-full px-3 py-2 border border-line placeholder-muted text-ink focus:outline-none focus:ring-accent focus:border-accent focus:z-10 sm:text-sm"
                    placeholder="Email"
                  />
                </div>

                <div>
                  <label
                    htmlFor="password"
                    className="block text-sm font-medium text-ink-soft mb-1"
                  >
                    Mot de passe
                  </label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="appearance-none rounded-card relative block w-full px-3 py-2 border border-line placeholder-muted text-ink focus:outline-none focus:ring-accent focus:border-accent focus:z-10 sm:text-sm"
                    placeholder="Mot de passe"
                  />
                </div>

                <div>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-card text-white bg-ink hover:bg-ink/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? "Connexion en cours..." : "Se connecter"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
