import React from "react";
import { AlertCircle, Clock, RefreshCw } from "lucide-react";

interface RateLimitMessageProps {
  cooldownTime: number;
  isInCooldown: boolean;
  onRetry?: () => void;
  errorType?: "too-many-requests" | "quota-exceeded" | "network-error";
}

const RateLimitMessage: React.FC<RateLimitMessageProps> = ({
  cooldownTime,
  isInCooldown,
  onRetry,
  errorType = "too-many-requests",
}) => {
  const getMessage = () => {
    switch (errorType) {
      case "too-many-requests":
        return {
          title: "Trop de tentatives",
          message:
            "Vous avez fait trop de tentatives d'envoi de SMS. Veuillez attendre avant de réessayer.",
          icon: Clock,
        };
      case "quota-exceeded":
        return {
          title: "Quota dépassé",
          message:
            "Le quota de SMS a été dépassé. Veuillez réessayer plus tard.",
          icon: AlertCircle,
        };
      case "network-error":
        return {
          title: "Erreur de connexion",
          message: "Problème de connexion. Vérifiez votre connexion internet.",
          icon: AlertCircle,
        };
      default:
        return {
          title: "Erreur temporaire",
          message: "Une erreur temporaire s'est produite. Veuillez réessayer.",
          icon: AlertCircle,
        };
    }
  };

  const { title, message, icon: Icon } = getMessage();

  return (
    <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
      <div className="flex items-start">
        <Icon className="h-5 w-5 text-orange-500 mt-0.5 mr-3 flex-shrink-0" />
        <div className="flex-1">
          <h4 className="text-sm font-medium text-orange-800 mb-1">{title}</h4>
          <p className="text-sm text-orange-700 mb-3">{message}</p>

          {isInCooldown && (
            <div className="flex items-center text-sm text-orange-600">
              <Clock className="h-4 w-4 mr-2" />
              <span>
                Temps d'attente restant : {Math.floor(cooldownTime / 60)}:
                {(cooldownTime % 60).toString().padStart(2, "0")}
              </span>
            </div>
          )}

          {!isInCooldown && onRetry && (
            <button
              onClick={onRetry}
              className="mt-2 inline-flex items-center text-sm text-orange-600 hover:text-orange-800"
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              Réessayer
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default RateLimitMessage;
