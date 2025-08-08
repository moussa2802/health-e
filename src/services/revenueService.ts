import { getFirestoreInstance } from "../utils/firebase";
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  Timestamp,
  updateDoc,
  doc,
} from "firebase/firestore";
import { retryFirestoreOperation } from "../utils/firebase";

export interface RevenueTransaction {
  id: string;
  professionalId: string;
  patientId: string;
  bookingId: string;
  type: "consultation" | "withdrawal";
  amount: number; // Montant total de la consultation
  platformFee: number; // Commission de la plateforme (15%)
  professionalAmount: number; // Montant pour le professionnel (85%)
  status: "pending" | "completed" | "failed";
  description: string;
  patientName?: string;
  professionalName?: string;
  consultationType?: string;
  withdrawalMethod?: "wave" | "orange-money" | "bank-transfer";
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface ProfessionalRevenue {
  totalEarnings: number;
  availableBalance: number;
  pendingAmount: number;
  totalWithdrawn: number;
  platformFees: number;
  netEarnings: number;
  thisMonth: number;
  lastMonth: number;
}

/**
 * Créer une transaction de revenu pour une consultation
 */
export async function createConsultationRevenue(
  professionalId: string,
  patientId: string,
  bookingId: string,
  amount: number,
  patientName: string,
  professionalName: string,
  consultationType: string
): Promise<string> {
  try {
    console.log("💰 [REVENUE] Creating consultation revenue:", {
      professionalId,
      bookingId,
      amount,
    });

    const platformFee = Math.round(amount * 0.15); // 15% de commission
    const professionalAmount = amount - platformFee; // 85% pour le professionnel

    const transaction: Omit<RevenueTransaction, "id" | "createdAt" | "updatedAt"> = {
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
      createdAt: serverTimestamp() as any,
      updatedAt: serverTimestamp() as any,
    };

    const db = getFirestoreInstance();
    if (!db) throw new Error("Firestore not available");

    const docRef = await retryFirestoreOperation(async () => {
      return await addDoc(collection(db, "revenue_transactions"), transaction);
    });

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
export async function createWithdrawalRequest(
  professionalId: string,
  amount: number,
  method: "wave" | "orange-money" | "bank-transfer"
): Promise<string> {
  try {
    console.log("💰 [REVENUE] Creating withdrawal request:", {
      professionalId,
      amount,
      method,
    });

    const transaction: Omit<RevenueTransaction, "id" | "createdAt" | "updatedAt"> = {
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
      createdAt: serverTimestamp() as any,
      updatedAt: serverTimestamp() as any,
    };

    const db = getFirestoreInstance();
    if (!db) throw new Error("Firestore not available");

    const docRef = await retryFirestoreOperation(async () => {
      return await addDoc(collection(db, "revenue_transactions"), transaction);
    });

    console.log("✅ [REVENUE] Withdrawal request created:", docRef.id);
    return docRef.id;
  } catch (error) {
    console.error("❌ [REVENUE] Error creating withdrawal request:", error);
    throw new Error("Erreur lors de la création de la demande de retrait");
  }
}

/**
 * Obtenir les statistiques de revenus d'un professionnel
 */
export async function getProfessionalRevenue(
  professionalId: string
): Promise<ProfessionalRevenue> {
  try {
    console.log("💰 [REVENUE] Getting professional revenue for:", professionalId);

    const db = getFirestoreInstance();
    if (!db) throw new Error("Firestore not available");

    // Récupérer toutes les transactions du professionnel
    const q = query(
      collection(db, "revenue_transactions"),
      where("professionalId", "==", professionalId),
      orderBy("createdAt", "desc")
    );

    const snapshot = await retryFirestoreOperation(async () => {
      return await getDocs(q);
    });

    const transactions = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as RevenueTransaction[];

    // Calculer les statistiques
    const totalEarnings = transactions
      .filter((t) => t.type === "consultation" && t.status === "completed")
      .reduce((sum, t) => sum + t.professionalAmount, 0);

    const availableBalance = transactions
      .filter((t) => t.type === "consultation" && t.status === "completed")
      .reduce((sum, t) => sum + t.professionalAmount, 0) -
      transactions
        .filter((t) => t.type === "withdrawal" && t.status === "completed")
        .reduce((sum, t) => sum + t.amount, 0);

    const pendingAmount = transactions
      .filter((t) => t.type === "withdrawal" && t.status === "pending")
      .reduce((sum, t) => sum + t.amount, 0);

    const totalWithdrawn = transactions
      .filter((t) => t.type === "withdrawal" && t.status === "completed")
      .reduce((sum, t) => sum + t.amount, 0);

    const platformFees = transactions
      .filter((t) => t.type === "consultation" && t.status === "completed")
      .reduce((sum, t) => sum + t.platformFee, 0);

    const netEarnings = totalEarnings;

    // Calculer les revenus du mois en cours et du mois précédent
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const thisMonth = transactions
      .filter((t) => {
        if (t.type !== "consultation" || t.status !== "completed") return false;
        const transactionDate = t.createdAt.toDate();
        return (
          transactionDate.getMonth() === currentMonth &&
          transactionDate.getFullYear() === currentYear
        );
      })
      .reduce((sum, t) => sum + t.professionalAmount, 0);

    const lastMonth = transactions
      .filter((t) => {
        if (t.type !== "consultation" || t.status !== "completed") return false;
        const transactionDate = t.createdAt.toDate();
        const lastMonthDate = new Date(currentYear, currentMonth - 1);
        return (
          transactionDate.getMonth() === lastMonthDate.getMonth() &&
          transactionDate.getFullYear() === lastMonthDate.getFullYear()
        );
      })
      .reduce((sum, t) => sum + t.professionalAmount, 0);

    const revenue: ProfessionalRevenue = {
      totalEarnings,
      availableBalance,
      pendingAmount,
      totalWithdrawn,
      platformFees,
      netEarnings,
      thisMonth,
      lastMonth,
    };

    console.log("✅ [REVENUE] Professional revenue calculated:", revenue);
    return revenue;
  } catch (error) {
    console.error("❌ [REVENUE] Error getting professional revenue:", error);
    throw new Error("Erreur lors de la récupération des revenus");
  }
}

/**
 * Obtenir l'historique des transactions d'un professionnel
 */
export async function getProfessionalTransactions(
  professionalId: string,
  limitCount: number = 50
): Promise<RevenueTransaction[]> {
  try {
    console.log("💰 [REVENUE] Getting professional transactions for:", professionalId);

    const db = getFirestoreInstance();
    if (!db) throw new Error("Firestore not available");

    const q = query(
      collection(db, "revenue_transactions"),
      where("professionalId", "==", professionalId),
      orderBy("createdAt", "desc"),
      limit(limitCount)
    );

    const snapshot = await retryFirestoreOperation(async () => {
      return await getDocs(q);
    });

    const transactions = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as RevenueTransaction[];

    console.log("✅ [REVENUE] Professional transactions retrieved:", transactions.length);
    return transactions;
  } catch (error) {
    console.error("❌ [REVENUE] Error getting professional transactions:", error);
    throw new Error("Erreur lors de la récupération des transactions");
  }
}

/**
 * Approuver une demande de retrait
 */
export async function approveWithdrawal(transactionId: string): Promise<void> {
  try {
    console.log("💰 [REVENUE] Approving withdrawal:", transactionId);

    const db = getFirestoreInstance();
    if (!db) throw new Error("Firestore not available");

    await retryFirestoreOperation(async () => {
      const docRef = doc(db, "revenue_transactions", transactionId);
      await updateDoc(docRef, {
        status: "completed",
        updatedAt: serverTimestamp(),
      });
    });

    console.log("✅ [REVENUE] Withdrawal approved:", transactionId);
  } catch (error) {
    console.error("❌ [REVENUE] Error approving withdrawal:", error);
    throw new Error("Erreur lors de l'approbation du retrait");
  }
}

/**
 * Rejeter une demande de retrait
 */
export async function rejectWithdrawal(transactionId: string, reason: string): Promise<void> {
  try {
    console.log("💰 [REVENUE] Rejecting withdrawal:", transactionId);

    const db = getFirestoreInstance();
    if (!db) throw new Error("Firestore not available");

    await retryFirestoreOperation(async () => {
      const docRef = doc(db, "revenue_transactions", transactionId);
      await updateDoc(docRef, {
        status: "failed",
        description: `Retrait rejeté: ${reason}`,
        updatedAt: serverTimestamp(),
      });
    });

    console.log("✅ [REVENUE] Withdrawal rejected:", transactionId);
  } catch (error) {
    console.error("❌ [REVENUE] Error rejecting withdrawal:", error);
    throw new Error("Erreur lors du rejet du retrait");
  }
}
