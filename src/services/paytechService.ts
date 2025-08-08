import { getFunctions, httpsCallable } from 'firebase/functions';
import { getAuth } from 'firebase/auth';

// Interface pour les données de paiement
interface PaymentData {
  amount: number;
  bookingId: string;
  customerEmail: string;
  customerPhone: string;
  customerName: string;
  professionalId: string;
  professionalName?: string;
  description?: string;
}

// Interface pour la réponse de paiement
interface PaymentResponse {
  success: boolean;
  paymentUrl: string;
  token: string;
  refCommand: string;
}

/**
 * Service PayTech pour gérer les paiements
 */
class PayTechService {
  private functions = getFunctions();
  private auth = getAuth();

  /**
   * Initier un paiement PayTech
   */
  async initiatePayment(paymentData: PaymentData): Promise<PaymentResponse> {
    try {
      console.log('🔔 [PAYTECH] Initiating payment for booking:', paymentData.bookingId);

      // Vérifier que l'utilisateur est authentifié
      const currentUser = this.auth.currentUser;
      if (!currentUser) {
        throw new Error('Utilisateur non authentifié');
      }

      // Appeler la fonction Firebase
      const initiatePaymentFunction = httpsCallable(this.functions, 'initiatePayment');
      const result = await initiatePaymentFunction(paymentData);

      const response = result.data as PaymentResponse;

      if (!response.success) {
        throw new Error('Échec de l\'initialisation du paiement');
      }

      console.log('✅ [PAYTECH] Payment initiated successfully:', response);
      return response;

    } catch (error) {
      console.error('❌ [PAYTECH] Error initiating payment:', error);
      throw new Error('Erreur lors de l\'initialisation du paiement');
    }
  }

  /**
   * Rediriger vers la page de paiement PayTech
   */
  redirectToPayment(paymentUrl: string): void {
    try {
      console.log('🔔 [PAYTECH] Redirecting to payment URL:', paymentUrl);
      window.location.href = paymentUrl;
    } catch (error) {
      console.error('❌ [PAYTECH] Error redirecting to payment:', error);
      throw new Error('Erreur lors de la redirection vers le paiement');
    }
  }

  /**
   * Vérifier le statut d'un paiement
   */
  async checkPaymentStatus(token: string): Promise<any> {
    try {
      console.log('🔔 [PAYTECH] Checking payment status for token:', token);

      // Cette fonction pourrait être implémentée si PayTech fournit une API pour vérifier le statut
      // Pour l'instant, on se base sur les webhooks IPN
      
      // TODO: Implémenter la vérification du statut si l'API PayTech le permet
      throw new Error('Vérification du statut non implémentée - utilisez les webhooks IPN');

    } catch (error) {
      console.error('❌ [PAYTECH] Error checking payment status:', error);
      throw error;
    }
  }

  /**
   * Formater le montant pour PayTech (en centimes)
   */
  formatAmount(amount: number): number {
    // PayTech attend le montant en centimes
    return Math.round(amount * 100);
  }

  /**
   * Valider les données de paiement
   */
  validatePaymentData(data: PaymentData): boolean {
    const requiredFields = ['amount', 'bookingId', 'customerEmail', 'customerPhone', 'customerName', 'professionalId'];
    
    for (const field of requiredFields) {
      if (!data[field as keyof PaymentData]) {
        console.error(`❌ [PAYTECH] Missing required field: ${field}`);
        return false;
      }
    }

    if (data.amount <= 0) {
      console.error('❌ [PAYTECH] Invalid amount:', data.amount);
      return false;
    }

    return true;
  }
}

// Instance singleton
export const paytechService = new PayTechService();
export default paytechService;
