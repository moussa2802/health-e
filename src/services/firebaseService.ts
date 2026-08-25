import { getFirestoreInstance, ensureFirestoreReady } from "../utils/firebase"; // Use getter function instead of direct import
import {
  getFirestore,
  collection,
  getDocs,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  serverTimestamp,
} from "firebase/firestore";
import { retryFirestoreOperation } from "../utils/firebase";

type Notification = {
  id: string;
  userId: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: Timestamp;
};

export async function getAdminNotifications(
  adminId: string
): Promise<Notification[]> {
  console.log("getAdminNotifications appelée avec adminId:", adminId);

  try {
    await ensureFirestoreReady();

    const db = getFirestoreInstance();
    if (!db) {
      console.error("Firestore non disponible");
      return [];
    }

    const notificationsRef = collection(db, "notifications");
    const q = query(
      notificationsRef,
      where("userId", "==", adminId),
      orderBy("createdAt", "desc")
    );

    const snapshot = await getDocs(q);

    const notifications: Notification[] = snapshot.docs.map((doc) => {
      const data = doc.data() as Omit<Notification, "id">;
      return { id: doc.id, ...data };
    });

    console.log(`${notifications.length} notifications récupérées`);
    return notifications;
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error("Erreur dans getAdminNotifications:", error.message);
      console.error("Stack:", error.stack);
    } else {
      console.error("Erreur inconnue dans getAdminNotifications:", error);
    }
    return [];
  }
}

export async function getAdminNotificationsAlt(adminId: string) {
  const db = getFirestore();
  const notificationsRef = collection(db, "notifications");
  const q = query(
    notificationsRef,
    where("userId", "==", adminId),
    orderBy("createdAt", "desc")
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

// Types pour les données Firebase
export interface FirebaseUser {
  id: string;
  name: string;
  email: string;
  type: "patient" | "professional" | "admin";
  createdAt: Timestamp;
  profileImage?: string;
  isActive: boolean;
}

export interface FirebaseProfessional {
  id: string;
  userId: string;
  name: string;
  email: string;
  specialty: string;
  type: "mental" | "sexual";
  languages: string[];
  rating: number;
  reviews: number;
  price: number | null;
  currency: string;
  description: string;
  education: string[];
  experience: string;
  profileImage: string;
  isAvailableNow: boolean;
  offersFreeConsultations: boolean;
  freeConsultationDuration?: number;
  freeConsultationsPerWeek?: number;
  location?: string;
  availability: {
    day: string;
    slots: string[];
  }[];
  createdAt: Timestamp;
  isActive: boolean;
}

export interface FirebaseAppointment {
  id: string;
  patientId: string;
  professionalId: string;
  patientName: string;
  professionalName: string;
  date: string;
  time: string;
  type: "video" | "audio" | "chat";
  status: "upcoming" | "completed" | "cancelled";
  duration: number;
  price: number;
  notes?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface FirebaseRevenue {
  id: string;
  professionalId: string;
  appointmentId: string;
  amount: number;
  platformFee: number;
  netAmount: number;
  status: "pending" | "available" | "withdrawn";
  createdAt: Timestamp;
  withdrawnAt?: Timestamp;
}

// Service pour récupérer les utilisateurs
export async function getUsers(): Promise<FirebaseUser[]> {
  try {
    return await retryFirestoreOperation(async () => {
      const db = getFirestoreInstance();
      if (!db) throw new Error("Firestore not available");

      const snapshot = await getDocs(collection(db, "users"));
      return snapshot.docs.map(
        (doc) =>
          ({
            id: doc.id,
            ...doc.data(),
          } as FirebaseUser)
      );
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    throw new Error("Erreur lors de la récupération des utilisateurs");
  }
}

// Service pour récupérer les professionnels
export async function getProfessionals(): Promise<FirebaseProfessional[]> {
  try {
    return await retryFirestoreOperation(async () => {
      const db = getFirestoreInstance();
      if (!db) throw new Error("Firestore not available");

      const snapshot = await getDocs(collection(db, "professionals"));
      return snapshot.docs.map(
        (doc) =>
          ({
            id: doc.id,
            ...doc.data(),
          } as FirebaseProfessional)
      );
    });
  } catch (error) {
    console.error("Error fetching professionals:", error);
    throw new Error("Erreur lors de la récupération des professionnels");
  }
}

// Service pour récupérer les consultations
export async function getAppointments(): Promise<FirebaseAppointment[]> {
  try {
    return await retryFirestoreOperation(async () => {
      const db = getFirestoreInstance();
      if (!db) throw new Error("Firestore not available");

      const q = query(collection(db, "bookings"), orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);
      return snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          // Normaliser les statuts pour correspondre à l'interface
          status:
            data.status === "confirmé"
              ? "completed"
              : data.status === "confirmed"
              ? "completed"
              : data.status === "en_attente"
              ? "upcoming"
              : data.status === "pending"
              ? "upcoming"
              : data.status === "annulé"
              ? "cancelled"
              : data.status === "cancelled"
              ? "cancelled"
              : data.status,
        } as FirebaseAppointment;
      });
    });
  } catch (error) {
    console.error("Error fetching appointments:", error);
    throw new Error("Erreur lors de la récupération des consultations");
  }
}

// Service pour récupérer les revenus (depuis revenue_transactions)
export async function getRevenues(): Promise<FirebaseRevenue[]> {
  try {
    return await retryFirestoreOperation(async () => {
      const db = getFirestoreInstance();
      if (!db) throw new Error("Firestore not available");

      // Récupérer toutes les transactions de revenus
      const q = query(
        collection(db, "revenue_transactions"),
        where("type", "==", "consultation"),
        where("status", "==", "completed"),
        orderBy("createdAt", "desc")
      );
      const snapshot = await getDocs(q);

      return snapshot.docs.map((doc) => {
        const data = doc.data();
        const amount = data.amount || 0;
        const platformFee = data.platformFee || 0;
        const netAmount = data.professionalAmount || 0;

        return {
          id: doc.id,
          amount,
          platformFee,
          netAmount,
          professionalId: data.professionalId,
          patientId: data.patientId,
          status: "available",
          createdAt: data.createdAt || new Date(),
          type: data.consultationType || "mental",
        } as FirebaseRevenue;
      });
    });
  } catch (error) {
    console.error("Error fetching revenues:", error);
    // Fallback vers les bookings si revenue_transactions n'existe pas encore
    try {
      return await retryFirestoreOperation(async () => {
        const db = getFirestoreInstance();
        if (!db) throw new Error("Firestore not available");

        const q = query(
          collection(db, "bookings"),
          where("status", "in", ["confirmed", "confirmé", "completed"]),
          orderBy("createdAt", "desc")
        );
        const snapshot = await getDocs(q);

        return snapshot.docs.map((doc) => {
          const data = doc.data();
          const amount = data.price || 0;
          const platformFee = Math.round(amount * 0.15); // 15% de commission
          const netAmount = amount - platformFee;

          return {
            id: doc.id,
            amount,
            platformFee,
            netAmount,
            professionalId: data.professionalId,
            patientId: data.patientId,
            status: "available",
            createdAt: data.createdAt || new Date(),
            type: data.type || "mental",
          } as FirebaseRevenue;
        });
      });
    } catch (fallbackError) {
      console.error("Error in fallback revenue calculation:", fallbackError);
      throw new Error("Erreur lors de la récupération des revenus");
    }
  }
}

// Service pour récupérer les statistiques
export async function getStatistics() {
  try {
    const [users, professionals, appointments, revenues] = await Promise.all([
      getUsers(),
      getProfessionals(),
      getAppointments(),
      getRevenues(),
    ]);

    const totalUsers = users.length;
    const totalProfessionals = professionals.length;
    const totalPatients = users.filter(
      (user) => user.type === "patient"
    ).length;

    const totalAppointments = appointments.length;
    const completedAppointments = appointments.filter(
      (apt) => apt.status === "completed"
    ).length;
    const upcomingAppointments = appointments.filter(
      (apt) => apt.status === "upcoming"
    ).length;
    const cancelledAppointments = appointments.filter(
      (apt) => apt.status === "cancelled"
    ).length;

    const totalRevenue = revenues.reduce((sum, rev) => sum + rev.amount, 0);
    const platformFees = revenues.reduce(
      (sum, rev) => sum + rev.platformFee,
      0
    );
    const availableRevenue = revenues
      .filter((rev) => rev.status === "available")
      .reduce((sum, rev) => sum + rev.netAmount, 0);
    const pendingRevenue = revenues
      .filter((rev) => rev.status === "pending")
      .reduce((sum, rev) => sum + rev.netAmount, 0);

    // Calcul de la croissance mensuelle (simulation)
    const currentMonth = new Date().getMonth();
    const currentMonthAppointments = appointments.filter((apt) => {
      const aptDate = new Date(apt.date);
      return aptDate.getMonth() === currentMonth;
    }).length;

    const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const lastMonthAppointments = appointments.filter((apt) => {
      const aptDate = new Date(apt.date);
      return aptDate.getMonth() === lastMonth;
    }).length;

    const monthlyGrowth =
      lastMonthAppointments > 0
        ? Math.round(
            ((currentMonthAppointments - lastMonthAppointments) /
              lastMonthAppointments) *
              100
          )
        : 0;

    // Répartition par type de service
    const mentalHealthProfessionals = professionals.filter(
      (p) => p.category === "mental-health"
    ).length;
    const sexualHealthProfessionals = professionals.filter(
      (p) => p.category === "sexual-health"
    ).length;

    const mentalHealthRevenue = revenues
      .filter((rev) => {
        const professional = professionals.find(
          (p) => p.id === rev.professionalId
        );
        return professional?.category === "mental-health";
      })
      .reduce((sum, rev) => sum + rev.amount, 0);

    const sexualHealthRevenue = revenues
      .filter((rev) => {
        const professional = professionals.find(
          (p) => p.id === rev.professionalId
        );
        return professional?.category === "sexual-health";
      })
      .reduce((sum, rev) => sum + rev.amount, 0);

    return {
      users: {
        total: totalUsers,
        patients: totalPatients,
        professionals: totalProfessionals,
      },
      appointments: {
        total: totalAppointments,
        completed: completedAppointments,
        upcoming: upcomingAppointments,
        cancelled: cancelledAppointments,
        completionRate:
          totalAppointments > 0
            ? Math.round((completedAppointments / totalAppointments) * 100)
            : 0,
      },
      revenue: {
        total: totalRevenue,
        platformFees,
        available: availableRevenue,
        pending: pendingRevenue,
        mentalHealth: mentalHealthRevenue,
        sexualHealth: sexualHealthRevenue,
      },
      growth: {
        monthly: monthlyGrowth,
        averageRating: 4.8, // Simulation
        satisfactionRate: 98, // Simulation
      },
      services: {
        mentalHealthProfessionals,
        sexualHealthProfessionals,
      },
    };
  } catch (error) {
    console.error("Error fetching statistics:", error);
    throw new Error("Erreur lors de la récupération des statistiques");
  }
}

// Service pour récupérer les transactions récentes
export async function getRecentTransactions(limitCount: number = 10) {
  try {
    return await retryFirestoreOperation(async () => {
      const db = getFirestoreInstance();
      if (!db) throw new Error("Firestore not available");

      // Essayer d'abord revenue_transactions
      try {
        const q = query(
          collection(db, "revenue_transactions"),
          where("type", "==", "consultation"),
          where("status", "==", "completed"),
          orderBy("createdAt", "desc"),
          limit(limitCount)
        );
        const snapshot = await getDocs(q);

        return snapshot.docs.map((doc) => {
          const data = doc.data();
          // Déterminer le type basé sur consultationType
          let type = "mental";
          if (
            data.consultationType === "sexual" ||
            data.consultationType === "sexual-health"
          ) {
            type = "sexual";
          } else if (
            data.consultationType === "mental" ||
            data.consultationType === "mental-health"
          ) {
            type = "mental";
          }

          return {
            id: doc.id,
            patient: data.patientName || "Patient inconnu",
            professional: data.professionalName || "Professionnel inconnu",
            amount: data.amount || 0,
            platformFee: data.platformFee || 0,
            type: type,
            date:
              data.createdAt?.toDate?.()?.toLocaleDateString("fr-FR") ||
              new Date().toLocaleDateString("fr-FR"),
            status: data.status || "completed",
          };
        });
      } catch (revenueError) {
        // Fallback vers les bookings
        const q = query(
          collection(db, "bookings"),
          where("status", "in", ["confirmed", "confirmé", "completed"]),
          orderBy("createdAt", "desc"),
          limit(limitCount)
        );
        const snapshot = await getDocs(q);

        const bookings = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        // Enrichir avec les informations des professionnels et patients
        const professionals = await getProfessionals();
        const users = await getUsers();

        return bookings.map((booking) => {
          const professional = professionals.find(
            (p) => p.id === booking.professionalId
          );
          const patient = users.find((u) => u.id === booking.patientId);

          const amount = booking.price || 0;
          const platformFee = Math.round(amount * 0.15); // 15% de commission

          return {
            id: booking.id,
            patient:
              patient?.name ||
              patient?.firstName + " " + patient?.lastName ||
              "Patient inconnu",
            professional:
              professional?.name ||
              professional?.firstName + " " + professional?.lastName ||
              "Professionnel inconnu",
            amount,
            platformFee,
            type:
              professional?.category === "mental-health" ? "mental" : "sexual",
            date: booking.createdAt?.toDate?.()
              ? booking.createdAt.toDate().toLocaleDateString("fr-FR")
              : new Date().toLocaleDateString("fr-FR"),
            status:
              booking.status === "confirmed" || booking.status === "confirmé"
                ? "completed"
                : booking.status,
          };
        });
      }
    });
  } catch (error) {
    console.error("Error fetching recent transactions:", error);
    throw new Error("Erreur lors de la récupération des transactions récentes");
  }
}

// Service pour mettre à jour le statut d'un utilisateur
export async function updateUserStatus(
  userId: string,
  isActive: boolean
): Promise<void> {
  try {
    await retryFirestoreOperation(async () => {
      const db = getFirestoreInstance();
      if (!db) throw new Error("Firestore not available");

      const userRef = doc(db, "users", userId);
      await updateDoc(userRef, { isActive });
    });
  } catch (error) {
    console.error("Error updating user status:", error);
    throw new Error("Erreur lors de la mise à jour du statut utilisateur");
  }
}

// Service pour supprimer un utilisateur
export async function deleteUser(userId: string): Promise<void> {
  try {
    await retryFirestoreOperation(async () => {
      const db = getFirestoreInstance();
      if (!db) throw new Error("Firestore not available");

      const userRef = doc(db, "users", userId);
      await deleteDoc(userRef);
    });
  } catch (error) {
    console.error("Error deleting user:", error);
    throw new Error("Erreur lors de la suppression de l'utilisateur");
  }
}

export const updateProfessionalApproval = async (
  userId: string,
  isApproved: boolean
) => {
  const db = getFirestoreInstance();
  if (!db) throw new Error("Firestore not available");
  const docRef = doc(db, "professionals", userId);
  await updateDoc(docRef, { isApproved });

  // Créer une notification pour le professionnel
  const { createNotification } = await import("./notificationService");
  await createNotification(
    userId,
    "professional_approval",
    isApproved ? "Compte approuvé" : "Compte rejeté",
    isApproved
      ? "Félicitations ! Votre compte professionnel a été approuvé. Vous pouvez maintenant commencer à recevoir des patients."
      : "Votre compte professionnel a été rejeté. Veuillez contacter le support pour plus d'informations.",
    userId,
    "professional_approval"
  );
};

export async function createNotification(
  userId: string,
  type: string,
  title: string,
  content: string,
  sourceId: string,
  sourceType: string
) {
  const db = getFirestoreInstance();
  if (!db) throw new Error("Firestore not available");
  const notificationsRef = collection(db, "notifications");

  await addDoc(notificationsRef, {
    userId, // 👈 ceci est crucial pour l'affichage côté cloche
    type,
    title,
    content,
    sourceId,
    sourceType,
    read: false,
    createdAt: serverTimestamp(),
  });
}

// Service pour s'abonner aux statistiques en temps réel
export function subscribeToAdminStatistics(
  callback: (statistics: any) => void
): () => void {
  const db = getFirestoreInstance();
  if (!db) {
    return () => {};
  }

  let isActive = true;

  const fetchStatistics = async () => {
    if (!isActive) return;

    try {
      const stats = await getStatistics();
      if (isActive) {
        callback(stats);
      }
    } catch (error) {
      console.error("Error fetching statistics in subscription:", error);
    }
  };

  // Récupérer les données immédiatement
  fetchStatistics();

  // Puis toutes les 30 secondes
  const interval = setInterval(fetchStatistics, 30000);

  return () => {
    isActive = false;
    clearInterval(interval);
  };
}
