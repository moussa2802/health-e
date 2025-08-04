// Service pour gérer les paiements PayDunya
import { getFirestore, doc, setDoc, updateDoc } from "firebase/firestore";

export interface PayDunyaInvoice {
  token: string;
  status: string;
  amount: number;
  currency: string;
  invoice_number?: string;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  description?: string;
  items?: Array<{
    name: string;
    quantity: number;
    unit_price: number;
    total_price: number;
    description?: string;
  }>;
}

export interface PayDunyaPaymentData {
  token: string;
  invoice: PayDunyaInvoice;
  payment_method?: string;
  payment_date?: string;
  transaction_id?: string;
}

// Configuration PayDunya (à remplacer par vos vraies clés)
const PAYDUNYA_CONFIG = {
  publicKey:
    process.env.REACT_APP_PAYDUNYA_PUBLIC_KEY ||
    "test_public_p64arhicc9ELdNg7kD78tmEYE3a",
  privateKey:
    process.env.REACT_APP_PAYDUNYA_PRIVATE_KEY ||
    "test_private_Cvyg0Z3E0kuBE20lWqZbjTxzKhf",
  masterKey:
    process.env.REACT_APP_PAYDUNYA_MASTER_KEY ||
    "gzt0lrr3-IhY9-C15D-nQjQ-4YiQ3HmHdWtF",
  baseUrl: "https://app.paydunya.com/api/v1",
  mode: "test", // ou 'live' pour la production
};

export class PayDunyaService {
  private static instance: PayDunyaService;
  private db = getFirestore();

  public static getInstance(): PayDunyaService {
    if (!PayDunyaService.instance) {
      PayDunyaService.instance = new PayDunyaService();
    }
    return PayDunyaService.instance;
  }

  // Créer une facture PayDunya
  async createInvoice(bookingData: {
    bookingId: string;
    patientName: string;
    patientEmail: string;
    patientPhone: string;
    professionalName: string;
    professionalId: string;
    consultationType: string;
    date: string;
    time: string;
    price: number;
    duration: number;
  }): Promise<{ success: boolean; invoiceUrl?: string; error?: string }> {
    try {
      console.log(
        "🔔 [PAYDUNYA] Creating invoice for booking:",
        bookingData.bookingId
      );

      // 🔍 DEBUG: Vérifier les types des données avant envoi
      console.log("[DEBUG] Type des champs envoyés à PayDunya:");
      console.log("unit_price:", bookingData.price, typeof bookingData.price);
      console.log("bookingData.professionalId:", bookingData.professionalId);
      console.log("bookingData.patientPhone:", bookingData.patientPhone);
      console.log("bookingData.bookingId:", bookingData.bookingId);

      // 🧪 TEST STATIQUE - Décommentez pour tester avec des données fixes
      /*
      const invoiceData = {
        invoice: {
          items: [
            {
              name: "Consultation test",
              quantity: 1,
              unit_price: 25000,
              description: "Consultation test statique"
            }
          ],
          total_amount: 25000,
          description: "Consultation test"
        },
        store: {
          name: "Health-e",
          website_url: "https://health-e.sn"
        },
        actions: {
          callback_url: "https://health-e.sn/success",
          cancel_url: "https://health-e.sn/cancel",
          return_url: "https://health-e.sn/return"
        },
        custom_data: {
          invoice_number: "INV-123456789",
          customer_name: "Test Patient",
          customer_email: "test@example.com",
          customer_phone: "770000000"
        }
      };
      */

      // Préparer les données de la facture selon le format PayDunya
      const invoiceData = {
        invoice: {
          items: [
            {
              name: `Consultation ${bookingData.consultationType} - ${bookingData.professionalName}`,
              quantity: 1,
              unit_price: parseInt(bookingData.price.toString()), // 🔧 Force en entier
              description: `Consultation ${bookingData.consultationType} le ${bookingData.date} à ${bookingData.time} (${bookingData.duration} min)`,
            },
          ],
          total_amount: parseInt(bookingData.price.toString()), // 🔧 Force en entier
          description: `Consultation avec ${bookingData.professionalName}`,
        },
        store: {
          name: "Health-e",
          website_url: "https://health-e.sn",
        },
        actions: {
          callback_url: `https://health-e.sn/appointment-success/${bookingData.bookingId}`,
          cancel_url: bookingData.professionalId
            ? `https://health-e.sn/book-appointment/${bookingData.professionalId}`
            : `https://health-e.sn/home`, // URL par défaut si undefined
          return_url: `https://health-e.sn/appointment-success/${bookingData.bookingId}`,
        },
        custom_data: {
          invoice_number: `INV-${bookingData.bookingId}`,
          customer_name: bookingData.patientName,
          customer_email: bookingData.patientEmail,
          customer_phone: bookingData.patientPhone || "770000000", // 🛑 Mets un téléphone factice si vide
        },
      };

      // 🔍 DEBUG: Vérifier les URLs générées
      console.log("🔍 [DEBUG] URLs générées:");
      console.log("callback_url:", `https://health-e.sn/appointment-success/${bookingData.bookingId}`);
      console.log("cancel_url:", bookingData.professionalId
        ? `https://health-e.sn/book-appointment/${bookingData.professionalId}`
        : `https://health-e.sn/home`);
      console.log("return_url:", `https://health-e.sn/appointment-success/${bookingData.bookingId}`);

      // Appel à l'API PayDunya pour créer la facture
      console.log(
        "🔔 [PAYDUNYA] API URL:",
        `${PAYDUNYA_CONFIG.baseUrl}/checkout-invoice/create`
      );
      console.log("🔔 [PAYDUNYA] Headers:", {
        "Content-Type": "application/json",
        "PAYDUNYA-PUBLIC-KEY": PAYDUNYA_CONFIG.publicKey,
        "PAYDUNYA-PRIVATE-KEY": PAYDUNYA_CONFIG.privateKey,
        "PAYDUNYA-MASTER-KEY": PAYDUNYA_CONFIG.masterKey,
        "PAYDUNYA-MODE": PAYDUNYA_CONFIG.mode,
      });
      console.log(
        "🔔 [PAYDUNYA] Request body:",
        JSON.stringify(invoiceData, null, 2)
      );

      const response = await fetch(
        `${PAYDUNYA_CONFIG.baseUrl}/checkout-invoice/create`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "PAYDUNYA-PUBLIC-KEY": PAYDUNYA_CONFIG.publicKey,
            "PAYDUNYA-PRIVATE-KEY": PAYDUNYA_CONFIG.privateKey,
            "PAYDUNYA-MASTER-KEY": PAYDUNYA_CONFIG.masterKey,
            "PAYDUNYA-MODE": PAYDUNYA_CONFIG.mode,
          },
          body: JSON.stringify(invoiceData),
        }
      );

      console.log("🔔 [PAYDUNYA] Response status:", response.status);
      console.log(
        "🔔 [PAYDUNYA] Response headers:",
        Object.fromEntries(response.headers.entries())
      );

      const responseText = await response.text();
      console.log("🔔 [PAYDUNYA] Response text:", responseText);

      let result;
      try {
        result = JSON.parse(responseText);
      } catch (parseError) {
        console.error(
          "❌ [PAYDUNYA] Failed to parse JSON response:",
          parseError
        );
        throw new Error(
          `Invalid response from PayDunya: ${responseText.substring(0, 200)}`
        );
      }

      if (result.success) {
        console.log(
          "✅ [PAYDUNYA] Invoice created successfully:",
          result.invoice_url
        );

        // Sauvegarder les informations de paiement dans Firestore
        await this.savePaymentInfo(bookingData.bookingId, {
          invoiceToken: result.token,
          invoiceUrl: result.invoice_url,
          status: "pending",
          amount: bookingData.price,
          currency: "XOF",
          createdAt: new Date().toISOString(),
        });

        return {
          success: true,
          invoiceUrl: result.invoice_url,
        };
      } else {
        console.error("❌ [PAYDUNYA] Failed to create invoice:", result);
        return {
          success: false,
          error: result.message || "Erreur lors de la création de la facture",
        };
      }
    } catch (error) {
      console.error("❌ [PAYDUNYA] Error creating invoice:", error);
      return {
        success: false,
        error: "Erreur de connexion avec PayDunya",
      };
    }
  }

  // Sauvegarder les informations de paiement
  private async savePaymentInfo(
    bookingId: string,
    paymentInfo: {
      invoiceToken: string;
      invoiceUrl: string;
      status: string;
      amount: number;
      currency: string;
      createdAt: string;
    }
  ) {
    try {
      const paymentRef = doc(this.db, "payments", bookingId);
      await setDoc(paymentRef, paymentInfo);
      console.log("✅ [PAYDUNYA] Payment info saved for booking:", bookingId);
    } catch (error) {
      console.error("❌ [PAYDUNYA] Error saving payment info:", error);
    }
  }

  // Vérifier le statut d'un paiement
  async checkPaymentStatus(
    invoiceToken: string
  ): Promise<{ success: boolean; status?: string; error?: string }> {
    try {
      const response = await fetch(
        `${PAYDUNYA_CONFIG.baseUrl}/checkout-invoice/confirm/${invoiceToken}`,
        {
          method: "GET",
          headers: {
            "PAYDUNYA-MASTER-KEY": PAYDUNYA_CONFIG.masterKey,
            "PAYDUNYA-MODE": PAYDUNYA_CONFIG.mode,
          },
        }
      );

      const result = await response.json();

      if (result.success) {
        return {
          success: true,
          status: result.invoice.status,
        };
      } else {
        return {
          success: false,
          error: result.message || "Erreur lors de la vérification du statut",
        };
      }
    } catch (error) {
      console.error("❌ [PAYDUNYA] Error checking payment status:", error);
      return {
        success: false,
        error: "Erreur de connexion",
      };
    }
  }

  // Traiter une notification IPN
  async processIPN(
    paymentData: PayDunyaPaymentData
  ): Promise<{ success: boolean; error?: string }> {
    try {
      console.log(
        "🔔 [PAYDUNYA IPN] Processing payment notification:",
        paymentData
      );

      // Vérifier le token
      if (paymentData.token !== PAYDUNYA_CONFIG.masterKey) {
        console.error("❌ [PAYDUNYA IPN] Invalid token");
        return { success: false, error: "Token invalide" };
      }

      // Extraire l'ID de réservation du numéro de facture
      const invoiceNumber = paymentData.invoice.invoice_number;
      const bookingId = invoiceNumber?.replace("INV-", "");

      if (!bookingId) {
        console.error(
          "❌ [PAYDUNYA IPN] No booking ID found in invoice number"
        );
        return { success: false, error: "ID de réservation manquant" };
      }

      // Mettre à jour le statut de la réservation
      const bookingRef = doc(this.db, "bookings", bookingId);
      await updateDoc(bookingRef, {
        paymentStatus: paymentData.invoice.status,
        paymentDate: new Date().toISOString(),
        paymentMethod: paymentData.payment_method || "paydunya",
        transactionId: paymentData.transaction_id,
      });

      // Mettre à jour les informations de paiement
      const paymentRef = doc(this.db, "payments", bookingId);
      await updateDoc(paymentRef, {
        status: paymentData.invoice.status,
        paymentDate: new Date().toISOString(),
        paymentMethod: paymentData.payment_method || "paydunya",
        transactionId: paymentData.transaction_id,
      });

      console.log(
        "✅ [PAYDUNYA IPN] Payment processed successfully for booking:",
        bookingId
      );
      return { success: true };
    } catch (error) {
      console.error("❌ [PAYDUNYA IPN] Error processing payment:", error);
      return { success: false, error: "Erreur lors du traitement du paiement" };
    }
  }
}

export default PayDunyaService.getInstance();
