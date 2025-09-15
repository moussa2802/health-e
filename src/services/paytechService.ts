import { getAuth } from "firebase/auth";

// Interface pour les données de paiement
interface PaymentData {
  amount: number;
  bookingId: string;
  customerEmail: string;
  customerPhone?: string; // Optionnel, valeur par défaut sera utilisée si manquant
  customerName: string;
  professionalId: string;
  professionalName?: string;
  description?: string;
}

// Interface pour la réponse de paiement selon les instructions officielles
interface PaymentResponse {
  success: number;
  redirect_url: string;
  refCommand: string;
}

/**
 * Service PayTech pour gérer les paiements
 */
class PayTechService {
  private auth = getAuth();

  /**
   * Initier un paiement PayTech
   */
  async initiatePayment(paymentData: PaymentData): Promise<PaymentResponse> {
    try {
      console.log(
        "🔔 [PAYTECH] Initiating payment for booking:",
        paymentData.bookingId
      );

      // Vérifier que l'utilisateur est authentifié
      const currentUser = this.auth.currentUser;
      if (!currentUser) {
        throw new Error("Utilisateur non authentifié");
      }

      // Appeler la fonction Netlify
      const response = await fetch(
        "/.netlify/functions/paytech-initiate-payment",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(paymentData),
        }
      );

      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }

      const result = await response.json();

      if (result.success !== 1) {
        throw new Error("Échec de l'initialisation du paiement");
      }

      console.log("✅ [PAYTECH] Payment initiated successfully:", result);
      return result;
    } catch (error) {
      console.error("❌ [PAYTECH] Error initiating payment:", error);
      throw new Error("Erreur lors de l'initialisation du paiement");
    }
  }

  /**
   * Rediriger vers la page de paiement PayTech selon les instructions officielles
   */
  redirectToPayment(redirectUrl: string): void {
    try {
      console.log("🔔 [PAYTECH] Redirecting to payment URL:", redirectUrl);
      window.location.href = redirectUrl;
    } catch (error) {
      console.error("❌ [PAYTECH] Error redirecting to payment:", error);
      throw new Error("Erreur lors de la redirection vers le paiement");
    }
  }

  /**
   * Vérifier le statut d'un paiement
   */
  async checkPaymentStatus(token: string): Promise<any> {
    try {
      // Cette fonction pourrait être implémentée si PayTech fournit une API pour vérifier le statut
      // Pour l'instant, on se base sur les webhooks IPN
      throw new Error(
        "Vérification du statut non implémentée - utilisez les webhooks IPN"
      );
    } catch (error) {
      console.error("❌ [PAYTECH] Error checking payment status:", error);
      throw error;
    }
  }

  /**
   * Formater le montant pour PayTech (en centimes)
   */
  formatAmount(amount: number): number {
    // PayTech attend le montant en centimes selon les instructions officielles
    return Math.round(amount * 100);
  }

  /**
   * Valider les données de paiement
   */
  validatePaymentData(data: PaymentData): boolean {
    const requiredFields = [
      "amount",
      "bookingId",
      "customerEmail",
      "customerName",
      "professionalId",
    ];

    for (const field of requiredFields) {
      if (!data[field as keyof PaymentData]) {
        console.error(`❌ [PAYTECH] Missing required field: ${field}`);
        console.error(`❌ [PAYTECH] Current data:`, {
          amount: data.amount,
          bookingId: data.bookingId,
          customerEmail: data.customerEmail,
          customerName: data.customerName,
          professionalId: data.professionalId,
        });
        return false;
      }
    }

    // Validation spécifique pour l'email
    if (data.customerEmail && !this.isValidEmail(data.customerEmail)) {
      console.error("❌ [PAYTECH] Invalid email format:", data.customerEmail);
      return false;
    }

    // Le numéro de téléphone est optionnel, utiliser une valeur par défaut si manquant
    if (!data.customerPhone) {
      console.log("⚠️ [PAYTECH] No phone number provided, using default");
      data.customerPhone = "770000000"; // Numéro par défaut pour PayTech
    }

    if (data.amount <= 0) {
      console.error("❌ [PAYTECH] Invalid amount:", data.amount);
      return false;
    }

    return true;
  }

  /**
   * Valider le format de l'email
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}

// Instance singleton
export const paytechService = new PayTechService();
export default paytechService;
