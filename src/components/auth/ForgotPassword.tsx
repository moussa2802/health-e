import React, { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Mail, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { validateEmail } from "../../utils/emailValidation";
import EmailInput from "./EmailInput";

const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const { resetPassword } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      setError("Veuillez entrer votre adresse email");
      return;
    }
    const emailCheck = validateEmail(email);
    if (!emailCheck.valid) {
      setError(emailCheck.error!);
      return;
    }

    try {
      setIsLoading(true);
      setError("");
      await resetPassword(email);
      setSuccess(true);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Une erreur inattendue s'est produite");
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-card rounded-block border border-line shadow-soft p-8">
          <div className="text-center">
            <CheckCircle2 className="h-16 w-16 text-ok mx-auto mb-4" />
            <h2 className="font-display text-2xl font-bold text-ink mb-4">
              Email envoyé !
            </h2>
            <p className="text-ink-soft mb-6">
              Nous avons envoyé un lien de réinitialisation à{" "}
              <span className="font-semibold text-ink">{email}</span>
            </p>
            <p className="text-sm text-muted mb-6">
              Vérifiez votre boîte de réception et cliquez sur le lien pour réinitialiser votre mot de passe.
            </p>
            <Link
              to="/patient/access"
              className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-pill text-white bg-ink hover:bg-ink/90 transition-colors"
            >
              Retour à la connexion
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-paper flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-card rounded-block border border-line shadow-soft p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <Link
            to="/patient/access"
            className="inline-flex items-center text-sm text-accent hover:text-accent/80 mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour à la connexion
          </Link>
          <h2 className="font-display text-2xl font-bold text-ink">
            Mot de passe oublié ?
          </h2>
          <p className="text-ink-soft mt-2">
            Entrez votre adresse email et nous vous enverrons un lien pour réinitialiser votre mot de passe.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-ink-soft mb-2">
              Adresse email
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-muted" />
              </div>
              <EmailInput
                id="email"
                autoComplete="email"
                required
                value={email}
                onChange={setEmail}
                className="block w-full pl-10 pr-3 py-2 border border-line rounded-xl bg-card placeholder-muted focus:outline-none focus:border-accent"
                placeholder="votre@email.com"
              />
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-center p-3 text-sm text-danger bg-danger/10 rounded-xl">
              <AlertCircle className="h-4 w-4 mr-2 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex justify-center items-center py-2.5 px-4 rounded-pill text-sm font-medium text-white bg-ink hover:bg-ink/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <div className="flex items-center">
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Envoi en cours...
              </div>
            ) : (
              "Envoyer le lien de réinitialisation"
            )}
          </button>
        </form>

        {/* Additional Help */}
        <div className="mt-6 text-center">
          <p className="text-sm text-ink-soft">
            Vous vous souvenez de votre mot de passe ?{" "}
            <Link
              to="/patient/access"
              className="font-medium text-accent hover:text-accent/80"
            >
              Se connecter
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
