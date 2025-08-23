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
  Download,
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import {
  getMedicalRecordsByProfessional,
  archivePatient,
  Patient,
  MedicalRecord,
} from "../../services/patientService";
import { getFirestore } from "firebase/firestore";
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
  const [showPrescriptionModal, setShowPrescriptionModal] = useState(false);
  const [currentPrescription, setCurrentPrescription] =
    useState<MedicalRecord | null>(null);

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

  const showPrescription = (record: MedicalRecord) => {
    if (!record.treatment || record.treatment.trim() === "") {
      alert("Ce dossier ne contient pas de traitement à prescrire.");
      return;
    }
    setCurrentPrescription(record);
    setShowPrescriptionModal(true);
  };

  // Fonction pour créer le logo Health-e avec le design réel
  const createHealthELogo = () => {
    const svg = `
      <svg width="80" height="40" viewBox="0 0 80 40" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#3B82F6;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#14B8A6;stop-opacity:1" />
          </linearGradient>
        </defs>
        <!-- Icône carrée arrondie avec gradient -->
        <rect x="2" y="2" width="36" height="36" rx="8" fill="url(#logoGradient)"/>
        <!-- Cœur blanc au centre -->
        <path d="M20 12c-1.5-1.5-3.5-2-5.5-2s-4 0.5-5.5 2c-3 3-3 8 0 11l10.5 10.5L20 23c3-3 3-8 0-11z" fill="white" stroke="white" stroke-width="0.5"/>
        <!-- Texte Health-e -->
        <text x="45" y="25" font-family="Arial, sans-serif" font-size="16" font-weight="bold" fill="#1E40AF">Health-e</text>
      </svg>
    `;
    return "data:image/svg+xml;base64," + btoa(svg);
  };

  // --- Helpers fonts / slug / images ---
  let _fontsLoaded = false;
  async function ensureFontsLoaded(doc: any) {
    if (_fontsLoaded) return;
    async function loadTtf(path: string) {
      const res = await fetch(path);
      if (!res.ok) {
        throw new Error(`Failed to load font: ${res.status} ${res.statusText}`);
      }
      const buf = await res.arrayBuffer();
      // Convert ArrayBuffer -> base64
      let binary = "";
      const bytes = new Uint8Array(buf);
      const len = bytes.byteLength;
      for (let i = 0; i < len; i++) binary += String.fromCharCode(bytes[i]);
      return btoa(binary);
    }
    try {
      console.log("🔍 [FONT DEBUG] Loading Inter fonts...");
      const regularB64 = await loadTtf("/fonts/Inter-Regular.ttf");
      const boldB64 = await loadTtf("/fonts/Inter-Bold.ttf");

      doc.addFileToVFS("Inter-Regular.ttf", regularB64);
      doc.addFileToVFS("Inter-Bold.ttf", boldB64);
      doc.addFont("Inter-Regular.ttf", "Inter", "normal");
      doc.addFont("Inter-Bold.ttf", "Inter", "bold");

      _fontsLoaded = true;
      console.log("✅ [FONT DEBUG] Inter fonts loaded successfully");
    } catch (e) {
      console.warn(
        "⚠️ [FONT DEBUG] Failed to load Inter fonts, using helvetica fallback:",
        e
      );
      _fontsLoaded = false;
    }
  }

  function slugify(input: string) {
    return (input || "patient")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // remove accents
      .replace(/[^a-zA-Z0-9]+/g, "_") // non alphanum -> _
      .replace(/^_+|_+$/g, "")
      .toLowerCase();
  }

  async function toDataURL(url: string): Promise<string> {
    const res = await fetch(url);
    const blob = await res.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  const generatePrescription = async (record: MedicalRecord) => {
    if (!record?.treatment || record.treatment.trim() === "") {
      alert("Ce dossier ne contient pas de traitement à prescrire.");
      return;
    }

    try {
      // Imports dynamiques pour optimiser le bundle initial
      const [{ default: jsPDF }, autoTableMod, { default: QRCode }] =
        await Promise.all([
          import("jspdf"),
          import("jspdf-autotable"),
          import("qrcode"),
        ]);
      const autoTable = (autoTableMod as any).default ?? autoTableMod;

      // A4 mm
      const doc = new jsPDF({ unit: "mm", format: "a4" });
      await ensureFontsLoaded(doc);

      // Vérifier les polices disponibles
      console.log("🔍 [FONT DEBUG] Available fonts:", doc.getFontList());

      // Essayer de récupérer le profil patient complet pour avoir la date de naissance
      let patientProfile = null;
      try {
        const { getPatientProfile } = await import(
          "../../services/profileService"
        );
        patientProfile = await getPatientProfile(record.patientId || "");
        console.log("🔍 [PDF DEBUG] Profil patient récupéré:", patientProfile);
      } catch (e) {
        console.warn(
          "⚠️ [PDF DEBUG] Impossible de récupérer le profil patient:",
          e
        );
      }

      // Utiliser helvetica par défaut pour éviter les erreurs
      doc.setFont("helvetica", "normal");
      doc.setTextColor(0, 0, 0);

      const page = { w: 210, h: 297, margin: 20 };
      let y = page.margin;

      // --- Header ---
      try {
        const logoBase64 = createHealthELogo();
        doc.addImage(logoBase64, "SVG", page.margin, y - 5, 40, 20);
      } catch {}

      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.setTextColor(59, 130, 246);
      doc.text("ORDONNANCE MÉDICALE", page.w / 2, y + 5, { align: "center" });

      // Infos pro (droite)
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(60, 60, 60);
      const proName = record.professionalName || "Professionnel";
      const proLines = [`Dr. ${proName}`, `Professionnel de santé`];
      proLines.forEach((t, i) =>
        doc.text(t, page.w - page.margin - 40, y + 8 + i * 5)
      );

      // trait
      doc.setDrawColor(59, 130, 246);
      doc.setLineWidth(0.8);
      y += 18;
      doc.line(page.margin, y, page.w - page.margin, y);
      y += 6;

      // --- Bloc patient ---
      const fmt = new Intl.DateTimeFormat("fr-FR", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
      const cDate = record.consultationDate
        ? new Date(record.consultationDate)
        : new Date();
      const dateFr = fmt.format(cDate);

      // Calculer l'âge et préparer les lignes d'information patient
      let ageTxt = "";
      let birthDateTxt = "";
      const patientBirthDate =
        patientProfile?.dateOfBirth || (record as any).patientDateOfBirth;

      if (patientBirthDate) {
        try {
          const bd = new Date(patientBirthDate);
          if (!isNaN(bd.getTime())) {
            const today = new Date();
            let age = today.getFullYear() - bd.getFullYear();
            const md = today.getMonth() - bd.getMonth();
            if (md < 0 || (md === 0 && today.getDate() < bd.getDate())) age--;
            ageTxt = ` (${age} ans)`;
            birthDateTxt = `Date de naissance : ${bd.toLocaleDateString(
              "fr-FR"
            )}`;
          }
        } catch (e) {
          console.warn("⚠️ [PDF DEBUG] Erreur calcul âge:", e);
        }
      }

      const row1 = `Nom : ${record.patientName || "Patient"}${ageTxt}`;
      const row2 = `Type de consultation : ${
        record.consultationType || "Vidéo"
      } • Consultation du ${dateFr}`;
      const row3 = birthDateTxt;

      // cadre patient avec hauteur dynamique
      const patientBoxHeight = row3 ? 30 : 24;
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(216, 222, 233);
      doc.setLineWidth(0.5);
      doc.rect(page.margin, y, page.w - page.margin * 2, patientBoxHeight, "F");
      doc.rect(page.margin, y, page.w - page.margin * 2, patientBoxHeight);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(0, 0, 0);
      doc.text("INFORMATIONS PATIENT", page.margin + 5, y + 7);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);

      doc.text(row1, page.margin + 5, y + 14);
      doc.text(row2, page.margin + 5, y + 20);
      if (row3) {
        doc.text(row3, page.margin + 5, y + 26);
      }

      y += patientBoxHeight + 6;

      // --- Prescription ---
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(34, 197, 94);
      // ℞ n'est pas garanti par toutes les polices → "Rx"
      doc.text("PRESCRIPTION MÉDICALE", page.margin + 7, y);
      doc.setTextColor(59, 130, 246);
      doc.text("Rx", page.margin, y);

      y += 4;
      doc.setDrawColor(34, 197, 94);
      doc.setLineWidth(0.5);
      doc.line(page.margin, y, page.w - page.margin, y);
      y += 6;

      // Si tu as un tableau de médicaments (optionnel)
      // record.medications?: Array<{ drug, dosage, posology, duration, instructions }>
      if (
        Array.isArray((record as any).medications) &&
        (record as any).medications.length
      ) {
        const rows = (record as any).medications.map((m: any) => [
          m.drug || "",
          m.dosage || "",
          m.posology || "",
          m.duration || "",
          m.instructions || "",
        ]);
        autoTable(doc, {
          head: [
            ["Médicament", "Dosage", "Posologie", "Durée", "Instructions"],
          ],
          body: rows,
          startY: y,
          styles: {
            font: "helvetica",
            fontSize: 9,
            cellPadding: 2,
          },
          headStyles: { fillColor: [240, 253, 244], textColor: [0, 0, 0] },
          alternateRowStyles: { fillColor: [250, 250, 250] },
          theme: "grid",
          margin: { left: page.margin, right: page.margin },
          tableWidth: page.w - page.margin * 2,
        });
        // positionner y sous la table
        // @ts-ignore
        y = (doc as any).lastAutoTable.finalY + 10;
      } else {
        // Texte libre: record.treatment
        doc.setFont("helvetica", "normal");
        doc.setFontSize(11);
        doc.setTextColor(0, 0, 0);

        const maxWidth = page.w - page.margin * 2 - 5;
        const lines = doc.splitTextToSize(record.treatment, maxWidth);

        // gestion pagination simple
        for (const line of lines) {
          if (y > page.h - 30) {
            doc.addPage();
            await ensureFontsLoaded(doc);
            doc.setFont("helvetica", "normal");
            y = page.margin;
          }
          doc.text(line, page.margin + 5, y);
          y += 6;
        }
        y += 4;
      }

      // Espace après la prescription
      y += 10;

      // --- Signature & cachet (en bas de chaque page) ---
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);

        // Position de la signature (60mm du bas)
        const signatureY = page.h - 60;

        // Titre de la section signature
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.setTextColor(0, 0, 0);
        doc.text("SIGNATURE ET CACHET", page.margin, signatureY);

        // Cadre pour la signature
        doc.setDrawColor(216, 222, 233);
        doc.setLineWidth(0.5);
        doc.rect(page.margin, signatureY + 4, page.w - page.margin * 2, 42);

        // cachet / signature à droite
        try {
          if (
            record.useElectronicSignature &&
            (record.stampUrl || record.signatureUrl)
          ) {
            if (record.stampUrl) {
              const b64 = await toDataURL(record.stampUrl);
              doc.addImage(
                b64,
                "PNG",
                page.w - page.margin - 50,
                signatureY + 7,
                34,
                34
              );
            }
            if (record.signatureUrl) {
              const b64s = await toDataURL(record.signatureUrl);
              doc.addImage(
                b64s,
                "PNG",
                page.w - page.margin - 50,
                signatureY + 32,
                40,
                15
              );
            }
            doc.setFontSize(9);
            doc.setTextColor(100, 100, 100);
            doc.text(
              "Document signé électroniquement conformément à la réglementation en vigueur.",
              page.margin + 2,
              signatureY + 44
            );
          } else {
            doc.setFontSize(9);
            doc.setTextColor(150, 150, 150);
            doc.text(
              "Signature électronique non disponible",
              page.margin + 2,
              signatureY + 16
            );
          }
        } catch (e) {
          doc.setFontSize(9);
          doc.setTextColor(150, 150, 150);
          doc.text(
            "Signature électronique non disponible",
            page.margin + 2,
            signatureY + 16
          );
        }

        // QR code (vérification)
        try {
          const verifyUrl = `${window.location.origin}/verify/prescription/${record.id}`;
          const qrDataUrl = await QRCode.toDataURL(verifyUrl, {
            margin: 0,
            width: 72,
          });
          doc.addImage(
            qrDataUrl,
            "PNG",
            page.margin + 2,
            signatureY + 7,
            22,
            22
          );
          doc.setFontSize(8);
          doc.setTextColor(100, 100, 100);
          doc.text("Vérifier l'authenticité", page.margin + 2, signatureY + 33);
        } catch {}

        // Footer en bas de page
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(120, 120, 120);
        const footerText = `Document signé électroniquement via Health-e | www.health-e.sn | Page ${i} / ${pageCount}`;
        doc.text(footerText, page.w / 2, page.h - 10, { align: "center" });
      }

      // --- Save ---
      const dateStr = new Date().toISOString().split("T")[0];
      const safeName = slugify(record.patientName || "patient");
      doc.save(`ordonnance-${safeName}-${dateStr}.pdf`);
    } catch (error) {
      console.error("❌ [PDF DEBUG] Error generating prescription:", error);
      alert(
        "Erreur lors de la génération de l'ordonnance. Veuillez réessayer."
      );
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
                          onClick={() => showPrescription(record)}
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

      {/* Prescription Modal */}
      {showPrescriptionModal && currentPrescription && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center flex-shrink-0">
              <h2 className="text-xl font-semibold flex items-center">
                <Pill className="h-6 w-6 mr-2 text-green-600" />
                Ordonnance médicale
              </h2>
              <button
                onClick={() => setShowPrescriptionModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <div className="bg-gray-50 rounded-lg p-6 space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Patient</h4>
                  <p className="text-gray-600">
                    {currentPrescription.patientName || "Patient"}
                  </p>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Date de consultation</h4>
                  <p className="text-gray-600">
                    {formatDate(currentPrescription.consultationDate)}
                  </p>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Type de consultation</h4>
                  <p className="text-gray-600">
                    {currentPrescription.consultationType || "Vidéo"}
                  </p>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Diagnostic</h4>
                  <p className="text-gray-600">
                    {currentPrescription.diagnosis || "Non spécifié"}
                  </p>
                </div>

                <div>
                  <h4 className="font-medium mb-2 flex items-center">
                    <Pill className="h-4 w-4 mr-1" />
                    Traitement prescrit
                  </h4>
                  <div className="bg-white p-4 rounded border">
                    <p className="text-gray-800 whitespace-pre-wrap">
                      {currentPrescription.treatment}
                    </p>
                  </div>
                </div>

                {currentPrescription.recommendations && (
                  <div>
                    <h4 className="font-medium mb-2">Recommandations</h4>
                    <p className="text-gray-600">
                      {currentPrescription.recommendations}
                    </p>
                  </div>
                )}

                {currentPrescription.nextAppointmentDate && (
                  <div>
                    <h4 className="font-medium mb-2">Prochain rendez-vous</h4>
                    <p className="text-gray-600">
                      {currentPrescription.nextAppointmentDate}
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end space-x-3 flex-shrink-0">
              <button
                onClick={() => setShowPrescriptionModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Fermer
              </button>
              <button
                onClick={() => generatePrescription(currentPrescription)}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center"
              >
                <Download className="h-4 w-4 mr-2" />
                Télécharger l'ordonnance
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientsList;
