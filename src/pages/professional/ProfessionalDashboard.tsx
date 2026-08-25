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
import {
  getProfessionalGroupTherapySessions,
  getMeetingInfo,
  openGroupTherapyMeeting,
  GroupTherapySession,
} from "../../services/groupTherapyService";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

// Helpers pour la gestion des dates
const WEEKDAYS_FR = [
  "Lundi",
  "Mardi",
  "Mercredi",
  "Jeudi",
  "Vendredi",
  "Samedi",
  "Dimanche",
];

function parseBookingDate(dateString: string): Date | null {
  try {
    // Ex: "Lundi" -> pas une date
    if (WEEKDAYS_FR.includes(dateString)) return null;

    // Ex: "2025-09-02"
    if (dateString.includes("-")) {
      const [y, m, d] = dateString.split("-").map(Number);
      const dt = new Date(y, (m ?? 1) - 1, d ?? 1, 12, 0, 0); // midi local
      return isNaN(dt.getTime()) ? null : dt;
    }

    // Ex: "Tue Sep 02 2025" ou ISO
    const dt = new Date(dateString);
    return isNaN(dt.getTime()) ? null : dt;
  } catch {
    return null;
  }
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

// A utiliser partout
export function isConsultationDay(dateString: string): boolean {
  const d = parseBookingDate(dateString);
  if (!d) return false;
  return isSameDay(d, new Date());
}

export function isDatePassed(dateString: string): boolean {
  const d = parseBookingDate(dateString);
  if (!d) return false;
  const today = new Date();
  const d0 = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const t0 = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return d0.getTime() < t0.getTime();
}

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
    <div className="bg-ink text-paper p-8 rounded-block shadow-lift mb-8">
      <h1 className="text-3xl font-display font-bold mb-2">
        {greeting}, {displayName}
      </h1>
      <p className="text-paper/70 text-lg">
        Voici votre tableau de bord professionnel
      </p>
      <div className="mt-4 flex items-center gap-2 text-paper/70">
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
      iconBg: "bg-sage",
      bgColor: "bg-sage-soft",
      textColor: "text-sage",
    },
    {
      title: "En attente",
      value: showBalance
        ? `${revenue.pending.toLocaleString()} FCFA`
        : "••••••",
      icon: Clock,
      iconBg: "bg-gold",
      bgColor: "bg-gold-soft",
      textColor: "text-gold",
    },
    {
      title: "Total retiré",
      value: showBalance
        ? `${revenue.withdrawn.toLocaleString()} FCFA`
        : "••••••",
      icon: TrendingUp,
      iconBg: "bg-accent",
      bgColor: "bg-accent-soft",
      textColor: "text-accent",
    },
  ];

  return (
    <div className="bg-card border border-line rounded-block shadow-soft p-6 mb-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-display font-bold text-ink flex items-center gap-2">
          <BarChart3 className="h-6 w-6 text-accent" />
          Statistiques financières
        </h2>
        <div className="flex items-center gap-2">
          <Link
            to="/professional/financial-details"
            className="px-4 py-2 bg-accent-soft text-accent rounded-pill hover:bg-accent/20 transition-colors text-sm font-medium"
          >
            Voir détails
          </Link>
          <button
            onClick={onToggleBalance}
            className="px-4 py-2 bg-paper border border-line text-ink-soft rounded-pill hover:bg-line/40 transition-colors text-sm font-medium"
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
              className={`${stat.bgColor} rounded-card p-4 border border-line`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className={`p-2 rounded-card ${stat.iconBg}`}>
                  <IconComponent className="h-5 w-5 text-paper" />
                </div>
                <span className={`text-sm font-medium ${stat.textColor}`}>
                  {stat.title}
                </span>
              </div>
              <p className="text-2xl font-display font-bold text-ink">
                {stat.value}
              </p>
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
      iconBg: "bg-accent",
      bgColor: "bg-accent-soft",
    },
    {
      title: "Mes disponibilités",
      icon: CalendarCheck,
      link: "/professional/availability",
      iconBg: "bg-sage",
      bgColor: "bg-sage-soft",
    },
    {
      title: "Mes patients",
      icon: Users2,
      link: "/professional/patients",
      iconBg: "bg-gold",
      bgColor: "bg-gold-soft",
    },
    {
      title: "Messages",
      icon: MessageCircle,
      link: "/professional/messages",
      iconBg: "bg-ink",
      bgColor: "bg-ink/5",
    },
    {
      title: "Support",
      icon: MessageCircle,
      action: "support",
      iconBg: "bg-danger",
      bgColor: "bg-danger/10",
    },
  ];

  return (
    <div className="bg-card border border-line rounded-block shadow-soft p-6 mb-8">
      <h2 className="text-xl font-display font-bold text-ink mb-6 flex items-center gap-2">
        <Settings className="h-6 w-6 text-ink-soft" />
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
                className={`${action.bgColor} rounded-card p-4 text-center hover:scale-105 transition-all duration-200 group cursor-pointer`}
              >
                <div
                  className={`p-3 rounded-card ${action.iconBg} inline-block mb-3 group-hover:scale-110 transition-transform`}
                >
                  <IconComponent className="h-6 w-6 text-paper" />
                </div>
                <p className="text-sm font-medium text-ink-soft">
                  {action.title}
                </p>
              </button>
            );
          }

          return (
            <Link
              key={index}
              to={action.link || "#"}
              className={`${action.bgColor} rounded-card p-4 text-center hover:scale-105 transition-all duration-200 group`}
            >
              <div
                className={`p-3 rounded-card ${action.iconBg} inline-block mb-3 group-hover:scale-110 transition-transform`}
              >
                <IconComponent className="h-6 w-6 text-paper" />
              </div>
              <p className="text-sm font-medium text-ink-soft">
                {action.title}
              </p>
            </Link>
          );
        })}
      </div>
    </div>
  );
};

// Today's Agenda (sans bouton "Rejoindre")
const TodaysAgenda: React.FC<{
  bookings: Array<{
    id: string;
    date: string;
    type: string;
    patientName: string;
    startTime: string;
    duration: number;
    status: string;
    patientId?: string;
  }>;
}> = ({ bookings }) => {
  const todaysBookings = bookings.filter((b) => isConsultationDay(b.date));

  const getConsultationTypeIcon = (type: string) => {
    switch (type) {
      case "video":
        return <Video className="h-4 w-4 text-accent" />;
      case "audio":
        return <Phone className="h-4 w-4 text-sage" />;
      default:
        return <FileText className="h-4 w-4 text-ink-soft" />;
    }
  };

  const getConsultationTypeColor = (type: string) => {
    switch (type) {
      case "video":
        return "bg-accent-soft text-accent";
      case "audio":
        return "bg-sage-soft text-sage";
      default:
        return "bg-paper text-ink-soft";
    }
  };

  return (
    <div className="bg-card border border-line rounded-block shadow-soft p-6 mb-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-display font-bold text-ink flex items-center gap-2">
          <CalendarDays className="h-6 w-6 text-accent" />
          Agenda du jour
        </h2>
        <span className="text-sm text-muted">
          {todaysBookings.length} consultation
          {todaysBookings.length > 1 ? "s" : ""}
        </span>
      </div>

      {todaysBookings.length === 0 ? (
        <div className="text-center py-8">
          <Calendar className="h-12 w-12 text-muted mx-auto mb-4" />
          <p className="text-muted">
            Aucune consultation prévue aujourd'hui
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {todaysBookings.map((booking) => (
            <div
              key={booking.id}
              className="flex items-center justify-between p-4 bg-paper rounded-card hover:bg-line/40 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  {getConsultationTypeIcon(booking.type)}
                  <span
                    className={`px-2 py-1 rounded-pill text-xs font-medium ${getConsultationTypeColor(
                      booking.type
                    )}`}
                  >
                    {booking.type}
                  </span>
                </div>
                <div>
                  <p className="font-medium text-ink">
                    {booking.patientName}
                  </p>
                  <p className="text-sm text-muted">
                    {formatDateTimeWithTimezone(
                      booking.date,
                      booking.startTime
                    )}
                  </p>
                </div>
              </div>

              {/* Bouton "Rejoindre" supprimé intentionnellement dans l'Agenda du jour */}
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
    patientId?: string;
  }>;
  onCancel?: (bookingId: string) => void;
  onComplete: (bookingId: string, notes?: string) => void;
}> = ({ bookings, onCancel, onComplete }) => {
  const [activeTab, setActiveTab] = useState<"upcoming" | "past">("upcoming");

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
      confirmed: "bg-ok/10 text-ok",
      pending: "bg-warn/10 text-warn",
      completed: "bg-accent-soft text-accent",
      cancelled: "bg-danger/10 text-danger",
      en_attente: "bg-warn/10 text-warn",
      confirmé: "bg-ok/10 text-ok",
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
        return <Video className="h-4 w-4 text-accent" />;
      case "audio":
        return <Phone className="h-4 w-4 text-sage" />;
      default:
        return <FileText className="h-4 w-4 text-muted" />;
    }
  };

  const displayedBookings =
    activeTab === "upcoming" ? upcomingBookings : pastBookings;

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-display font-bold text-ink flex items-center">
          <Calendar className="h-6 w-6 mr-3 text-accent" />
          Consultations
        </h2>
      </div>

      {/* Tabs modernisés */}
      <div className="flex bg-paper rounded-pill p-1 mb-6">
        <button
          onClick={() => setActiveTab("upcoming")}
          className={`flex-1 py-3 px-4 rounded-pill text-sm font-medium transition-all duration-200 ${
            activeTab === "upcoming"
              ? "bg-card text-accent shadow-soft"
              : "text-ink-soft hover:text-ink"
          }`}
        >
          <div className="flex items-center justify-center">
            <Play className="h-4 w-4 mr-2" />À venir ({upcomingBookings.length})
          </div>
        </button>
        <button
          onClick={() => setActiveTab("past")}
          className={`flex-1 py-3 px-4 rounded-pill text-sm font-medium transition-all duration-200 ${
            activeTab === "past"
              ? "bg-card text-accent shadow-soft"
              : "text-ink-soft hover:text-ink"
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
              className="bg-card rounded-block shadow-soft border border-line overflow-hidden hover:shadow-lift transition-all duration-300"
            >
              <div className="p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4">
                  <div className="flex items-center mb-4 sm:mb-0">
                    <div className="w-12 h-12 rounded-card bg-accent flex items-center justify-center mr-4 shadow-soft">
                      <User className="h-6 w-6 text-paper" />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg text-ink">
                        {booking.patientName}
                      </h3>
                      <p className="text-ink-soft flex items-center">
                        <Stethoscope className="h-4 w-4 mr-1" />
                        Consultation {booking.type}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center">
                    {getConsultationIcon(booking.type)}
                    <span className="ml-2 text-sm text-ink-soft capitalize font-medium">
                      {booking.type}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                  <div className="flex items-center text-ink-soft bg-paper rounded-card p-3">
                    <Calendar className="h-4 w-4 mr-2 text-accent" />
                    <span className="text-sm font-medium">
                      {formatDateTimeWithTimezone(
                        booking.date,
                        booking.startTime
                      )}
                    </span>
                  </div>
                  <div className="flex items-center text-ink-soft bg-paper rounded-card p-3">
                    <Clock className="h-4 w-4 mr-2 text-sage" />
                    <span className="text-sm font-medium">
                      Durée: {booking.duration} min
                    </span>
                  </div>
                  <div className="flex items-center">
                    <span
                      className={`text-xs font-bold px-3 py-1.5 rounded-pill ${getStatusColor(
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
                      className="flex items-center text-danger text-sm font-medium hover:text-danger/80 transition-colors"
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      Annuler
                    </button>
                    {isConsultationDay(booking.date) ? (
                      <Link
                        to={`/consultation/${booking.id}${
                          booking.patientId
                            ? `?patientId=${booking.patientId}`
                            : ""
                        }`}
                        className="px-4 py-2 bg-accent text-paper rounded-pill hover:bg-accent/90 transition-colors text-sm font-medium flex items-center gap-2"
                        onClick={() => {
                          console.log("[AGENDA] Rejoindre", {
                            bookingId: booking.id,
                            patientId: booking.patientId,
                          });
                        }}
                      >
                        <Play className="h-4 w-4" />
                        Rejoindre
                      </Link>
                    ) : (
                      <div className="px-4 py-2 bg-line text-muted rounded-pill text-sm font-medium flex items-center gap-2 cursor-not-allowed">
                        <Play className="h-4 w-4" />
                        Rejoindre
                        <span className="text-xs">(Disponible le jour J)</span>
                      </div>
                    )}
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
                        className="bg-sage text-paper px-6 py-2.5 rounded-pill text-sm font-semibold hover:bg-sage/90 transition-all duration-200 shadow-soft flex items-center"
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
        <div className="bg-card rounded-block shadow-soft border border-line p-8 text-center">
          <div className="w-16 h-16 bg-paper border border-line rounded-full flex items-center justify-center mx-auto mb-4">
            <Calendar className="h-8 w-8 text-muted" />
          </div>
          <p className="text-muted font-medium">
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
  const [groupTherapySessions, setGroupTherapySessions] = useState<
    GroupTherapySession[]
  >([]);
  const [loadingGroupTherapy, setLoadingGroupTherapy] = useState(false);
  const [meetingInfoMap, setMeetingInfoMap] = useState<
    Record<string, { meetingLink: string; meetingStatus: "closed" | "open" }>
  >({});

  // Only fetch bookings if user is authenticated
  const { bookings, loading, error, refreshBookings } = useBookings(
    currentUser?.id || "",
    currentUser?.type === "professional" ? "professional" : "patient"
  );

  // Écouter les demandes de consultation pour ce professionnel
  useEffect(() => {
    if (!currentUser?.id) {
      console.log(
        "No current user, skipping consultation requests listener"
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
        console.log("No current user, skipping connection test");
        return;
      }

      try {
        console.log("Testing Firestore connection...");

        // Ensure Firestore is ready before checking status
        await ensureFirestoreReady();

        const status = getFirestoreConnectionStatus();

        if (!status.isOnline || !status.isInitialized) {
          setConnectionError(
            "Impossible de se connecter à la base de données. Certaines fonctionnalités peuvent être limitées."
          );
        } else {
          setConnectionError(null);
          console.log("Firestore connection status verified");
        }
      } catch (error) {
        console.error("Firestore connection status check failed:", error);
        setConnectionError(
          "Problème de connexion à la base de données. Veuillez vérifier votre connexion internet."
        );

        // Reset Firestore connection on critical errors
        try {
          await resetFirestoreConnection();
          console.log("Firestore connection reset after error");
        } catch (resetError) {
          console.error(
            "Failed to reset Firestore connection:",
            resetError
          );
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
        console.error("fetchRevenue error:", e);
      }
    };

    fetchRevenue(); // 1er chargement
    const interval = setInterval(fetchRevenue, 15000); // refresh régulier

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [currentUser?.id]);

  // Fetch group therapy sessions
  useEffect(() => {
    const fetchGroupTherapySessions = async () => {
      if (!currentUser?.id) return;

      try {
        setLoadingGroupTherapy(true);
        const sessions = await getProfessionalGroupTherapySessions(
          currentUser.id
        );
        setGroupTherapySessions(sessions);

        // Charger les informations de réunion pour chaque session
        const meetingInfoPromises = sessions.map(async (session) => {
          const info = await getMeetingInfo(session.id);
          return {
            sessionId: session.id,
            info: info
              ? {
                  meetingLink: info.meetingLink,
                  meetingStatus: info.meetingStatus,
                }
              : { meetingLink: "", meetingStatus: "closed" as const },
          };
        });

        const meetingInfos = await Promise.all(meetingInfoPromises);
        const infoMap: Record<
          string,
          { meetingLink: string; meetingStatus: "closed" | "open" }
        > = {};
        meetingInfos.forEach(({ sessionId, info }) => {
          infoMap[sessionId] = info;
        });
        setMeetingInfoMap(infoMap);
      } catch (error) {
        console.error("Error fetching group therapy sessions:", error);
      } finally {
        setLoadingGroupTherapy(false);
      }
    };

    fetchGroupTherapySessions();
  }, [currentUser?.id]);

  const handleCancelBooking = async (bookingId: string) => {
    if (!currentUser?.id) {
      console.warn("User not authenticated, cannot cancel booking");
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

      console.log("Booking cancelled successfully");
    } catch (error) {
      console.error("Error cancelling booking:", error);
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
      console.warn("No current user, cannot complete booking");
      return;
    }

    try {
      // Ensure Firestore is ready before operation
      await ensureFirestoreReady();

      console.log("Completing booking:", bookingId);
      await completeBooking(bookingId, notes);
    } catch (error) {
      console.error("Error completing booking:", error);
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
            console.log("Firestore connection reset after error");
          } catch (resetError) {
            console.error(
              "Failed to reset Firestore connection:",
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
      console.warn("No current user, cannot process withdrawal");
      return;
    }

    setIsSaving(true);

    try {
      // Ensure Firestore is ready before operation
      await ensureFirestoreReady();

      console.log("Processing withdrawal request...");
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
      console.log("Withdrawal request processed successfully");
    } catch (error) {
      console.error("Error processing withdrawal:", error);
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
            console.log("Firestore connection reset after error");
          } catch (resetError) {
            console.error(
              "Failed to reset Firestore connection:",
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

  // Simplified migration function that doesn't require index
  // const handleMigrateAvailability = async () => {
  //   ...
  // } // Supprimé car inutilisé

  // Handle connection recovery
  const handleConnectionRecovery = async () => {
    if (!currentUser?.id) {
      console.warn("No current user, cannot recover connection");
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
      console.error("Failed to recover connection:", error);
      setConnectionError(
        "Échec de la reconnexion. Veuillez rafraîchir la page."
      );
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent"></div>
          <span className="ml-4 text-lg text-ink-soft">
            Chargement du tableau de bord...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-paper">
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
          <div className="mb-6 p-4 bg-warn/10 border border-warn/30 text-warn rounded-card flex items-center justify-between">
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
                className={`flex items-center px-3 py-1 rounded-pill text-sm ${
                  connectionStatus.isOnline && connectionStatus.isInitialized
                    ? "bg-ok/10 text-ok"
                    : "bg-danger/10 text-danger"
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
                className="px-3 py-1 bg-accent text-paper rounded-pill hover:bg-accent/90 text-sm transition-colors"
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
                ? "bg-ok/10 border border-ok/30 text-ok"
                : "bg-danger/10 border border-danger/30 text-danger"
            } rounded-card flex items-center justify-between`}
          >
            <p>{migrationResult}</p>
            <button
              onClick={() => setMigrationResult(null)}
              className="text-muted hover:text-ink-soft"
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

        {/* Group Therapy Sessions Section */}
        {loadingGroupTherapy ? (
          <div className="bg-card border border-line rounded-block shadow-soft p-6 mb-8">
            <div className="flex items-center justify-center py-8">
              <LoadingSpinner size="md" />
              <span className="ml-3 text-ink-soft">
                Chargement des thérapies...
              </span>
            </div>
          </div>
        ) : groupTherapySessions.length > 0 ? (
          <div className="bg-card border border-line rounded-block shadow-soft p-6 mb-8">
            <h2 className="text-xl font-display font-bold text-ink mb-6 flex items-center gap-2">
              <Users2 className="h-6 w-6 text-gold" />
              Mes thérapies de groupe
            </h2>
            <div className="space-y-4">
              {groupTherapySessions.map((session) => {
                const formattedDate = session.date
                  ? format(
                      new Date(session.date + "T00:00:00"),
                      "EEEE d MMMM yyyy",
                      { locale: fr }
                    )
                  : "";
                const isFree = session.price === 0;
                const registrationsCount = session.registrationsCount ?? 0;

                return (
                  <div
                    key={session.id}
                    className="border border-line rounded-card p-4 hover:shadow-soft transition-shadow"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-ink mb-2">
                          {session.title}
                        </h3>
                        <p className="text-sm text-ink-soft mb-3">
                          {session.description}
                        </p>
                        <div className="flex flex-wrap items-center gap-4 text-sm text-ink-soft">
                          {session.date && (
                            <div className="flex items-center">
                              <Calendar className="h-4 w-4 mr-2" />
                              <span>{formattedDate}</span>
                            </div>
                          )}
                          {session.time && (
                            <div className="flex items-center">
                              <Clock className="h-4 w-4 mr-2" />
                              <span>{session.time}</span>
                            </div>
                          )}
                          <div className="flex items-center">
                            <Users2 className="h-4 w-4 mr-2" />
                            <span>
                              {registrationsCount}/{session.capacity}{" "}
                              participants
                            </span>
                          </div>
                          <div>
                            {isFree ? (
                              <span className="text-ok font-medium">
                                Gratuit
                              </span>
                            ) : (
                              <span className="text-accent font-medium">
                                {session.price} FCFA
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="ml-4">
                        {/* Les professionnels hôtes peuvent démarrer la réunion */}
                        {meetingInfoMap[session.id]?.meetingStatus ===
                        "open" ? (
                          <button
                            onClick={async () => {
                              try {
                                const meetingLink =
                                  meetingInfoMap[session.id]?.meetingLink;
                                // Accéder directement à la réunion Jitsi
                                if (meetingLink) {
                                  window.open(meetingLink, "_blank");
                                }
                              } catch (error) {
                                console.error(
                                  "Error accessing meeting:",
                                  error
                                );
                                alert(
                                  "Erreur lors de l'accès à la réunion. Veuillez réessayer."
                                );
                              }
                            }}
                            className="inline-flex items-center px-4 py-2 bg-gold text-paper rounded-pill font-medium hover:bg-gold/90 transition-all shadow-soft"
                          >
                            <Video className="h-4 w-4 mr-2" />
                            Rejoindre
                          </button>
                        ) : (
                          <button
                            onClick={async () => {
                              if (!currentUser?.id) return;
                              try {
                                // Démarrer la réunion et récupérer le meetingLink directement
                                const meetingLink =
                                  await openGroupTherapyMeeting(
                                    session.id,
                                    currentUser.id
                                  );
                                // Mettre à jour l'état local
                                setMeetingInfoMap((prev) => ({
                                  ...prev,
                                  [session.id]: {
                                    meetingLink,
                                    meetingStatus: "open",
                                  },
                                }));
                                // Ouvrir directement la réunion Jitsi
                                if (meetingLink) {
                                  window.open(meetingLink, "_blank");
                                }
                              } catch (error) {
                                console.error("Error starting meeting:", error);
                                const errorMessage =
                                  error instanceof Error
                                    ? error.message
                                    : "Erreur lors du démarrage de la réunion. Veuillez réessayer.";
                                alert(errorMessage);
                              }
                            }}
                            className="inline-flex items-center px-4 py-2 bg-sage text-paper rounded-pill font-medium hover:bg-sage/90 transition-all shadow-soft"
                          >
                            <Video className="h-4 w-4 mr-2" />
                            Démarrer la réunion
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}

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
          <div className="fixed inset-0 bg-ink/50 flex items-center justify-center z-50 p-4">
            <div className="bg-card rounded-block shadow-lift max-w-md w-full p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-display font-bold text-ink">
                  Retrait de fonds
                </h2>
                <button
                  onClick={() => setShowWithdrawalModal(false)}
                  className="p-2 hover:bg-paper rounded-card transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <form onSubmit={handleWithdrawal} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-ink-soft mb-2">
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
                    className="w-full px-4 py-2 border border-line rounded-card focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent"
                    placeholder="Montant à retirer"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-ink-soft mb-2">
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
                    className="w-full px-4 py-2 border border-line rounded-card focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent"
                  >
                    <option value="wave">Wave</option>
                    <option value="orange-money">Orange Money</option>
                    <option value="bank-transfer">Virement bancaire</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-ink-soft mb-2">
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
                    className="w-full px-4 py-2 border border-line rounded-card focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent"
                    placeholder="Numéro de compte"
                    required
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowWithdrawalModal(false)}
                    className="flex-1 px-4 py-2 border border-line text-ink-soft rounded-pill hover:bg-paper transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="flex-1 px-4 py-2 bg-accent text-paper rounded-pill hover:bg-accent/90 transition-colors disabled:opacity-50"
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
          <div className="fixed inset-0 bg-ink/50 flex items-center justify-center z-50">
            <div className="bg-card rounded-block shadow-lift w-full max-w-4xl max-h-[90vh] flex flex-col">
              <div className="p-6 border-b border-line flex justify-between items-center flex-shrink-0">
                <h2 className="text-xl font-display font-bold text-ink">
                  Support et assistance
                </h2>
                <button
                  onClick={() => setShowSupport(false)}
                  className="text-muted hover:text-ink-soft"
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
          <div className="fixed inset-0 bg-ink/50 flex items-center justify-center z-50">
            <div className="bg-card rounded-block shadow-lift p-6 w-full max-w-md mx-4">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-ink">
                  Confirmer l'annulation
                </h3>
                <button
                  onClick={() => setShowCancelModal(false)}
                  className="text-muted hover:text-ink-soft"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="mb-6">
                <p className="text-ink-soft">
                  Êtes-vous sûr de vouloir annuler cette consultation ? Cette
                  action ne peut pas être annulée.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowCancelModal(false)}
                  className="flex-1 px-4 py-2 border border-line text-ink-soft rounded-pill hover:bg-paper transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={() => handleCancelBooking(bookingToCancel!)}
                  disabled={isCancelling}
                  className="flex-1 px-4 py-2 bg-danger text-paper rounded-pill hover:bg-danger/90 transition-colors disabled:opacity-50"
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
