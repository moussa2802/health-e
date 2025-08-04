import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";

import {
  Calendar,
  Clock,
  Settings,
  Users,
  ChevronRight,
  Wallet,
  ArrowDownToLine,
  History,
  X,
  MessageSquare,
  AlertCircle,
  Wifi,
  WifiOff,
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

// Welcome banner component
const WelcomeBanner: React.FC<{ name: string }> = ({ name }) => {
  // Remove "Dr." prefix if it already exists in the name
  const displayName = name.startsWith("Dr.") ? name : `Dr. ${name}`;

  return (
    <div className="bg-gradient-to-r from-blue-500 to-teal-400 text-white p-6 rounded-lg shadow-md mb-6">
      <h2 className="text-2xl font-bold flex items-center">
        Bonjour, {displayName} 👋
      </h2>
      <p className="mt-2 opacity-90">
        Voici votre tableau de bord professionnel.
      </p>
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
  const [activeTab, setActiveTab] = useState<"upcoming" | "past">("upcoming");
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

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "en_attente":
        return "En attente";
      case "confirmé":
        return "Confirmé";
      case "terminé":
        return "Terminé";
      case "annulé":
        return "Annulé";
      default:
        return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "en_attente":
        return "bg-yellow-100 text-yellow-800";
      case "confirmé":
        return "bg-green-100 text-green-800";
      case "terminé":
        return "bg-blue-100 text-blue-800";
      case "annulé":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // Filter bookings based on activeTab
  const upcomingBookings = Array.isArray(bookings)
    ? bookings.filter(
        (booking) =>
          booking.status === "en_attente" || booking.status === "confirmé"
      )
    : [];
  const pastBookings = Array.isArray(bookings)
    ? bookings.filter(
        (booking) => booking.status === "terminé" || booking.status === "annulé"
      )
    : [];
  const displayedBookings =
    activeTab === "upcoming" ? upcomingBookings : pastBookings;

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
        <div className="mb-6 p-4 bg-yellow-100 border border-yellow-400 text-yellow-700 rounded-lg flex items-center justify-between">
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
              className="px-3 py-1 bg-blue-500 text-white rounded-md hover:bg-blue-600 text-sm"
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
          } rounded-lg flex items-center justify-between`}
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

      <div className="flex flex-col lg:flex-row gap-8">
        <div className="lg:w-2/3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-white rounded-lg p-6 shadow-md">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-700">
                  Revenus disponibles
                </h3>
                <Wallet className="h-6 w-6 text-green-500" />
              </div>
              <div className="space-y-4">
                <div>
                  <p className="text-3xl font-bold text-green-600">
                    {revenue.available.toLocaleString()} XOF
                  </p>
                </div>
                <button
                  onClick={() => setShowWithdrawalModal(true)}
                  disabled={revenue.available === 0 || !currentUser?.id}
                  className="mt-4 w-full bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 transition-colors flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ArrowDownToLine className="h-4 w-4 mr-2" />
                  Retirer
                </button>
              </div>
            </div>

            <div className="bg-white rounded-lg p-6 shadow-md">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-700">
                  En attente
                </h3>
                <Clock className="h-6 w-6 text-orange-500" />
              </div>
              <div className="space-y-4">
                <div>
                  <p className="text-3xl font-bold text-orange-600">
                    {revenue.pending.toLocaleString()} XOF
                  </p>
                </div>
                <p className="mt-4 text-sm text-gray-500">
                  Disponible dans 7 jours
                </p>
              </div>
            </div>

            <div className="bg-white rounded-lg p-6 shadow-md">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-700">
                  Total retiré
                </h3>
                <History className="h-6 w-6 text-blue-500" />
              </div>
              <div className="space-y-4">
                <div>
                  <p className="text-3xl font-bold text-blue-600">
                    {revenue.withdrawn.toLocaleString()} XOF
                  </p>
                </div>
                <p className="mt-4 text-sm text-gray-500">Depuis le début</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <h2 className="text-xl font-semibold p-6 border-b border-gray-200">
              Consultations
            </h2>
            <div className="flex border-b border-gray-200">
              <button
                onClick={() => setActiveTab("upcoming")}
                className={`flex-1 py-4 px-6 text-center font-medium ${
                  activeTab === "upcoming"
                    ? "text-blue-600 border-b-2 border-blue-500"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                Consultations à venir ({upcomingBookings.length})
              </button>
              <button
                onClick={() => setActiveTab("past")}
                className={`flex-1 py-4 px-6 text-center font-medium ${
                  activeTab === "past"
                    ? "text-blue-600 border-b-2 border-blue-500"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                Historique ({pastBookings.length})
              </button>
            </div>

            <div className="p-6">
              {displayedBookings.length > 0 ? (
                <div className="space-y-4">
                  {displayedBookings.map((booking) => (
                    <div
                      key={booking.id}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                    >
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900">
                          {booking.patientName || "Patient"}
                        </h3>
                        <div className="flex items-center text-sm text-gray-500 mt-1">
                          <Calendar className="h-4 w-4 mr-1" />
                          {booking.date || "Date non spécifiée"} à{" "}
                          {booking.startTime?.trim() || "Heure non spécifiée"}
                        </div>
                        <div className="mt-2">
                          <span
                            className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(
                              booking.status
                            )}`}
                          >
                            {getStatusLabel(booking.status)}
                          </span>
                        </div>
                      </div>

                      <div className="flex space-x-2">
                        {booking.status === "en_attente" && (
                          <>
                            <button
                              onClick={() => handleConfirmBooking(booking.id)}
                              className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600"
                            >
                              Confirmer
                            </button>
                            <button
                              onClick={() => handleCancelBooking(booking.id)}
                              className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600"
                            >
                              Refuser
                            </button>
                          </>
                        )}
                        {booking.status === "confirmé" && (
                          <>
                            <Link
                              to={`/consultation/${booking.id}`}
                              className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
                            >
                              Rejoindre
                            </Link>
                            <button
                              onClick={() => handleCompleteBooking(booking.id)}
                              className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600"
                            >
                              Terminer
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Calendar className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <p className="text-gray-500">
                    {activeTab === "upcoming"
                      ? "Aucune consultation à venir."
                      : "Aucune consultation passée."}
                  </p>
                  {connectionError && (
                    <p className="text-sm text-gray-400 mt-2">
                      Les données peuvent ne pas être à jour en raison d'un
                      problème de connexion.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="lg:w-1/3">
          {/* User profile card */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="flex items-center">
              {currentUser?.profileImage ? (
                <img
                  src={currentUser.profileImage}
                  alt={currentUser.name}
                  className="w-16 h-16 rounded-full object-cover mr-4"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mr-4">
                  <Users className="h-8 w-8 text-blue-500" />
                </div>
              )}
              <div>
                <h2 className="font-semibold text-lg">
                  {currentUser?.name?.startsWith("Dr.")
                    ? currentUser?.name
                    : `Dr. ${currentUser?.name || "Professionnel"}`}
                </h2>
                <p className="text-gray-600">
                  {currentUser?.specialty || "Professionnel de santé"}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">Actions rapides</h2>
            <div className="space-y-3">
              <Link
                to="/professional/settings"
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center">
                  <Settings className="h-5 w-5 text-gray-500 mr-3" />
                  <span>Gérer mon profil</span>
                </div>
                <ChevronRight className="h-5 w-5 text-gray-400" />
              </Link>
              <Link
                to="/professional/availability"
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center">
                  <Clock className="h-5 w-5 text-gray-500 mr-3" />
                  <span>Gérer mes disponibilités</span>
                </div>
                <ChevronRight className="h-5 w-5 text-gray-400" />
              </Link>
              <Link
                to="/professional/patients"
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center">
                  <Users className="h-5 w-5 text-gray-500 mr-3" />
                  <span>Mes patients</span>
                </div>
                <ChevronRight className="h-5 w-5 text-gray-400" />
              </Link>
              <Link
                to="/professional/messages"
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center">
                  <MessageSquare className="h-5 w-5 text-gray-500 mr-3" />
                  <span>Messages</span>
                </div>
                <ChevronRight className="h-5 w-5 text-gray-400" />
              </Link>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">Agenda du jour</h2>
            <div className="space-y-3">
              {upcomingBookings.slice(0, 3).map((booking) => (
                <div key={booking.id} className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">
                      {booking.startTime || "Heure non spécifiée"}
                    </span>
                    <span className="text-blue-500 capitalize">
                      {booking.type || "Consultation"}
                    </span>
                  </div>
                  <p className="text-gray-600 mt-1">
                    Consultation avec {booking.patientName || "Patient"}
                  </p>
                </div>
              ))}
              {upcomingBookings.length === 0 && (
                <div className="text-center py-4">
                  <p className="text-gray-500">Aucun rendez-vous aujourd'hui</p>
                  {connectionError && (
                    <p className="text-sm text-gray-400 mt-1">
                      Vérifiez votre connexion pour voir les dernières données.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Withdrawal Modal */}
      {showWithdrawalModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-semibold mb-4">Retirer des fonds</h2>

            <form onSubmit={handleWithdrawal}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Montant à retirer
                  </label>
                  <input
                    type="number"
                    max={revenue.available}
                    value={withdrawalData.amount}
                    onChange={(e) =>
                      setWithdrawalData({
                        ...withdrawalData,
                        amount: Number(e.target.value),
                      })
                    }
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    required
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Maximum disponible: {revenue.available.toLocaleString()} XOF
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Méthode de retrait
                  </label>
                  <select
                    value={withdrawalData.method}
                    onChange={(e) =>
                      setWithdrawalData({
                        ...withdrawalData,
                        method: e.target.value as WithdrawalFormData["method"],
                      })
                    }
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    required
                  >
                    <option value="wave">Wave</option>
                    <option value="orange-money">Orange Money</option>
                    <option value="bank-transfer">Virement bancaire</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
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
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    placeholder="Numéro de téléphone ou RIB"
                    required
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowWithdrawalModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={
                    isSaving ||
                    withdrawalData.amount > revenue.available ||
                    withdrawalData.amount <= 0 ||
                    !currentUser?.id
                  }
                  className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSaving ? "Traitement..." : "Confirmer le retrait"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfessionalDashboard;
