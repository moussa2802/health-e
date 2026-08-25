import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import paytechService from "../../services/paytechService";
import LoadingSpinner from "../ui/LoadingSpinner";
import { CreditCard, AlertCircle, ShieldCheck } from "lucide-react";

interface PayTechPaymentFormProps {
  bookingId: string;
  amount: number;
  professionalId: string;
  professionalName: string;
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

const PayTechPaymentForm: React.FC<PayTechPaymentFormProps> = ({
  bookingId,
  amount,
  professionalId,
  professionalName,
  onSuccess,
  onError,
}) => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePayment = async () => {
    if (!currentUser) {
      setError("Vous devez être connecté pour effectuer un paiement");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log(
        "[PAYTECH] Starting payment process for booking:",
        bookingId
      );

      // Générer un email par défaut si manquant (pour l'authentification par téléphone)
      const customerEmail =
        currentUser.email || `patient_${currentUser.id}@health-e.sn`;

      // Préparer les données de paiement
      const paymentData = {
        amount: paytechService.formatAmount(amount),
        bookingId,
        customerEmail: customerEmail,
        customerPhone: currentUser.phoneNumber || "",
        customerName: currentUser.displayName || "Patient",
        professionalId,
        professionalName,
        description: `Consultation avec ${professionalName}`,
      };

      // Valider les données
      if (!paytechService.validatePaymentData(paymentData)) {
        throw new Error("Données de paiement invalides");
      }

      // Initier le paiement
      const response = await paytechService.initiatePayment(paymentData);

      console.log(
        "[PAYTECH] Payment initiated, redirecting to:",
        response.redirect_url
      );

      // Rediriger vers la page de paiement PayTech selon les instructions officielles
      paytechService.redirectToPayment(response.redirect_url);

      // Appeler le callback de succès si défini
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error("[PAYTECH] Payment error:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Erreur lors du paiement";
      setError(errorMessage);

      if (onError) {
        onError(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-card rounded-block border border-line shadow-soft p-6">
      <div className="flex items-center mb-4">
        <CreditCard className="h-6 w-6 text-accent mr-2" />
        <h3 className="font-display text-lg font-semibold text-ink">
          Paiement sécurisé
        </h3>
      </div>

      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <span className="text-ink-soft">Montant à payer :</span>
          <span className="text-xl font-bold text-ok">
            {amount.toLocaleString()} XOF
          </span>
        </div>

        <div className="bg-paper rounded-xl p-4 mb-4">
          <h4 className="font-medium text-ink mb-2">
            Détails de la consultation
          </h4>
          <div className="text-sm text-ink-soft">
            <p>
              <strong className="text-ink">Professionnel :</strong> {professionalName}
            </p>
            <p>
              <strong className="text-ink">Référence :</strong> {bookingId}
            </p>
          </div>
        </div>

        {error && (
          <div className="bg-danger/10 border border-danger/20 rounded-xl p-4 mb-4">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-danger mr-2 flex-shrink-0" />
              <span className="text-danger">{error}</span>
            </div>
          </div>
        )}

        <div className="bg-sage-soft border border-sage/20 rounded-xl p-4 mb-6">
          <div className="flex items-start">
            <ShieldCheck className="h-5 w-5 text-sage mr-2 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-sage">
              <p className="font-medium mb-1">Paiement sécurisé</p>
              <p>
                Votre paiement sera traité de manière sécurisée par PayTech.
                Vous serez redirigé vers leur plateforme de paiement.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex space-x-4">
        <button
          onClick={handlePayment}
          disabled={isLoading}
          className={`flex-1 flex items-center justify-center px-6 py-3 rounded-pill font-medium transition-colors ${
            isLoading
              ? "bg-line text-muted cursor-not-allowed"
              : "bg-accent hover:bg-accent/90 text-white"
          }`}
        >
          {isLoading ? (
            <>
              <LoadingSpinner size="sm" />
              <span className="ml-2">Traitement en cours...</span>
            </>
          ) : (
            <>
              <CreditCard className="h-5 w-5 mr-2" />
              Payer maintenant
            </>
          )}
        </button>

        <button
          onClick={() => navigate(-1)}
          disabled={isLoading}
          className="px-6 py-3 border border-line text-ink-soft rounded-pill hover:bg-paper transition-colors disabled:opacity-50"
        >
          Annuler
        </button>
      </div>

      <div className="mt-4 text-xs text-muted text-center">
        En cliquant sur "Payer maintenant", vous acceptez les conditions de
        paiement de PayTech.
      </div>
    </div>
  );
};

export default PayTechPaymentForm;
