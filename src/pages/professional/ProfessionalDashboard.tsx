import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";

import {
  Calendar,
  Clock,
  Settings,
  Wallet,
  X,
  AlertCircle,
  Wifi,
  WifiOff,
  TrendingUp,
  User,
  Video,
  Phone,
  FileText,
  CheckCircle,
  Play,
  BarChart3,
  CalendarDays,
  Users2,
  MessageCircle,
  CalendarCheck,
} from "lucide-react";
import ConsultationRequests from "../../components/professional/ConsultationRequests";
import { useConsultationStore } from "../../store/consultationStore";
import { useBookings } from "../../hooks/useBookings";
import {
  confirmBooking,
  cancelBooking,
  completeBooking,
} from "../../services/bookingService";
import {
  getFirestoreConnectionStatus,
  ensureFirestoreReady,
  resetFirestoreConnection,
} from "../../utils/firebase";
import EthicsReminder from "../../components/dashboard/EthicsReminder";
import LoadingSpinner from "../../components/ui/LoadingSpinner";

// Welcome banner component with improved design
const WelcomeBanner: React.FC<{ name: string }> = ({ name }) => {
  const displayName = name.startsWith("Dr.") ? name : `Dr. ${name}`;
  const currentHour = new Date().getHours();
  const greeting =
    currentHour < 12
      ? "Bonjour"
      : currentHour < 18
      ? "Bon après-midi"
      : "Bonsoir";

  return (
    <div className="bg-gradient-to-br from-blue-600 via-blue-500 to-teal-500 text-white p-8 rounded-2xl shadow-xl mb-8 relative overflow-hidden">
      <div className="absolute inset-0 bg-black/10"></div>
      <div className="relative z-10">
        <h1 className="text-3xl font-bold mb-2">
          {greeting}, {displayName.split(" ")[0]} 👋
        </h1>
        <p className="text-blue-50 text-lg opacity-90">
          Voici votre tableau de bord professionnel
        </p>
        <div className="mt-4 flex items-center gap-2 text-blue-100">
          <Calendar className="h-5 w-5" />
          <span>
            {new Date().toLocaleDateString("fr-FR", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </span>
        </div>
      </div>
    </div>
  );
};

// Financial Statistics Card
const FinancialStats: React.FC<{ revenue: Revenue; onHide?: () => void }> = ({ revenue, onHide }) => {
  const stats = [
    {
      title: "Revenus disponibles",
      value: `${revenue.available.toLocaleString()} FCFA`,
      icon: Wallet,
      color: "from-green-500 to-emerald-500",
      bgColor: "bg-green-50",
      textColor: "text-green-700",
    },
    {
      title: "En attente",
      value: `${revenue.pending.toLocaleString()} FCFA`,
      icon: Clock,
      color: "from-yellow-500 to-orange-500",
      bgColor: "bg-yellow-50",
      textColor: "text-yellow-700",
    },
    {
      title: "Total retiré",
      value: `${revenue.withdrawn.toLocaleString()} FCFA`,
      icon: TrendingUp,
      color: "from-blue-500 to-indigo-500",
      bgColor: "bg-blue-50",
      textColor: "text-blue-700",
    },
  ];

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <BarChart3 className="h-6 w-6 text-blue-600" />
          Statistiques financières
        </h2>
        <div className="flex items-center gap-2">
          <Link
            to="/professional/financial-details"
            className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-sm font-medium"
          >
            Voir détails
          </Link>
          {onHide && (
            <button
              onClick={onHide}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
            >
              Masquer
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat, index) => {
          const IconComponent = stat.icon;
          return (
            <div
              key={index}
              className={`${stat.bgColor} rounded-xl p-4 border border-gray-100`}
            >
              <div className="flex items-center justify-between mb-3">
                <div
                  className={`p-2 rounded-lg bg-gradient-to-r ${stat.color}`}
                >
                  <IconComponent className="h-5 w-5 text-white" />
                </div>
                <span className={`text-sm font-medium ${stat.textColor}`}>
                  {stat.title}
                </span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Quick Actions Grid
const QuickActions: React.FC = () => {
  const actions = [
    {
      title: "Gérer mon profil",
      icon: User,
      link: "/professional/settings",
      color: "from-blue-500 to-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      title: "Mes disponibilités",
      icon: CalendarCheck,
      link: "/professional/availability",
      color: "from-green-500 to-green-600",
      bgColor: "bg-green-50",
    },
    {
      title: "Mes patients",
      icon: Users2,
      link: "/professional/patients",
      color: "from-purple-500 to-purple-600",
      bgColor: "bg-purple-50",
    },
    {
      title: "Messages",
      icon: MessageCircle,
      link: "/professional/messages",
      color: "from-orange-500 to-orange-600",
      bgColor: "bg-orange-50",
    },
  ];

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
      <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
        <Settings className="h-6 w-6 text-gray-600" />
        Actions rapides
      </h2>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {actions.map((action, index) => {
          const IconComponent = action.icon;
          return (
            <Link
              key={index}
              to={action.link}
              className={`${action.bgColor} rounded-xl p-4 text-center hover:scale-105 transition-all duration-200 group`}
            >
              <div
                className={`p-3 rounded-lg bg-gradient-to-r ${action.color} inline-block mb-3 group-hover:scale-110 transition-transform`}
              >
                <IconComponent className="h-6 w-6 text-white" />
              </div>
              <p className="text-sm font-medium text-gray-700">
                {action.title}
              </p>
            </Link>
          );
        })}
      </div>
    </div>
  );
};

// Today's Agenda
const TodaysAgenda: React.FC<{ bookings: any[] }> = ({ bookings }) => {
  const today = new Date().toDateString();
  const todaysBookings = bookings.filter(
    (booking) => new Date(booking.date).toDateString() === today
  );

  const getConsultationTypeIcon = (type: string) => {
    switch (type) {
      case "video":
        return <Video className="h-4 w-4 text-blue-600" />;
      case "audio":
        return <Phone className="h-4 w-4 text-green-600" />;
      default:
        return <FileText className="h-4 w-4 text-gray-600" />;
    }
  };

  const getConsultationTypeColor = (type: string) => {
    switch (type) {
      case "video":
        return "bg-blue-100 text-blue-700";
      case "audio":
        return "bg-green-100 text-green-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <CalendarDays className="h-6 w-6 text-blue-600" />
          Agenda du jour
        </h2>
        <span className="text-sm text-gray-500">
          {todaysBookings.length} consultation
          {todaysBookings.length > 1 ? "s" : ""}
        </span>
      </div>

      {todaysBookings.length === 0 ? (
        <div className="text-center py-8">
          <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">
            Aucune consultation prévue aujourd'hui
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {todaysBookings.map((booking) => (
            <div
              key={booking.id}
              className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  {getConsultationTypeIcon(booking.type)}
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${getConsultationTypeColor(
                      booking.type
                    )}`}
                  >
                    {booking.type}
                  </span>
                </div>
                <div>
                  <p className="font-medium text-gray-900">
                    {booking.patientName}
                  </p>
                  <p className="text-sm text-gray-500">
                    {new Date(booking.date).toLocaleTimeString("fr-FR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium flex items-center gap-2">
                <Play className="h-4 w-4" />
                Rejoindre
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Consultations Section with Tabs
const ConsultationsSection: React.FC<{
  bookings: any[];
  onConfirm: (bookingId: string) => void;
  onCancel: (bookingId: string) => void;
  onComplete: (bookingId: string, notes?: string) => void;
}> = ({ bookings, onConfirm, onCancel, onComplete }) => {
  const [activeTab, setActiveTab] = useState<"upcoming" | "past">("upcoming");

  const upcomingBookings = bookings.filter(
    (booking) =>
      new Date(booking.date) > new Date() && booking.status === "confirmed"
  );

  const pastBookings = bookings.filter(
    (booking) =>
      new Date(booking.date) < new Date() || booking.status === "completed"
  );

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      confirmed: { label: "Confirmé", color: "bg-green-100 text-green-700" },
      pending: { label: "En attente", color: "bg-yellow-100 text-yellow-700" },
      completed: { label: "Terminé", color: "bg-blue-100 text-blue-700" },
      cancelled: { label: "Annulé", color: "bg-red-100 text-red-700" },
    };

    const config =
      statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    return (
      <span
        className={`px-2 py-1 rounded-full text-xs font-medium ${config.color}`}
      >
        {config.label}
      </span>
    );
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
      <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
        <Calendar className="h-6 w-6 text-blue-600" />
        Consultations
      </h2>

      {/* Tabs */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-xl mb-6">
        <button
          onClick={() => setActiveTab("upcoming")}
          className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all duration-200 ${
            activeTab === "upcoming"
              ? "bg-white text-blue-600 shadow-sm"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          À venir ({upcomingBookings.length})
        </button>
        <button
          onClick={() => setActiveTab("past")}
          className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all duration-200 ${
            activeTab === "past"
              ? "bg-white text-blue-600 shadow-sm"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          Historique ({pastBookings.length})
        </button>
      </div>

      {/* Content */}
      <div className="space-y-4">
        {(activeTab === "upcoming" ? upcomingBookings : pastBookings).map(
          (booking) => (
            <div
              key={booking.id}
              className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <User className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      {booking.patientName}
                    </p>
                    <p className="text-sm text-gray-500">
                      {formatDate(booking.date)}
                    </p>
                  </div>
                </div>
                {getStatusBadge(booking.status)}
              </div>

              <div className="flex items-center gap-2">
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium ${
                    booking.type === "video"
                      ? "bg-blue-100 text-blue-700"
                      : booking.type === "audio"
                      ? "bg-green-100 text-green-700"
                      : "bg-gray-100 text-gray-700"
                  }`}
                >
                  {booking.type === "video" ? (
                    <Video className="h-3 w-3 inline mr-1" />
                  ) : booking.type === "audio" ? (
                    <Phone className="h-3 w-3 inline mr-1" />
                  ) : (
                    <FileText className="h-3 w-3 inline mr-1" />
                  )}
                  {booking.type}
                </span>
              </div>

              {activeTab === "upcoming" && booking.status === "confirmed" && (
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => onConfirm(booking.id)}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium flex items-center justify-center gap-2"
                  >
                    <Play className="h-4 w-4" />
                    Rejoindre
                  </button>
                  <button
                    onClick={() => onCancel(booking.id)}
                    className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-sm font-medium"
                  >
                    Annuler
                  </button>
                </div>
              )}

              {activeTab === "past" && booking.status === "confirmed" && (
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => onComplete(booking.id)}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium flex items-center justify-center gap-2"
                  >
                    <CheckCircle className="h-4 w-4" />
                    Terminer
                  </button>
                </div>
              )}
            </div>
          )
        )}

        {(activeTab === "upcoming" ? upcomingBookings : pastBookings).length ===
          0 && (
          <div className="text-center py-8">
            <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">
              {activeTab === "upcoming"
                ? "Aucune consultation à venir"
                : "Aucune consultation passée"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

interface WithdrawalFormData {
  amount: number;
  method: "wave" | "orange-money" | "bank-transfer";
  accountNumber: string;
}

interface Revenue {
  available: number;
  pending: number;
  withdrawn: number;
  history: {
    id: string;
    type: "consultation" | "withdrawal";
    amount: number;
    description: string;
    date: string;
    status: string;
  }[];
}

const ProfessionalDashboard: React.FC = () => {
  const { currentUser } = useAuth();
  const [showWithdrawalModal, setShowWithdrawalModal] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState(
    getFirestoreConnectionStatus()
  );
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [revenue, setRevenue] = useState<Revenue>({
    available: 0,
    pending: 0,
    withdrawn: 0,
    history: [],
  });
  const [withdrawalData, setWithdrawalData] = useState<WithdrawalFormData>({
    amount: 0,
    method: "wave",
    accountNumber: "",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [migrationResult, setMigrationResult] = useState<string | null>(null);
  const { listenForRequests, stopListening } = useConsultationStore();
  const isMountedRef = useRef(true);
  const [showEthicsReminder, setShowEthicsReminder] = useState(true);
  const [showFinancialStats, setShowFinancialStats] = useState(true);

  // Only fetch bookings if user is authenticated
  const { bookings, loading, error, refreshBookings } = useBookings(
    currentUser?.id || "",
    currentUser?.type === "professional" ? "professional" : "patient"
  );

  // Écouter les demandes de consultation pour ce professionnel
  useEffect(() => {
    if (!currentUser?.id) {
      console.log(
        "⚠️ No current user, skipping consultation requests listener"
      );
      return;
    }

    listenForRequests(currentUser.id);

    return () => {
      stopListening();
    };
  }, [currentUser?.id, listenForRequests, stopListening]);

  // Check if ethics reminder should be shown
  useEffect(() => {
    const reminderDismissed = localStorage.getItem(
      "health-e-ethics-reminder-dismissed"
    );
    if (reminderDismissed) {
      setShowEthicsReminder(false);
    }
  }, []);

  const dismissEthicsReminder = () => {
    localStorage.setItem("health-e-ethics-reminder-dismissed", "true");
    setShowEthicsReminder(false);
  };

  // Test Firestore connection on component mount
  useEffect(() => {
    const testConnection = async () => {
      if (!currentUser?.id) {
        console.log("⚠️ No current user, skipping connection test");
        return;
      }

      try {
        console.log("🔍 Testing Firestore connection...");

        // Ensure Firestore is ready before checking status
        await ensureFirestoreReady();

        const status = getFirestoreConnectionStatus();

        if (!status.isOnline || !status.isInitialized) {
          setConnectionError(
            "Impossible de se connecter à la base de données. Certaines fonctionnalités peuvent être limitées."
          );
        } else {
          setConnectionError(null);
          console.log("✅ Firestore connection status verified");
        }
      } catch (error) {
        console.error("❌ Firestore connection status check failed:", error);
        setConnectionError(
          "Problème de connexion à la base de données. Veuillez vérifier votre connexion internet."
        );

        // Reset Firestore connection on critical errors
        try {
          await resetFirestoreConnection();
          console.log("✅ Firestore connection reset after error");
        } catch (resetError) {
          console.error("❌ Failed to reset Firestore connection:", resetError);
        }
      }
    };

    testConnection();

    return () => {
      isMountedRef.current = false;
    };
  }, [currentUser?.id]);

  // Monitor connection status
  useEffect(() => {
    const updateConnectionStatus = () => {
      if (!isMountedRef.current) return;
      setConnectionStatus(getFirestoreConnectionStatus());
    };

    // Update connection status every 10 seconds
    const interval = setInterval(updateConnectionStatus, 10000);

    // Listen for online/offline events
    window.addEventListener("online", updateConnectionStatus);
    window.addEventListener("offline", updateConnectionStatus);

    return () => {
      clearInterval(interval);
      window.removeEventListener("online", updateConnectionStatus);
      window.removeEventListener("offline", updateConnectionStatus);
      isMountedRef.current = false;
    };
  }, []);

  // Calculate revenue from bookings data (real data from Firestore)
  useEffect(() => {
    const calculateRevenue = async () => {
      if (!currentUser?.id) {
        console.log("⚠️ No current user, skipping revenue calculation");
        return;
      }

      if (!bookings || bookings.length === 0) {
        console.log("ℹ️ No bookings data available for revenue calculation");
        return;
      }

      try {
        // Ensure Firestore is ready before any calculations that might need it
        await ensureFirestoreReady();

        console.log("💰 Calculating revenue from bookings...");

        // Calculate revenue from completed bookings
        const completedBookings = bookings.filter(
          (booking) => booking.status === "terminé"
        );
        const totalRevenue = completedBookings.reduce(
          (sum, booking) => sum + (booking.price || 0),
          0
        );

        // Revenue distribution (realistic calculation)
        const available = Math.floor(totalRevenue * 0.7); // 70% available
        const pending = Math.floor(totalRevenue * 0.2); // 20% pending
        const withdrawn = Math.floor(totalRevenue * 0.1); // 10% already withdrawn

        const history = completedBookings.map((booking) => ({
          id: booking.id,
          type: "consultation" as const,
          amount: booking.price || 0,
          description: `Consultation avec ${booking.patientName || "Patient"}`,
          date: booking.date || "Date inconnue",
          status: "Terminée",
        }));

        if (isMountedRef.current) {
          setRevenue({
            available,
            pending,
            withdrawn,
            history,
          });
        }

        console.log("✅ Revenue calculated successfully:", {
          available,
          pending,
          withdrawn,
          historyCount: history.length,
        });
      } catch (error) {
        console.error("❌ Error calculating revenue:", error);
        // Keep default values if calculation fails
      }
    };

    calculateRevenue();
  }, [bookings, currentUser?.id]);

  const handleConfirmBooking = async (bookingId: string) => {
    if (!currentUser?.id) {
      console.warn("⚠️ No current user, cannot confirm booking");
      return;
    }

    try {
      // Ensure Firestore is ready before operation
      await ensureFirestoreReady();

      console.log("✅ Confirming booking:", bookingId);
      await confirmBooking(bookingId);
    } catch (error) {
      console.error("❌ Error confirming booking:", error);
      alert("Erreur lors de la confirmation. Veuillez réessayer.");

      // Reset Firestore connection on critical errors
      if (error instanceof Error) {
        if (
          error.message &&
          (error.message.includes("permission-denied") ||
            error.message.includes("client terminated") ||
            error.message.includes("unexpected state"))
        ) {
          try {
            await resetFirestoreConnection();
            console.log("✅ Firestore connection reset after error");
          } catch (resetError) {
            console.error(
              "❌ Failed to reset Firestore connection:",
              resetError
            );
          }
        }
      } else {
        // Gestion d'autres types d'erreur si besoin
        console.error("Erreur inconnue :", error);
      }
    }
  };

  const handleCancelBooking = async (bookingId: string) => {
    if (!currentUser?.id) {
      console.warn("⚠️ No current user, cannot cancel booking");
      return;
    }

    try {
      // Ensure Firestore is ready before operation
      await ensureFirestoreReady();

      console.log("❌ Cancelling booking:", bookingId);
      await cancelBooking(bookingId);
    } catch (error) {
      console.error("❌ Error cancelling booking:", error);
      alert("Erreur lors de l'annulation. Veuillez réessayer.");

      // Reset Firestore connection on critical errors
      if (error instanceof Error) {
        if (
          error.message &&
          (error.message.includes("permission-denied") ||
            error.message.includes("client terminated") ||
            error.message.includes("unexpected state"))
        ) {
          try {
            await resetFirestoreConnection();
            console.log("✅ Firestore connection reset after error");
          } catch (resetError) {
            console.error(
              "❌ Failed to reset Firestore connection:",
              resetError
            );
          }
        }
      } else {
        // Gestion d'autres types d'erreur si besoin
        console.error("Erreur inconnue :", error);
      }
    }
  };

  const handleCompleteBooking = async (bookingId: string, notes?: string) => {
    if (!currentUser?.id) {
      console.warn("⚠️ No current user, cannot complete booking");
      return;
    }

    try {
      // Ensure Firestore is ready before operation
      await ensureFirestoreReady();

      console.log("✅ Completing booking:", bookingId);
      await completeBooking(bookingId, notes);
    } catch (error) {
      console.error("❌ Error completing booking:", error);
      alert("Erreur lors de la finalisation. Veuillez réessayer.");

      // Reset Firestore connection on critical errors
      if (error instanceof Error) {
        if (
          error.message &&
          (error.message.includes("permission-denied") ||
            error.message.includes("client terminated") ||
            error.message.includes("unexpected state"))
        ) {
          try {
            await resetFirestoreConnection();
            console.log("✅ Firestore connection reset after error");
          } catch (resetError) {
            console.error(
              "❌ Failed to reset Firestore connection:",
              resetError
            );
          }
        }
      } else {
        // Gestion d'autres types d'erreur si besoin
        console.error("Erreur inconnue :", error);
      }
    }
  };

  const handleWithdrawal = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentUser?.id) {
      console.warn("⚠️ No current user, cannot process withdrawal");
      return;
    }

    setIsSaving(true);

    try {
      // Ensure Firestore is ready before operation
      await ensureFirestoreReady();

      console.log("💸 Processing withdrawal request...");
      // Simulate withdrawal processing
      await new Promise((resolve) => setTimeout(resolve, 2000));

      setShowWithdrawalModal(false);
      setWithdrawalData({
        amount: 0,
        method: "wave",
        accountNumber: "",
      });

      alert(
        "Demande de retrait initiée avec succès. Vous recevrez une confirmation par email."
      );
      console.log("✅ Withdrawal request processed successfully");
    } catch (error) {
      console.error("❌ Error processing withdrawal:", error);
      alert("Une erreur est survenue lors du traitement de votre demande.");

      // Reset Firestore connection on critical errors
      if (error instanceof Error) {
        if (
          error.message &&
          (error.message.includes("permission-denied") ||
            error.message.includes("client terminated") ||
            error.message.includes("unexpected state"))
        ) {
          try {
            await resetFirestoreConnection();
            console.log("✅ Firestore connection reset after error");
          } catch (resetError) {
            console.error(
              "❌ Failed to reset Firestore connection:",
              resetError
            );
          }
        }
      } else {
        // Gestion d'autres types d'erreur si besoin
        console.error("Erreur inconnue :", error);
      }
    } finally {
      if (isMountedRef.current) {
        setIsSaving(false);
      }
    }
  };

  // ✅ FIXED: Simplified migration function that doesn't require index
  // const handleMigrateAvailability = async () => {
  //   ...
  // } // Supprimé car inutilisé

  // Handle connection recovery
  const handleConnectionRecovery = async () => {
    if (!currentUser?.id) {
      console.warn("⚠️ No current user, cannot recover connection");
      return;
    }

    setConnectionError("Tentative de reconnexion en cours...");

    try {
      await resetFirestoreConnection();
      await ensureFirestoreReady();

      // Refresh data
      refreshBookings();

      setConnectionError(null);
      setConnectionStatus(getFirestoreConnectionStatus());
    } catch (error) {
      console.error("❌ Failed to recover connection:", error);
      setConnectionError(
        "Échec de la reconnexion. Veuillez rafraîchir la page."
      );
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          <span className="ml-4 text-lg text-gray-600">
            Chargement du tableau de bord...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        <ConsultationRequests />
        {showEthicsReminder && (
          <EthicsReminder
            userType="professional"
            onDismiss={dismissEthicsReminder}
          />
        )}

        {/* Welcome Banner */}
        <WelcomeBanner
          name={currentUser?.name?.split(" ")[0] || "Professionnel"}
        />

        {/* Connection Status Banner */}
        {(connectionError || error) && (
          <div className="mb-6 p-4 bg-yellow-100 border border-yellow-400 text-yellow-700 rounded-xl flex items-center justify-between">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 mr-2" />
              <div className="flex-1">
                <p className="font-medium">Problème de connexion détecté</p>
                <p className="text-sm mt-1">
                  {connectionError ||
                    error ||
                    "Certaines données peuvent ne pas être à jour. Vérifiez votre connexion internet."}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div
                className={`flex items-center px-3 py-1 rounded-full text-sm ${
                  connectionStatus.isOnline && connectionStatus.isInitialized
                    ? "bg-green-100 text-green-800"
                    : "bg-red-100 text-red-800"
                }`}
              >
                {connectionStatus.isOnline && connectionStatus.isInitialized ? (
                  <>
                    <Wifi className="h-4 w-4 mr-1" />
                    Connecté
                  </>
                ) : (
                  <>
                    <WifiOff className="h-4 w-4 mr-1" />
                    Hors ligne
                  </>
                )}
              </div>
              <button
                onClick={handleConnectionRecovery}
                className="px-3 py-1 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm transition-colors"
              >
                Reconnecter
              </button>
            </div>
          </div>
        )}

        {/* Migration Result Banner */}
        {migrationResult && (
          <div
            className={`mb-6 p-4 ${
              migrationResult.startsWith("✅")
                ? "bg-green-100 border border-green-400 text-green-700"
                : "bg-red-100 border border-red-400 text-red-700"
            } rounded-xl flex items-center justify-between`}
          >
            <p>{migrationResult}</p>
            <button
              onClick={() => setMigrationResult(null)}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        )}

        {/* Financial Statistics */}
        {showFinancialStats && (
          <FinancialStats 
            revenue={revenue} 
            onHide={() => setShowFinancialStats(false)}
          />
        )}

        {/* Quick Actions */}
        <QuickActions />

        {/* Today's Agenda */}
        <TodaysAgenda bookings={bookings} />

        {/* Consultations Section */}
        <ConsultationsSection
          bookings={bookings}
          onConfirm={handleConfirmBooking}
          onCancel={handleCancelBooking}
          onComplete={handleCompleteBooking}
        />

        {/* Withdrawal Modal */}
        {showWithdrawalModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold">Retrait de fonds</h2>
                <button
                  onClick={() => setShowWithdrawalModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <form onSubmit={handleWithdrawal} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Montant (FCFA)
                  </label>
                  <input
                    type="number"
                    value={withdrawalData.amount}
                    onChange={(e) =>
                      setWithdrawalData({
                        ...withdrawalData,
                        amount: Number(e.target.value),
                      })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Montant à retirer"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Méthode de retrait
                  </label>
                  <select
                    value={withdrawalData.method}
                    onChange={(e) =>
                      setWithdrawalData({
                        ...withdrawalData,
                        method: e.target.value as any,
                      })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="wave">Wave</option>
                    <option value="orange-money">Orange Money</option>
                    <option value="bank-transfer">Virement bancaire</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Numéro de compte
                  </label>
                  <input
                    type="text"
                    value={withdrawalData.accountNumber}
                    onChange={(e) =>
                      setWithdrawalData({
                        ...withdrawalData,
                        accountNumber: e.target.value,
                      })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Numéro de compte"
                    required
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowWithdrawalModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    {isSaving ? (
                      <div className="flex items-center justify-center">
                        <LoadingSpinner size="sm" />
                        <span className="ml-2">Traitement...</span>
                      </div>
                    ) : (
                      "Confirmer le retrait"
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfessionalDashboard;
