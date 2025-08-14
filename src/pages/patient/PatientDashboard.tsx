import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Calendar,
  Clock,
  Video,
  MessageSquare,
  FileText,
  ChevronRight,
  User,
  PhoneCall,
  Pill,
  AlertCircle,
  X,
  Heart,
  Brain,
  Activity,
  Stethoscope,
  Play,
  XCircle,
  Eye,
  Plus,
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { useBookings } from "../../hooks/useBookings";
import { formatLocalDate } from "../../utils/dateUtils";
import { cancelBooking } from "../../services/bookingService";
import MessagingCenter from "../../components/messaging/MessagingCenter";
import { jsPDF } from "jspdf";
import {
  getPatientMedicalRecords,
  MedicalRecord,
} from "../../services/patientService";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import EthicsReminder from "../../components/dashboard/EthicsReminder";
import UserSupportTickets from "../../components/support/UserSupportTickets";

async function convertImageUrlToBase64(url: string): Promise<string> {
  const response = await fetch(url);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject("Conversion failed");
    };
    reader.readAsDataURL(blob);
  });
}

// Welcome banner component avec design moderne
const WelcomeBanner: React.FC<{ name: string }> = ({ name }) => (
  <div className="bg-gradient-to-br from-blue-600 via-blue-500 to-indigo-600 text-white p-8 rounded-2xl shadow-xl mb-8 relative overflow-hidden">
    <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent"></div>
    <div className="relative z-10">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold flex items-center mb-2">
            Bonjour, {name} 👋
          </h2>
          <p className="text-blue-100 text-lg">
            Voici votre tableau de bord santé personnalisé
          </p>
        </div>
        <div className="hidden lg:block">
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
            <Heart className="h-8 w-8 text-white" />
          </div>
        </div>
      </div>
    </div>
  </div>
);

const PatientDashboard: React.FC = () => {
  const { currentUser } = useAuth();
  const { bookings, loading } = useBookings(currentUser?.id || "", "patient");
  const [activeTab, setActiveTab] = useState<"upcoming" | "past">("upcoming");
  const [showMessaging, setShowMessaging] = useState(true);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [bookingToCancel, setBookingToCancel] = useState<any | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [medicalRecords, setMedicalRecords] = useState<MedicalRecord[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [recordError, setRecordError] = useState<string | null>(null);
  const [showMedicalRecordModal, setShowMedicalRecordModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<MedicalRecord | null>(
    null
  );
  const [showEthicsReminder, setShowEthicsReminder] = useState(true);
  const [showSupport, setShowSupport] = useState(false);

  // Fetch medical records
  useEffect(() => {
    const fetchMedicalRecords = async () => {
      if (!currentUser?.id) {
        console.log(
          "📚 [DASHBOARD DEBUG] No current user, skipping medical records fetch"
        );
        return;
      }

      console.log(
        "📚 [DASHBOARD DEBUG] Fetching medical records for user:",
        currentUser.id
      );
      setLoadingRecords(true);
      setRecordError(null);

      try {
        const records = await getPatientMedicalRecords(currentUser.id);
        console.log(
          "📚 [DASHBOARD DEBUG] Medical records fetched successfully:",
          records.length
        );
        setMedicalRecords(records);
      } catch (error) {
        console.error(
          "📚 [DASHBOARD DEBUG] Error fetching medical records:",
          error
        );
        setRecordError(
          "Impossible de charger vos dossiers médicaux. Vérifiez vos permissions."
        );
      } finally {
        setLoadingRecords(false);
      }
    };

    fetchMedicalRecords();
  }, [currentUser?.id]);

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

  const generatePrescription = async (record: MedicalRecord) => {
    if (!record.treatment || record.treatment.trim() === "") {
      alert("Ce dossier ne contient pas de traitement à prescrire.");
      return;
    }

    const doc = new jsPDF();

    // Add header with logo
    doc.setFontSize(22);
    doc.setTextColor(0, 102, 204);
    doc.text("ORDONNANCE MÉDICALE", 105, 20, { align: "center" });
    doc.setTextColor(0, 0, 0);

    // Add professional info
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(`Dr. ${record.professionalName || "Professionnel"}`, 20, 40);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.text(`Professionnel de santé`, 20, 47);

    // Add line separator
    doc.setDrawColor(0, 102, 204);
    doc.setLineWidth(0.5);
    doc.line(20, 55, 190, 55);

    // Calculate patient age if possible
    let patientAge = "";
    if (currentUser?.dateOfBirth) {
      const birthDate = new Date(currentUser.dateOfBirth);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (
        monthDiff < 0 ||
        (monthDiff === 0 && today.getDate() < birthDate.getDate())
      ) {
        age--;
      }
      patientAge = `(Âge : ${age} ans)`;
    }

    // Add patient info on a single line with age
    doc.setFontSize(11);
    doc.text(
      `Patient : ${currentUser?.name || "Patient"} ${patientAge}`,
      20,
      65
    );

    // Format date
    const consultationDate = new Date(record.consultationDate);
    const formattedDate = consultationDate.toLocaleDateString();
    doc.text(`Date : ${formattedDate}`, 20, 72);

    // Add Rx symbol
    doc.setFont("zapfdingbats", "normal");
    doc.setFontSize(14);
    doc.text("R", 20, 85);

    // Add prescription content
    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);

    // Split treatment into lines
    const treatmentLines = doc.splitTextToSize(record.treatment, 160);
    let yPos = 90;

    treatmentLines.forEach((line) => {
      doc.text(line, 25, yPos);
      yPos += 7;
    });

    // Add line separator
    doc.setDrawColor(0, 102, 204);
    doc.setLineWidth(0.5);
    doc.line(20, yPos + 10, 190, yPos + 10);

    // Add signature area
    doc.setFontSize(11);
    doc.text("Signature et cachet:", 130, yPos + 25);

    // Add signature and stamp if available
    try {
      if (
        record.useElectronicSignature &&
        (record.signatureUrl || record.stampUrl)
      ) {
        // Ajouter le cachet (si disponible)
        if (record.stampUrl) {
          const stampBase64 = await convertImageUrlToBase64(record.stampUrl);
          doc.addImage(stampBase64, "PNG", 140, yPos + 30, 40, 40);
        }

        // Ajouter la signature (si disponible)
        if (record.signatureUrl) {
          const signatureBase64 = await convertImageUrlToBase64(
            record.signatureUrl
          );
          doc.addImage(signatureBase64, "PNG", 140, yPos + 75, 50, 20);
        }

        // Mention légale
        doc.setFontSize(8);
        doc.text(
          "Document signé électroniquement conformément à la réglementation en vigueur.",
          20,
          yPos + 100
        );
      }
    } catch (error) {
      console.error("Erreur ajout signature/cachet PDF (patient) :", error);
      doc.setFontSize(9);
      doc.text("Signature électronique non disponible", 130, yPos + 35);
    }

    // Add footer
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text("Health-e - Plateforme de téléconsultation", 105, 280, {
      align: "center",
    });

    // Save the PDF
    const dateStr = new Date().toISOString().split("T")[0];
    doc.save(
      `ordonnance-${currentUser?.name.replace(" ", "_")}-${dateStr}.pdf`
    );
  };

  const generateRecommendations = (record: MedicalRecord) => {
    const doc = new jsPDF();

    // Add header
    doc.setFontSize(20);
    doc.text("Recommandations", 105, 20, { align: "center" });

    // Add professional info
    doc.setFontSize(12);
    doc.text(`Dr. ${record.professionalName}`, 20, 40);
    doc.text(`Professionnel de santé`, 20, 47);

    // Add patient info
    doc.text("Patient:", 20, 70);
    doc.text(currentUser?.name || "", 50, 70);

    // Format date
    const consultationDate = new Date(record.consultationDate);
    const formattedDate = consultationDate.toLocaleDateString();
    doc.text(`Date: ${formattedDate}`, 20, 85);

    // Add recommendations
    doc.setFontSize(14);
    doc.text("Recommandations de suivi", 20, 100);

    doc.setFontSize(12);

    // Split recommendations into lines
    const recommendationsLines = doc.splitTextToSize(
      record.recommendations || "Aucune recommandation spécifique",
      170
    );
    doc.text(recommendationsLines, 20, 120);

    let yPos = 130 + recommendationsLines.length * 7;

    // Add next appointment if available
    if (record.nextAppointmentDate) {
      doc.setFontSize(14);
      doc.text("Prochain rendez-vous", 20, yPos);
      doc.setFontSize(12);
      doc.text(record.nextAppointmentDate, 20, yPos + 10);
    }

    doc.save(
      `recommandations-${currentUser?.name.replace(" ", "_")}-${
        consultationDate.toISOString().split("T")[0]
      }.pdf`
    );
  };

  const handleCancelBooking = async () => {
    if (!bookingToCancel) return;

    setIsCancelling(true);
    try {
      await cancelBooking(bookingToCancel.id);
      setShowCancelModal(false);
      setBookingToCancel(null);
    } catch (error) {
      console.error("Error cancelling booking:", error);
      alert("Erreur lors de l'annulation de la réservation");
    } finally {
      setIsCancelling(false);
    }
  };

  const getConsultationIcon = (type: string) => {
    switch (type) {
      case "video":
        return <Video className="h-5 w-5 text-blue-500" />;
      case "audio":
        return <PhoneCall className="h-5 w-5 text-blue-500" />;
      case "chat":
        return <MessageSquare className="h-5 w-5 text-blue-500" />;
      default:
        return <Video className="h-5 w-5 text-blue-500" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "en_attente":
        return "En attente";
      case "confirmé":
      case "confirmed":
        return "Confirmé";
      case "terminé":
      case "completed":
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
      case "confirmed":
        return "bg-green-100 text-green-800";
      case "terminé":
      case "completed":
        return "bg-blue-100 text-blue-800";
      case "annulé":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "Non disponible";

    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("fr-FR", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch (error) {
      return dateString;
    }
  };

  // Debug: Afficher tous les bookings reçus
  console.log("🔍 [DASHBOARD DEBUG] All bookings received:", bookings.length);
  bookings.forEach((booking, index) => {
    console.log(`  Dashboard Booking ${index + 1}:`, {
      id: booking.id,
      status: booking.status,
      patientId: booking.patientId,
      professionalId: booking.professionalId,
      date: booking.date,
      type: booking.type,
    });
  });

  const upcomingBookings = bookings.filter(
    (booking) =>
      booking.status === "en_attente" ||
      booking.status === "confirmé" ||
      booking.status === "confirmed"
  );
  const pastBookings = bookings.filter(
    (booking) =>
      booking.status === "terminé" ||
      booking.status === "completed" ||
      booking.status === "annulé"
  );

  console.log("🔍 [DASHBOARD DEBUG] Filtered bookings:", {
    upcoming: upcomingBookings.length,
    past: pastBookings.length,
    activeTab,
  });

  const displayedBookings =
    activeTab === "upcoming" ? upcomingBookings : pastBookings;

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {showEthicsReminder && (
        <EthicsReminder userType="patient" onDismiss={dismissEthicsReminder} />
      )}

      {/* Welcome Banner */}
      <WelcomeBanner name={currentUser?.name?.split(" ")[0] || "Patient"} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main content */}
        <div className="lg:col-span-2">
          {/* Upcoming Appointments Section */}
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
                  <Play className="h-4 w-4 mr-2" />À venir (
                  {upcomingBookings.length})
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
                              {booking.professionalName}
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
                            {booking.date} à {booking.startTime}
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
                              booking.status
                            )}`}
                          >
                            {getStatusLabel(booking.status)}
                          </span>
                        </div>
                      </div>

                      {booking.status === "en_attente" ||
                      booking.status === "confirmé" ||
                      booking.status === "confirmed" ? (
                        <div className="flex justify-between items-center">
                          <button
                            onClick={() => {
                              setBookingToCancel(booking);
                              setShowCancelModal(true);
                            }}
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
                      ) : booking.status === "terminé" ||
                        booking.status === "completed" ? (
                        <div className="mt-4 pt-4 border-t border-gray-100">
                          <div className="flex justify-between items-center">
                            <h4 className="text-sm font-semibold text-gray-700 flex items-center">
                              <FileText className="h-4 w-4 mr-1" />
                              Dossier médical:
                            </h4>
                            <button
                              onClick={() => {
                                // Find the medical record for this booking
                                const record = medicalRecords.find(
                                  (r) => r.consultationId === booking.id
                                );
                                if (record) {
                                  setSelectedRecord(record);
                                  setShowMedicalRecordModal(true);
                                } else {
                                  alert(
                                    "Dossier médical non disponible pour cette consultation"
                                  );
                                }
                              }}
                              className="text-blue-500 hover:text-blue-600 text-sm flex items-center font-medium"
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              Voir le dossier
                            </button>
                          </div>
                        </div>
                      ) : null}
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

          {/* Medical Records Section */}
          <div className="mt-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                <FileText className="h-6 w-6 mr-3 text-green-600" />
                Mes dossiers médicaux
              </h2>
            </div>

            {loadingRecords ? (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 flex justify-center">
                <LoadingSpinner size="lg" />
              </div>
            ) : recordError ? (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center text-red-500 mb-4">
                  <AlertCircle className="h-5 w-5 mr-2" />
                  <p>{recordError}</p>
                </div>
                <button
                  onClick={() => window.location.reload()}
                  className="text-blue-500 hover:text-blue-600 font-medium"
                >
                  Réessayer
                </button>
              </div>
            ) : medicalRecords.length > 0 ? (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="divide-y divide-gray-100">
                  {medicalRecords.slice(0, 3).map((record) => (
                    <div
                      key={record.id}
                      className="p-6 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center mr-4 shadow-md">
                            <Stethoscope className="h-5 w-5 text-white" />
                          </div>
                          <div>
                            <div className="flex items-center mb-1">
                              <Calendar className="h-4 w-4 text-gray-500 mr-2" />
                              <span className="text-sm font-semibold text-gray-900">
                                {formatLocalDate(
                                  new Date(record.consultationDate)
                                )}
                              </span>
                              <span className="ml-3 px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded-full font-medium">
                                {record.consultationType || "Vidéo"}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600">
                              Dr. {record.professionalName}
                            </p>
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          {record.treatment && (
                            <button
                              onClick={() => generatePrescription(record)}
                              className="text-green-600 hover:text-green-700 text-sm flex items-center font-medium bg-green-50 hover:bg-green-100 px-3 py-1.5 rounded-lg transition-colors"
                            >
                              <Pill className="h-4 w-4 mr-1" />
                              <span className="hidden sm:inline">
                                Ordonnance
                              </span>
                            </button>
                          )}
                          <button
                            onClick={() => {
                              setSelectedRecord(record);
                              setShowMedicalRecordModal(true);
                            }}
                            className="text-blue-600 hover:text-blue-700 text-sm flex items-center font-medium bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors"
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            <span className="hidden sm:inline">Détails</span>
                          </button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <p className="text-gray-700 text-sm">
                          <span className="font-semibold">Diagnostic:</span>{" "}
                          {record.diagnosis || "Non spécifié"}
                        </p>
                        {record.treatment && (
                          <p className="text-gray-700 text-sm">
                            <span className="font-semibold">Traitement:</span>{" "}
                            {record.treatment}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {medicalRecords.length > 3 && (
                  <div className="p-6 bg-gray-50 border-t border-gray-100 text-center">
                    <button
                      onClick={() => {
                        // Show all records in modal
                        setShowMedicalRecordModal(true);
                        setSelectedRecord(null);
                      }}
                      className="text-blue-500 hover:text-blue-600 text-sm font-semibold flex items-center justify-center mx-auto"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Voir tous les dossiers ({medicalRecords.length})
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FileText className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Aucun dossier médical
                </h3>
                <p className="text-gray-500">
                  Vous n'avez pas encore de dossier médical enregistré.
                </p>
              </div>
            )}
          </div>

          {/* Messaging Center */}
          <div className="mt-8 mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                <MessageSquare className="h-6 w-6 mr-3 text-blue-600" />
                Messages
              </h2>
              <button
                onClick={() => setShowMessaging(!showMessaging)}
                className="text-blue-600 hover:text-blue-700 font-semibold flex items-center transition-colors bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg"
              >
                {showMessaging ? (
                  <>
                    <X className="h-4 w-4 mr-1" />
                    Réduire
                  </>
                ) : (
                  <>
                    <MessageSquare className="h-4 w-4 mr-1" />
                    Voir tous les messages
                  </>
                )}
              </button>
            </div>
            {showMessaging ? (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <MessageSquare className="h-5 w-5 text-blue-600 mr-2" />
                      <span className="font-semibold text-gray-900">Centre de messagerie</span>
                    </div>
                    <div className="flex items-center text-sm text-green-600">
                      <div className="w-2 h-2 bg-green-500 rounded-full mr-1"></div>
                      En ligne
                    </div>
                  </div>
                </div>
                <div className="max-h-96 overflow-y-auto">
                  <MessagingCenter />
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <div className="text-center">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <MessageSquare className="h-8 w-8 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Centre de messagerie</h3>
                  <p className="text-gray-600 mb-4">
                    Gérez vos conversations avec les professionnels de santé
                  </p>
                  <button
                    onClick={() => setShowMessaging(true)}
                    className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-2.5 rounded-xl font-semibold hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-md hover:shadow-lg flex items-center mx-auto"
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Ouvrir la messagerie
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div>
          {/* Quick actions modernisées */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h3 className="font-bold text-xl text-gray-900 mb-6 flex items-center">
              <Activity className="h-6 w-6 mr-3 text-purple-600" />
              Actions rapides
            </h3>
            <div className="space-y-4">
              <Link
                to="/professionals/mental"
                className="block p-4 border border-gray-200 rounded-xl hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 transition-all duration-200 hover:shadow-md group"
              >
                <div className="flex items-center text-gray-800">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center mr-4 shadow-md group-hover:shadow-lg transition-shadow">
                    <Brain className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <span className="font-semibold text-gray-900">
                      Consulter en santé mentale
                    </span>
                    <p className="text-sm text-gray-600 mt-1">
                      Psychologues et psychiatres
                    </p>
                  </div>
                </div>
              </Link>
              <Link
                to="/professionals/sexual"
                className="block p-4 border border-gray-200 rounded-xl hover:bg-gradient-to-r hover:from-teal-50 hover:to-cyan-50 transition-all duration-200 hover:shadow-md group"
              >
                <div className="flex items-center text-gray-800">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center mr-4 shadow-md group-hover:shadow-lg transition-shadow">
                    <Heart className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <span className="font-semibold text-gray-900">
                      Consulter en santé sexuelle
                    </span>
                    <p className="text-sm text-gray-600 mt-1">
                      Gynécologues et sexologues
                    </p>
                  </div>
                </div>
              </Link>
              
              <button
                onClick={() => setShowSupport(true)}
                className="block w-full p-4 border border-gray-200 rounded-xl hover:bg-gradient-to-r hover:from-orange-50 hover:to-red-50 transition-all duration-200 hover:shadow-md group"
              >
                <div className="flex items-center text-gray-800">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center mr-4 shadow-md group-hover:shadow-lg transition-shadow">
                    <MessageSquare className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <span className="font-semibold text-gray-900">
                      Support et assistance
                    </span>
                    <p className="text-sm text-gray-600 mt-1">
                      Besoin d'aide ? Contactez-nous
                    </p>
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* User profile card modernisée */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mt-6">
            <div className="flex items-center mb-4">
              {currentUser?.profileImage ? (
                <img
                  src={currentUser.profileImage}
                  alt={currentUser.name}
                  className="w-16 h-16 rounded-2xl object-cover mr-4 shadow-md"
                />
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center mr-4 shadow-md">
                  <User className="h-8 w-8 text-white" />
                </div>
              )}
              <div>
                <h2 className="font-bold text-lg text-gray-900">
                  {currentUser?.name}
                </h2>
                <p className="text-gray-600 text-sm">{currentUser?.email}</p>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-100">
              <Link
                to="/patient/profile"
                className="flex items-center justify-between text-blue-600 font-semibold hover:text-blue-700 transition-colors p-3 rounded-lg hover:bg-blue-50"
              >
                <span>Gérer mon profil</span>
                <ChevronRight className="h-5 w-5" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Cancel Booking Modal */}
      {showCancelModal && bookingToCancel && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-semibold mb-4">
              Annuler le rendez-vous
            </h3>
            <p className="text-gray-600 mb-6">
              Êtes-vous sûr de vouloir annuler votre rendez-vous avec{" "}
              {bookingToCancel.professionalName} le {bookingToCancel.date} à{" "}
              {bookingToCancel.startTime} ?
            </p>
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => {
                  setShowCancelModal(false);
                  setBookingToCancel(null);
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Non, garder
              </button>
              <button
                onClick={handleCancelBooking}
                disabled={isCancelling}
                className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCancelling ? "Annulation..." : "Oui, annuler"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Medical Record Modal */}
      {showMedicalRecordModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-hidden">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center flex-shrink-0">
              <h2 className="text-xl font-semibold">
                {selectedRecord
                  ? "Détails du dossier médical"
                  : "Mes dossiers médicaux"}
              </h2>
              <button
                onClick={() => {
                  setShowMedicalRecordModal(false);
                  setSelectedRecord(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {selectedRecord ? (
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-5 w-5 text-gray-500" />
                        <span className="font-medium">
                          {formatDate(selectedRecord.consultationDate)}
                        </span>
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded-full">
                          {selectedRecord.consultationType || "Vidéo"}
                        </span>
                      </div>
                      <p className="text-gray-600 mt-1">
                        Dr. {selectedRecord.professionalName}
                      </p>
                    </div>
                    <div className="flex space-x-2">
                      {selectedRecord.treatment && (
                        <button
                          onClick={() => generatePrescription(selectedRecord)}
                          className="flex items-center text-green-600 hover:text-green-700 bg-green-50 hover:bg-green-100 px-3 py-1.5 rounded text-sm"
                        >
                          <Pill className="h-4 w-4 mr-1" />
                          <span>Ordonnance</span>
                        </button>
                      )}
                      <button
                        onClick={() => generateRecommendations(selectedRecord)}
                        className="flex items-center text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded text-sm"
                      >
                        <FileText className="h-4 w-4 mr-1" />
                        <span>Recommandations</span>
                      </button>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-6 space-y-4">
                    <div>
                      <h4 className="font-medium mb-2">Diagnostic</h4>
                      <p className="text-gray-600">
                        {selectedRecord.diagnosis || "Non spécifié"}
                      </p>
                    </div>

                    {selectedRecord.treatment && (
                      <div>
                        <h4 className="font-medium mb-2 flex items-center">
                          <Pill className="h-4 w-4 mr-1" />
                          Traitement
                        </h4>
                        <p className="text-gray-600">
                          {selectedRecord.treatment}
                        </p>
                      </div>
                    )}

                    {selectedRecord.recommendations && (
                      <div>
                        <h4 className="font-medium mb-2">Recommandations</h4>
                        <p className="text-gray-600">
                          {selectedRecord.recommendations}
                        </p>
                      </div>
                    )}

                    {selectedRecord.nextAppointmentDate && (
                      <div>
                        <h4 className="font-medium mb-2">
                          Prochain rendez-vous
                        </h4>
                        <p className="text-gray-600">
                          {selectedRecord.nextAppointmentDate}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {medicalRecords.length > 0 ? (
                    medicalRecords.map((record) => (
                      <div
                        key={record.id}
                        className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors cursor-pointer"
                        onClick={() => setSelectedRecord(record)}
                      >
                        <div className="flex justify-between items-center mb-2">
                          <div className="flex items-center space-x-2">
                            <Calendar className="h-4 w-4 text-gray-500" />
                            <span className="font-medium">
                              {formatDate(record.consultationDate)}
                            </span>
                            <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded-full">
                              {record.consultationType || "Vidéo"}
                            </span>
                          </div>
                          <ChevronRight className="h-5 w-5 text-gray-400" />
                        </div>
                        <p className="text-gray-600 text-sm">
                          Dr. {record.professionalName}
                        </p>
                        <p className="text-gray-600 text-sm mt-2 line-clamp-1">
                          <span className="font-medium">Diagnostic:</span>{" "}
                          {record.diagnosis || "Non spécifié"}
                        </p>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">
                        Aucun dossier médical
                      </h3>
                      <p className="text-gray-500">
                        Vous n'avez pas encore de dossier médical enregistré.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
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
    </div>
  );
};

export default PatientDashboard;
