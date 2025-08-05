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
  publicKey: "test_public_p64arhicc9ELdNg7kD78tmEYE3a", // 🔧 Clé publique de test
  privateKey: "test_private_CvygOZ3E0kuBE20lWqZbjTxzKhf", // 🔧 Clé privée de test
  masterKey: "gzt0lrr3-IhY9-Cl5D-nQjQ-4YiQ3HmHdWtF", // 🔧 Clé Master de votre dashboard
  token: "wZTFnRBd87rYZIdoQmyh", // 🔧 Token de test de votre dashboard
  baseUrl: "https://app.paydunya.com/sandbox-api/v1", // 🔧 Endpoint sandbox pour le mode test
  mode: "test", // ou 'live' pour la production
};

// 🔍 DEBUG: Vérifier la configuration au démarrage
console.log("🔍 [PAYDUNYA CONFIG DEBUG] Configuration chargée:");
console.log(
  "REACT_APP_PAYDUNYA_MASTER_KEY:",
  process.env.REACT_APP_PAYDUNYA_MASTER_KEY
);
console.log("PAYDUNYA_MASTER_KEY:", process.env.PAYDUNYA_MASTER_KEY);
console.log("REACT_APP_PAYDUNYA_TOKEN:", process.env.REACT_APP_PAYDUNYA_TOKEN);
console.log("PAYDUNYA_TOKEN:", process.env.PAYDUNYA_TOKEN);
console.log("masterKey final:", PAYDUNYA_CONFIG.masterKey);
console.log("token final:", PAYDUNYA_CONFIG.token);

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

      const invoiceData = {
        invoice: {
          items: [
            {
              name: `Consultation ${
                bookingData.consultationType || "Vidéo"
              } - ${bookingData.professionalName || "Professionnel"}`,
              quantity: 1,
              unit_price: price,
              total_price: price, // 🔧 Ajouté selon la doc PayDunya
              description: `Consultation ${
                bookingData.consultationType || "Vidéo"
              } le ${bookingData.date || "Aujourd'hui"} à ${
                bookingData.time || "Maintenant"
              } (${bookingData.duration || 60} min)`,
            },
          ],
          total_amount: price,
          description: `Consultation avec ${
            bookingData.professionalName || "Professionnel"
          }`,
        },
        store: {
          name: "Health-e",
          website_url: "https://health-e.sn",
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
          customer_phone: bookingData.patientPhone || "770000000", // 🛑 Mets un téléphone factice si vide
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

      // 🔍 Vérifier que les clés ne sont pas vides
      if (
        !PAYDUNYA_CONFIG.masterKey ||
        PAYDUNYA_CONFIG.masterKey.trim() === ""
      ) {
        throw new Error("PAYDUNYA_MASTER_KEY is missing or empty");
      }
      if (!PAYDUNYA_CONFIG.token || PAYDUNYA_CONFIG.token.trim() === "") {
        throw new Error("PAYDUNYA_TOKEN is missing or empty");
      }

      // 🔍 DEBUG: Vérifier le format exact des clés
      console.log("🔍 [PAYDUNYA DEBUG] Format des clés:");
      console.log("masterKey length:", PAYDUNYA_CONFIG.masterKey.length);
      console.log("masterKey exact:", `"${PAYDUNYA_CONFIG.masterKey}"`);
      console.log("token length:", PAYDUNYA_CONFIG.token.length);
      console.log("token exact:", `"${PAYDUNYA_CONFIG.token}"`);

      const headers = {
        "Content-Type": "application/json",
        Accept: "application/json", // 🔧 Ajouté pour éviter les réponses HTML
        "PAYDUNYA-PUBLIC-KEY": PAYDUNYA_CONFIG.publicKey,
        "PAYDUNYA-PRIVATE-KEY": PAYDUNYA_CONFIG.privateKey,
        "PAYDUNYA-MASTER-KEY": PAYDUNYA_CONFIG.masterKey.trim(), // 🔧 Trim pour enlever les espaces
        "PAYDUNYA-TOKEN": PAYDUNYA_CONFIG.token.trim(), // 🔧 Trim pour enlever les espaces
        "PAYDUNYA-MODE": PAYDUNYA_CONFIG.mode,
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

      if (result.response_code === "00") {
        console.log(
          "✅ [PAYDUNYA] Invoice created successfully:",
          result.response_text
        );

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
        console.error("❌ [PAYDUNYA] Failed to create invoice:", result);
        return {
          success: false,
          error:
            result.response_text || "Erreur lors de la création de la facture",
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
