import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
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
  Eye,
  Plus,
  Download,
  Edit,
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { useBookings } from "../../hooks/useBookings";
import {
  formatDateTimeWithTimezone,
  isDatePassed,
  isWithinTwoDays,
} from "../../utils/dateTimeUtils";
import MessagingCenter from "../../components/messaging/MessagingCenter";
import {
  getFirestore,
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
  getDocs,
} from "firebase/firestore";
import {
  getPatientMedicalRecords,
  MedicalRecord,
} from "../../services/patientService";
import {
  getPatientGroupTherapySessions,
  GroupTherapySession,
} from "../../services/groupTherapyService";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import EthicsReminder from "../../components/dashboard/EthicsReminder";
import UserSupportTickets from "../../components/support/UserSupportTickets";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Users } from "lucide-react";
import {
  generateInvoicePDF,
  type InvoiceData,
} from "../../services/invoiceService";

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
  const location = useLocation();
  const { bookings, loading } = useBookings(currentUser?.id || "", "patient");

  const [activeTab, setActiveTab] = useState<"upcoming" | "past">("upcoming");
  const [showMessaging, setShowMessaging] = useState(true);
  const [medicalRecords, setMedicalRecords] = useState<MedicalRecord[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [recordError, setRecordError] = useState<string | null>(null);
  const [showMedicalRecordModal, setShowMedicalRecordModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<MedicalRecord | null>(
    null,
  );
  const [showEthicsReminder, setShowEthicsReminder] = useState(true);
  const [showSupport, setShowSupport] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showPrescriptionModal, setShowPrescriptionModal] = useState(false);
  const [currentPrescription, setCurrentPrescription] =
    useState<MedicalRecord | null>(null);
  const [showRecommendationsModal, setShowRecommendationsModal] =
    useState(false);
  const [currentRecommendations, setCurrentRecommendations] =
    useState<MedicalRecord | null>(null);
  const [groupTherapySessions, setGroupTherapySessions] = useState<
    GroupTherapySession[]
  >([]);
  const [loadingGroupTherapy, setLoadingGroupTherapy] = useState(false);

  // Fetch medical records - Optimisé avec cache + temps réel
  useEffect(() => {
    if (!currentUser?.id) {
      return;
    }
    setLoadingRecords(true);
    setRecordError(null);

    const db = getFirestore();
    // Utiliser la sous-collection correcte : patients/{patientId}/medicalRecords
    const q = query(
      collection(db, "patients", currentUser.id, "medicalRecords"),
      orderBy("consultationDate", "desc"),
      limit(3),
    );

    const unsub = onSnapshot(
      q,
      { includeMetadataChanges: true },
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
        setMedicalRecords(list as MedicalRecord[]);
        setLoadingRecords(false);
      },
      (err) => {
        console.error("❌ [DASHBOARD] Medical records error:", err);
        setRecordError("Impossible de charger vos dossiers médicaux.");
        setLoadingRecords(false);
      },
    );

    return () => {
      console.log("🧹 [DASHBOARD] Cleaning up medical records listener");
      unsub();
    };
  }, [currentUser?.id]);

  // Check if ethics reminder should be shown
  useEffect(() => {
    const reminderDismissed = localStorage.getItem(
      "health-e-ethics-reminder-dismissed",
    );
    if (reminderDismissed) {
      setShowEthicsReminder(false);
    }
  }, []);

  // Fetch group therapy sessions
  useEffect(() => {
    const fetchGroupTherapySessions = async () => {
      if (!currentUser?.id) return;

      try {
        setLoadingGroupTherapy(true);
        const sessions = await getPatientGroupTherapySessions(currentUser.id);
        setGroupTherapySessions(sessions);
      } catch (error) {
        console.error("Error fetching group therapy sessions:", error);
      } finally {
        setLoadingGroupTherapy(false);
      }
    };

    fetchGroupTherapySessions();
  }, [currentUser?.id]);

  // Gérer les messages de succès depuis l'URL
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const message = searchParams.get("message");

    if (message === "appointment_updated") {
      setSuccessMessage("Rendez-vous modifié avec succès !");
      // Nettoyer l'URL
      window.history.replaceState({}, document.title, window.location.pathname);

      // Masquer le message après 5 secondes
      setTimeout(() => {
        setSuccessMessage(null);
      }, 5000);
    }
  }, [location.search]);

  const dismissEthicsReminder = () => {
    localStorage.setItem("health-e-ethics-reminder-dismissed", "true");
    setShowEthicsReminder(false);
  };

  const showPrescription = (record: MedicalRecord) => {
    if (!record.treatment || record.treatment.trim() === "") {
      alert("Ce dossier ne contient pas de traitement à prescrire.");
      return;
    }
    setCurrentPrescription(record);
    setShowPrescriptionModal(true);
  };

  const showRecommendations = (record: MedicalRecord) => {
    if (!record.recommendations || record.recommendations.trim() === "") {
      alert("Ce dossier ne contient pas de recommandations.");
      return;
    }
    setCurrentRecommendations(record);
    setShowRecommendationsModal(true);
  };

  // Fonction pour charger tous les dossiers à la demande
  async function loadAllRecords() {
    if (!currentUser?.id) return;
    setLoadingRecords(true);
    setRecordError(null);
    try {
      const db = getFirestore();
      // Utiliser la sous-collection correcte : patients/{patientId}/medicalRecords
      const q = query(
        collection(db, "patients", currentUser.id, "medicalRecords"),
        orderBy("consultationDate", "desc"),
        limit(50),
      );
      const snap = await getDocs(q);
      const all = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as any),
      })) as MedicalRecord[];
      setMedicalRecords(all);
      setShowMedicalRecordModal(true);
      setSelectedRecord(null);
    } catch (e) {
      console.error(e);
      setRecordError("Erreur lors du chargement de tous les dossiers.");
    } finally {
      setLoadingRecords(false);
    }
  }

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
  async function ensureFontsLoaded(doc: jsPDF) {
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
        e,
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
        const { getPatientProfile } =
          await import("../../services/profileService");
        patientProfile = await getPatientProfile(currentUser?.id || "");
        console.log("🔍 [PDF DEBUG] Profil patient récupéré:", patientProfile);
      } catch (e) {
        console.warn(
          "⚠️ [PDF DEBUG] Impossible de récupérer le profil patient:",
          e,
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
        doc.text(t, page.w - page.margin - 40, y + 8 + i * 5),
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

      // cadre patient
      const patientBoxHeight = 24;
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

      doc.text(
        `Nom : ${currentUser?.name || "Patient"}`,
        page.margin + 5,
        y + 14,
      );
      doc.text(
        `Type de consultation : ${
          record.consultationType || "Vidéo"
        } • Consultation du ${dateFr}`,
        page.margin + 5,
        y + 20,
      );

      y += 30;

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
                34,
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
                15,
              );
            }
            doc.setFontSize(9);
            doc.setTextColor(100, 100, 100);
            doc.text(
              "Document signé électroniquement conformément à la réglementation en vigueur.",
              page.margin + 2,
              signatureY + 44,
            );
          } else {
            doc.setFontSize(9);
            doc.setTextColor(150, 150, 150);
            doc.text(
              "Signature électronique non disponible",
              page.margin + 2,
              signatureY + 16,
            );
          }
        } catch (e) {
          doc.setFontSize(9);
          doc.setTextColor(150, 150, 150);
          doc.text(
            "Signature électronique non disponible",
            page.margin + 2,
            signatureY + 16,
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
            22,
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
      const safeName = slugify(currentUser?.name || "patient");
      doc.save(`ordonnance-${safeName}-${dateStr}.pdf`);
    } catch (error) {
      console.error("❌ [PDF DEBUG] Error generating prescription:", error);
      alert(
        "Erreur lors de la génération de l'ordonnance. Veuillez réessayer.",
      );
    }
  };

  const generateRecommendations = async (record: MedicalRecord) => {
    if (!record?.recommendations || record.recommendations.trim() === "") {
      alert("Ce dossier ne contient pas de recommandations.");
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
      doc.text("RECOMMANDATIONS MÉDICALES", page.w / 2, y + 5, {
        align: "center",
      });

      // Infos pro (droite)
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(60, 60, 60);
      const proName = record.professionalName || "Professionnel";
      const proLines = [`Dr. ${proName}`, `Professionnel de santé`];
      proLines.forEach((t, i) =>
        doc.text(t, page.w - page.margin - 40, y + 8 + i * 5),
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

      // Récupérer la date de naissance du patient
      let patientProfile = null;
      try {
        const { getPatientProfile } =
          await import("../../services/profileService");
        patientProfile = await getPatientProfile(currentUser?.id || "");
      } catch (e) {
        console.warn(
          "⚠️ [PDF DEBUG] Impossible de récupérer le profil patient:",
          e,
        );
      }

      // Calculer l'âge et préparer les lignes d'information patient
      let ageTxt = "";
      let birthDateTxt = "";
      const patientBirthDate =
        patientProfile?.dateOfBirth ||
        currentUser?.dateOfBirth ||
        (currentUser as any)?.profile?.dateOfBirth ||
        record.patientDateOfBirth;

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
              "fr-FR",
            )}`;
          }
        } catch (e) {
          console.warn("⚠️ [PDF DEBUG] Erreur calcul âge:", e);
        }
      }

      // Préparer les lignes d'information patient
      const row1 = `Nom : ${currentUser?.name || "Patient"}${ageTxt}`;
      const row2 = `Type de consultation : ${
        record.consultationType || "Vidéo"
      } • Consultation du ${dateFr}`;
      const row3 = birthDateTxt;

      // cadre patient - agrandi pour inclure la date de naissance
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
        y += 6; // Ajuster la hauteur si on ajoute une ligne
      }

      y += 30;

      // --- Recommandations ---
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(34, 197, 94);
      doc.text("RECOMMANDATIONS MÉDICALES", page.margin - 10, y);
      doc.setTextColor(59, 130, 246);
      doc.text("💡", page.margin - 25, y);

      y += 4;
      doc.setDrawColor(34, 197, 94);
      doc.setLineWidth(0.5);
      doc.line(page.margin, y, page.w - page.margin, y);
      y += 6;

      // Texte des recommandations
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      doc.setTextColor(0, 0, 0);

      const maxWidth = page.w - page.margin * 2 - 5;
      const lines = doc.splitTextToSize(record.recommendations, maxWidth);

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

      // Espace après les recommandations
      y += 10;

      // --- Signature & cachet (en bas de chaque page) ---
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);

        // Position de la signature (60mm du bas)
        const signatureY = page.h - 60;

        // --- Prochain rendez-vous (si disponible) - juste au-dessus de la signature ---
        if (record.nextAppointmentDate) {
          const appointmentY = signatureY - 25;

          doc.setFont("helvetica", "bold");
          doc.setFontSize(12);
          doc.setTextColor(168, 85, 247);
          doc.text("PROCHAIN RENDEZ-VOUS", page.margin, appointmentY);
          doc.setTextColor(59, 130, 246);
          doc.text("📅", page.margin - 25, appointmentY);

          const lineY = appointmentY + 4;
          doc.setDrawColor(168, 85, 247);
          doc.setLineWidth(0.5);
          doc.line(page.margin, lineY, page.w - page.margin, lineY);

          doc.setFont("helvetica", "normal");
          doc.setFontSize(11);
          doc.setTextColor(0, 0, 0);
          doc.text(
            record.nextAppointmentDate,
            page.margin + 5,
            appointmentY + 10,
          );
        }

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
                34,
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
                15,
              );
            }
            doc.setFontSize(9);
            doc.setTextColor(100, 100, 100);
            doc.text(
              "Document signé électroniquement conformément à la réglementation en vigueur.",
              page.margin + 2,
              signatureY + 44,
            );
          } else {
            doc.setFontSize(9);
            doc.setTextColor(150, 150, 150);
            doc.text(
              "Signature électronique non disponible",
              page.margin + 2,
              signatureY + 16,
            );
          }
        } catch (e) {
          doc.setFontSize(9);
          doc.setTextColor(150, 150, 150);
          doc.text(
            "Signature électronique non disponible",
            page.margin + 2,
            signatureY + 16,
          );
        }

        // QR code (vérification)
        try {
          const verifyUrl = `${window.location.origin}/verify/recommendations/${record.id}`;
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
            22,
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
      const safeName = slugify(currentUser?.name || "patient");
      doc.save(`recommandations-${safeName}-${dateStr}.pdf`);
    } catch (error) {
      console.error("❌ [PDF DEBUG] Error generating recommendations:", error);
      alert(
        "Erreur lors de la génération des recommandations. Veuillez réessayer.",
      );
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
      // Si c'est déjà un nom de jour (ex: "Jeudi"), le retourner tel quel
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
        return dateString;
      }

      // Créer la date en spécifiant explicitement le fuseau horaire local
      let date: Date;

      if (dateString.includes("-")) {
        // Format YYYY-MM-DD : créer la date en heure locale
        const [year, month, day] = dateString.split("-").map(Number);
        // Créer la date à midi dans le fuseau local pour éviter les problèmes de minuit
        date = new Date(year, month - 1, day, 12, 0, 0);
      } else {
        // Autre format : utiliser le parser standard
        date = new Date(dateString);
      }

      if (isNaN(date.getTime())) {
        // Si ce n'est pas une date valide, retourner la chaîne originale
        console.warn("⚠️ [FORMAT DATE] Invalid date:", dateString);
        return dateString;
      }

      // Debug du formatage
      console.log("🔍 [FORMAT DATE] Formatting date:", {
        original: dateString,
        parsed: date.toISOString(),
        local: date.toLocaleDateString("fr-FR"),
        year: date.getFullYear(),
        month: date.getMonth() + 1,
        day: date.getDate(),
      });

      return date.toLocaleDateString("fr-FR", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch (error) {
      console.warn("⚠️ Erreur formatage date:", error, dateString);
      return dateString;
    }
  };

  // Fonction pour vérifier si c'est le jour de la consultation
  const isConsultationDay = (dateString: string) => {
    try {
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
        return false; // Les noms de jours ne sont pas des dates précises
      }

      let bookingDate: Date;
      if (dateString.includes("-")) {
        const [year, month, day] = dateString.split("-").map(Number);
        bookingDate = new Date(year, month - 1, day, 12, 0, 0);
      } else {
        bookingDate = new Date(dateString);
      }

      if (isNaN(bookingDate.getTime())) {
        return false;
      }

      const today = new Date();

      // Comparer seulement le jour, mois et année (pas l'heure)
      return (
        bookingDate.getDate() === today.getDate() &&
        bookingDate.getMonth() === today.getMonth() &&
        bookingDate.getFullYear() === today.getFullYear()
      );
    } catch (error) {
      console.error("❌ Error in isConsultationDay:", error);
      return false;
    }
  };

  const upcomingBookings = bookings.filter(
    (booking) =>
      (booking.status === "en_attente" ||
        booking.status === "confirmé" ||
        booking.status === "confirmed") &&
      !isDatePassed(booking.date),
  );

  const pastBookings = bookings.filter(
    (booking) =>
      booking.status === "terminé" ||
      booking.status === "completed" ||
      booking.status === "annulé" ||
      isDatePassed(booking.date),
  );

  const displayedBookings =
    activeTab === "upcoming" ? upcomingBookings : pastBookings;

  /* ── Téléchargement facture ─────────────────────────────────── */
  const handleDownloadInvoice = (booking: (typeof bookings)[0]) => {
    const invoiceData: InvoiceData = {
      invoiceNumber: booking.id.slice(-8).toUpperCase(),
      bookingId: booking.id,
      date: booking.date,
      startTime: booking.startTime || "00:00",
      endTime: undefined,
      patientName: currentUser?.name || "Patient",
      patientEmail: currentUser?.email,
      professionalName: booking.professionalName,
      professionalSpecialty: undefined,
      consultationType: (booking.type as "video" | "audio" | "chat") || "video",
      amount: booking.amount ?? 0,
      isPaid: booking.status === "terminé" || booking.status === "completed",
      paymentMethod: undefined,
    };
    const blob = generateInvoicePDF(invoiceData);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `facture-health-e-${invoiceData.invoiceNumber}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  };

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

      {/* Message de succès */}
      {successMessage && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center">
          <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center mr-3">
            <svg
              className="w-5 h-5 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <div className="flex-1">
            <p className="text-green-800 font-medium">{successMessage}</p>
          </div>
          <button
            onClick={() => setSuccessMessage(null)}
            className="text-green-600 hover:text-green-800 ml-4"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      )}

      {/* Welcome Banner */}
      <WelcomeBanner name={currentUser?.name?.split(" ")[0] || "Patient"} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main content */}
        <div className="lg:col-span-2">
          {/* Actions rapides - déplacées au-dessus des consultations */}
          <div className="mb-8">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h3 className="font-bold text-xl text-gray-900 mb-6 flex items-center">
                <Activity className="h-6 w-6 mr-3 text-purple-600" />
                Actions rapides
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                        Consulter en profil psychologique
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
                        Consulter en vie intime
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
          </div>

          {/* Group Therapy Sessions Section */}
          {groupTherapySessions.length > 0 && (
            <div className="mb-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                  <Users className="h-6 w-6 mr-3 text-purple-600" />
                  Mes thérapies de groupe
                </h2>
              </div>
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <div className="space-y-4">
                  {groupTherapySessions.map((session) => {
                    const formattedDate = session.date
                      ? format(
                          new Date(session.date + "T00:00:00"),
                          "EEEE d MMMM yyyy",
                          { locale: fr },
                        )
                      : "";
                    const isFree = session.price === 0;
                    const registrationsCount = session.registrationsCount ?? 0;
                    const isFull = registrationsCount >= session.capacity;

                    return (
                      <div
                        key={session.id}
                        className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">
                              {session.title}
                            </h3>
                            <p className="text-sm text-gray-600 mb-3">
                              {session.description}
                            </p>
                            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
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
                                <Users className="h-4 w-4 mr-2" />
                                <span>
                                  {registrationsCount}/{session.capacity} places
                                </span>
                              </div>
                              <div>
                                {isFree ? (
                                  <span className="text-green-600 font-medium">
                                    Gratuit
                                  </span>
                                ) : (
                                  <span className="text-blue-600 font-medium">
                                    {session.price} FCFA
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="ml-4">
                            {session.meetingLink &&
                            session.meetingStatus === "open" ? (
                              <Link
                                to={`/group-therapy/${session.id}/meeting`}
                                className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-lg font-medium hover:from-purple-600 hover:to-pink-700 transition-all shadow-sm hover:shadow-md"
                              >
                                <Video className="h-4 w-4 mr-2" />
                                Rejoindre
                              </Link>
                            ) : (
                              <Link
                                to={`/group-therapy/${session.id}`}
                                className="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-all"
                              >
                                Voir détails
                              </Link>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

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
                            {formatDateTimeWithTimezone(
                              booking.date,
                              booking.startTime,
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
                              // Si c'est dans l'historique et que la date est passée, afficher comme "terminé"
                              activeTab === "past" &&
                                isDatePassed(booking.date) &&
                                (booking.status === "en_attente" ||
                                  booking.status === "confirmé" ||
                                  booking.status === "confirmed")
                                ? "completed"
                                : booking.status,
                            )}`}
                          >
                            {getStatusLabel(
                              // Si c'est dans l'historique et que la date est passée, afficher comme "terminé"
                              activeTab === "past" &&
                                isDatePassed(booking.date) &&
                                (booking.status === "en_attente" ||
                                  booking.status === "confirmé" ||
                                  booking.status === "confirmed")
                                ? "completed"
                                : booking.status,
                            )}
                          </span>
                        </div>
                      </div>

                      {/* Bouton téléchargement facture — historique uniquement */}
                      {activeTab === "past" && (
                        <div className="flex justify-end mt-2">
                          <button
                            onClick={() => handleDownloadInvoice(booking)}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-colors duration-200"
                          >
                            <Download className="h-4 w-4" />
                            Télécharger la facture
                          </button>
                        </div>
                      )}

                      {/* Afficher les boutons seulement pour les consultations à venir */}
                      {activeTab === "upcoming" &&
                      (booking.status === "en_attente" ||
                        booking.status === "confirmé" ||
                        booking.status === "confirmed") ? (
                        <div className="flex justify-between items-center">
                          <div className="flex items-center space-x-4">
                            {/* Bouton Modifier - seulement pour les rendez-vous confirmés et pas dans les 2 jours */}
                            {(() => {
                              const canModify =
                                (booking.status === "confirmé" ||
                                  booking.status === "confirmed") &&
                                !isWithinTwoDays(booking.date) &&
                                !isDatePassed(booking.date);

                              return canModify ? (
                                <Link
                                  to={`/book/${booking.professionalId}?modify=${booking.id}`}
                                  className="flex items-center text-blue-500 text-sm font-medium hover:text-blue-600 transition-colors"
                                >
                                  <Edit className="h-4 w-4 mr-1" />
                                  Modifier
                                </Link>
                              ) : (
                                <span
                                  className="flex items-center text-gray-400 text-sm font-medium cursor-not-allowed"
                                  aria-disabled="true"
                                  title="La modification n'est plus possible à moins de 2 jours"
                                >
                                  <Edit className="h-4 w-4 mr-1" />
                                  Modifier
                                </span>
                              );
                            })()}
                          </div>
                          {isConsultationDay(booking.date) ? (
                            <Link
                              to={`/consultation/${booking.id}`}
                              className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-md hover:shadow-lg flex items-center"
                            >
                              <Play className="h-4 w-4 mr-2" />
                              Rejoindre
                            </Link>
                          ) : (
                            <div className="bg-gray-300 text-gray-500 px-6 py-2.5 rounded-xl text-sm font-semibold flex items-center cursor-not-allowed">
                              <Play className="h-4 w-4 mr-2" />
                              Rejoindre
                              <span className="text-xs ml-2">
                                (Disponible le jour J)
                              </span>
                            </div>
                          )}
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

          {/* Medical Records Section - MASQUÉE TEMPORAIREMENT */}
          {false && (
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
              ) : medicalRecords.length === 0 ? (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FileText className="h-8 w-8 text-gray-400" />
                  </div>
                  <p className="text-gray-500 font-medium mb-4">
                    Vous n'avez pas encore de dossiers médicaux.
                  </p>
                  <button
                    onClick={() => setShowMedicalRecordModal(true)}
                    className="bg-gradient-to-r from-green-500 to-green-600 text-white px-6 py-2.5 rounded-xl font-semibold hover:from-green-600 hover:to-green-700 transition-all duration-200 shadow-md hover:shadow-lg flex items-center mx-auto"
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Voir tous les dossiers
                  </button>
                </div>
              ) : null}

              {medicalRecords.length > 0 ? (
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
                                    record.consultationDate
                                      ? new Date(record.consultationDate)
                                      : record.createdAt?.toDate
                                        ? record.createdAt.toDate()
                                        : new Date(),
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
                                onClick={() => showPrescription(record)}
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
                          {record.recommendations && (
                            <p className="text-gray-700 text-sm">
                              <span className="font-semibold">
                                Recommandations:
                              </span>{" "}
                              {record.recommendations}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {medicalRecords.length > 3 && (
                    <div className="p-6 bg-gray-50 border-t border-gray-100 text-center">
                      <button
                        onClick={loadAllRecords}
                        className="text-blue-500 hover:text-blue-600 text-sm font-semibold flex items-center justify-center mx-auto"
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Voir tous les dossiers ({medicalRecords.length})
                      </button>
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          )}

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
                      <span className="font-semibold text-gray-900">
                        Centre de messagerie
                      </span>
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
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Centre de messagerie
                  </h3>
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
                          onClick={() => showPrescription(selectedRecord)}
                          className="flex items-center text-green-600 hover:text-green-700 bg-green-50 hover:bg-green-100 px-3 py-1.5 rounded text-sm"
                        >
                          <Pill className="h-4 w-4 mr-1" />
                          <span>Ordonnance</span>
                        </button>
                      )}
                      <button
                        onClick={() => showRecommendations(selectedRecord)}
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
                  {loadingRecords ? (
                    // Skeleton loader pendant le chargement
                    <div className="space-y-4">
                      {[1, 2, 3].map((i) => (
                        <div
                          key={i}
                          className="bg-gray-50 rounded-lg p-4 animate-pulse"
                        >
                          <div className="flex justify-between items-center mb-2">
                            <div className="flex items-center space-x-2">
                              <div className="h-4 w-4 bg-gray-300 rounded"></div>
                              <div className="h-4 w-20 bg-gray-300 rounded"></div>
                              <div className="h-4 w-16 bg-gray-300 rounded-full"></div>
                            </div>
                            <div className="h-5 w-5 bg-gray-300 rounded"></div>
                          </div>
                          <div className="h-4 w-32 bg-gray-300 rounded mb-2"></div>
                          <div className="h-4 w-48 bg-gray-300 rounded"></div>
                        </div>
                      ))}
                    </div>
                  ) : medicalRecords.length > 0 ? (
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
                      {recordError ? (
                        <div>
                          <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
                          <h3 className="text-lg font-medium text-gray-900 mb-2">
                            Erreur de chargement
                          </h3>
                          <p className="text-gray-500 mb-4">{recordError}</p>
                          <button
                            onClick={() => {
                              setRecordError(null);
                              // Retry the fetch
                              if (currentUser?.id) {
                                setLoadingRecords(true);
                                getPatientMedicalRecords(currentUser.id)
                                  .then(setMedicalRecords)
                                  .catch((error) => {
                                    console.error("Retry failed:", error);
                                    setRecordError(
                                      "Échec de la nouvelle tentative. Vérifiez votre connexion.",
                                    );
                                  })
                                  .finally(() => setLoadingRecords(false));
                              }
                            }}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                          >
                            Réessayer
                          </button>
                        </div>
                      ) : (
                        <>
                          <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                          <h3 className="text-lg font-medium text-gray-900 mb-2">
                            Aucun dossier médical
                          </h3>
                          <p className="text-gray-500">
                            Vous n'avez pas encore de dossier médical
                            enregistré.
                          </p>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}
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
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-6">
                {/* Header */}
                <div className="text-center border-b border-gray-200 pb-4">
                  <h3 className="text-2xl font-bold text-blue-600 mb-2">
                    ORDONNANCE MÉDICALE
                  </h3>
                  <div className="flex justify-between items-center text-sm text-gray-600">
                    <span>Dr. {currentPrescription.professionalName}</span>
                    <span>
                      Date: {formatDate(currentPrescription.consultationDate)}
                    </span>
                  </div>
                </div>

                {/* Patient Info */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-2">
                    Informations patient
                  </h4>
                  <p className="text-gray-700">Nom: {currentUser?.name}</p>
                  <p className="text-gray-700">
                    Type de consultation:{" "}
                    {currentPrescription.consultationType || "Vidéo"}
                  </p>
                </div>

                {/* Diagnosis */}
                {currentPrescription.diagnosis && (
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">
                      Diagnostic
                    </h4>
                    <p className="text-gray-700 bg-yellow-50 p-3 rounded-lg border-l-4 border-yellow-400">
                      {currentPrescription.diagnosis}
                    </p>
                  </div>
                )}

                {/* Treatment */}
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2 flex items-center">
                    <Pill className="h-5 w-5 mr-2 text-green-600" />
                    Traitement prescrit
                  </h4>
                  <div className="bg-green-50 p-4 rounded-lg border-l-4 border-green-400">
                    <p className="text-gray-800 whitespace-pre-wrap">
                      {currentPrescription.treatment}
                    </p>
                  </div>
                </div>

                {/* Recommendations */}
                {currentPrescription.recommendations && (
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">
                      Recommandations
                    </h4>
                    <p className="text-gray-700 bg-blue-50 p-3 rounded-lg border-l-4 border-blue-400">
                      {currentPrescription.recommendations}
                    </p>
                  </div>
                )}

                {/* Download Button */}
                <div className="text-center pt-4 border-t border-gray-200">
                  <button
                    onClick={() => generatePrescription(currentPrescription)}
                    className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold flex items-center mx-auto transition-colors"
                  >
                    <Download className="h-5 w-5 mr-2" />
                    Télécharger l'ordonnance en PDF
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recommendations Modal */}
      {showRecommendationsModal && currentRecommendations && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center flex-shrink-0">
              <h2 className="text-xl font-semibold flex items-center">
                <FileText className="h-6 w-6 mr-2 text-blue-600" />
                Recommandations médicales
              </h2>
              <button
                onClick={() => setShowRecommendationsModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-6">
                {/* Header */}
                <div className="text-center border-b border-gray-200 pb-4">
                  <h3 className="text-2xl font-bold text-blue-600 mb-2">
                    RECOMMANDATIONS MÉDICALES
                  </h3>
                  <div className="flex justify-between items-center text-sm text-gray-600">
                    <span>Dr. {currentRecommendations.professionalName}</span>
                    <span>
                      Date:{" "}
                      {formatDate(currentRecommendations.consultationDate)}
                    </span>
                  </div>
                </div>

                {/* Patient Info */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-2">
                    Informations patient
                  </h4>
                  <p className="text-gray-700">Nom: {currentUser?.name}</p>
                  <p className="text-gray-700">
                    Type de consultation:{" "}
                    {currentRecommendations.consultationType || "Vidéo"}
                  </p>
                </div>

                {/* Diagnosis */}
                {currentRecommendations.diagnosis && (
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">
                      Diagnostic
                    </h4>
                    <p className="text-gray-700 bg-yellow-50 p-3 rounded-lg border-l-4 border-yellow-400">
                      {currentRecommendations.diagnosis}
                    </p>
                  </div>
                )}

                {/* Recommendations */}
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2 flex items-center">
                    <FileText className="h-5 w-5 mr-2 text-blue-600" />
                    Recommandations de suivi
                  </h4>
                  <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-400">
                    <p className="text-gray-800 whitespace-pre-wrap">
                      {currentRecommendations.recommendations}
                    </p>
                  </div>
                </div>

                {/* Next Appointment */}
                {currentRecommendations.nextAppointmentDate && (
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2 flex items-center">
                      <Calendar className="h-5 w-5 mr-2 text-purple-600" />
                      Prochain rendez-vous
                    </h4>
                    <div className="bg-purple-50 p-4 rounded-lg border-l-4 border-purple-400">
                      <p className="text-gray-800">
                        {currentRecommendations.nextAppointmentDate}
                      </p>
                    </div>
                  </div>
                )}

                {/* Download Button */}
                <div className="text-center pt-4 border-t border-gray-200">
                  <button
                    onClick={() =>
                      generateRecommendations(currentRecommendations)
                    }
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold flex items-center mx-auto transition-colors"
                  >
                    <Download className="h-5 w-5 mr-2" />
                    Télécharger les recommandations en PDF
                  </button>
                </div>
              </div>
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
