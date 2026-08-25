import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import {
  Calendar,
  Clock,
  Video,
  PhoneCall,
  CreditCard,
  Smartphone,
  ChevronRight,
  AlertCircle,
  User,
  Info,
  Edit,
  Loader2,
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useProfessionals } from "../../hooks/useProfessionals";
import { useAuth } from "../../contexts/AuthContext";
import NewAppointmentScheduler, {
  TimeSlot,
} from "../../components/calendar/NewAppointmentScheduler";
import { getProfessionalAvailabilityData } from "../../services/calendarService";
import {
  getAvailableTimeSlots,
  getAvailableDays,
} from "../../services/slotService";
import {
  createBooking,
  checkAvailability,
  updateBooking,
} from "../../services/bookingService";
// + ADD
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { getFirestoreInstance } from "../../utils/firebase";
import { formatLocalTime } from "../../utils/dateUtils";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import { getDatabase, ref, set } from "firebase/database";
import { createInstantConsultationRequest } from "../../services/jitsiService";
import { ensureFirestoreReady } from "../../utils/firebase";
import { paytechService } from "../../services/paytechService";

type ConsultationType = "video" | "audio";

interface PaymentMethod {
  id: string;
  name: string;
  type: "mobile" | "card";
  icon: React.ReactNode;
  description: string;
}

const BookAppointment: React.FC = () => {
  const { professionalId } = useParams<{ professionalId: string }>();
  const location = useLocation();
  const [professional, setProfessional] = useState<any | null>(null);
  const [selectedDay, setSelectedDay] = useState<string>("");
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [consultationType, setConsultationType] =
    useState<ConsultationType>("video");
  const [showPaymentStep, setShowPaymentStep] = useState<boolean>(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] =
    useState<string>("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [cvv, setCvv] = useState("");
  const [paymentError, setPaymentError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRequestingInstant, setIsRequestingInstant] = useState(false);
  const [availabilityChecking, setAvailabilityChecking] = useState(false);
  const [isSlotAvailable, setIsSlotAvailable] = useState(true);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [availabilityData, setAvailabilityData] = useState<any[]>([]);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<TimeSlot | null>(
    null
  );
  const [availableDays, setAvailableDays] = useState<Date[]>([]);
  const [isTesting, setIsTesting] = useState(true);

  // États pour la modification d'un rendez-vous
  const [isModifying, setIsModifying] = useState(false);
  const [bookingToModify, setBookingToModify] = useState<any | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  const getValidDate = (input: any): Date | null => {
    if (input instanceof Date) return input;
    if (input?.toDate) return input.toDate();
    if (typeof input === "string") return new Date(input);
    return null;
  };

  const {
    professionals,
    loading: professionalsLoading,
    error,
  } = useProfessionals();
  const { isAuthenticated, currentUser } = useAuth();
  const navigate = useNavigate();
  const database = getDatabase();

  // Rediriger les utilisateurs non connectés vers la page de connexion
  useEffect(() => {
    if (!isAuthenticated) {
      console.log("User not authenticated, redirecting to login");
      navigate("/patient");
      return;
    }
  }, [isAuthenticated, navigate]);

  // Gérer la modification d'un rendez-vous
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const modifyBookingId = searchParams.get("modify");

    if (modifyBookingId) {
      setIsModifying(true);
      // Charger les données du rendez-vous à modifier
      loadBookingToModify(modifyBookingId);
    }
  }, [location.search]);

  const loadBookingToModify = async (bookingId: string) => {
    try {
      console.log(
        "Mode modification activé pour le rendez-vous:",
        bookingId
      );

      // Charger les données du rendez-vous depuis Firestore
      const { getFirestoreInstance, ensureFirestoreReady } = await import(
        "../../utils/firebase"
      );
      const { doc, getDoc } = await import("firebase/firestore");

      await ensureFirestoreReady();
      const db = getFirestoreInstance();

      if (!db) {
        throw new Error("Firestore not available");
      }

      const bookingRef = doc(db, "bookings", bookingId);
      const bookingSnap = await getDoc(bookingRef);

      if (bookingSnap.exists()) {
        const bookingData = bookingSnap.data();
        setBookingToModify({
          id: bookingId,
          ...bookingData,
        });

        // Pré-remplir les champs avec les données existantes
        if (bookingData.date) {
          setSelectedDay(bookingData.date);
        }
        if (bookingData.startTime) {
          setSelectedTime(bookingData.startTime);
        }
        if (bookingData.type) {
          setConsultationType(bookingData.type);
        }

        // Créer un selectedTimeSlot pour la modification
        if (bookingData.date && bookingData.startTime) {
          setSelectedTimeSlot({
            date: bookingData.date,
            time: bookingData.startTime,
            available: true,
          });
        }

        console.log("Données du rendez-vous chargées:", bookingData);
      } else {
        throw new Error("Rendez-vous introuvable");
      }
    } catch (error) {
      console.error(
        "Erreur lors du chargement du rendez-vous à modifier:",
        error
      );
      setLocalError(
        "Impossible de charger les données du rendez-vous à modifier"
      );
    }
  };

  const paymentMethods: PaymentMethod[] = [
    {
      id: "mobile",
      name: "Mobile Money",
      type: "mobile",
      icon: <Smartphone className="h-6 w-6 text-sage" />,
      description: "Paiement via mobile money (Wave, Orange Money, MTN, etc.)",
    },
    {
      id: "card",
      name: "Carte bancaire",
      type: "card",
      icon: <CreditCard className="h-6 w-6 text-accent" />,
      description: "Paiement sécurisé par carte bancaire",
    },
  ];

  // Try to load from cache first
  useEffect(() => {
    if (!professionalId) return;

    try {
      setLoading(true);
      const cachedData = sessionStorage.getItem(
        `professional_${professionalId}`
      );
      if (cachedData) {
        console.log("Loading professional from cache");
        const parsedData = JSON.parse(cachedData);
        setProfessional(parsedData);

        // Debug info
        setDebugInfo({
          source: "cache",
          availabilityCount: parsedData?.availability?.length || 0,
          hasSlots: parsedData?.availability?.some(
            (avail: any) =>
              avail?.slots &&
              Array.isArray(avail.slots) &&
              avail.slots.length > 0
          ),
        });

        // Initialize selected day if available
        if (
          parsedData?.availability &&
          Array.isArray(parsedData.availability) &&
          parsedData.availability.length > 0
        ) {
          setSelectedDay(parsedData.availability[0]?.day || "");

          // Set available slots for the first day
          const firstDayAvailability = parsedData.availability[0];
          const firstDaySlots = firstDayAvailability?.slots || [];
          setAvailableSlots(firstDaySlots);
        }
        setLoading(false);
      }
    } catch (error) {
      console.warn("Failed to load professional from cache:", error);
    }
  }, [professionalId]);

  // Charger les créneaux disponibles pour le mois en cours
  useEffect(() => {
    if (!professionalId) return;

    const loadAvailableSlots = async () => {
      try {
        setLoading(true);

        // Calculer le premier et le dernier jour du mois en cours
        const today = new Date();
        const startOfCurrentMonth = new Date(
          today.getFullYear(),
          today.getMonth(),
          1
        );
        const endOfNextMonth = new Date(
          today.getFullYear(),
          today.getMonth() + 2,
          0
        );

        console.log(
          `Chargement des jours disponibles du ${format(
            startOfCurrentMonth,
            "dd/MM/yyyy"
          )} au ${format(endOfNextMonth, "dd/MM/yyyy")}`
        );

        // Récupérer tous les jours disponibles pour cette période
        const days = await getAvailableDays(
          startOfCurrentMonth,
          endOfNextMonth,
          professionalId
        );
        setAvailableDays(days);

        console.log(`${days.length} jours disponibles trouvés:`);
        days.forEach((day) => {
          console.log(
            `- ${format(day, "yyyy-MM-dd")} (${format(day, "EEEE", {
              locale: fr,
            })})`
          );
        });

        // Si aucun jour disponible n'est trouvé, afficher un message
        if (days.length === 0)
          console.log("Aucun jour disponible trouvé pour cette période");
      } catch (error) {
        console.error("Erreur lors du chargement des créneaux:", error);
      } finally {
        setLoading(false);
      }
    };

    loadAvailableSlots();
  }, [professionalId]);

  // Fetch availability data directly from the professional document
  useEffect(() => {
    if (!professionalId) return;

    const fetchAvailabilityData = async () => {
      try {
        console.log(
          "Fetching availability data for professional:",
          professionalId
        );
        const data = await getProfessionalAvailabilityData(professionalId);
        setAvailabilityData(data);
        console.log("Availability data fetched successfully:", data);

        // Initialize selected day if available
        if (data.length > 0) {
          setSelectedDay(data[0].day);

          // Set available slots for the first day
          const firstDaySlots = data[0].slots || [];
          setAvailableSlots(firstDaySlots);
        }
      } catch (error) {
        console.error("Error fetching availability data:", error);
      }
    };

    fetchAvailabilityData();
  }, [professionalId]);

  // Load from Firestore
  useEffect(() => {
    if (!professionalId) return;

    if (professionals.length > 0) {
      console.log("Looking for professional with ID:", professionalId);

      const found = professionals.find((p) => p.id === professionalId);
      if (found) {
        if (!found.isActive || !found.isApproved) {
          // Vérifie si le professionnel est approuvé et actif
          console.warn("Ce professionnel est inactif ou non approuvé");
          navigate("/"); // ou '/not-available' si tu veux une page personnalisée
          return;
        }
        console.log("Professional found:", found.name || "Unknown");
        setProfessional(found);
        setLoading(false);

        // Debug info
        setDebugInfo({
          source: "firestore",
          availabilityCount: found?.availability?.length || 0,
          hasSlots: found?.availability?.some(
            (avail) =>
              avail?.slots &&
              Array.isArray(avail.slots) &&
              avail.slots.length > 0
          ),
        });

        // Update cache
        try {
          sessionStorage.setItem(
            `professional_${professionalId}`,
            JSON.stringify(found)
          );
        } catch (error) {
          console.warn("Failed to cache professional data:", error);
        }

        // Initialize selected day if available
        if (
          found?.availability &&
          Array.isArray(found.availability) &&
          found.availability.length > 0
        ) {
          setSelectedDay(found.availability[0]?.day || "");
        }
      }
    }
  }, [professionalId, professionals]);

  // CRITICAL: Update available slots when day changes
  useEffect(() => {
    if (!professional || !selectedDay) return;

    console.log(`Day changed to: ${selectedDay}`);

    const dayAvailability = professional?.availability?.find(
      (avail: any) => avail?.day === selectedDay
    );
    console.log("Found day availability:", dayAvailability);

    // FIXED: Use slots directly from the availability data with safety checks
    const slots = dayAvailability?.slots || [];
    if (!Array.isArray(slots)) {
      console.warn("Slots is not an array:", slots);
      setAvailableSlots([]);
    } else {
      console.log("Available slots from Firestore:", slots);
      setAvailableSlots(slots);
    }

    setSelectedTime(""); // Reset selected time when day changes

    // Update debug info
    setDebugInfo((prev) => ({
      ...prev,
      selectedDay,
      dayAvailability,
      slotsCount: Array.isArray(slots) ? slots.length : 0,
      slots,
    }));
  }, [professional, selectedDay]);

  // Vérifier la disponibilité quand un créneau est sélectionné
  useEffect(() => {
    if (professional && selectedDay && selectedTime) {
      checkSlotAvailability();
    }
  }, [professional, selectedDay, selectedTime]);

  const checkSlotAvailability = async () => {
    if (!professional || !selectedDay || !selectedTime) return;

    // Skip availability check in testing mode
    if (isTesting) {
      setIsSlotAvailable(true);
      return;
    }

    setAvailabilityChecking(true);
    try {
      // Ensure Firestore is ready before checking
      await ensureFirestoreReady();

      // Calculer l'heure de fin (consultation de 60 minutes par défaut)
      const [hours, minutes] = selectedTime.split(":").map(Number);
      const endTime = `${String(hours + 1).padStart(2, "0")}:${String(
        minutes
      ).padStart(2, "0")}`;

      // Utiliser directement la date sélectionnée
      const dateString = selectedTimeSlot
        ? format(selectedTimeSlot.date, "yyyy-MM-dd")
        : "";

      const available = await checkAvailability(
        professional.id,
        dateString,
        selectedTime,
        endTime
      );

      setIsSlotAvailable(available);
    } catch (error) {
      console.error("Error checking availability:", error);
      setIsSlotAvailable(true); // En cas d'erreur, on assume que c'est disponible
    } finally {
      setAvailabilityChecking(false);
    }
  };

  const handleInstantConsultation = async () => {
    if (!isAuthenticated) {
      navigate("/patient");
      return;
    }

    if (!professional || !currentUser) {
      console.error("Professional or user data missing");
      return;
    }

    setIsRequestingInstant(true);

    try {
      // Ensure Firestore is ready before operation
      await ensureFirestoreReady();

      // Create instant consultation request using the Jitsi service
      const consultationId = await createInstantConsultationRequest(
        professional.id,
        currentUser.id,
        currentUser.name || "Patient"
      );

      console.log("Instant consultation request created:", consultationId);

      // Navigate to the consultation room
      navigate(`/consultation/${consultationId}`);
    } catch (error) {
      console.error("Error in handleInstantConsultation:", error);
      setIsRequestingInstant(false);
      alert("Une erreur est survenue. Veuillez réessayer.");
    }
  };

  const validatePaymentForm = () => {
    if (!selectedPaymentMethod) {
      setPaymentError("Veuillez sélectionner une méthode de paiement");
      return false;
    }

    // Pour les paiements mobiles, pas besoin de validation spécifique car les informations
    // seront collectées sur la page de paiement
    if (selectedPaymentMethod === "mobile") {
      return true;
    }

    // Validation pour les autres méthodes de paiement (si ajoutées plus tard)
    if (selectedPaymentMethod === "card") {
      if (!cardNumber || cardNumber.length < 16) {
        setPaymentError("Numéro de carte invalide");
        return false;
      }
      if (!expiryDate || !/^\d{2}\/\d{2}$/.test(expiryDate)) {
        setPaymentError("Date d'expiration invalide");
        return false;
      }
      if (!cvv || !/^\d{3}$/.test(cvv)) {
        setPaymentError("CVV invalide");
        return false;
      }
    }

    setPaymentError("");
    return true;
  };

  const handlePayment = async () => {
    if (!currentUser || !professional) {
      setPaymentError("Informations utilisateur manquantes");
      console.log("Current user or professional missing");
      return;
    }

    setIsSubmitting(true);
    setPaymentError("");

    try {
      // Ensure Firestore is ready before operation
      await ensureFirestoreReady();

      console.log("Firestore ready for booking creation");

      // For testing mode, use current date and time
      let dateString, startTime, endTime;

      // Calculer l'heure de fin
      const [hours, minutes] = selectedTime.split(":").map(Number);
      endTime = `${String(hours + 1).padStart(2, "0")}:${String(
        minutes
      ).padStart(2, "0")}`;

      // Utiliser directement la date du créneau sélectionné
      if (selectedTimeSlot && selectedTimeSlot.date) {
        let dateObj: Date;

        if (selectedTimeSlot.date instanceof Date) {
          dateObj = selectedTimeSlot.date;
        } else if (typeof selectedTimeSlot.date === "string") {
          dateObj = new Date(selectedTimeSlot.date);
        } else {
          // Fallback pour les objets Firestore Timestamp ou autres
          try {
            dateObj = new Date(selectedTimeSlot.date as any);
          } catch (error) {
            console.warn("Failed to parse date, using current date:", error);
            dateObj = new Date();
          }
        }

        dateString = format(dateObj, "yyyy-MM-dd");
        console.log("Using selected date from timeSlot:", dateString);
      } else {
        // Fallback au cas où selectedTimeSlot n'est pas disponible
        const today = new Date();
        const daysOfWeek = [
          "Dimanche",
          "Lundi",
          "Mardi",
          "Mercredi",
          "Jeudi",
          "Vendredi",
          "Samedi",
        ];
        const dayIndex = daysOfWeek.indexOf(selectedDay);

        if (dayIndex !== -1) {
          // Calculer la prochaine occurrence de ce jour
          const daysUntilNext = (dayIndex - today.getDay() + 7) % 7;
          const targetDate = new Date(today);
          targetDate.setDate(
            today.getDate() + (daysUntilNext === 0 ? 7 : daysUntilNext)
          );
          dateString = format(targetDate, "yyyy-MM-dd");
          console.log(
            "Using calculated date from selectedDay:",
            dateString,
            "for day:",
            selectedDay
          );
        } else {
          // Fallback ultime : utiliser la date d'aujourd'hui
          dateString = format(today, "yyyy-MM-dd");
          console.log("Using fallback date (today):", dateString);
        }
      }

      // Utiliser selectedTime ou selectedTimeSlot.time
      startTime = selectedTime || selectedTimeSlot?.time || "";

      if (!startTime) {
        throw new Error("Heure de début manquante");
      }

      console.log(
        "Creating booking with date:",
        dateString,
        "time:",
        startTime
      );

      // IMPORTANT: Vérifier que les heures sont correctes avant de créer la réservation
      console.log(
        "Heures de réservation - Début:",
        startTime,
        "- Fin:",
        endTime
      );

      // Créer ou modifier la réservation
      const bookingData = {
        patientId: currentUser.id,
        professionalId: professional.id,
        patientName: currentUser.name || "Patient",
        professionalName: professional.name || "Professionnel",
        date: dateString,
        startTime: startTime,
        endTime: endTime,
        type: consultationType,
        duration: 60, // 60 minutes par défaut
        price: professional.price || 0,
      };
      console.log("Booking Data to be saved:", bookingData);
      console.log(
        "Current User ID (should match patientId):",
        currentUser.id
      );
      console.log("Professional ID:", professional.id);

      // Gérer la modification d'un rendez-vous existant
      if (isModifying && bookingToModify?.id) {
        console.log(
          "Mode modification - Mise à jour du rendez-vous:",
          bookingToModify.id
        );

        // Mettre à jour le rendez-vous existant
        await updateBooking(bookingToModify.id, bookingData);

        // Rediriger vers le tableau de bord avec un message de succès
        navigate("/patient/dashboard?message=appointment_updated");
        return;
      }

      // Générer un ID temporaire pour le paiement
      const tempBookingId = `temp_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 9)}`;
      console.log(
        "[PAYMENT] Generated temporary booking ID:",
        tempBookingId
      );

      // Écrire la réservation "pending" AVANT d'appeler PayTech
      const db = getFirestoreInstance();
      // Calculer les bonnes valeurs de date et heure de fin
      const timeToUse = selectedTimeSlot?.time || selectedTime;
      const [tempHours, tempMinutes] = timeToUse.split(":").map(Number);
      const tempEndTime = `${String(tempHours + 1).padStart(2, "0")}:${String(
        tempMinutes
      ).padStart(2, "0")}`;

      let tempDateString;
      if (selectedTimeSlot && selectedTimeSlot.date) {
        let dateObj: Date;
        if (selectedTimeSlot.date instanceof Date) {
          dateObj = selectedTimeSlot.date;
        } else if (typeof selectedTimeSlot.date === "string") {
          dateObj = new Date(selectedTimeSlot.date);
        } else {
          try {
            dateObj = new Date(selectedTimeSlot.date as any);
          } catch (error) {
            dateObj = new Date();
          }
        }
        tempDateString = format(dateObj, "yyyy-MM-dd");
      } else {
        tempDateString = selectedDay;
      }

      const method = (selectedPaymentMethod as "mobile" | "card") || "mobile";

      const tempBookingData = {
        id: tempBookingId,
        tempId: tempBookingId,
        patientId: currentUser.id,
        professionalId: professional.id,
        patientName: currentUser.name || "Patient",
        professionalName: professional.name,
        date: tempDateString, // ← on utilise la date calculée
        startTime: selectedTimeSlot?.time || selectedTime, // ← inchangé
        endTime: tempEndTime, // ← on garde l'heure de fin calculée
        type: consultationType,
        duration: 60,
        price: professionalPrice || 0,
        status: "pending_payment",
        paymentStatus: "pending",
        createdAt: serverTimestamp(),
        payment: {
          provider: "paytech",
          method, // 'mobile' | 'card'
          status: "init",
        },
      };

      await setDoc(doc(db, "bookings", tempBookingId), tempBookingData);
      console.log("[PAYMENT] Temporary booking created in database");

      // Préparer les données de paiement
      console.log("[PAYMENT] Preparing payment data for:", tempBookingId);

      // Initier le paiement PayTech
      try {
        // Utiliser le numéro de téléphone saisi par l'utilisateur si disponible
        const customerPhone =
          selectedPaymentMethod === "mobile" && phoneNumber
            ? `+221${phoneNumber}`
            : currentUser.phoneNumber || "";

        const successUrl = `${
          window.location.origin
        }/appointment-success/${encodeURIComponent(
          tempBookingId
        )}?status=success`;
        const cancelUrl = `${
          window.location.origin
        }/appointment-success/${encodeURIComponent(
          tempBookingId
        )}?status=cancelled`;

        const paymentData = {
          amount: Math.round(Number(professionalPrice || 0)),
          bookingId: tempBookingId,
          customerEmail:
            method === "card"
              ? currentUser.email || `patient_${currentUser.id}@health-e.sn`
              : currentUser.email || null,
          customerPhone,
          customerName: currentUser.name || "Patient",
          professionalId: professional.id,
          professionalName: professional.name,
          description: `Consultation ${consultationType} avec ${professional.name}`,
          patientId: currentUser.id,
          date: tempDateString,
          startTime: selectedTimeSlot?.time || selectedTime,
          endTime: tempEndTime,
          type: consultationType,
          successUrl,
          cancelUrl,
          method,
        };

        if (method === "card" && !paymentData.customerEmail) {
          setPaymentError(
            "Pour le paiement par carte, un e-mail est requis. Veuillez ajouter un e-mail dans votre profil."
          );
          setIsSubmitting(false);
          return;
        }

        console.log("[PAYTECH] Initiating payment with data:", paymentData);

        // Valider les données de paiement
        if (!paytechService.validatePaymentData(paymentData)) {
          throw new Error("Données de paiement invalides");
        }

        // Initier le paiement
        const response = await paytechService.initiatePayment(paymentData);

        console.log("[PAYTECH] Payment initiated successfully:", response);

        // Rediriger vers PayTech
        paytechService.redirectToPayment(response.redirect_url);
      } catch (paymentError) {
        console.error("[PAYTECH] Payment error:", paymentError);

        // En cas d'erreur de paiement, rediriger vers la page de succès avec un message d'erreur
        navigate(`/appointment-success/${tempBookingId}?payment_error=true`);
      }
    } catch (error) {
      console.error("Error during booking creation:", error);
      setPaymentError(
        "Une erreur est survenue lors de la réservation. Veuillez réessayer."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    console.log("handleSubmit called with:", {
      selectedTimeSlot: selectedTimeSlot
        ? {
            id: selectedTimeSlot.id,
            date: selectedTimeSlot.date,
            time: selectedTimeSlot.time,
            isBooked: selectedTimeSlot.isBooked,
          }
        : null,
      selectedTime,
      consultationType,
      selectedDay,
      // Vérifications supplémentaires
      hasTimeSlot: !!selectedTimeSlot,
      hasTime: !!selectedTime,
      hasConsultationType: !!consultationType,
    });

    if (!isAuthenticated) {
      navigate("/patient");
      return;
    }

    // Validation améliorée avec logs détaillés
    if (!selectedTimeSlot) {
      console.log("Validation failed: selectedTimeSlot is missing");
      alert("Veuillez sélectionner un créneau dans le calendrier");
      return;
    }

    // Utiliser selectedTimeSlot.time si selectedTime est vide
    const timeToUse = selectedTime || selectedTimeSlot?.time;
    if (!timeToUse) {
      console.log("Validation failed: selectedTime is missing");
      console.log("selectedTime:", selectedTime);
      console.log("selectedTimeSlot.time:", selectedTimeSlot?.time);
      alert("Veuillez sélectionner une heure");
      return;
    }

    // Mettre à jour selectedTime si nécessaire
    if (!selectedTime && selectedTimeSlot?.time) {
      console.log("Updating selectedTime from selectedTimeSlot");
      setSelectedTime(selectedTimeSlot.time);
    }

    if (!consultationType) {
      console.log("Validation failed: consultationType is missing");
      alert("Veuillez sélectionner un type de consultation");
      return;
    }

    console.log("All validations passed");

    if (!isSlotAvailable && !selectedTimeSlot?.isBooked) {
      console.log("Slot not available");
      alert("Ce créneau n'est plus disponible. Veuillez en choisir un autre.");
      return;
    }

    // En mode modification, traiter directement la modification
    if (isModifying && bookingToModify?.id) {
      console.log(
        "Mode modification - Traitement direct de la modification"
      );
      await handleModification();
      return;
    }

    console.log("Opening payment step");
    setShowPaymentStep(true);
  };

  // Fonction pour gérer la modification directe d'un rendez-vous
  const handleModification = async () => {
    if (!currentUser || !professional || !bookingToModify?.id) {
      setLocalError("Informations manquantes pour la modification");
      return;
    }

    setIsSubmitting(true);
    setLocalError("");

    try {
      // Utiliser l'heure du créneau sélectionné
      const timeToUse = selectedTimeSlot?.time || selectedTime;

      if (!timeToUse) {
        setLocalError("Aucun créneau horaire sélectionné");
        return;
      }

      // Calculer l'heure de fin
      const [hours, minutes] = timeToUse.split(":").map(Number);
      const endTime = `${String(hours + 1).padStart(2, "0")}:${String(
        minutes
      ).padStart(2, "0")}`;

      // Utiliser directement la date du créneau sélectionné
      let dateString;
      if (selectedTimeSlot && selectedTimeSlot.date) {
        let dateObj: Date;

        if (selectedTimeSlot.date instanceof Date) {
          dateObj = selectedTimeSlot.date;
        } else if (typeof selectedTimeSlot.date === "string") {
          dateObj = new Date(selectedTimeSlot.date);
        } else {
          try {
            dateObj = new Date(selectedTimeSlot.date as any);
          } catch (error) {
            console.warn("Failed to parse date, using current date:", error);
            dateObj = new Date();
          }
        }

        dateString = format(dateObj, "yyyy-MM-dd");
      } else {
        dateString = selectedDay;
      }

      // Préparer les données de mise à jour
      const bookingData = {
        date: dateString,
        startTime: timeToUse,
        endTime: endTime,
        type: consultationType,
        duration: 60,
        price: professional.price || 0,
      };

      console.log(
        "Mise à jour du rendez-vous:",
        bookingToModify.id,
        bookingData
      );

      // Mettre à jour le rendez-vous
      await updateBooking(bookingToModify.id, bookingData);

      // Rediriger vers le tableau de bord avec un message de succès
      navigate("/patient/dashboard?message=appointment_updated");
    } catch (error) {
      console.error("Erreur lors de la modification:", error);
      setLocalError(
        "Une erreur est survenue lors de la modification. Veuillez réessayer."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Ne pas afficher le composant si l'utilisateur n'est pas connecté
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-paper container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner size="lg" />
          <span className="ml-4 text-lg text-ink-soft">
            Redirection en cours...
          </span>
        </div>
      </div>
    );
  }

  if (loading || professionalsLoading) {
    return (
      <div className="min-h-screen bg-paper container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner size="lg" />
          <span className="ml-4 text-lg text-ink-soft">Chargement...</span>
        </div>
      </div>
    );
  }

  if (error || localError) {
    return (
      <div className="min-h-screen bg-paper container mx-auto px-4 py-8 text-center">
        <div className="flex items-center gap-2 justify-center bg-danger/10 border border-danger/20 text-danger px-4 py-3 rounded-card">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <span>
            <strong className="font-semibold">Erreur : </strong>
            {error || localError}
          </span>
        </div>
      </div>
    );
  }

  if (!professional) {
    return (
      <div className="min-h-screen bg-paper container mx-auto px-4 py-8 text-center">
        <div className="bg-gold-soft border border-gold/20 text-gold px-4 py-3 rounded-card">
          <strong className="font-semibold block">
            Professionnel non trouvé
          </strong>
          <p className="mt-2 text-ink-soft">
            Ce professionnel n'existe pas ou n'est plus disponible.
          </p>
        </div>
      </div>
    );
  }

  // Safety checks for professional data
  const professionalName = professional?.name || "Nom non disponible";
  const professionalSpecialty =
    professional?.specialty || "Spécialité non précisée";
  const professionalPrice =
    professional?.price === undefined ? 0 : professional.price;
  const professionalCurrency = professional?.currency || "XOF";
  const isAvailableNow = professional?.isAvailableNow || false;

  const totalAmount = professionalPrice === null ? 0 : professionalPrice;

  if (showPaymentStep) {
    return (
      <div className="min-h-screen bg-paper container mx-auto px-4 py-8">
        <h1 className="font-display text-3xl font-bold text-ink mb-8">
          Paiement
        </h1>

        <div className="max-w-2xl mx-auto">
          {/* Payment Summary */}
          <div className="bg-card rounded-block border border-line shadow-soft p-6 mb-6">
            <h2 className="font-display text-xl font-semibold text-ink mb-4">
              Résumé de la consultation
            </h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-ink-soft">Professionnel</span>
                <span className="font-medium text-ink">
                  {professionalName}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-soft">Date</span>
                <span className="font-medium text-ink">
                  {selectedTimeSlot
                    ? format(
                        selectedTimeSlot.date instanceof Date
                          ? selectedTimeSlot.date
                          : selectedTimeSlot.date.toDate
                          ? selectedTimeSlot.date.toDate()
                          : new Date(selectedTimeSlot.date),
                        "EEEE d MMMM yyyy",
                        { locale: fr }
                      ) + ` à ${selectedTime}`
                    : "Date non sélectionnée"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-soft">Type</span>
                <span className="font-medium text-ink capitalize">
                  {consultationType}
                </span>
              </div>
              <div className="pt-3 border-t border-line">
                <div className="flex justify-between">
                  <span className="text-ink-soft">Consultation</span>
                  <span className="font-medium text-ink">
                    {professionalPrice === null
                      ? "Gratuit"
                      : `${professionalPrice.toLocaleString()} ${professionalCurrency}`}
                  </span>
                </div>
                <div className="flex justify-between mt-3 pt-3 border-t border-line">
                  <span className="font-semibold text-ink">Total</span>
                  <span className="font-semibold text-ink">
                    {totalAmount === 0
                      ? "Gratuit"
                      : `${totalAmount.toLocaleString()} ${professionalCurrency}`}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Methods */}
          <div className="bg-card rounded-block border border-line shadow-soft p-6">
            <h2 className="font-display text-xl font-semibold text-ink mb-4">
              Méthode de paiement
            </h2>

            {paymentError && (
              <div className="mb-4 p-3 bg-danger/10 border border-danger/20 text-danger rounded-card flex items-center">
                <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0" />
                {paymentError}
              </div>
            )}

            <div className="space-y-4">
              {paymentMethods.map((method) => (
                <button
                  key={method.id}
                  onClick={() => setSelectedPaymentMethod(method.id)}
                  className={`w-full flex items-center p-4 rounded-card border-2 transition-colors ${
                    selectedPaymentMethod === method.id
                      ? "border-accent bg-accent-soft"
                      : "border-line hover:border-accent-light"
                  }`}
                >
                  <div className="flex items-center flex-1">
                    <div className="mr-4">{method.icon}</div>
                    <div className="text-left">
                      <h3 className="font-medium text-ink">{method.name}</h3>
                      <p className="text-sm text-muted">
                        {method.description}
                      </p>
                    </div>
                  </div>
                  <ChevronRight
                    className={`h-5 w-5 ${
                      selectedPaymentMethod === method.id
                        ? "text-accent"
                        : "text-muted"
                    }`}
                  />
                </button>
              ))}
            </div>

            {selectedPaymentMethod && (
              <div className="mt-6 pt-6 border-t border-line">
                <h3 className="font-medium text-ink mb-4">
                  Informations de paiement
                </h3>

                {selectedPaymentMethod === "mobile" && (
                  <div>
                    <label className="block text-sm font-medium text-ink-soft mb-1">
                      Numéro de téléphone
                    </label>
                    <div className="flex">
                      <span className="inline-flex items-center px-3 rounded-l-xl border border-r-0 border-line bg-paper text-ink-soft sm:text-sm">
                        +221
                      </span>
                      <input
                        type="tel"
                        value={phoneNumber}
                        onChange={(e) =>
                          setPhoneNumber(
                            e.target.value.replace(/\D/g, "").slice(0, 9)
                          )
                        }
                        placeholder="77 123 45 67"
                        className="flex-1 min-w-0 block w-full px-3 py-2 rounded-none rounded-r-xl border border-line bg-card focus:outline-none focus:border-accent sm:text-sm"
                      />
                    </div>
                    <p className="mt-2 text-sm text-muted">
                      Vous recevrez une demande de paiement sur votre téléphone
                    </p>
                  </div>
                )}

                {selectedPaymentMethod === "card" && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-ink-soft mb-1">
                        Numéro de carte
                      </label>
                      <input
                        type="text"
                        value={cardNumber}
                        onChange={(e) =>
                          setCardNumber(
                            e.target.value.replace(/\D/g, "").slice(0, 16)
                          )
                        }
                        placeholder="1234 5678 9012 3456"
                        className="block w-full px-3 py-2 rounded-xl border border-line bg-card focus:outline-none focus:border-accent sm:text-sm"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-ink-soft mb-1">
                          Date d'expiration
                        </label>
                        <input
                          type="text"
                          value={expiryDate}
                          onChange={(e) => {
                            let value = e.target.value.replace(/\D/g, "");
                            if (value.length >= 2) {
                              value =
                                value.slice(0, 2) + "/" + value.slice(2, 4);
                            }
                            setExpiryDate(value);
                          }}
                          placeholder="MM/YY"
                          className="block w-full px-3 py-2 rounded-xl border border-line bg-card focus:outline-none focus:border-accent sm:text-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-ink-soft mb-1">
                          CVV
                        </label>
                        <input
                          type="text"
                          value={cvv}
                          onChange={(e) =>
                            setCvv(
                              e.target.value.replace(/\D/g, "").slice(0, 3)
                            )
                          }
                          placeholder="123"
                          className="block w-full px-3 py-2 rounded-xl border border-line bg-card focus:outline-none focus:border-accent sm:text-sm"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="mt-6 flex justify-between items-center">
              <button
                onClick={() => setShowPaymentStep(false)}
                className="px-4 py-2 text-ink-soft hover:text-ink transition-colors"
              >
                Retour
              </button>
              <button
                onClick={handlePayment}
                disabled={
                  isSubmitting ||
                  (selectedPaymentMethod === "mobile" && !phoneNumber.trim())
                }
                className={`px-6 py-2.5 rounded-pill font-semibold transition-colors flex items-center gap-2 ${
                  isSubmitting ||
                  (selectedPaymentMethod === "mobile" && !phoneNumber.trim())
                    ? "bg-line text-muted cursor-not-allowed"
                    : "bg-accent text-white hover:bg-accent/90"
                }`}
              >
                {isSubmitting && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                {isSubmitting
                  ? "Traitement..."
                  : selectedPaymentMethod === "mobile" && !phoneNumber.trim()
                  ? "Saisissez votre numéro de téléphone"
                  : "Payer et confirmer"}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-paper container mx-auto px-4 py-8">
      <h1 className="font-display text-3xl font-bold text-ink mb-8">
        {isModifying ? "Modifier le rendez-vous" : "Prendre rendez-vous"}
      </h1>

      <div className="bg-card rounded-block border border-line shadow-soft overflow-hidden">
        {/* Professional info */}
        <div className="bg-paper border-b border-line p-6">
          <div className="flex items-center">
            {professional?.profileImage ? (
              <img
                src={professional.profileImage}
                alt={professionalName}
                className="w-16 h-16 rounded-full object-cover mr-4 border-2 border-line"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-ink flex items-center justify-center mr-4">
                <User className="h-8 w-8 text-white" />
              </div>
            )}
            <div>
              <h2 className="font-display text-xl font-bold text-ink">
                {professionalName}
              </h2>
              <p className="text-ink-soft">{professionalSpecialty}</p>
              {isAvailableNow && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-pill text-xs font-medium bg-sage-soft text-sage mt-2">
                  <span className="w-2 h-2 bg-sage rounded-full mr-2"></span>
                  Disponible maintenant
                </span>
              )}
            </div>
          </div>
        </div>

        {isAvailableNow && (
          <div className="p-6 bg-sage-soft border-b border-sage/10">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-display text-lg font-semibold text-sage">
                  Consultation immédiate disponible
                </h3>
                <p className="text-sage/80 mt-1">
                  Ce professionnel est disponible pour une consultation
                  maintenant
                </p>
              </div>
              <button
                onClick={handleInstantConsultation}
                disabled={isRequestingInstant}
                className={`px-6 py-3 bg-sage text-white font-semibold rounded-pill hover:bg-sage/90 transition-colors flex items-center gap-2 ${
                  isRequestingInstant ? "opacity-75 cursor-not-allowed" : ""
                }`}
              >
                {isRequestingInstant ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Video className="h-5 w-5" />
                )}
                {isRequestingInstant ? "Connexion..." : "Démarrer maintenant"}
              </button>
            </div>
          </div>
        )}

        <div className="p-6">
          {/* Calendar view */}
          <NewAppointmentScheduler
            professionalId={professional.id}
            isProfessional={false}
            availableDays={availableDays}
            onSlotSelect={(slot) => {
              setSelectedTimeSlot(slot);

              try {
                // Extract date and time for the form
                if (slot && slot.date) {
                  const dateObj =
                    slot.date instanceof Date
                      ? slot.date
                      : slot.date.toDate
                      ? slot.date.toDate()
                      : new Date(slot.date);

                  const dayNames = [
                    "Dimanche",
                    "Lundi",
                    "Mardi",
                    "Mercredi",
                    "Jeudi",
                    "Vendredi",
                    "Samedi",
                  ];
                  const dayName = dayNames[dateObj.getDay()];
                  // Stocker la vraie date au lieu du nom du jour
                  const realDate = format(dateObj, "yyyy-MM-dd");
                  setSelectedDay(realDate);
                  setSelectedTime(slot.time || "");

                  console.log("Slot selected and state updated:", {
                    slot,
                    dayName,
                    realDate,
                    time: slot.time,
                    selectedTimeSlot: slot,
                    selectedTime: slot.time,
                  });
                  console.log("Slot selected:", slot);
                } else {
                  // Si le slot est null (désélection), réinitialiser les valeurs
                  setSelectedDay("");
                  setSelectedTime("");
                  console.log("Slot deselected, state reset");
                }

                // Check availability
                if (professional && selectedDay && selectedTime) {
                  checkSlotAvailability();
                }
              } catch (error) {
                console.error(
                  "Erreur lors de la sélection du créneau:",
                  error
                );
                setSelectedDay("");
                setSelectedTime("");
              }
            }}
          />

          {/* Form for consultation type and payment */}
          <form
            onSubmit={handleSubmit}
            className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-12"
          >
            <div className="space-y-6">
              {/* Consultation type */}
              <section>
                <h3 className="font-display text-lg font-semibold text-ink mb-4">
                  Type de consultation
                </h3>

                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={() => setConsultationType("video")}
                    className={`w-full flex items-center p-4 rounded-card transition-colors ${
                      consultationType === "video"
                        ? "bg-accent-soft border-2 border-accent text-accent"
                        : "bg-card border border-line text-ink-soft hover:border-accent"
                    }`}
                  >
                    <Video
                      className={`h-6 w-6 mr-3 ${
                        consultationType === "video"
                          ? "text-accent"
                          : "text-muted"
                      }`}
                    />
                    <div className="text-left">
                      <span className="font-medium block text-ink">
                        Vidéo
                      </span>
                      <span className="text-sm text-muted">
                        Face-à-face virtuel avec le professionnel
                      </span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setConsultationType("audio")}
                    className={`w-full flex items-center p-4 rounded-card transition-colors ${
                      consultationType === "audio"
                        ? "bg-accent-soft border-2 border-accent text-accent"
                        : "bg-card border border-line text-ink-soft hover:border-accent"
                    }`}
                  >
                    <PhoneCall
                      className={`h-6 w-6 mr-3 ${
                        consultationType === "audio"
                          ? "text-accent"
                          : "text-muted"
                      }`}
                    />
                    <div className="text-left">
                      <span className="font-medium block text-ink">
                        Audio
                      </span>
                      <span className="text-sm text-muted">
                        Consultation téléphonique
                      </span>
                    </div>
                  </button>
                </div>
              </section>

              {/* Selected slot info */}
              {selectedTimeSlot && (
                <section className="bg-accent-soft p-4 rounded-card">
                  <h3 className="text-md font-semibold mb-2 text-accent">
                    {isModifying
                      ? "Nouveau créneau sélectionné"
                      : "Créneau sélectionné"}
                  </h3>
                  <div className="flex items-center text-accent mb-1">
                    <Calendar className="h-4 w-4 mr-2" />
                    <span>
                      {(() => {
                        try {
                          if (!selectedTimeSlot?.date)
                            return "Date non disponible";

                          const dateObj =
                            selectedTimeSlot.date instanceof Date
                              ? selectedTimeSlot.date
                              : selectedTimeSlot.date.toDate
                              ? selectedTimeSlot.date.toDate()
                              : new Date(selectedTimeSlot.date);

                          if (isNaN(dateObj.getTime())) return "Date invalide";

                          return format(dateObj, "EEEE d MMMM yyyy", {
                            locale: fr,
                          });
                        } catch (error) {
                          console.error("Error formatting date:", error);
                          return "Erreur de date";
                        }
                      })()}
                    </span>
                  </div>
                  <div className="flex items-center text-accent">
                    <Clock className="h-4 w-4 mr-2" />
                    <span>
                      {selectedTimeSlot.time || "Heure non disponible"}
                    </span>
                  </div>
                </section>
              )}

              {/* Payment summary - masqué en mode modification */}
              {!isModifying && (
                <section className="bg-paper rounded-card p-6">
                  <h3 className="font-display text-lg font-semibold text-ink mb-4">
                    Résumé
                  </h3>

                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-ink-soft">Consultation</span>
                      <span className="font-medium text-ink">
                        {professionalPrice === null
                          ? "Gratuit"
                          : `${professionalPrice.toLocaleString()} ${professionalCurrency}`}
                      </span>
                    </div>
                    <div className="pt-3 border-t border-line">
                      <div className="flex justify-between">
                        <span className="font-semibold text-ink">Total</span>
                        <span className="font-semibold text-ink">
                          {professionalPrice === null || professionalPrice === 0
                            ? "Gratuit"
                            : `${professionalPrice.toLocaleString()} ${professionalCurrency}`}
                        </span>
                      </div>
                    </div>
                  </div>
                </section>
              )}

              <button
                type="submit"
                disabled={
                  !isTesting &&
                  (!selectedTimeSlot ||
                    !consultationType ||
                    isSubmitting ||
                    !isSlotAvailable)
                }
                className={`w-full py-3 rounded-pill font-semibold mt-4 transition-all duration-200 flex items-center justify-center gap-2 shadow-soft hover:shadow-lift ${
                  !isTesting &&
                  (!selectedTimeSlot ||
                    !consultationType ||
                    isSubmitting ||
                    !isSlotAvailable)
                    ? "bg-line text-muted cursor-not-allowed"
                    : "bg-ink text-white hover:bg-ink/90"
                }`}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {isModifying
                      ? "Modification en cours..."
                      : "Création de la facture..."}
                  </>
                ) : (
                  <>
                    {isModifying ? (
                      <>
                        <Edit className="h-5 w-5" />
                        Modifier le rendez-vous
                      </>
                    ) : (
                      <>
                        <CreditCard className="h-5 w-5" />
                        Payer avec PayTech
                      </>
                    )}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default BookAppointment;
