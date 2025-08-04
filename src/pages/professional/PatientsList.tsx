import React, { useState, useEffect } from "react";
import {
  Search,
  FileText,
  MessageSquare,
  Calendar,
  Download,
  Send,
  X,
  User,
  Pill,
  RefreshCw,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import { jsPDF } from "jspdf";
import { useAuth } from "../../contexts/AuthContext";
import {
  getMedicalRecordsByProfessional,
  MedicalRecord,
} from "../../services/patientService";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import { getBookings } from "../../services/bookingService";
import {
  getOrCreateConversation,
  sendMessage,
} from "../../services/messageService";
import { getProfessionalProfile } from "../../services/profileService";
import { convertImageUrlToBase64 } from "../../utils/pdfUtils";

interface Patient {
  id: string;
  name: string;
  profileImage?: string;
  lastConsultation?: string;
  consultationsCount: number;
  nextAppointment?: string;
  medicalRecords?: MedicalRecord[];
  messages: {
    id: string;
    text: string;
    timestamp: Date;
    sender: "professional" | "patient";
  }[];
}

interface ProfessionalProfile {
  id: string;
  name: string;
  email: string;
  serviceType?: "mental" | "sexual";
  specialty?: string;
  useElectronicSignature?: boolean;
  signatureUrl?: string | null;
  stampUrl?: string | null;
}

const PatientsList: React.FC = () => {
  const { currentUser } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [showMedicalHistory, setShowMedicalHistory] = useState(false);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [messageType, setMessageType] = useState<"text" | "reminder">("text");
  const [reminderDate, setReminderDate] = useState("");
  const [reminderTime, setReminderTime] = useState("");
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [messageError, setMessageError] = useState<string | null>(null);
  const [messageSent, setMessageSent] = useState(false);
  const [professionalProfile, setProfessionalProfile] =
    useState<ProfessionalProfile | null>(null);

  // Fetch professional profile to check if electronic signature is enabled
  useEffect(() => {
    const fetchProfessionalProfile = async () => {
      if (!currentUser?.id) return;

      try {
        const profile = await getProfessionalProfile(currentUser.id);
        setProfessionalProfile(profile);
      } catch (error) {
        console.error("Error fetching professional profile:", error);
      }
    };

    fetchProfessionalProfile();
  }, [currentUser?.id]);

  // Fetch patients data and medical records
  useEffect(() => {
    const fetchData = async () => {
      if (!currentUser?.id) return;

      try {
        setLoading(true);
        setError(null);

        console.log(
          "👥 [PATIENTS LIST DEBUG] Starting data fetch for professional:",
          currentUser.id
        );
        console.log(
          "👥 [PATIENTS LIST DEBUG] Current user type:",
          currentUser.type
        );

        // Fetch all medical records for this professional
        console.log("👥 [PATIENTS LIST DEBUG] Fetching medical records...");
        const records = await getMedicalRecordsByProfessional(currentUser.id);
        console.log(
          "👥 [PATIENTS LIST DEBUG] Medical records fetched successfully:",
          records.length
        );

        // Only show patients who have medical records
        if (records.length === 0) {
          console.log(
            "👥 [PATIENTS LIST DEBUG] No medical records found, showing empty list"
          );
          setPatients([]);
          return;
        }

        // Create patient objects ONLY from medical records
        const patientMap = new Map<string, Patient>();

        // Create patients ONLY from medical records (no other source)
        records.forEach((record) => {
          console.log(
            "👥 [PATIENTS LIST DEBUG] Processing medical record for patient:",
            record.patientId
          );

          if (!patientMap.has(record.patientId)) {
            // Create new patient entry
            patientMap.set(record.patientId, {
              id: record.patientId,
              name: record.patientName || "Patient", // Use name from medical record
              profileImage: undefined,
              consultationsCount: 1, // Start with 1 since we have at least one medical record
              messages: [],
              medicalRecords: [record],
              lastConsultation: record.consultationDate,
            });
            console.log(
              "👥 [PATIENTS LIST DEBUG] Created new patient entry for:",
              record.patientId
            );
          } else {
            // Add medical record to existing patient
            const patient = patientMap.get(record.patientId)!;
            patient.medicalRecords!.push(record);
            patient.consultationsCount += 1; // Increment for each medical record

            // Update last consultation if this one is more recent
            if (
              !patient.lastConsultation ||
              record.consultationDate > patient.lastConsultation
            ) {
              patient.lastConsultation = record.consultationDate;
            }
          }
        });

        console.log(
          "👥 [PATIENTS LIST DEBUG] Patients from medical records:",
          patientMap.size
        );

        // Optionally enrich with booking data for future appointments only
        const bookingsData = await getBookings();
        console.log(
          "👥 [PATIENTS LIST DEBUG] Bookings fetched for enrichment:",
          bookingsData.length
        );

        bookingsData.forEach((booking) => {
          if (
            booking.professionalId === currentUser.id &&
            patientMap.has(booking.patientId)
          ) {
            console.log(
              "👥 [PATIENTS LIST DEBUG] Enriching patient data from booking:",
              booking.patientId,
              booking.patientName
            );
            const patient = patientMap.get(booking.patientId)!;

            // Update patient name if we have it from booking and it's better than default
            if (
              booking.patientName &&
              (patient.name === "Patient" || !patient.name)
            ) {
              patient.name = booking.patientName;
            }

            // Only add next appointment if this is in the future and status is confirmed
            const bookingDate = new Date(booking.date);
            if (booking.status === "confirmé" && bookingDate > new Date()) {
              patient.nextAppointment = `${booking.date} à ${booking.startTime}`;
            }
          }
        });

        // Convert map to array
        const patientList = Array.from(patientMap.values());
        console.log(
          "👥 [PATIENTS LIST DEBUG] Final patient list:",
          patientList.length,
          "patients with medical records"
        );

        // Final verification: only keep patients with actual medical records
        const verifiedPatients = patientList.filter(
          (patient) =>
            patient.medicalRecords && patient.medicalRecords.length > 0
        );

        console.log(
          "👥 [PATIENTS LIST DEBUG] Verified patients with medical records:",
          verifiedPatients.length
        );

        setPatients(verifiedPatients);
      } catch (err) {
        console.error("❌ [PATIENTS LIST DEBUG] Error fetching data:", err);
        console.error("❌ [PATIENTS LIST DEBUG] Error details:", {
          code: err instanceof Error ? err.message : "Unknown error",
          message: err instanceof Error ? err.message : "Unknown error",
          currentUserId: currentUser?.id,
        });
        setError("Erreur lors du chargement des données. Veuillez réessayer.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [currentUser?.id]);

  const handleRefresh = async () => {
    if (!currentUser?.id) return;

    setRefreshing(true);
    try {
      // Refresh medical records
      const records = await getMedicalRecordsByProfessional(currentUser.id);

      // Update selected patient if needed
      if (selectedPatient) {
        const patientRecords = records.filter(
          (r) => r.patientId === selectedPatient.id
        );
        setSelectedPatient({
          ...selectedPatient,
          medicalRecords: patientRecords,
        });
      }
    } catch (error) {
      console.error("Error refreshing data:", error);
    } finally {
      setRefreshing(false);
    }
  };

  const generateMedicalReport = (patient: Patient) => {
    const doc = new jsPDF();

    // Add header
    doc.setFontSize(20);
    doc.text("Dossier Médical", 105, 20, { align: "center" });

    // Add patient info
    doc.setFontSize(14);
    doc.text(`Patient: ${patient.name}`, 20, 40);
    doc.text(`Nombre de consultations: ${patient.consultationsCount}`, 20, 50);
    doc.text(
      `Dernière consultation: ${patient.lastConsultation || "Non disponible"}`,
      20,
      60
    );

    // Add medical history
    doc.setFontSize(16);
    doc.text("Historique des consultations", 20, 80);

    let yPos = 100;

    if (patient.medicalRecords && patient.medicalRecords.length > 0) {
      patient.medicalRecords.forEach((record) => {
        // Format date
        const consultationDate = new Date(record.consultationDate);
        const formattedDate = consultationDate.toLocaleDateString();

        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text(`Date: ${formattedDate}`, 20, yPos);
        doc.setFont("helvetica", "normal");
        doc.text(`Type: ${record.consultationType || "Vidéo"}`, 20, yPos + 10);

        doc.text("Diagnostic:", 20, yPos + 20);
        // Split long text into multiple lines
        const splitDiagnosis = doc.splitTextToSize(
          record.diagnosis || "Non spécifié",
          170
        );
        doc.text(splitDiagnosis, 20, yPos + 30);

        yPos += 40 + splitDiagnosis.length * 7;

        if (record.treatment) {
          doc.text("Traitement:", 20, yPos);
          const splitTreatment = doc.splitTextToSize(record.treatment, 170);
          doc.text(splitTreatment, 20, yPos + 10);
          yPos += 20 + splitTreatment.length * 7;
        }

        if (record.recommendations) {
          doc.text("Recommandations:", 20, yPos);
          const splitRecommendations = doc.splitTextToSize(
            record.recommendations,
            170
          );
          doc.text(splitRecommendations, 20, yPos + 10);
          yPos += 20 + splitRecommendations.length * 7;
        }

        if (record.nextAppointmentDate) {
          doc.text(
            `Prochain rendez-vous: ${record.nextAppointmentDate}`,
            20,
            yPos
          );
          yPos += 10;
        }

        // Add page if needed
        if (yPos > 250) {
          doc.addPage();
          yPos = 20;
        } else {
          // Add separator between records
          doc.setDrawColor(200, 200, 200);
          doc.setLineWidth(0.5);
          doc.line(20, yPos + 10, 190, yPos + 10);
          yPos += 30;
        }
      });
    } else {
      doc.setFontSize(12);
      doc.text("Aucun historique médical disponible", 20, yPos);
    }

    doc.save(`dossier_medical_${patient.name.replace(" ", "_")}.pdf`);
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
    doc.text(`${currentUser?.specialty || "Professionnel de santé"}`, 20, 47);

    // Add line separator
    doc.setDrawColor(0, 102, 204);
    doc.setLineWidth(0.5);
    doc.line(20, 55, 190, 55);

    // Add patient info on a single line
    doc.setFontSize(11);
    doc.text(`Patient : ${selectedPatient?.name || "Patient"}`, 20, 65);

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

    treatmentLines.forEach((line: string) => {
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

    // Add signature and stamp if available and enabled
    if (
      professionalProfile &&
      professionalProfile.useElectronicSignature &&
      (professionalProfile.stampUrl || professionalProfile.signatureUrl)
    ) {
      try {
        const [stampBase64, signatureBase64] = await Promise.all([
          professionalProfile.stampUrl
            ? convertImageUrlToBase64(professionalProfile.stampUrl)
            : null,
          professionalProfile.signatureUrl
            ? convertImageUrlToBase64(professionalProfile.signatureUrl)
            : null,
        ]);

        if (stampBase64) {
          doc.addImage(stampBase64, "PNG", 140, yPos + 30, 40, 40);
        }

        if (signatureBase64) {
          doc.addImage(signatureBase64, "PNG", 140, yPos + 75, 50, 20);
        }

        doc.setFontSize(8);
        doc.text(
          "Document signé électroniquement conformément à la réglementation en vigueur.",
          20,
          yPos + 100
        );
      } catch (error) {
        console.error("Erreur ajout signature/cachet PDF :", error);
        doc.setFontSize(9);
        doc.text("Signature électronique non disponible", 130, yPos + 35);
      }
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
      `ordonnance-${selectedPatient?.name.replace(" ", "_")}-${dateStr}.pdf`
    );
  };

  const handleSendMessage = async () => {
    if (!selectedPatient || !newMessage.trim() || !currentUser) {
      return;
    }

    let messageText = newMessage;
    if (messageType === "reminder") {
      messageText = `Rappel pour votre rendez-vous du ${reminderDate} à ${reminderTime}:\n${newMessage}`;
    }

    setSendingMessage(true);
    setMessageError(null);
    setMessageSent(false);

    try {
      // Create or get conversation
      const conversationId = await getOrCreateConversation(
        currentUser.id,
        currentUser.name || "Professionnel",
        "professional",
        selectedPatient.id,
        selectedPatient.name,
        "patient"
      );

      // Send message
      await sendMessage(
        conversationId,
        currentUser.id,
        currentUser.name || "Professionnel",
        "professional",
        messageText
      );

      // Update local state
      const message = {
        id: Date.now().toString(),
        text: messageText,
        timestamp: new Date(),
        sender: "professional" as const,
      };

      setSelectedPatient({
        ...selectedPatient,
        messages: [...selectedPatient.messages, message],
      });

      // Reset form
      setNewMessage("");
      setMessageType("text");
      setReminderDate("");
      setReminderTime("");
      setMessageSent(true);

      // Close modal after a short delay
      setTimeout(() => {
        setShowMessageModal(false);
        setMessageSent(false);
      }, 2000);
    } catch (error) {
      console.error("Error sending message:", error);
      setMessageError("Erreur lors de l'envoi du message. Veuillez réessayer.");
    } finally {
      setSendingMessage(false);
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
    } catch {
      return dateString;
    }
  };

  const filteredPatients = patients.filter((patient) =>
    patient.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner size="lg" />
          <span className="ml-4 text-lg text-gray-600">
            Chargement des patients...
          </span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
          <strong className="font-bold">Erreur : </strong>
          <span className="block sm:inline">{error}</span>
          <button
            onClick={() => window.location.reload()}
            className="mt-2 bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Mes patients</h1>
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher un patient..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredPatients.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <User className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              Aucun patient trouvé
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm
                ? "Essayez de modifier votre recherche."
                : "Vous n'avez pas encore de patients."}
            </p>
          </div>
        ) : (
          filteredPatients.map((patient) => (
            <div
              key={patient.id}
              className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
            >
              <div className="p-6">
                <div className="flex items-center mb-4">
                  {patient.profileImage ? (
                    <img
                      src={patient.profileImage}
                      alt={patient.name}
                      className="w-12 h-12 rounded-full object-cover mr-4"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center mr-4">
                      <User className="h-6 w-6 text-gray-500" />
                    </div>
                  )}
                  <div>
                    <h3 className="font-semibold text-lg">{patient.name}</h3>
                    <p className="text-gray-500 text-sm">
                      {patient.consultationsCount} consultation
                      {patient.consultationsCount > 1 ? "s" : ""}
                    </p>
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center text-gray-600">
                    <Calendar className="h-4 w-4 mr-2" />
                    <span className="text-sm">
                      Dernière consultation:{" "}
                      {formatDate(patient.lastConsultation || "")}
                    </span>
                  </div>
                  {patient.nextAppointment && (
                    <div className="flex items-center text-blue-600">
                      <Calendar className="h-4 w-4 mr-2" />
                      <span className="text-sm">
                        Prochain RDV: {patient.nextAppointment}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex justify-between items-center">
                  <div className="flex space-x-4">
                    <button
                      onClick={() => {
                        setSelectedPatient(patient);
                        setShowMedicalHistory(true);
                      }}
                      className="text-blue-500 hover:text-blue-600 flex items-center"
                    >
                      <FileText className="h-4 w-4 mr-1" />
                      <span>Dossier</span>
                    </button>
                    <button
                      onClick={() => {
                        setSelectedPatient(patient);
                        setShowMessageModal(true);
                        setNewMessage("");
                        setMessageType("text");
                        setReminderDate("");
                        setReminderTime("");
                        setMessageError(null);
                        setMessageSent(false);
                      }}
                      className="text-green-500 hover:text-green-600 flex items-center"
                    >
                      <MessageSquare className="h-4 w-4 mr-1" />
                      <span>Message</span>
                    </button>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedPatient(patient);
                      setShowMedicalHistory(true);
                      setTimeout(() => {
                        generateMedicalReport(patient);
                      }, 100);
                    }}
                    className="text-gray-500 hover:text-gray-600"
                  >
                    <Download className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Medical History Modal */}
      {showMedicalHistory && selectedPatient && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-hidden">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center flex-shrink-0">
              <div className="flex items-center">
                {selectedPatient.profileImage ? (
                  <img
                    src={selectedPatient.profileImage}
                    alt={selectedPatient.name}
                    className="w-12 h-12 rounded-full object-cover mr-4"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center mr-4">
                    <User className="h-6 w-6 text-gray-500" />
                  </div>
                )}
                <div>
                  <h2 className="text-xl font-semibold">
                    {selectedPatient.name}
                  </h2>
                  <p className="text-gray-500">
                    {selectedPatient.consultationsCount} consultation
                    {selectedPatient.consultationsCount > 1 ? "s" : ""}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <button
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="p-2 text-blue-500 hover:text-blue-600 hover:bg-blue-50 rounded-full"
                >
                  {refreshing ? (
                    <LoadingSpinner size="sm" />
                  ) : (
                    <RefreshCw className="h-5 w-5" />
                  )}
                </button>
                <button
                  onClick={() => setShowMedicalHistory(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-6">
                {selectedPatient.medicalRecords &&
                selectedPatient.medicalRecords.length > 0 ? (
                  selectedPatient.medicalRecords.map((record) => (
                    <div
                      key={record.id}
                      className="bg-gray-50 rounded-lg p-6 space-y-4"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <span className="text-gray-600">
                            {formatDate(record.consultationDate)}
                          </span>
                          <span className="flex items-center text-blue-600 capitalize">
                            {record.consultationType || "vidéo"}
                          </span>
                        </div>
                        <div className="flex space-x-2">
                          {record.treatment && (
                            <button
                              onClick={() => generatePrescription(record)}
                              className="flex items-center text-green-600 hover:text-green-700 bg-green-50 hover:bg-green-100 px-2 py-1 rounded text-sm"
                            >
                              <Pill className="h-4 w-4 mr-1" />
                              <span>Ordonnance</span>
                            </button>
                          )}
                          <button
                            onClick={() => {
                              const doc = new jsPDF();

                              // Add header
                              doc.setFontSize(20);
                              doc.text("Rapport de Consultation", 105, 20, {
                                align: "center",
                              });

                              // Add professional info
                              doc.setFontSize(11);
                              doc.text(
                                `Dr. ${record.professionalName}`,
                                20,
                                40
                              );

                              // Add patient info
                              doc.text(
                                `Patient: ${selectedPatient.name}`,
                                20,
                                60
                              );

                              // Add consultation date
                              const consultationDate = new Date(
                                record.consultationDate
                              );
                              doc.text(
                                `Date: ${consultationDate.toLocaleDateString()}`,
                                20,
                                70
                              );

                              // Add content
                              doc.setFontSize(12);
                              doc.text("Diagnostic:", 20, 90);
                              doc.setFontSize(11);
                              const diagnosisLines = doc.splitTextToSize(
                                record.diagnosis || "Non spécifié",
                                170
                              );
                              doc.text(diagnosisLines, 20, 100);

                              let yPos = 110 + diagnosisLines.length * 7;

                              if (record.treatment) {
                                doc.setFontSize(12);
                                doc.text("Traitement:", 20, yPos);
                                doc.setFontSize(11);
                                const treatmentLines = doc.splitTextToSize(
                                  record.treatment,
                                  170
                                );
                                doc.text(treatmentLines, 20, yPos + 10);
                                yPos += 20 + treatmentLines.length * 7;
                              }

                              if (record.recommendations) {
                                doc.setFontSize(12);
                                doc.text("Recommandations:", 20, yPos);
                                doc.setFontSize(11);
                                const recommendationsLines =
                                  doc.splitTextToSize(
                                    record.recommendations,
                                    170
                                  );
                                doc.text(recommendationsLines, 20, yPos + 10);
                                yPos += 20 + recommendationsLines.length * 7;
                              }

                              if (record.nextAppointmentDate) {
                                doc.setFontSize(12);
                                doc.text("Prochain rendez-vous:", 20, yPos);
                                doc.setFontSize(11);
                                doc.text(
                                  record.nextAppointmentDate,
                                  20,
                                  yPos + 10
                                );
                              }

                              // Add signature if electronic signature is enabled
                              if (professionalProfile?.useElectronicSignature) {
                                try {
                                  yPos += 30;
                                  doc.text("Signature et cachet:", 130, yPos);

                                  // Add stamp first (at the bottom right)
                                  if (professionalProfile.stampUrl) {
                                    doc.addImage(
                                      professionalProfile.stampUrl,
                                      "PNG",
                                      140, // x position
                                      yPos + 10, // y position
                                      40, // width
                                      40, // height
                                      "stamp", // alias
                                      "FAST" // compression
                                    );
                                  }

                                  // Add signature below the stamp
                                  if (professionalProfile.signatureUrl) {
                                    doc.addImage(
                                      professionalProfile.signatureUrl,
                                      "PNG",
                                      140, // x position
                                      yPos + 55, // y position
                                      50, // width
                                      20, // height
                                      "signature", // alias
                                      "FAST" // compression
                                    );
                                  }

                                  // Add legal notice
                                  doc.setFontSize(8);
                                  doc.text(
                                    "Document signé électroniquement conformément à la réglementation en vigueur.",
                                    20,
                                    yPos + 80
                                  );
                                } catch (error) {
                                  console.error(
                                    "Error adding signature to PDF:",
                                    error
                                  );
                                }
                              }

                              doc.save(
                                `rapport-${selectedPatient.name.replace(
                                  " ",
                                  "_"
                                )}-${
                                  consultationDate.toISOString().split("T")[0]
                                }.pdf`
                              );
                            }}
                            className="flex items-center text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded text-sm"
                          >
                            <FileText className="h-4 w-4 mr-1" />
                            <span>Rapport</span>
                          </button>
                        </div>
                      </div>

                      <div>
                        <h4 className="font-medium mb-2">Diagnostic</h4>
                        <p className="text-gray-600">
                          {record.diagnosis || "Non spécifié"}
                        </p>
                      </div>

                      {record.treatment && (
                        <div>
                          <h4 className="font-medium mb-2 flex items-center">
                            <Pill className="h-4 w-4 mr-1" />
                            Traitement
                          </h4>
                          <p className="text-gray-600">{record.treatment}</p>
                        </div>
                      )}

                      {record.recommendations && (
                        <div>
                          <h4 className="font-medium mb-2">Recommandations</h4>
                          <p className="text-gray-600">
                            {record.recommendations}
                          </p>
                        </div>
                      )}

                      {record.nextAppointmentDate && (
                        <div>
                          <h4 className="font-medium mb-2">
                            Prochain rendez-vous
                          </h4>
                          <p className="text-gray-600">
                            {record.nextAppointmentDate}
                          </p>
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      Aucun dossier médical
                    </h3>
                    <p className="text-gray-500">
                      Ce patient n'a pas encore de dossier médical enregistré.
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 bg-gray-50 flex-shrink-0">
              <button
                onClick={() => generateMedicalReport(selectedPatient)}
                className="flex items-center justify-center w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                <Download className="h-5 w-5 mr-2" />
                Télécharger le dossier complet
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Message Modal */}
      {showMessageModal && selectedPatient && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-hidden">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center flex-shrink-0">
              <div className="flex items-center">
                {selectedPatient.profileImage ? (
                  <img
                    src={selectedPatient.profileImage}
                    alt={selectedPatient.name}
                    className="w-12 h-12 rounded-full object-cover mr-4"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center mr-4">
                    <User className="h-6 w-6 text-gray-500" />
                  </div>
                )}
                <div>
                  <h2 className="text-xl font-semibold">
                    {selectedPatient.name}
                  </h2>
                  <p className="text-gray-500">Messages</p>
                </div>
              </div>
              <button
                onClick={() => setShowMessageModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Message Form */}
            <div className="p-6 border-t border-gray-200 flex-shrink-0">
              {messageError && (
                <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg flex items-center">
                  <AlertCircle className="h-5 w-5 mr-2" />
                  {messageError}
                </div>
              )}

              {messageSent && (
                <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded-lg flex items-center">
                  <CheckCircle className="h-5 w-5 mr-2" />
                  Message envoyé avec succès
                </div>
              )}

              <div className="mb-4">
                <div className="flex space-x-4 mb-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="messageType"
                      value="text"
                      checked={messageType === "text"}
                      onChange={() => setMessageType("text")}
                      className="mr-2"
                    />
                    Message simple
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="messageType"
                      value="reminder"
                      checked={messageType === "reminder"}
                      onChange={() => setMessageType("reminder")}
                      className="mr-2"
                    />
                    Rappel de RDV
                  </label>
                </div>

                {messageType === "reminder" && (
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Date
                      </label>
                      <input
                        type="date"
                        value={reminderDate}
                        onChange={(e) => setReminderDate(e.target.value)}
                        className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Heure
                      </label>
                      <input
                        type="time"
                        value={reminderTime}
                        onChange={(e) => setReminderTime(e.target.value)}
                        className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                )}

                <textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder={
                    messageType === "reminder"
                      ? "Détails du rendez-vous..."
                      : "Votre message..."
                  }
                  className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  rows={3}
                />
              </div>

              <div className="flex justify-end">
                <button
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim() || sendingMessage}
                  className="flex items-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {sendingMessage ? (
                    <LoadingSpinner size="sm" className="mr-2" />
                  ) : (
                    <Send className="h-4 w-4 mr-2" />
                  )}
                  Envoyer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientsList;
