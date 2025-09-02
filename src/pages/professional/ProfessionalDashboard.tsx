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
  Stethoscope,
  XCircle,
} from "lucide-react";
import ConsultationRequests from "../../components/professional/ConsultationRequests";
import { useConsultationStore } from "../../store/consultationStore";

import { useBookings } from "../../hooks/useBookings";
import { cancelBooking, completeBooking } from "../../services/bookingService";
import {
  calculateProfessionalRevenue,
  getProfessionalTransactions,
} from "../../services/revenueService";
import {
  getFirestoreConnectionStatus,
  ensureFirestoreReady,
  resetFirestoreConnection,
} from "../../utils/firebase";
import { formatDateTimeWithTimezone } from "../../utils/dateTimeUtils";
import EthicsReminder from "../../components/dashboard/EthicsReminder";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import UserSupportTickets from "../../components/support/UserSupportTickets";
import ProfessionalNotificationCenter from "../../components/professional/ProfessionalNotificationCenter";

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
          {greeting}, {displayName} 👋
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
const FinancialStats: React.FC<{
  revenue: Revenue;
  showBalance: boolean;
  onToggleBalance: () => void;
}> = ({ revenue, showBalance, onToggleBalance }) => {
  const stats = [
    {
      title: "Revenus disponibles",
      value: showBalance
        ? `${revenue.available.toLocaleString()} FCFA`
        : "••••••",
      icon: Wallet,
      color: "from-green-500 to-emerald-500",
      bgColor: "bg-green-50",
      textColor: "text-green-700",
    },
    {
      title: "En attente",
      value: showBalance
        ? `${revenue.pending.toLocaleString()} FCFA`
        : "••••••",
      icon: Clock,
      color: "from-yellow-500 to-orange-500",
      bgColor: "bg-yellow-50",
      textColor: "text-yellow-700",
    },
    {
      title: "Total retiré",
      value: showBalance
        ? `${revenue.withdrawn.toLocaleString()} FCFA`
        : "••••••",
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
          <button
            onClick={onToggleBalance}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
          >
            {showBalance ? "Masquer" : "Afficher"}
          </button>
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
    {
      title: "Support",
      icon: MessageCircle,
      action: "support",
      color: "from-red-500 to-red-600",
      bgColor: "bg-red-50",
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

          if (action.action === "support") {
            return (
              <button
                key={index}
                onClick={() =>
                  window.dispatchEvent(new CustomEvent("showSupport"))
                }
                className={`${action.bgColor} rounded-xl p-4 text-center hover:scale-105 transition-all duration-200 group cursor-pointer`}
              >
                <div
                  className={`p-3 rounded-lg bg-gradient-to-r ${action.color} inline-block mb-3 group-hover:scale-110 transition-transform`}
                >
                  <IconComponent className="h-6 w-6 text-white" />
                </div>
                <p className="text-sm font-medium text-gray-700">
                  {action.title}
                </p>
              </button>
            );
          }

          return (
            <Link
              key={index}
              to={action.link || "#"}
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
const TodaysAgenda: React.FC<{
  bookings: Array<{
    id: string;
    date: string;
    type: string;
    patientName: string;
    startTime: string;
    duration: number;
    status: string;
  }>;
}> = ({ bookings }) => {
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
                    {formatDateTimeWithTimezone(
                      booking.date,
                      booking.startTime
                    )}
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

// Consultations Section with Tabs - Design identique au dashboard patient
const ConsultationsSection: React.FC<{
  bookings: Array<{
    id: string;
    date: string;
    type: string;
    patientName: string;
    startTime: string;
    duration: number;
    status: string;
  }>;
  onCancel?: (bookingId: string) => void;
  onComplete: (bookingId: string, notes?: string) => void;
}> = ({ bookings, onCancel, onComplete }) => {
  const [activeTab, setActiveTab] = useState<"upcoming" | "past">("upcoming");

  // Fonction pour comparer les dates en tenant compte seulement du jour (pas de l'heure)
  const isDatePassed = (dateString: string) => {
    try {
      // Si c'est déjà un nom de jour (ex: "Jeudi"), retourner false (pas encore passé)
      if (
        [
          "Lundi",
          "Mardi",
          "Mercredi",
          "Jeudi",
          "Vendredi",
          "Samedi",
          "Dimanche",
        ].includes(dateString)
      ) {
        return false;
      }

      // Créer la date en spécifiant explicitement le fuseau horaire local
      let bookingDate: Date;

      if (dateString.includes("-")) {
        // Format YYYY-MM-DD : créer la date en heure locale
        const [year, month, day] = dateString.split("-").map(Number);
        // Créer la date à midi dans le fuseau local pour éviter les problèmes de minuit
        bookingDate = new Date(year, month - 1, day, 12, 0, 0);
      } else {
        // Autre format : utiliser le parser standard
        bookingDate = new Date(dateString);
      }

      const today = new Date();

      // Vérifier si la date est valide
      if (isNaN(bookingDate.getTime())) {
        return false;
      }

      // Comparer directement les composants de date (année, mois, jour)
      const isPassed =
        bookingDate.getFullYear() < today.getFullYear() ||
        (bookingDate.getFullYear() === today.getFullYear() &&
          bookingDate.getMonth() < today.getMonth()) ||
        (bookingDate.getFullYear() === today.getFullYear() &&
          bookingDate.getMonth() === today.getMonth() &&
          bookingDate.getDate() < today.getDate());

      return isPassed;
    } catch {
      return false; // En cas d'erreur, traiter comme non passée
    }
  };

  const upcomingBookings = bookings.filter(
    (booking) =>
      (booking.status === "confirmed" ||
        booking.status === "confirmé" ||
        booking.status === "en_attente") &&
      !isDatePassed(booking.date)
  );

  const pastBookings = bookings.filter(
    (booking) =>
      booking.status === "completed" ||
      booking.status === "cancelled" ||
      isDatePassed(booking.date)
  );

  const getStatusColor = (status: string) => {
    const statusConfig = {
      confirmed: "bg-green-100 text-green-700",
      pending: "bg-yellow-100 text-yellow-700",
      completed: "bg-blue-100 text-blue-700",
      cancelled: "bg-red-100 text-red-700",
      en_attente: "bg-yellow-100 text-yellow-700",
      confirmé: "bg-green-100 text-green-700",
    };

    return (
      statusConfig[status as keyof typeof statusConfig] || statusConfig.pending
    );
  };

  const getStatusLabel = (status: string) => {
    const statusConfig = {
      confirmed: "Confirmé",
      pending: "En attente",
      completed: "Terminé",
      cancelled: "Annulé",
      en_attente: "En attente",
      confirmé: "Confirmé",
    };

    return (
      statusConfig[status as keyof typeof statusConfig] || statusConfig.pending
    );
  };

  const getConsultationIcon = (type: string) => {
    switch (type) {
      case "video":
        return <Video className="h-4 w-4 text-blue-500" />;
      case "audio":
        return <Phone className="h-4 w-4 text-green-500" />;
      default:
        return <FileText className="h-4 w-4 text-gray-500" />;
    }
  };

  const displayedBookings =
    activeTab === "upcoming" ? upcomingBookings : pastBookings;

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center">
          <Calendar className="h-6 w-6 mr-3 text-blue-600" />
          Consultations
        </h2>
      </div>

      {/* Tabs modernisés */}
      <div className="flex bg-gray-100 rounded-xl p-1 mb-6">
        <button
          onClick={() => setActiveTab("upcoming")}
          className={`flex-1 py-3 px-4 rounded-lg text-sm font-medium transition-all duration-200 ${
            activeTab === "upcoming"
              ? "bg-white text-blue-600 shadow-sm"
              : "text-gray-600 hover:text-gray-800"
          }`}
        >
          <div className="flex items-center justify-center">
            <Play className="h-4 w-4 mr-2" />À venir ({upcomingBookings.length})
          </div>
        </button>
        <button
          onClick={() => setActiveTab("past")}
          className={`flex-1 py-3 px-4 rounded-lg text-sm font-medium transition-all duration-200 ${
            activeTab === "past"
              ? "bg-white text-blue-600 shadow-sm"
              : "text-gray-600 hover:text-gray-800"
          }`}
        >
          <div className="flex items-center justify-center">
            <FileText className="h-4 w-4 mr-2" />
            Historique ({pastBookings.length})
          </div>
        </button>
      </div>

      {/* Bookings list modernisée */}
      {displayedBookings.length > 0 ? (
        <div className="space-y-4">
          {displayedBookings.map((booking) => (
            <div
              key={booking.id}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg transition-all duration-300 hover:scale-[1.02]"
            >
              <div className="p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4">
                  <div className="flex items-center mb-4 sm:mb-0">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center mr-4 shadow-md">
                      <User className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg text-gray-900">
                        {booking.patientName}
                      </h3>
                      <p className="text-gray-600 flex items-center">
                        <Stethoscope className="h-4 w-4 mr-1" />
                        Consultation {booking.type}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center">
                    {getConsultationIcon(booking.type)}
                    <span className="ml-2 text-sm text-gray-600 capitalize font-medium">
                      {booking.type}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                  <div className="flex items-center text-gray-600 bg-gray-50 rounded-lg p-3">
                    <Calendar className="h-4 w-4 mr-2 text-blue-500" />
                    <span className="text-sm font-medium">
                      {formatDateTimeWithTimezone(
                        booking.date,
                        booking.startTime
                      )}
                    </span>
                  </div>
                  <div className="flex items-center text-gray-600 bg-gray-50 rounded-lg p-3">
                    <Clock className="h-4 w-4 mr-2 text-green-500" />
                    <span className="text-sm font-medium">
                      Durée: {booking.duration} min
                    </span>
                  </div>
                  <div className="flex items-center">
                    <span
                      className={`text-xs font-bold px-3 py-1.5 rounded-full ${getStatusColor(
                        // Si c'est dans l'historique et que la date est passée, afficher comme "completed"
                        activeTab === "past" &&
                          isDatePassed(booking.date) &&
                          (booking.status === "en_attente" ||
                            booking.status === "confirmé" ||
                            booking.status === "confirmed")
                          ? "completed"
                          : booking.status
                      )}`}
                    >
                      {getStatusLabel(
                        // Si c'est dans l'historique et que la date est passée, afficher comme "completed"
                        activeTab === "past" &&
                          isDatePassed(booking.date) &&
                          (booking.status === "en_attente" ||
                            booking.status === "confirmé" ||
                            booking.status === "confirmed")
                          ? "completed"
                          : booking.status
                      )}
                    </span>
                  </div>
                </div>

                {/* Afficher les boutons seulement pour les consultations à venir */}
                {activeTab === "upcoming" &&
                (booking.status === "en_attente" ||
                  booking.status === "confirmé" ||
                  booking.status === "confirmed") ? (
                  <div className="flex justify-between items-center">
                    <button
                      onClick={() => onCancel?.(booking.id)}
                      className="flex items-center text-red-500 text-sm font-medium hover:text-red-600 transition-colors"
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      Annuler
                    </button>
                    <Link
                      to={`/consultation/${booking.id}`}
                      className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-md hover:shadow-lg flex items-center"
                    >
                      <Play className="h-4 w-4 mr-2" />
                      Rejoindre
                    </Link>
                  </div>
                ) : null}

                {/* Pour les consultations dans l'historique qui ne sont pas encore terminées */}
                {activeTab === "past" &&
                  booking.status === "confirmed" &&
                  !isDatePassed(booking.date) && (
                    <div className="flex justify-between items-center">
                      <div></div> {/* Espaceur */}
                      <button
                        onClick={() => onComplete(booking.id)}
                        className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-md hover:shadow-lg flex items-center"
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Terminer
                      </button>
                    </div>
                  )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Calendar className="h-8 w-8 text-gray-400" />
          </div>
          <p className="text-gray-500 font-medium">
            {activeTab === "upcoming"
              ? "Vous n'avez pas de rendez-vous à venir."
              : "Vous n'avez pas encore eu de consultations."}
          </p>
        </div>
      )}
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
  const [showSupport, setShowSupport] = useState(false);
  const [showFinancialStats] = useState(true);
  const [showBalance, setShowBalance] = useState(true);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [bookingToCancel, setBookingToCancel] = useState<string | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);

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

  // Écouter l'événement pour afficher le support
  useEffect(() => {
    const handleShowSupport = () => setShowSupport(true);
    window.addEventListener("showSupport", handleShowSupport);

    return () => {
      window.removeEventListener("showSupport", handleShowSupport);
    };
  }, []);

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

  // Calculate revenue from Firestore revenue transactions
  useEffect(() => {
    if (!currentUser?.id) return; // attendre l'ID

    let cancelled = false;

    const fetchRevenue = async () => {
      try {
        await ensureFirestoreReady();

        const [r, tx] = await Promise.all([
          calculateProfessionalRevenue(currentUser.id),
          getProfessionalTransactions(currentUser.id, 20),
        ]);

        if (cancelled) return;

        setRevenue({
          available: Number(r?.available ?? 0),
          pending: Number(r?.pending ?? 0),
          withdrawn: Number(r?.withdrawn ?? 0),
          history: (tx ?? []).map((t) => ({
            id: t.id ?? "",
            type: t.type,
            amount: Number(t.professionalAmount ?? 0),
            description: t.description ?? "Transaction",
            date: (t.createdAt?.toDate?.()
              ? t.createdAt.toDate()
              : new Date()
            ).toLocaleDateString("fr-FR"),
            status: t.status === "completed" ? "Terminée" : t.status,
          })),
        });
      } catch (e) {
        console.error("⚠️ fetchRevenue error:", e);
      }
    };

    fetchRevenue(); // 1er chargement
    const interval = setInterval(fetchRevenue, 15000); // refresh régulier

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [currentUser?.id]);

  const handleCancelBooking = async (bookingId: string) => {
    if (!currentUser?.id) {
      console.warn("⚠️ User not authenticated, cannot cancel booking");
      return;
    }

    try {
      setIsCancelling(true);
      await cancelBooking(bookingId);

      // Rafraîchir les données
      if (isMountedRef.current) {
        // Recharger les bookings
        window.location.reload(); // Solution simple pour rafraîchir
      }

      console.log("✅ Booking cancelled successfully");
    } catch (error) {
      console.error("❌ Error cancelling booking:", error);
      alert("Erreur lors de l'annulation du rendez-vous. Veuillez réessayer.");
    } finally {
      setIsCancelling(false);
      setShowCancelModal(false);
      setBookingToCancel(null);
    }
  };

  const confirmCancel = (bookingId: string) => {
    setBookingToCancel(bookingId);
    setShowCancelModal(true);
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
        <WelcomeBanner name={currentUser?.name || "Professionnel"} />

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
            showBalance={showBalance}
            onToggleBalance={() => setShowBalance(!showBalance)}
          />
        )}

        {/* Quick Actions */}
        <QuickActions />

        {/* Today's Agenda */}
        <TodaysAgenda bookings={bookings} />

        {/* Consultations Section */}
        <ConsultationsSection
          bookings={bookings}
          onCancel={confirmCancel}
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
                        method: e.target.value as
                          | "wave"
                          | "orange-money"
                          | "bank-transfer",
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

        {/* Support Modal */}
        {showSupport && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
              <div className="p-6 border-b border-gray-200 flex justify-between items-center flex-shrink-0">
                <h2 className="text-xl font-semibold">Support et assistance</h2>
                <button
                  onClick={() => setShowSupport(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto">
                <UserSupportTickets />
              </div>
            </div>
          </div>
        )}

        {/* Modal de confirmation d'annulation */}
        {showCancelModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">
                  Confirmer l'annulation
                </h3>
                <button
                  onClick={() => setShowCancelModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="mb-6">
                <p className="text-gray-600">
                  Êtes-vous sûr de vouloir annuler cette consultation ? Cette
                  action ne peut pas être annulée.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowCancelModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={() => handleCancelBooking(bookingToCancel!)}
                  disabled={isCancelling}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  {isCancelling ? (
                    <div className="flex items-center justify-center">
                      <LoadingSpinner size="sm" />
                      <span className="ml-2">Annulation...</span>
                    </div>
                  ) : (
                    "Confirmer l'annulation"
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfessionalDashboard;
