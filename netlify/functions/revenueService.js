const admin = require("firebase-admin");

/**
 * Créer une transaction de revenu pour une consultation
 */
async function createConsultationRevenue(
  professionalId,
  patientId,
  bookingId,
  amount,
  patientName,
  professionalName,
  consultationType
) {
  try {
    console.log("💰 [REVENUE] Creating consultation revenue:", {
      professionalId,
      bookingId,
      amount,
    });

    const platformFee = Math.round(amount * 0.15); // 15% de commission
    const professionalAmount = amount - platformFee; // 85% pour le professionnel

    const transaction = {
      professionalId,
      patientId,
      bookingId,
      type: "consultation",
      amount,
      platformFee,
      professionalAmount,
      status: "completed",
      description: `Consultation ${consultationType} - ${patientName}`,
      patientName,
      professionalName,
      consultationType,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const db = admin.firestore();
    const docRef = await db.collection("revenue_transactions").add(transaction);

    console.log("✅ [REVENUE] Consultation revenue created:", docRef.id);
    return docRef.id;
  } catch (error) {
    console.error("❌ [REVENUE] Error creating consultation revenue:", error);
    throw new Error("Erreur lors de la création de la transaction de revenu");
  }
}

/**
 * Créer une demande de retrait
 */
async function createWithdrawalRequest(
  professionalId,
  amount,
  method
) {
  try {
    console.log("💰 [REVENUE] Creating withdrawal request:", {
      professionalId,
      amount,
      method,
    });

    const transaction = {
      professionalId,
      patientId: "", // Pas de patient pour un retrait
      bookingId: "", // Pas de booking pour un retrait
      type: "withdrawal",
      amount,
      platformFee: 0, // Pas de commission sur les retraits
      professionalAmount: amount,
      status: "pending",
      description: `Demande de retrait vers ${method}`,
      withdrawalMethod: method,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const db = admin.firestore();
    const docRef = await db.collection("revenue_transactions").add(transaction);

    console.log("✅ [REVENUE] Withdrawal request created:", docRef.id);
    return docRef.id;
  } catch (error) {
    console.error("❌ [REVENUE] Error creating withdrawal request:", error);
    throw new Error("Erreur lors de la création de la demande de retrait");
  }
}

module.exports = {
  createConsultationRevenue,
  createWithdrawalRequest,
};
