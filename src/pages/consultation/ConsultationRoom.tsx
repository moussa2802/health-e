import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import {
  PhoneOff,
  FileText,
  Calendar,
  Save,
  CheckCircle,
  Download,
  Pill,
  AlertCircle,
  Wifi,
  WifiOff,
  PenTool,
} from "lucide-react";
import { jsPDF } from "jspdf";
import {
  joinRoom,
  getConnectionStatus,
  endConsultation,
  getRoomParticipants,
} from "../../services/jitsiService";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import { updatePatientMedicalRecord } from "../../services/patientService";
import { getProfessionalProfile } from "../../services/profileService";

interface MedicalRecordData {
  diagnosis: string;
  treatment: string;
  recommendations: string;
  nextAppointmentDate: string;
}

interface JitsiParticipant {
  displayName?: string;
  id: string;
  type?: string;
}

const ConsultationRoom: React.FC = () => {
  const convertImageUrlToBase64 = async (url: string): Promise<string> => {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const { id } = useParams<{ id: string }>();
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [showMedicalRecordPanel, setShowMedicalRecordPanel] = useState(false);
  const [medicalRecordData, setMedicalRecordData] = useState<MedicalRecordData>(
    {
      diagnosis: "",
      treatment: "",
      recommendations: "",
      nextAppointmentDate: "",
    }
  );
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [callDuration, setCallDuration] = useState(0);
  const [bothConnected, setBothConnected] = useState(false);
  const [timeoutMessage, setTimeoutMessage] = useState<string | null>(null);
  const [remoteUserName, setRemoteUserName] = useState<string>("");
  const [remoteUserId, setRemoteUserId] = useState<string>("");
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [jitsiLoaded, setJitsiLoaded] = useState(false);
  const [jitsiApiInitialized, setJitsiApiInitialized] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [participants, setParticipants] = useState<JitsiParticipant[]>([]);
  const [professionalProfile, setProfessionalProfile] = useState<any>(null);
  const [isPrescriptionSigned, setIsPrescriptionSigned] = useState(false);
  const [isSigningPrescription, setIsSigningPrescription] = useState(false);

  const jitsiContainerRef = useRef<HTMLDivElement>(null);
  const jitsiApiRef = useRef<JitsiMeetInstance | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  const durationTimerRef = useRef<NodeJS.Timeout | null>(null);
  const connectionStatusUnsubscribeRef = useRef<(() => void) | null>(null);
  const waitingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const participantsIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const roomId: string = id || "";
  const isInitiator: boolean = currentUser?.type === "patient";

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Fetch professional profile if current user is a professional
  useEffect(() => {
    const fetchProfessionalProfile = async () => {
      if (currentUser?.type !== "professional" || !currentUser?.id) return;

      try {
        const profile = await getProfessionalProfile(currentUser.id);
        setProfessionalProfile(profile);
      } catch (error) {
        console.error("Error fetching professional profile:", error);
      }
    };

    fetchProfessionalProfile();
  }, [currentUser]);

  // Load Jitsi Meet API script
  useEffect(() => {
    if (window.JitsiMeetExternalAPI) {
      console.log("✅ Jitsi Meet API already loaded");
      setJitsiLoaded(true);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://meet.health-e.sn/external_api.js";
    script.async = true;
    script.onload = () => {
      setJitsiLoaded(true);
      console.log("✅ Jitsi Meet API script loaded");
    };
    script.onerror = () => {
      console.error("❌ Error loading Jitsi Meet API script");
      setConnectionError(
        "Impossible de charger l'API Jitsi Meet. Veuillez vérifier votre connexion internet."
      );
    };
    document.body.appendChild(script);
  }, []);

  useEffect(() => {
    return () => {
      if (jitsiApiRef.current) {
        jitsiApiRef.current.dispose();
        jitsiApiRef.current = null;
        console.log("🧹 Jitsi instance nettoyée");
      }

      if (jitsiContainerRef.current) {
        jitsiContainerRef.current.innerHTML = "";
        console.log("♻️ Jitsi container vidé");
      }
    };
  }, []);

  // Fetch room participants periodically
  useEffect(() => {
    if (!roomId || !currentUser) return;

    // Initial fetch
    const fetchParticipants = async () => {
      try {
        const roomParticipants = await getRoomParticipants(roomId);
        console.log("👥 Room participants:", roomParticipants);
        setParticipants(roomParticipants);
      } catch (error) {
        console.error("❌ Error fetching room participants:", error);
      }
    };

    fetchParticipants();

    // Set up interval to fetch participants
    participantsIntervalRef.current = setInterval(fetchParticipants, 10000); // Every 10 seconds

    return () => {
      if (participantsIntervalRef.current) {
        clearInterval(participantsIntervalRef.current);
        participantsIntervalRef.current = null;
      }
    };
  }, [roomId, currentUser]);

  // Initialize Jitsi Meet when script is loaded
  useEffect(() => {
    console.log("🧪 DEBUG : jitsiLoaded =", jitsiLoaded);
    console.log("🧪 DEBUG : roomId =", roomId);
    console.log("🧪 DEBUG : currentUser =", currentUser);
    console.log(
      "🧪 DEBUG : jitsiContainerRef.current =",
      jitsiContainerRef.current
    );
    console.log("🧪 DEBUG : jitsiApiInitialized =", jitsiApiInitialized);

    if (!jitsiLoaded || !roomId || !currentUser || !jitsiContainerRef.current)
      return;

    try {
      console.log("🚀 Initializing Jitsi Meet API");

      // Generate a unique room name based on the consultation ID
      console.log("🔁 Consultation Room ID utilisé pour Jitsi:", roomId);
      const roomName = `health-e-${roomId}`;
      console.log("📺 Room ID depuis l'URL :", roomId);
      console.log("📺 Nom final de la salle Jitsi:", roomName);

      // Initialize Jitsi Meet API
      const domain = "meet.health-e.sn";
      const options = {
        roomName,
        width: "100%",
        height: "100%",
        parentNode: jitsiContainerRef.current,
        userInfo: {
          displayName:
            currentUser.name ||
            (currentUser.type === "patient" ? "Patient" : "Professionnel"),
        },
        configOverwrite: {
          prejoinPageEnabled: false, // Désactive l'écran "Je suis l'hôte"
          startWithAudioMuted: false,
          startWithVideoMuted: false,
          startAudioOnly: false,
          enableWelcomePage: false,
          disableDeepLinking: true,
          disableInviteFunctions: true,
          requireDisplayName: false,
          startSilent: false,
          // Configuration pour instance privée
          guestDialOutEnabled: false,
          guestDialInEnabled: false,
          liveStreamingEnabled: false,
          recordingEnabled: false,
          transcribingEnabled: false,
          breakoutRoomsEnabled: false,
          prejoinPageEnabled: false,
        },
        interfaceConfigOverwrite: {
          TOOLBAR_BUTTONS: [
            "microphone",
            "camera",
            "chat",
            "screenSharing",
            "tileview"
          ],
          filmStripOnly: false,
          SHOW_JITSI_WATERMARK: false, // Supprime le watermark Jitsi
          SHOW_WATERMARK_FOR_GUESTS: false,
          DEFAULT_BACKGROUND: "#3c4043",
          DEFAULT_REMOTE_DISPLAY_NAME: "Participant",
          DISABLE_JOIN_LEAVE_NOTIFICATIONS: true,
          HIDE_INVITE_MORE_HEADER: true,
          // Suppression des éléments inutiles
          SHOW_POWERED_BY: false, // Supprime "Powered by Jitsi"
          SHOW_JITSI_WATERMARK: false, // Supprime le watermark
          SHOW_WATERMARK_FOR_GUESTS: false,
          SHOW_BRAND_WATERMARK: false, // Supprime les marques
          SHOW_PROMOTIONAL_SPOTLIGHT: false, // Supprime les promotions
          SHOW_MEETING_TIMER: true, // Garde le timer de réunion
          SHOW_PARTICIPANT_COUNT: true, // Garde le compteur de participants
          // Interface épurée pour téléconsultation
          TOOLBAR_ALWAYS_VISIBLE: true,
          VERTICAL_FILMSTRIP: true,
          HIDE_KICK_PARTICIPANT: true, // Cache l'option d'expulsion
          HIDE_RAISE_HAND: false, // Garde la main levée
          HIDE_VIDEO_QUALITY_BUTTON: false, // Garde la qualité vidéo
        },
      };

      if (!jitsiContainerRef.current) {
        console.error("❌ Le conteneur Jitsi n'est pas prêt !");
        return;
      }
      console.log("🖼️ Container exists:", jitsiContainerRef.current);
      console.log("📺 RoomName utilisé :", roomName);
      console.log("✅ Creating Jitsi API");

      // Create Jitsi Meet API instance
      // 🔁 Ajouter une clé unique à la room pour forcer le bon rendu iframe
      console.log("📺 RoomName utilisé :", options.roomName);
      console.log("📦 Appel API Jitsi avec options :", options);
      const api = new window.JitsiMeetExternalAPI(domain, options);
      jitsiApiRef.current = api;
      console.log("✅ Jitsi API created");

      // Add event listeners
      api.addListener("videoConferenceJoined", () => {
        console.log("✅ Joined Jitsi Meet conference");
        console.log(
          "✅ Jitsi: videoConferenceJoined triggered by:",
          currentUser.name
        );
        setJitsiApiInitialized(true);
        // Start call duration timer
        startCallDurationTimer();
      });

      api.addListener("participantJoined", (participant: JitsiParticipant) => {
        console.log("👤 Participant joined:", participant);
        if (participant.displayName?.toLowerCase().includes("patient")) {
          console.log("🧍‍♀️ Le patient a rejoint la salle !");
        } else if (
          participant.displayName?.toLowerCase().includes("dr") ||
          participant.displayName?.toLowerCase().includes("professionnel")
        ) {
          console.log("👤 Participant joined:", participant);
          console.log("🧍‍⚕️ Le professionnel a rejoint la salle !");
        }

        // Set remote user name if available
        if (participant.displayName) {
          setRemoteUserName(participant.displayName);
          setRemoteUserId(participant.id);
        }

        // Clear timeout message
        setTimeoutMessage(null);

        // Clear waiting timeout
        if (waitingTimeoutRef.current) {
          clearTimeout(waitingTimeoutRef.current);
          waitingTimeoutRef.current = null;
        }
      });

      // Join the room in Firebase
      joinRoom(
        roomId,
        currentUser.id,
        currentUser.name ||
          (currentUser.type === "patient" ? "Patient" : "Professionnel"),
        currentUser.type as "patient" | "professional" | "admin"
      )
        .then((cleanup) => {
          cleanupRef.current = cleanup;
        })
        .catch((error) => {
          console.error("❌ Error joining room:", error);
          setConnectionError(
            "Erreur lors de la connexion à la salle de consultation"
          );
        });

      // Listen for connection status changes
      const unsubscribeConnectionStatus = getConnectionStatus(
        roomId,
        (status) => {
          console.log("🔌 Connection status update:", status);

          const bothConnected =
            status.patientConnected && status.professionalConnected;
          setBothConnected(bothConnected);

          if (bothConnected) {
            console.log("✅ Both participants are connected!");

            // Clear any waiting timeout
            if (waitingTimeoutRef.current) {
              clearTimeout(waitingTimeoutRef.current);
              waitingTimeoutRef.current = null;
            }

            // Clear timeout message
            setTimeoutMessage(null);
          }
        }
      );

      connectionStatusUnsubscribeRef.current = unsubscribeConnectionStatus;

      // Set a timeout to show a message if the other participant doesn't connect
      const timeout = setTimeout(() => {
        const message = isInitiator
          ? "Le professionnel n'a pas répondu. Veuillez réessayer plus tard."
          : "Le patient n'a pas rejoint la consultation. Veuillez réessayer plus tard.";

        setTimeoutMessage(message);
      }, 60000); // 60 seconds

      waitingTimeoutRef.current = timeout;
    } catch (error) {
      console.error("❌ Error initializing Jitsi Meet:", error);
      setConnectionError(
        "Erreur lors de l'initialisation de la consultation vidéo"
      );
    }

    return () => {
      // Clean up Jitsi API
      if (jitsiApiRef.current) {
        jitsiApiRef.current.dispose();
        jitsiApiRef.current = null;
      }

      // Clean up room participation
      if (cleanupRef.current) {
        cleanupRef.current();
      }

      // Clean up connection status listener
      if (connectionStatusUnsubscribeRef.current) {
        connectionStatusUnsubscribeRef.current();
      }

      // Stop call duration timer
      stopCallDurationTimer();

      // Clear waiting timeout
      if (waitingTimeoutRef.current) {
        clearTimeout(waitingTimeoutRef.current);
      }

      // Clear participants interval
      if (participantsIntervalRef.current) {
        clearInterval(participantsIntervalRef.current);
        participantsIntervalRef.current = null;
      }

      console.log("🧹 Cleanup complet effectué après la session Jitsi.");
    };
  }, [jitsiLoaded, roomId, currentUser, isInitiator, jitsiApiInitialized]);

  // Start call duration timer
  const startCallDurationTimer = () => {
    if (durationTimerRef.current) {
      clearInterval(durationTimerRef.current);
    }

    durationTimerRef.current = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);
  };

  // Stop call duration timer
  const stopCallDurationTimer = () => {
    if (durationTimerRef.current) {
      clearInterval(durationTimerRef.current);
      durationTimerRef.current = null;
    }
  };

  // Format call duration
  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    return [
      hours > 0 ? String(hours).padStart(2, "0") : null,
      String(minutes).padStart(2, "0"),
      String(secs).padStart(2, "0"),
    ]
      .filter(Boolean)
      .join(":");
  };

  // End call
  const endCall = async () => {
    try {
      // End the consultation in Firebase
      if (currentUser) {
        await endConsultation(roomId, currentUser.id);
      }

      // Dispose Jitsi API
      if (jitsiApiRef.current) {
        jitsiApiRef.current.dispose();
        jitsiApiRef.current = null;
      }

      // Stop call duration timer
      stopCallDurationTimer();

      // Navigate back to dashboard
      navigate(
        currentUser?.type === "patient"
          ? "/patient/dashboard"
          : "/professional/dashboard"
      );
    } catch (error) {
      console.error("❌ Error ending call:", error);
      // Navigate anyway
      navigate(
        currentUser?.type === "patient"
          ? "/patient/dashboard"
          : "/professional/dashboard"
      );
    }
  };

  // Find patient ID from participants
  const findPatientId = (): string | null => {
    console.log("🔍 [CONSULTATION DEBUG] Finding patient ID...");
    console.log("🔍 [CONSULTATION DEBUG] Room ID:", roomId);
    console.log(
      "🔍 [CONSULTATION DEBUG] Current user:",
      currentUser?.id,
      currentUser?.type
    );
    console.log("🔍 [CONSULTATION DEBUG] Remote user ID:", remoteUserId);
    console.log("🔍 [CONSULTATION DEBUG] Participants:", participants);

    // First check if we have participants from Firebase
    if (participants.length > 0) {
      const patientParticipant = participants.find((p) => p.type === "patient");
      if (patientParticipant) {
        console.log(
          "✅ Found patient from Firebase participants:",
          patientParticipant.id
        );
        return patientParticipant.id;
      }
    }

    // If we're the patient, return our ID
    if (currentUser?.type === "patient") {
      console.log("✅ Current user is the patient:", currentUser.id);
      return currentUser.id;
    }

    // If we have a remote user ID and we're the professional, use it as patient ID
    if (remoteUserId && currentUser?.type === "professional") {
      console.log("✅ Using remote user as patient:", remoteUserId);
      return remoteUserId;
    }

    // For instant consultations, extract patient ID from room ID
    if (roomId && roomId.startsWith("instant-")) {
      // Format: instant-patientId-timestamp
      const parts = roomId.split("-");
      if (parts.length >= 2) {
        const possiblePatientId = parts[1];
        console.log(
          "✅ Extracted patient ID from instant consultation room ID:",
          possiblePatientId
        );
        return possiblePatientId;
      }
    }

    // For booking consultations, try to extract from room ID
    if (roomId && roomId.startsWith("booking-")) {
      const bookingId = roomId.replace("booking-", "");
      console.log("🔍 [CONSULTATION DEBUG] Extracted booking ID:", bookingId);
      
      // Try to get patient ID from URL parameters
      const urlParams = new URLSearchParams(window.location.search);
      const patientIdFromUrl = urlParams.get("patientId");
      if (patientIdFromUrl) {
        console.log("✅ Found patient ID from URL:", patientIdFromUrl);
        return patientIdFromUrl;
      }
    }

    // If all else fails, try to get from the other participant
    if (participants.length > 0 && currentUser?.type === "professional") {
      const otherParticipant = participants.find(p => p.id !== currentUser.id);
      if (otherParticipant) {
        console.log("✅ Using other participant as patient:", otherParticipant.id);
        return otherParticipant.id;
      }
    }

    console.warn("⚠️ Could not determine patient ID");
    console.warn("⚠️ [CONSULTATION DEBUG] All identification methods failed");
    return null;
  };

  // Sign prescription
  const handleSignPrescription = () => {
    if (
      !medicalRecordData.treatment ||
      medicalRecordData.treatment.trim() === ""
    ) {
      alert(
        "Veuillez d'abord saisir un traitement avant de signer l'ordonnance."
      );
      return;
    }

    setIsSigningPrescription(true);

    // Simulate signing process
    setTimeout(() => {
      setIsPrescriptionSigned(true);
      setIsSigningPrescription(false);
    }, 1000);
  };

  // Save medical record
  const handleSaveMedicalRecord = async () => {
    if (!currentUser) {
      setSaveError("Utilisateur non connecté. Veuillez vous reconnecter.");
      return;
    }

    // Find the patient ID using our helper function
    const patientId = findPatientId();

    if (!patientId) {
      setSaveError("Impossible d'identifier le patient. Veuillez réessayer.");
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    try {
      console.log("📝 Saving medical record for patient:", patientId);
      console.log("📝 Professional ID:", currentUser.id);
      console.log("📝 Medical record data:", {
        diagnosis: medicalRecordData.diagnosis,
        treatment: medicalRecordData.treatment,
        recommendations: medicalRecordData.recommendations,
      });

      // Save medical record to patient's profile
      await updatePatientMedicalRecord(patientId, {
        diagnosis: medicalRecordData.diagnosis,
        treatment: medicalRecordData.treatment,
        recommendations: medicalRecordData.recommendations,
        nextAppointmentDate: medicalRecordData.nextAppointmentDate,
        professionalId: currentUser.id,
        professionalName: currentUser.name || "Professionnel",
        consultationDate: new Date().toISOString(),
        consultationType: "video",
        consultationId: roomId,
        isPrescriptionSigned: true,
        signatureUrl: professionalProfile?.signatureUrl || null,
        stampUrl: professionalProfile?.stampUrl || null,
        useElectronicSignature:
          professionalProfile?.useElectronicSignature || false,
      });

      console.log("✅ Medical record updated successfully");
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error: any) {
      console.error("❌ Error saving medical record:", error);
      console.error("❌ Error details:", {
        code: error.code,
        message: error.message,
        patientId,
        professionalId: currentUser.id,
      });

      // Check if it's just a patient update error but medical record was created
      if (
        error.message &&
        error.message.includes("patient reference update failed")
      ) {
        console.log(
          "✅ Medical record created successfully despite patient update error"
        );
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        console.error(
          "💾 [CONSULTATION DEBUG] Unhandled error during medical record save:",
          error
        );
        setSaveError(
          `Erreur lors de l'enregistrement: ${
            error.message || "Erreur inconnue"
          }`
        );
      }
    } finally {
      setIsSaving(false);
    }
  };

  // Generate medical report PDF
  const generateMedicalReport = async () => {
    const doc = new jsPDF();

    // Add header
    doc.setFontSize(20);
    doc.text("Health-e", 105, 20, { align: "center" });

    doc.setFontSize(12);
    doc.text("Rapport de Consultation", 105, 30, { align: "center" });

    // Add professional info
    doc.setFontSize(11);
    doc.text(`Dr. ${currentUser?.name}`, 20, 50);
    doc.text(`${currentUser?.specialty || "Professionnel de santé"}`, 20, 57);

    // Calculate patient age if possible
    let patientAge = "";
    const patient = participants.find((p) => p.type === "patient");
    if (patient && patient.dateOfBirth) {
      const birthDate = new Date(patient.dateOfBirth);
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
    doc.text(`Patient : ${remoteUserName || "Patient"} ${patientAge}`, 20, 70);

    // Add consultation date
    doc.text(`Date : ${new Date().toLocaleDateString()}`, 20, 80);

    // Add content
    doc.setFontSize(12);
    doc.text("Diagnostic:", 20, 100);
    doc.setFontSize(11);
    doc.text(
      medicalRecordData.diagnosis || "Aucun diagnostic fourni",
      20,
      110,
      {
        maxWidth: 170,
      }
    );

    doc.setFontSize(12);
    doc.text("Traitement:", 20, 130);
    doc.setFontSize(11);
    doc.text(
      medicalRecordData.treatment || "Aucun traitement fourni",
      20,
      140,
      { maxWidth: 170 }
    );

    doc.setFontSize(12);
    doc.text("Recommandations:", 20, 160);
    doc.setFontSize(11);
    doc.text(
      medicalRecordData.recommendations || "Aucune recommandation fournie",
      20,
      170,
      { maxWidth: 170 }
    );

    doc.setFontSize(12);
    doc.text("Prochain rendez-vous:", 20, 200);
    doc.setFontSize(11);
    doc.text(medicalRecordData.nextAppointmentDate || "À déterminer", 20, 210);

    // Add signature if electronic signature is enabled
    if (professionalProfile?.useElectronicSignature) {
      try {
        // Convert URLs to base64 before inserting into PDF
        const [signatureBase64, stampBase64] = await Promise.all([
          professionalProfile.signatureUrl
            ? convertImageUrlToBase64(professionalProfile.signatureUrl)
            : null,
          professionalProfile.stampUrl
            ? convertImageUrlToBase64(professionalProfile.stampUrl)
            : null,
        ]);

        // Add stamp first (at the bottom right)
        if (stampBase64) {
          doc.addImage(stampBase64, "PNG", 140, 220, 40, 40);
        }

        // Add signature below the stamp
        if (signatureBase64) {
          doc.addImage(signatureBase64, "PNG", 140, 265, 50, 20);
        }

        // Add legal mention
        doc.setFontSize(8);
        doc.text(
          "Document signé électroniquement conformément à la réglementation en vigueur.",
          20,
          280
        );
      } catch (error) {
        console.error(
          "❌ Erreur d'ajout de la signature/cachet dans le PDF :",
          error
        );
        doc.setFontSize(9);
        doc.text("Signature électronique non disponible", 130, 230);
      }
    }

    // Save the PDF
    doc.save(
      `rapport-medical-${remoteUserName}-${
        new Date().toISOString().split("T")[0]
      }.pdf`
    );
  };

  // Generate prescription PDF
  const generatePrescription = async () => {
    if (
      !medicalRecordData.treatment ||
      medicalRecordData.treatment.trim() === ""
    ) {
      alert(
        "Veuillez d'abord saisir un traitement avant de générer une ordonnance."
      );
      return;
    }

    // If prescription is not signed and user is professional with electronic signature enabled
    if (
      !isPrescriptionSigned &&
      currentUser?.type === "professional" &&
      professionalProfile?.useElectronicSignature &&
      (professionalProfile?.signatureUrl || professionalProfile?.stampUrl)
    ) {
      alert("Veuillez d'abord signer l'ordonnance avant de la télécharger.");
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
    doc.text(`Dr. ${currentUser?.name || "Professionnel"}`, 20, 40);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.text(`${currentUser?.specialty || "Professionnel de santé"}`, 20, 47);

    // Add line separator
    doc.setDrawColor(0, 102, 204);
    doc.setLineWidth(0.5);
    doc.line(20, 55, 190, 55);

    // Calculate patient age if possible
    let patientAge = "";
    const patient = participants.find((p) => p.type === "patient");
    if (patient && patient.dateOfBirth) {
      const birthDate = new Date(patient.dateOfBirth);
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
    doc.text(`Patient : ${remoteUserName || "Patient"} ${patientAge}`, 20, 65);

    // Format date
    const consultationDate = new Date();
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
    const treatmentLines = doc.splitTextToSize(
      medicalRecordData.treatment,
      160
    );
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

    // Add signature and stamp if available and enabled
    if (professionalProfile?.useElectronicSignature) {
      try {
        const [signatureBase64, stampBase64] = await Promise.all([
          professionalProfile.signatureUrl
            ? convertImageUrlToBase64(professionalProfile.signatureUrl)
            : null,
          professionalProfile.stampUrl
            ? convertImageUrlToBase64(professionalProfile.stampUrl)
            : null,
        ]);

        // Add stamp first (at the bottom right)
        if (stampBase64) {
          doc.addImage(stampBase64, "PNG", 140, yPos + 30, 40, 40);
        }

        // Add signature below the stamp
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
        console.error(
          `❌ Erreur d'ajout de la signature/cachet dans le PDF :`,
          error
        );
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
    doc.save(`ordonnance-${remoteUserName.replace(" ", "_")}-${dateStr}.pdf`);
  };

  useEffect(() => {
    return () => {
      if (jitsiApiRef.current) {
        jitsiApiRef.current.dispose();
        jitsiApiRef.current = null;
      }

      if (jitsiContainerRef.current) {
        jitsiContainerRef.current.innerHTML = "";
        console.log("♻️ Jitsi container reset");
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-lg border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-gray-900">Consultation vidéo</h1>
              <span
                className={`px-4 py-2 rounded-full text-sm font-medium ${
                  bothConnected
                    ? "bg-green-100 text-green-800 border border-green-200"
                    : "bg-yellow-100 text-yellow-800 border border-yellow-200"
                }`}
              >
                {bothConnected
                  ? "✅ Consultation active"
                  : "⏳ En attente de connexion..."}
              </span>
            </div>
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-2 bg-white px-4 py-2 rounded-lg shadow-sm border">
                <span className="text-sm font-medium text-gray-700">
                  Durée: {formatDuration(callDuration)}
                </span>
              </div>
              <div
                className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium ${
                  isOnline
                    ? "bg-green-100 text-green-800 border border-green-200"
                    : "bg-red-100 text-red-800 border border-red-200"
                }`}
              >
                {isOnline ? (
                  <Wifi className="h-4 w-4 mr-2" />
                ) : (
                  <WifiOff className="h-4 w-4 mr-2" />
                )}
                {isOnline ? "En ligne" : "Hors ligne"}
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        {/* Error Messages */}
        {connectionError && (
          <div className="mb-6">
            <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-xl shadow-sm">
              <strong className="font-semibold">Erreur de connexion : </strong>
              <span className="block sm:inline">{connectionError}</span>
            </div>
          </div>
        )}

        {timeoutMessage && (
          <div className="mb-6">
            <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-6 py-4 rounded-xl shadow-sm flex items-center">
              <AlertCircle className="h-5 w-5 mr-3" />
              <span className="font-medium">{timeoutMessage}</span>
            </div>
          </div>
        )}

        {/* Success notification */}
        {saveSuccess && (
          <div className="fixed top-24 right-6 z-50 bg-green-50 border border-green-200 text-green-700 px-6 py-4 rounded-xl shadow-lg animate-fade-in-out flex items-center">
            <CheckCircle className="h-5 w-5 mr-3" />
            <span className="font-medium">Dossier médical enregistré avec succès</span>
          </div>
        )}

        {/* Main content area */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Video Container - Takes 2/3 on desktop */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
              {/* Video Area */}
              <div className="relative">
                {!jitsiLoaded ? (
                  <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-t-2xl overflow-hidden aspect-video w-full flex items-center justify-center">
                    <div className="text-center text-white">
                      <LoadingSpinner size="lg" color="white" />
                      <p className="mt-4 text-lg font-medium">Chargement de la vidéoconférence...</p>
                    </div>
                  </div>
                ) : (
                  <div className="bg-black rounded-t-2xl overflow-hidden" style={{ height: '70vh', maxHeight: '600px' }}>
                    <div ref={jitsiContainerRef} className="w-full h-full"></div>
                  </div>
                )}

                {/* Connection Status Banner - Moved outside video area to avoid overlapping Jitsi controls */}
                {bothConnected && (
                  <div className="mt-4 px-4">
                    <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-xl shadow-sm flex items-center justify-center">
                      <div className="flex items-center">
                        <div className="w-3 h-3 bg-green-500 rounded-full mr-3 animate-pulse"></div>
                        <span className="font-medium">
                          ✅ Consultation active - Les deux participants sont connectés
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Controls */}
              <div className="p-6 bg-gray-50 border-t border-gray-200">
                <div className="flex flex-col sm:flex-row justify-center space-y-3 sm:space-y-0 sm:space-x-4">
                  {currentUser?.type === "professional" && (
                    <button
                      onClick={() =>
                        setShowMedicalRecordPanel(!showMedicalRecordPanel)
                      }
                      className={`px-6 py-3 rounded-xl font-medium transition-all duration-200 flex items-center justify-center ${
                        showMedicalRecordPanel
                          ? "bg-blue-600 text-white shadow-lg transform scale-105"
                          : "bg-blue-100 text-blue-700 hover:bg-blue-200 hover:shadow-md"
                      }`}
                    >
                      <FileText className="h-5 w-5 mr-2" />
                      Dossier médical
                    </button>
                  )}

                  <button
                    onClick={endCall}
                    className="px-6 py-3 rounded-xl bg-red-600 text-white hover:bg-red-700 transition-all duration-200 flex items-center justify-center font-medium shadow-lg hover:shadow-xl transform hover:scale-105"
                  >
                    <PhoneOff className="h-5 w-5 mr-2" />
                    Terminer l'appel
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Medical Record Panel - Takes 1/3 on desktop */}
          {showMedicalRecordPanel && currentUser?.type === "professional" && (
            <div className="lg:col-span-1">
              <div className="bg-white rounded-2xl shadow-lg overflow-hidden h-full flex flex-col">
                <div className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200">
                  <h2 className="text-xl font-bold text-gray-900">Dossier médical</h2>
                  <p className="text-sm text-gray-600 mt-1">Remplissez les informations de consultation</p>
                </div>

                <div className="flex-1 p-6 overflow-y-auto">
                  {saveSuccess && (
                    <div className="mb-6 p-4 bg-green-50 text-green-800 rounded-xl border border-green-200 flex items-center">
                      <CheckCircle className="h-5 w-5 mr-3" />
                      <span className="font-medium">Dossier médical enregistré avec succès</span>
                    </div>
                  )}

                  {saveError && (
                    <div className="mb-6 p-4 bg-red-50 text-red-800 rounded-xl border border-red-200 flex items-center">
                      <AlertCircle className="h-5 w-5 mr-3" />
                      <span className="font-medium">{saveError}</span>
                    </div>
                  )}

                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Diagnostic
                      </label>
                      <textarea
                        value={medicalRecordData.diagnosis}
                        onChange={(e) =>
                          setMedicalRecordData({
                            ...medicalRecordData,
                            diagnosis: e.target.value,
                          })
                        }
                        rows={4}
                        className="w-full rounded-xl border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 resize-none"
                        placeholder="Entrez le diagnostic..."
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center">
                        <Pill className="h-4 w-4 mr-2" />
                        Traitement
                      </label>
                      <textarea
                        value={medicalRecordData.treatment}
                        onChange={(e) => {
                          setMedicalRecordData({
                            ...medicalRecordData,
                            treatment: e.target.value,
                          });
                          setIsPrescriptionSigned(false);
                        }}
                        rows={4}
                        className="w-full rounded-xl border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 resize-none"
                        placeholder="Prescrire le traitement..."
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Recommandations
                      </label>
                      <textarea
                        value={medicalRecordData.recommendations}
                        onChange={(e) =>
                          setMedicalRecordData({
                            ...medicalRecordData,
                            recommendations: e.target.value,
                          })
                        }
                        rows={4}
                        className="w-full rounded-xl border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 resize-none"
                        placeholder="Ajoutez des recommandations..."
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Prochain rendez-vous
                      </label>
                      <div className="flex items-center">
                        <Calendar className="h-5 w-5 text-gray-400 mr-3" />
                        <input
                          type="date"
                          value={medicalRecordData.nextAppointmentDate}
                          onChange={(e) =>
                            setMedicalRecordData({
                              ...medicalRecordData,
                              nextAppointmentDate: e.target.value,
                            })
                          }
                          className="w-full rounded-xl border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-6 border-t border-gray-200 bg-gray-50">
                  <div className="flex flex-col space-y-3">
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={generateMedicalReport}
                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors flex items-center text-sm font-medium"
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        Rapport
                      </button>

                      {/* Sign Prescription Button */}
                      {medicalRecordData.treatment &&
                        professionalProfile?.useElectronicSignature &&
                        (professionalProfile?.signatureUrl ||
                          professionalProfile?.stampUrl) && (
                          <button
                            onClick={handleSignPrescription}
                            disabled={isPrescriptionSigned || isSigningPrescription}
                            className={`px-4 py-2 rounded-lg transition-colors flex items-center text-sm font-medium ${
                              isPrescriptionSigned
                                ? "bg-green-100 text-green-700 border border-green-200"
                                : isSigningPrescription
                                ? "bg-blue-100 text-blue-700 opacity-75"
                                : "bg-blue-100 text-blue-700 hover:bg-blue-200"
                            }`}
                          >
                            {isSigningPrescription ? (
                              <>
                                <LoadingSpinner size="sm" className="mr-2" />
                                Signature...
                              </>
                            ) : isPrescriptionSigned ? (
                              <>
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Signé
                              </>
                            ) : (
                              <>
                                <PenTool className="h-4 w-4 mr-2" />
                                Signer
                              </>
                            )}
                          </button>
                        )}

                      <button
                        onClick={generatePrescription}
                        disabled={
                          !medicalRecordData.treatment ||
                          (!isPrescriptionSigned &&
                            professionalProfile?.useElectronicSignature &&
                            (professionalProfile?.signatureUrl ||
                              professionalProfile?.stampUrl))
                        }
                        className={`px-4 py-2 rounded-lg transition-colors flex items-center text-sm font-medium ${
                          !medicalRecordData.treatment ||
                          (!isPrescriptionSigned &&
                            professionalProfile?.useElectronicSignature &&
                            (professionalProfile?.signatureUrl ||
                              professionalProfile?.stampUrl))
                            ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                            : "bg-green-100 text-green-700 hover:bg-green-200"
                        }`}
                      >
                        <Pill className="h-4 w-4 mr-2" />
                        Ordonnance
                      </button>
                    </div>

                    <button
                      onClick={handleSaveMedicalRecord}
                      disabled={isSaving}
                      className="w-full px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all duration-200 flex items-center justify-center font-medium shadow-lg hover:shadow-xl disabled:opacity-50"
                    >
                      {isSaving ? (
                        <LoadingSpinner size="sm" className="mr-3" />
                      ) : (
                        <Save className="h-5 w-5 mr-3" />
                      )}
                      Enregistrer le dossier
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ConsultationRoom;
