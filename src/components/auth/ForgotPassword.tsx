import React, { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Mail, CheckCircle, AlertCircle } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";

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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
          <div className="text-center">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Email envoyé !
            </h2>
            <p className="text-gray-600 mb-6">
              Nous avons envoyé un lien de réinitialisation à{" "}
              <span className="font-semibold">{email}</span>
            </p>
            <p className="text-sm text-gray-500 mb-6">
              Vérifiez votre boîte de réception et cliquez sur le lien pour réinitialiser votre mot de passe.
            </p>
            <Link
              to="/patient/access"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Retour à la connexion
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <Link
            to="/patient/access"
            className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour à la connexion
          </Link>
          <h2 className="text-2xl font-bold text-gray-900">
            Mot de passe oublié ?
          </h2>
          <p className="text-gray-600 mt-2">
            Entrez votre adresse email et nous vous enverrons un lien pour réinitialiser votre mot de passe.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Adresse email
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-gray-400" />
              </div>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                placeholder="votre@email.com"
              />
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-center p-3 text-sm text-red-700 bg-red-100 rounded-md">
              <AlertCircle className="h-4 w-4 mr-2" />
              {error}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Envoi en cours...
              </div>
            ) : (
              "Envoyer le lien de réinitialisation"
            )}
          </button>
        </form>

        {/* Additional Help */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Vous vous souvenez de votre mot de passe ?{" "}
            <Link
              to="/patient/access"
              className="font-medium text-blue-600 hover:text-blue-500"
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
