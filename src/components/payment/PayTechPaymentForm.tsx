import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import paytechService from '../../services/paytechService';
import LoadingSpinner from '../ui/LoadingSpinner';
import { CreditCard, AlertCircle, CheckCircle } from 'lucide-react';

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
  onError
}) => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePayment = async () => {
    if (!currentUser) {
      setError('Vous devez être connecté pour effectuer un paiement');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log('🔔 [PAYTECH] Starting payment process for booking:', bookingId);

      // Préparer les données de paiement
      const paymentData = {
        amount: paytechService.formatAmount(amount),
        bookingId,
        customerEmail: currentUser.email || '',
        customerPhone: currentUser.phoneNumber || '',
        customerName: currentUser.displayName || 'Patient',
        professionalId,
        professionalName,
        description: `Consultation avec ${professionalName}`
      };

      // Valider les données
      if (!paytechService.validatePaymentData(paymentData)) {
        throw new Error('Données de paiement invalides');
      }

      // Initier le paiement
      const response = await paytechService.initiatePayment(paymentData);

      console.log('✅ [PAYTECH] Payment initiated, redirecting to:', response.paymentUrl);

      // Rediriger vers la page de paiement PayTech
      paytechService.redirectToPayment(response.paymentUrl);

      // Appeler le callback de succès si défini
      if (onSuccess) {
        onSuccess();
      }

    } catch (error) {
      console.error('❌ [PAYTECH] Payment error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erreur lors du paiement';
      setError(errorMessage);
      
      if (onError) {
        onError(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center mb-4">
        <CreditCard className="h-6 w-6 text-blue-600 mr-2" />
        <h3 className="text-lg font-semibold text-gray-900">Paiement sécurisé</h3>
      </div>

      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <span className="text-gray-600">Montant à payer :</span>
          <span className="text-xl font-bold text-green-600">
            {amount.toLocaleString()} XOF
          </span>
        </div>

        <div className="bg-gray-50 rounded-lg p-4 mb-4">
          <h4 className="font-medium text-gray-900 mb-2">Détails de la consultation</h4>
          <div className="text-sm text-gray-600">
            <p><strong>Professionnel :</strong> {professionalName}</p>
            <p><strong>Référence :</strong> {bookingId}</p>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
              <span className="text-red-700">{error}</span>
            </div>
          </div>
        )}

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-start">
            <CheckCircle className="h-5 w-5 text-blue-500 mr-2 mt-0.5" />
            <div className="text-sm text-blue-700">
              <p className="font-medium mb-1">Paiement sécurisé</p>
              <p>Votre paiement sera traité de manière sécurisée par PayTech. 
              Vous serez redirigé vers leur plateforme de paiement.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex space-x-4">
        <button
          onClick={handlePayment}
          disabled={isLoading}
          className={`flex-1 flex items-center justify-center px-6 py-3 rounded-lg font-medium transition-colors ${
            isLoading
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
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
          className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          Annuler
        </button>
      </div>

      <div className="mt-4 text-xs text-gray-500 text-center">
        En cliquant sur "Payer maintenant", vous acceptez les conditions de paiement de PayTech.
      </div>
    </div>
  );
};

export default PayTechPaymentForm;
