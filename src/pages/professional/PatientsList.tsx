import React, { useState, useEffect } from "react";
import {
  Search,
  FileText,
  MessageCircle,
  Calendar,
  X,
  User,
  Pill,
  RefreshCw,
  CheckCircle,
  Archive,
  Undo,
  Users,
  Archive as ArchiveIcon,
  Clock,
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import {
  getMedicalRecordsByProfessional,
  archivePatient,
  Patient,
} from "../../services/patientService";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import { getBookings } from "../../services/bookingService";

type TabType = "active" | "archived";

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
  const [activeTab, setActiveTab] = useState<TabType>("active");
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState<"success" | "error">("success");

  // Fetch patients data and medical records
  useEffect(() => {
    const fetchData = async () => {
      if (!currentUser?.id) return;

      try {
        setLoading(true);
        console.log(
          "👥 [PATIENTS LIST DEBUG] Starting data fetch for professional:",
          currentUser.id
        );

        // Fetch medical records by professional
        const medicalRecords = await getMedicalRecordsByProfessional(
          currentUser.id
        );
        console.log(
          "👥 [PATIENTS LIST DEBUG] Medical records fetched successfully:",
          medicalRecords.length
        );

        // Process medical records to create patient list
        const patientMap = new Map<string, Patient>();

        medicalRecords.forEach((record) => {
          console.log(
            "👥 [PATIENTS LIST DEBUG] Processing medical record for patient:",
            record.patientId
          );

          if (!patientMap.has(record.patientId)) {
            console.log(
              "👥 [PATIENTS LIST DEBUG] Created new patient entry for:",
              record.patientId
            );
            patientMap.set(record.patientId, {
              id: record.patientId,
              name: record.patientName || "Patient",
              profileImage: undefined,
              lastConsultation: record.consultationDate,
              consultationsCount: 1,
              medicalRecords: [record],
              isArchived: false,
            });
          } else {
            const existingPatient = patientMap.get(record.patientId)!;
            existingPatient.consultationsCount++;
            existingPatient.medicalRecords?.push(record);

            // Update last consultation if this one is more recent
            if (
              record.consultationDate > (existingPatient.lastConsultation || "")
            ) {
              existingPatient.lastConsultation = record.consultationDate;
            }
          }
        });

        // Fetch bookings to enrich patient data
        console.log(
          "👥 [PATIENTS LIST DEBUG] Fetching bookings for enrichment..."
        );
        const bookings = await getBookings();
        console.log(
          "👥 [PATIENTS LIST DEBUG] Bookings fetched for enrichment:",
          bookings.length
        );

        // Note: Booking enrichment logic removed as nextAppointment is not available in Booking type

        const patientsList = Array.from(patientMap.values());
        console.log(
          "👥 [PATIENTS LIST DEBUG] Final patient list:",
          patientsList.length,
          "patients with medical records"
        );

        // Verify patients with medical records
        const verifiedPatients = patientsList.filter(
          (patient) =>
            patient.medicalRecords && patient.medicalRecords.length > 0
        );
        console.log(
          "👥 [PATIENTS LIST DEBUG] Verified patients with medical records:",
          verifiedPatients.length
        );

        setPatients(verifiedPatients);
        setError(null);
      } catch (error) {
        console.error("❌ Error fetching patients:", error);
        setError("Erreur lors du chargement des patients");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [currentUser?.id]);

  // Handle patient archive/unarchive
  const handleArchivePatient = async (patientId: string, archive: boolean) => {
    if (!currentUser?.id) return;

    try {
      await archivePatient(patientId, currentUser.id, archive);
      setPatients((prevPatients) =>
        prevPatients.map((patient) =>
          patient.id === patientId
            ? {
                ...patient,
                isArchived: archive,
                archivedAt: archive ? new Date().toISOString() : undefined,
              }
            : patient
        )
      );

      setToastMessage(
        archive ? "Patient archivé avec succès" : "Patient restauré avec succès"
      );
      setToastType("success");
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    } catch (error) {
      console.error("❌ Error archiving patient:", error);
      setToastMessage("Erreur lors de l'archivage du patient");
      setToastType("error");
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    }
  };

  // Filter patients based on active tab and search
  const filteredPatients = patients.filter((patient) => {
    const matchesSearch = patient.name
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesTab =
      activeTab === "active" ? !patient.isArchived : patient.isArchived;
    return matchesSearch && matchesTab;
  });

  // Sort patients by last consultation (most recent first)
  const sortedPatients = filteredPatients.sort((a, b) => {
    if (!a.lastConsultation && !b.lastConsultation) return 0;
    if (!a.lastConsultation) return 1;
    if (!b.lastConsultation) return -1;
    return (
      new Date(b.lastConsultation).getTime() -
      new Date(a.lastConsultation).getTime()
    );
  });

  // Count patients by status
  const activePatientsCount = patients.filter((p) => !p.isArchived).length;
  const archivedPatientsCount = patients.filter((p) => p.isArchived).length;

  // Check if patient is new (consultation within last 7 days)
  const isNewPatient = (patient: Patient) => {
    if (!patient.lastConsultation) return false;
    const lastConsultation = new Date(patient.lastConsultation);
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    return lastConsultation > sevenDaysAgo;
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString("fr-FR", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return dateString;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <LoadingSpinner size="lg" />
            <span className="ml-4 text-lg text-gray-600">
              Chargement des patients...
            </span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="container mx-auto px-4 py-8">
          <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-xl shadow-sm">
            <strong className="font-semibold">Erreur : </strong>
            <span className="block sm:inline">{error}</span>
            <button
              onClick={() => window.location.reload()}
              className="mt-3 bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors"
            >
              Réessayer
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header with stats */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Mes patients</h1>
              <div className="flex items-center gap-6 mt-2">
                <div className="flex items-center gap-2 text-green-600">
                  <Users className="h-5 w-5" />
                  <span className="font-medium">
                    {activePatientsCount} patients actifs
                  </span>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <ArchiveIcon className="h-5 w-5" />
                  <span className="font-medium">
                    {archivedPatientsCount} archivés
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <input
                  type="text"
                  placeholder="Rechercher un patient..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-64"
                />
              </div>
              <button
                onClick={() => window.location.reload()}
                className="p-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors"
                title="Actualiser"
              >
                <RefreshCw className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
          <div className="flex space-x-1 bg-gray-100 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab("active")}
              className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all duration-200 ${
                activeTab === "active"
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Patients actifs ({activePatientsCount})
            </button>
            <button
              onClick={() => setActiveTab("archived")}
              className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all duration-200 ${
                activeTab === "archived"
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Archives ({archivedPatientsCount})
            </button>
          </div>
        </div>

        {/* Patients Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedPatients.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <User className="mx-auto h-16 w-16 text-gray-400" />
              <h3 className="mt-4 text-lg font-medium text-gray-900">
                {activeTab === "active"
                  ? "Aucun patient actif"
                  : "Aucun patient archivé"}
              </h3>
              <p className="mt-2 text-gray-500">
                {searchTerm
                  ? "Essayez de modifier votre recherche."
                  : activeTab === "active"
                  ? "Vous n'avez pas encore de patients actifs."
                  : "Aucun patient n'est archivé."}
              </p>
            </div>
          ) : (
            sortedPatients.map((patient) => (
              <div
                key={patient.id}
                className={`bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md hover:scale-[1.01] transition-all duration-200 ${
                  patient.isArchived ? "opacity-75 bg-gray-50" : ""
                }`}
              >
                <div className="p-4">
                  {/* Patient Header */}
                  <div className="flex items-center mb-4">
                    {patient.profileImage ? (
                      <img
                        src={patient.profileImage}
                        alt={patient.name}
                        className="w-12 h-12 rounded-full object-cover mr-4"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center mr-4">
                        <User className="h-6 w-6 text-blue-600" />
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-lg text-gray-900">
                          {patient.name}
                        </h3>
                        {isNewPatient(patient) && !patient.isArchived && (
                          <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-medium rounded-full">
                            Nouveau
                          </span>
                        )}
                        {patient.isArchived && (
                          <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-full flex items-center gap-1">
                            <Archive className="h-3 w-3" />
                            Archivé
                          </span>
                        )}
                      </div>
                      <p className="text-gray-500 text-sm">
                        {patient.consultationsCount} consultation
                        {patient.consultationsCount > 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>

                  {/* Patient Info */}
                  <div className="space-y-2 mb-4">
                    {patient.lastConsultation && (
                      <div className="flex items-center text-sm text-gray-600">
                        <Calendar className="h-4 w-4 mr-2" />
                        <span>
                          Dernière consultation:{" "}
                          {formatDate(patient.lastConsultation)}
                        </span>
                      </div>
                    )}
                    {patient.nextAppointment && !patient.isArchived && (
                      <div className="flex items-center text-sm text-green-600">
                        <Clock className="h-4 w-4 mr-2" />
                        <span>
                          Prochain RDV: {formatDate(patient.nextAppointment)}
                        </span>
                      </div>
                    )}
                    {patient.isArchived && patient.archivedAt && (
                      <div className="flex items-center text-sm text-gray-500">
                        <Archive className="h-4 w-4 mr-2" />
                        <span>
                          Archivé le: {formatDate(patient.archivedAt)}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => {
                        setSelectedPatient(patient);
                        setShowMedicalHistory(true);
                      }}
                      className="flex items-center gap-2 px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-sm font-medium"
                    >
                      <FileText className="h-4 w-4" />
                      Dossier
                    </button>

                    {!patient.isArchived && (
                      <button
                        onClick={() => {
                          setSelectedPatient(patient);
                          setShowMessageModal(true);
                        }}
                        className="flex items-center gap-2 px-3 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors text-sm font-medium"
                      >
                        <MessageCircle className="h-4 w-4" />
                        Message
                      </button>
                    )}

                    <button
                      onClick={() =>
                        handleArchivePatient(patient.id, !patient.isArchived)
                      }
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-sm font-medium ${
                        patient.isArchived
                          ? "bg-green-100 text-green-700 hover:bg-green-200"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      {patient.isArchived ? (
                        <>
                          <Undo className="h-4 w-4" />
                          Restaurer
                        </>
                      ) : (
                        <>
                          <Archive className="h-4 w-4" />
                          Archiver
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Toast Notification */}
      {showToast && (
        <div className="fixed top-4 right-4 z-50">
          <div
            className={`px-6 py-4 rounded-xl shadow-lg flex items-center gap-3 ${
              toastType === "success"
                ? "bg-green-50 border border-green-200 text-green-700"
                : "bg-red-50 border border-red-200 text-red-700"
            }`}
          >
            <CheckCircle className="h-5 w-5" />
            <span className="font-medium">{toastMessage}</span>
          </div>
        </div>
      )}

      {/* Medical History Modal */}
      {showMedicalHistory && selectedPatient && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">
                  Dossier médical - {selectedPatient.name}
                </h2>
                <button
                  onClick={() => setShowMedicalHistory(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              {selectedPatient.medicalRecords &&
              selectedPatient.medicalRecords.length > 0 ? (
                <div className="space-y-6">
                  {selectedPatient.medicalRecords.map((record) => (
                    <div key={record.id} className="bg-gray-50 rounded-xl p-4">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="font-semibold text-lg">
                            Consultation du{" "}
                            {formatDate(record.consultationDate)}
                          </h3>
                          <p className="text-gray-600">
                            Type: {record.consultationType}
                          </p>
                        </div>
                        <button
                          onClick={() => {
                            // Generate prescription logic here
                            console.log(
                              "Generate prescription for record:",
                              record.id
                            );
                          }}
                          className="px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors text-sm font-medium"
                        >
                          <Pill className="h-4 w-4 inline mr-2" />
                          Ordonnance
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <h4 className="font-medium text-gray-900 mb-2">
                            Diagnostic
                          </h4>
                          <p className="text-gray-700">
                            {record.diagnosis || "Non spécifié"}
                          </p>
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900 mb-2">
                            Traitement
                          </h4>
                          <p className="text-gray-700">
                            {record.treatment || "Non spécifié"}
                          </p>
                        </div>
                        <div className="md:col-span-2">
                          <h4 className="font-medium text-gray-900 mb-2">
                            Recommandations
                          </h4>
                          <p className="text-gray-700">
                            {record.recommendations || "Aucune recommandation"}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <FileText className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-lg font-medium text-gray-900">
                    Aucun dossier médical
                  </h3>
                  <p className="mt-1 text-gray-500">
                    Aucune consultation enregistrée pour ce patient.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Message Modal */}
      {showMessageModal && selectedPatient && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold">
                  Envoyer un message à {selectedPatient.name}
                </h2>
                <button
                  onClick={() => setShowMessageModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="mb-4">
                <div className="flex space-x-2 mb-4">
                  <button
                    onClick={() => setMessageType("text")}
                    className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                      messageType === "text"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    Message
                  </button>
                  <button
                    onClick={() => setMessageType("reminder")}
                    className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                      messageType === "reminder"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    Rappel
                  </button>
                </div>

                {messageType === "text" ? (
                  <textarea
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Tapez votre message..."
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    rows={4}
                  />
                ) : (
                  <div className="space-y-3">
                    <input
                      type="date"
                      value={reminderDate}
                      onChange={(e) => setReminderDate(e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="time"
                      value={reminderTime}
                      onChange={(e) => setReminderTime(e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowMessageModal(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={() => {
                    // Send message logic here
                    console.log("Send message to patient:", selectedPatient.id);
                    setShowMessageModal(false);
                  }}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
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
