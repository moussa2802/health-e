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
  }


export async function getAdminNotifications(adminId: string): Promise<Notification[]> {
  console.log("🔍 getAdminNotifications appelée avec adminId:", adminId);

  try {
    await ensureFirestoreReady();

    const db = getFirestoreInstance();
    if (!db) {
      console.error("❌ Firestore non disponible");
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
      const data = doc.data() as Omit<Notification, 'id'>;
      return { id: doc.id, ...data };
    });

    console.log(`✅ ${notifications.length} notifications récupérées`);
    return notifications;
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error("❌ Erreur dans getAdminNotifications:", error.message);
      console.error("❌ Stack:", error.stack);
    } else {
      console.error("❌ Erreur inconnue dans getAdminNotifications:", error);
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

      const q = query(
        collection(db, "appointments"),
        orderBy("createdAt", "desc")
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(
        (doc) =>
          ({
            id: doc.id,
            ...doc.data(),
          } as FirebaseAppointment)
      );
    });
  } catch (error) {
    console.error("Error fetching appointments:", error);
    throw new Error("Erreur lors de la récupération des consultations");
  }
}

// Service pour récupérer les revenus
export async function getRevenues(): Promise<FirebaseRevenue[]> {
  try {
    return await retryFirestoreOperation(async () => {
      const db = getFirestoreInstance();
      if (!db) throw new Error("Firestore not available");

      const q = query(collection(db, "revenues"), orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(
        (doc) =>
          ({
            id: doc.id,
            ...doc.data(),
          } as FirebaseRevenue)
      );
    });
  } catch (error) {
    console.error("Error fetching revenues:", error);
    throw new Error("Erreur lors de la récupération des revenus");
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
      (p) => p.type === "mental"
    ).length;
    const sexualHealthProfessionals = professionals.filter(
      (p) => p.type === "sexual"
    ).length;

    const mentalHealthRevenue = revenues
      .filter((rev) => {
        const professional = professionals.find(
          (p) => p.id === rev.professionalId
        );
        return professional?.type === "mental";
      })
      .reduce((sum, rev) => sum + rev.amount, 0);

    const sexualHealthRevenue = revenues
      .filter((rev) => {
        const professional = professionals.find(
          (p) => p.id === rev.professionalId
        );
        return professional?.type === "sexual";
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

      const q = query(
        collection(db, "revenues"),
        orderBy("createdAt", "desc"),
        limit(limitCount)
      );
      const snapshot = await getDocs(q);

      const revenues = snapshot.docs.map(
        (doc) =>
          ({
            id: doc.id,
            ...doc.data(),
          } as FirebaseRevenue)
      );

      // Enrichir avec les informations des professionnels
      const professionals = await getProfessionals();
      const users = await getUsers();

      return revenues.map((revenue) => {
        const professional = professionals.find(
          (p) => p.id === revenue.professionalId
        );
        const patient = users.find((u) => u.type === "patient"); // Simulation - il faudrait lier via appointmentId

        return {
          id: revenue.id,
          patient: patient?.name || "Patient inconnu",
          professional: professional?.name || "Professionnel inconnu",
          amount: revenue.amount,
          platformFee: revenue.platformFee,
          type: professional?.type || "mental",
          date: revenue.createdAt.toDate().toLocaleDateString("fr-FR"),
          status: revenue.status,
        };
      });
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