import { getAuth } from "firebase/auth";

// Types (adapter si JS)
export type PaymentMethod = "mobile" | "card";

export interface PaymentInit {
  amount: number; // XOF entier
  bookingId: string;
  method: PaymentMethod; // 👈 important
  customerName: string;
  customerEmail?: string | null; // requis si 'card'
  customerPhone?: string | null; // requis si 'mobile'
  professionalId: string;
  professionalName: string;
  description?: string;
  successUrl: string;
  cancelUrl: string;
  // champs métier optionnels
  patientId?: string;
  date?: string;
  startTime?: string;
  endTime?: string;
  type?: string;
}

// Interface pour les données de paiement (legacy - pour compatibilité)
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
  async initiatePayment(
    paymentData: PaymentData | PaymentInit
  ): Promise<PaymentResponse> {
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
   * Valider les données de paiement (legacy et nouveau format)
   */
  validatePaymentData(data: PaymentData | PaymentInit): boolean {
    try {
      // Si c'est le nouveau format PaymentInit, utiliser la validation stricte
      if ("method" in data && "successUrl" in data) {
        validatePaymentInit(data as PaymentInit);
        return true;
      }

      // Sinon, validation legacy simplifiée
      const legacyData = data as PaymentData;
      const requiredFields = [
        "amount",
        "bookingId",
        "customerName",
        "professionalId",
      ];

      for (const field of requiredFields) {
        if (!legacyData[field as keyof PaymentData]) {
          console.error(`❌ [PAYTECH] Missing required field: ${field}`);
          console.error(`❌ [PAYTECH] Current data:`, {
            amount: legacyData.amount,
            bookingId: legacyData.bookingId,
            customerEmail: legacyData.customerEmail,
            customerName: legacyData.customerName,
            professionalId: legacyData.professionalId,
          });
          return false;
        }
      }

      // customerEmail n'est plus obligatoire pour les paiements mobile

      // Validation spécifique pour l'email (accepter les emails générés automatiquement)
      if (
        legacyData.customerEmail &&
        !this.isValidEmail(legacyData.customerEmail)
      ) {
        console.error(
          "❌ [PAYTECH] Invalid email format:",
          legacyData.customerEmail
        );
        return false;
      }

      // Le numéro de téléphone est optionnel, utiliser une valeur par défaut si manquant
      if (!legacyData.customerPhone) {
        console.log("⚠️ [PAYTECH] No phone number provided, using default");
        legacyData.customerPhone = "770000000"; // Numéro par défaut pour PayTech
      }

      if (legacyData.amount <= 0) {
        console.error("❌ [PAYTECH] Invalid amount:", legacyData.amount);
        return false;
      }

      return true;
    } catch (error) {
      console.error("❌ [PAYTECH] Validation error:", error);
      return false;
    }
  }

  /**
   * Valider le format de l'email
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}

// Remplacer l'ancienne fonction par celle-ci
export function validatePaymentInit(d: PaymentInit): true {
  // Champs base
  const baseRequired = [
    "amount",
    "bookingId",
    "method",
    "successUrl",
    "cancelUrl",
  ] as const;
  for (const k of baseRequired) {
    // @ts-ignore
    if (d[k] === undefined || d[k] === null || d[k] === "") {
      console.error("❌ [PAYTECH] Missing required field:", k);
      console.error("❌ [PAYTECH] Current data:", {
        amount: d.amount,
        bookingId: d.bookingId,
        customerEmail: d.customerEmail ?? null,
        customerPhone: d.customerPhone ?? null,
        customerName: d.customerName,
        professionalId: d.professionalId,
      });
      throw new Error(`Missing required field: ${k}`);
    }
  }

  if (!Number.isFinite(d.amount) || d.amount <= 0) {
    throw new Error("Invalid amount");
  }

  if (d.method === "card") {
    if (!d.customerEmail)
      throw new Error("customerEmail is required for card payments");
  } else if (d.method === "mobile") {
    if (!d.customerPhone)
      throw new Error("customerPhone is required for mobile payments");
  } else {
    throw new Error("Unsupported payment method");
  }

  return true;
}

// Instance singleton
export const paytechService = new PayTechService();
export default paytechService;
