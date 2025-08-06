// Service pour gérer les paiements PayDunya
// 🔄 FORCE REBUILD: Ajout d'un commentaire pour forcer le déploiement avec les nouvelles variables d'environnement
// Mode: PRODUCTION - Variables Netlify mises à jour
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

// Configuration PayDunya (production ou test selon les variables d'environnement)
// 🔄 FORCE REBUILD: Configuration mise à jour pour forcer l'utilisation des nouvelles variables
const PAYDUNYA_CONFIG = {
  publicKey:
    process.env.REACT_APP_PAYDUNYA_PUBLIC_KEY ||
    "test_public_p64arhicc9ELdNg7kD78tmEYE3a",
  privateKey:
    process.env.REACT_APP_PAYDUNYA_PRIVATE_KEY ||
    "test_private_CvygOZ3E0kuBE20lWqZbjTxzKhf",
  masterKey:
    process.env.REACT_APP_PAYDUNYA_MASTER_KEY ||
    "gzt0lrr3-IhY9-Cl5D-nQjQ-4YiQ3HmHdWtF",
  token: process.env.REACT_APP_PAYDUNYA_TOKEN || "wZTFnRBd87rYZIdoQmyh",
  // URL automatique selon le mode
  baseUrl: (process.env.REACT_APP_PAYDUNYA_MODE || "test") === "live" 
    ? "https://app.paydunya.com/api/v1" 
    : "https://app.paydunya.com/sandbox-api/v1",
  mode: process.env.REACT_APP_PAYDUNYA_MODE || "test",
};

// 🔍 DEBUG: Vérifier la configuration au démarrage
// 🔄 FORCE REBUILD: Debug amélioré pour vérifier les nouvelles variables
console.log("🔍 [PAYDUNYA CONFIG DEBUG] Configuration chargée:");
console.log("Mode:", PAYDUNYA_CONFIG.mode);
console.log("Base URL:", PAYDUNYA_CONFIG.baseUrl);
console.log("REACT_APP_PAYDUNYA_MODE:", process.env.REACT_APP_PAYDUNYA_MODE);
console.log("REACT_APP_PAYDUNYA_PUBLIC_KEY:", process.env.REACT_APP_PAYDUNYA_PUBLIC_KEY ? "✅ Configuré" : "❌ Non configuré");
console.log("REACT_APP_PAYDUNYA_PRIVATE_KEY:", process.env.REACT_APP_PAYDUNYA_PRIVATE_KEY ? "✅ Configuré" : "❌ Non configuré");
console.log(
  "REACT_APP_PAYDUNYA_MASTER_KEY:",
  process.env.REACT_APP_PAYDUNYA_MASTER_KEY ? "✅ Configuré" : "❌ Non configuré"
);
console.log("REACT_APP_PAYDUNYA_TOKEN:", process.env.REACT_APP_PAYDUNYA_TOKEN ? "✅ Configuré" : "❌ Non configuré");
console.log("masterKey final:", PAYDUNYA_CONFIG.masterKey.substring(0, 10) + "...");
console.log("token final:", PAYDUNYA_CONFIG.token.substring(0, 10) + "...");

// 🔍 DEBUG: Vérifier si on utilise les clés de test ou production
console.log("🔍 [PAYDUNYA DEBUG] Clés utilisées:");
console.log("Public Key starts with:", PAYDUNYA_CONFIG.publicKey.substring(0, 15));
console.log("Private Key starts with:", PAYDUNYA_CONFIG.privateKey.substring(0, 15));
console.log("Master Key starts with:", PAYDUNYA_CONFIG.masterKey.substring(0, 15));
console.log("Token starts with:", PAYDUNYA_CONFIG.token.substring(0, 15));

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

      // 🧪 TEST STATIQUE - Version minimale selon la doc PayDunya
      /*
      const invoiceData = {
        invoice: {
          items: [
            {
              name: "Consultation vidéo",
              quantity: 1,
              unit_price: 25000,
              total_price: 25000,
              description: "Consultation vidéo de 60 minutes"
            }
          ],
          total_amount: 25000,
          description: "Consultation médicale"
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

      // 🔧 Sécuriser tous les champs avec des fallbacks
      const cancelUrl = bookingData.professionalId
        ? `https://health-e.sn/book-appointment/${bookingData.professionalId}`
        : `https://health-e.sn/home`;

      const callbackUrl = bookingData.bookingId
        ? `https://health-e.sn/appointment-success/${bookingData.bookingId}`
        : `https://health-e.sn/home`;

      const returnUrl = bookingData.bookingId
        ? `https://health-e.sn/appointment-success/${bookingData.bookingId}`
        : `https://health-e.sn/home`;

      const invoiceNumber = bookingData.bookingId
        ? `INV-${bookingData.bookingId}`
        : `INV-${Date.now()}`;

      // Préparer les données de la facture selon le format PayDunya
      const price = parseInt(bookingData.price.toString()); // 🔧 Force en entier

      // 🔧 Structure PayDunya corrigée selon la documentation officielle
      const invoiceData = {
        invoice: {
          items: [
            {
              name: `Consultation ${bookingData.consultationType || "Vidéo"}`,
              quantity: 1,
              unit_price: price,
              total_price: price,
              description: `Consultation ${bookingData.consultationType || "Vidéo"} - ${bookingData.professionalName || "Professionnel"}`,
            },
          ],
          total_amount: price,
          description: `Consultation médicale avec ${bookingData.professionalName || "Professionnel"}`,
          currency: "XOF",
        },
        store: {
          name: "Health-e",
          website_url: "https://health-e.sn",
          tagline: "Plateforme de santé en ligne",
        },
        actions: {
          callback_url: callbackUrl,
          cancel_url: cancelUrl,
          return_url: returnUrl,
        },
        custom_data: {
          invoice_number: invoiceNumber,
          customer_name: bookingData.patientName || "Patient",
          customer_email: bookingData.patientEmail || "patient@health-e.sn",
          customer_phone: bookingData.patientPhone || "770000000",
          booking_id: bookingData.bookingId,
          professional_id: bookingData.professionalId,
        },
      };

      // 🔍 DEBUG: Vérifier les URLs générées
      console.log("🔍 [DEBUG] URLs générées:");
      console.log("callback_url:", callbackUrl);
      console.log("[PAYDUNYA] cancel_url:", cancelUrl);
      console.log("return_url:", returnUrl);

      // Appel à l'API PayDunya pour créer la facture
      console.log(
        "🔔 [PAYDUNYA] API URL:",
        `${PAYDUNYA_CONFIG.baseUrl}/checkout-invoice/create`
      );
      // 🔍 DEBUG: Vérifier les clés PayDunya
      console.log("🔍 [PAYDUNYA DEBUG] Clés utilisées:");
      console.log("masterKey:", PAYDUNYA_CONFIG.masterKey);
      console.log("token:", PAYDUNYA_CONFIG.token);
      console.log("mode:", PAYDUNYA_CONFIG.mode);
      console.log("baseUrl:", PAYDUNYA_CONFIG.baseUrl);
      console.log("🔍 [PAYDUNYA DEBUG] Variables d'environnement:");
      console.log(
        "REACT_APP_PAYDUNYA_TOKEN:",
        process.env.REACT_APP_PAYDUNYA_TOKEN
      );
      console.log(
        "REACT_APP_PAYDUNYA_MASTER_KEY:",
        process.env.REACT_APP_PAYDUNYA_MASTER_KEY
      );

      console.log("🔔 [PAYDUNYA] Headers:", {
        "Content-Type": "application/json",
        "PAYDUNYA-PUBLIC-KEY": PAYDUNYA_CONFIG.publicKey,
        "PAYDUNYA-PRIVATE-KEY": PAYDUNYA_CONFIG.privateKey,
        "PAYDUNYA-MASTER-KEY": PAYDUNYA_CONFIG.masterKey,
        "PAYDUNYA-TOKEN": PAYDUNYA_CONFIG.token, // 🔧 Token ajouté
        "PAYDUNYA-MODE": PAYDUNYA_CONFIG.mode,
      });
      console.log(
        "🔔 [PAYDUNYA] Request body:",
        JSON.stringify(invoiceData, null, 2)
      );
      console.log("🔔 [PAYDUNYA] Price value:", price, typeof price);

      // 🔍 Validation des clés PayDunya
      if (!PAYDUNYA_CONFIG.masterKey || PAYDUNYA_CONFIG.masterKey.trim() === "") {
        throw new Error("PAYDUNYA_MASTER_KEY is missing or empty");
      }
      if (!PAYDUNYA_CONFIG.token || PAYDUNYA_CONFIG.token.trim() === "") {
        throw new Error("PAYDUNYA_TOKEN is missing or empty");
      }
      if (!PAYDUNYA_CONFIG.publicKey || PAYDUNYA_CONFIG.publicKey.trim() === "") {
        throw new Error("PAYDUNYA_PUBLIC_KEY is missing or empty");
      }
      if (!PAYDUNYA_CONFIG.privateKey || PAYDUNYA_CONFIG.privateKey.trim() === "") {
        throw new Error("PAYDUNYA_PRIVATE_KEY is missing or empty");
      }

      // 🔍 Validation du prix
      if (price <= 0) {
        throw new Error("Le prix doit être supérieur à 0");
      }

      // 🔍 DEBUG: Vérifier le format exact des clés
      console.log("🔍 [PAYDUNYA DEBUG] Format des clés:");
      console.log("masterKey length:", PAYDUNYA_CONFIG.masterKey.length);
      console.log("masterKey exact:", `"${PAYDUNYA_CONFIG.masterKey}"`);
      console.log("token length:", PAYDUNYA_CONFIG.token.length);
      console.log("token exact:", `"${PAYDUNYA_CONFIG.token}"`);

      const headers = {
        "Content-Type": "application/json",
        Accept: "application/json",
        "PAYDUNYA-PUBLIC-KEY": PAYDUNYA_CONFIG.publicKey,
        "PAYDUNYA-PRIVATE-KEY": PAYDUNYA_CONFIG.privateKey,
        "PAYDUNYA-MASTER-KEY": PAYDUNYA_CONFIG.masterKey.trim(),
        "PAYDUNYA-TOKEN": PAYDUNYA_CONFIG.token.trim(),
        // 🔧 Headers spécifiques pour la production
        "PAYDUNYA-MODE": PAYDUNYA_CONFIG.mode,
        "User-Agent": "Health-e/1.0",
      };

      // 🔍 DEBUG: Vérifier les headers exacts envoyés
      console.log("🔍 [PAYDUNYA DEBUG] Headers exacts envoyés:");
      Object.entries(headers).forEach(([key, value]) => {
        console.log(`${key}:`, value);
      });

      const response = await fetch(
        `${PAYDUNYA_CONFIG.baseUrl}/checkout-invoice/create`,
        {
          method: "POST",
          headers,
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

      // 🔍 Debug de la réponse PayDunya
      console.log("🔍 [PAYDUNYA DEBUG] Response object:", result);
      console.log("🔍 [PAYDUNYA DEBUG] Response code:", result.response_code);
      console.log("🔍 [PAYDUNYA DEBUG] Response text:", result.response_text);

      if (result.response_code === "00") {
        console.log("✅ [PAYDUNYA] Invoice created successfully");
        console.log("🔍 [PAYDUNYA DEBUG] Invoice URL:", result.response_text);
        console.log("🔍 [PAYDUNYA DEBUG] Token:", result.token);

        // Sauvegarder les informations de paiement dans Firestore
        await this.savePaymentInfo(bookingData.bookingId, {
          invoiceToken: result.token,
          invoiceUrl: result.response_text,
          status: "pending",
          amount: bookingData.price,
          currency: "XOF",
          createdAt: new Date().toISOString(),
        });

        return {
          success: true,
          invoiceUrl: result.response_text,
        };
      } else {
        console.error("❌ [PAYDUNYA] Failed to create invoice");
        console.error("🔍 [PAYDUNYA DEBUG] Error details:", {
          code: result.response_code,
          text: result.response_text,
          full_response: result
        });
        
        return {
          success: false,
          error: result.response_text || "Erreur lors de la création de la facture",
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
      console.log(
        "🔔 [PAYDUNYA] Checking payment status for token:",
        invoiceToken
      );
      console.log(
        "🔔 [PAYDUNYA] Using endpoint:",
        `${PAYDUNYA_CONFIG.baseUrl}/checkout-invoice/confirm/${invoiceToken}`
      );

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

      console.log("🔔 [PAYDUNYA] Response status:", response.status);
      const responseText = await response.text();
      console.log("🔔 [PAYDUNYA] Response text:", responseText);

      let result;
      try {
        result = JSON.parse(responseText);
      } catch (parseError) {
        console.error("❌ [PAYDUNYA] Failed to parse response:", parseError);
        return {
          success: false,
          error: `Invalid response: ${responseText.substring(0, 200)}`,
        };
      }

      console.log("🔔 [PAYDUNYA] Parsed result:", result);

      if (result.success) {
        console.log(
          "✅ [PAYDUNYA] Payment status check successful:",
          result.invoice.status
        );
        return {
          success: true,
          status: result.invoice.status,
        };
      } else {
        console.log(
          "❌ [PAYDUNYA] Payment status check failed:",
          result.message
        );
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
  async updateBookingStatus(
    bookingId: string,
    status: "confirmed" | "cancelled" | "failed"
  ): Promise<{ success: boolean; error?: string }> {
    try {
      console.log(
        "🔔 [PAYDUNYA] Updating booking status:",
        bookingId,
        "to",
        status
      );

      const db = getFirestore();
      const bookingRef = doc(db, "bookings", bookingId);

      // Mettre à jour le statut de la réservation
      await updateDoc(bookingRef, {
        status: status,
        paymentStatus: status === "confirmed" ? "completed" : "failed",
        updatedAt: new Date().toISOString(),
      });

      // Mettre à jour aussi dans la Realtime Database
      const { getDatabase, ref, update } = await import("firebase/database");
      const database = getDatabase();
      const roomRef = ref(database, `scheduled_rooms/${bookingId}`);

      await update(roomRef, {
        status: status,
        updatedAt: new Date().toISOString(),
      });

      console.log("✅ [PAYDUNYA] Booking status updated successfully");
      return { success: true };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.error("❌ [PAYDUNYA] Error updating booking status:", error);
      return { success: false, error: errorMessage };
    }
  }

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

      // Déterminer le statut de la réservation basé sur le statut du paiement
      let bookingStatus: "confirmed" | "cancelled" | "failed";
      if (
        paymentData.invoice.status === "completed" ||
        paymentData.invoice.status === "success"
      ) {
        bookingStatus = "confirmed";
      } else if (paymentData.invoice.status === "cancelled") {
        bookingStatus = "cancelled";
      } else {
        bookingStatus = "failed";
      }

      // Mettre à jour le statut de la réservation
      await this.updateBookingStatus(bookingId, bookingStatus);

      // Mettre à jour les informations de paiement
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
