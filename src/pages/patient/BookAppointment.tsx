import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
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
} from "../../services/bookingService";
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
      console.log("🔒 User not authenticated, redirecting to login");
      navigate("/patient");
      return;
    }
  }, [isAuthenticated, navigate]);

  const paymentMethods: PaymentMethod[] = [
    {
      id: "mobile",
      name: "Mobile Money",
      type: "mobile",
      icon: <Smartphone className="h-6 w-6 text-green-500" />,
      description: "Paiement via mobile money (Wave, Orange Money, MTN, etc.)",
    },
    {
      id: "card",
      name: "Carte bancaire",
      type: "card",
      icon: <CreditCard className="h-6 w-6 text-blue-500" />,
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
        console.log("📦 Loading professional from cache");
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
          `🔍 Chargement des jours disponibles du ${format(
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

        console.log(`✅ ${days.length} jours disponibles trouvés:`);
        days.forEach((day) => {
          console.log(
            `- ${format(day, "yyyy-MM-dd")} (${format(day, "EEEE", {
              locale: fr,
            })})`
          );
        });

        // Si aucun jour disponible n'est trouvé, afficher un message
        if (days.length === 0)
          console.log("⚠️ Aucun jour disponible trouvé pour cette période");
      } catch (error) {
        console.error("❌ Erreur lors du chargement des créneaux:", error);
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
          "🔍 Fetching availability data for professional:",
          professionalId
        );
        const data = await getProfessionalAvailabilityData(professionalId);
        setAvailabilityData(data);
        console.log("✅ Availability data fetched successfully:", data);

        // Initialize selected day if available
        if (data.length > 0) {
          setSelectedDay(data[0].day);

          // Set available slots for the first day
          const firstDaySlots = data[0].slots || [];
          setAvailableSlots(firstDaySlots);
        }
      } catch (error) {
        console.error("❌ Error fetching availability data:", error);
      }
    };

    fetchAvailabilityData();
  }, [professionalId]);

  // Load from Firestore
  useEffect(() => {
    if (!professionalId) return;

    if (professionals.length > 0) {
      console.log("🔍 Looking for professional with ID:", professionalId);

      const found = professionals.find((p) => p.id === professionalId);
      if (found) {
        if (!found.isActive || !found.isApproved) {
          // Vérifie si le professionnel est approuvé et actif
          console.warn("⛔️ Ce professionnel est inactif ou non approuvé");
          navigate("/"); // ou '/not-available' si tu veux une page personnalisée
          return;
        }
        console.log("✅ Professional found:", found.name || "Unknown");
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

    console.log(`📅 Day changed to: ${selectedDay}`);

    const dayAvailability = professional?.availability?.find(
      (avail: any) => avail?.day === selectedDay
    );
    console.log("🔍 Found day availability:", dayAvailability);

    // FIXED: Use slots directly from the availability data with safety checks
    const slots = dayAvailability?.slots || [];
    if (!Array.isArray(slots)) {
      console.warn("⚠️ Slots is not an array:", slots);
      setAvailableSlots([]);
    } else {
      console.log("🕐 Available slots from Firestore:", slots);
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
      console.error("❌ Professional or user data missing");
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

      console.log("✅ Instant consultation request created:", consultationId);

      // Navigate to the consultation room
      navigate(`/consultation/${consultationId}`);
    } catch (error) {
      console.error("❌ Error in handleInstantConsultation:", error);
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
      console.log("❌ Current user or professional missing");
      return;
    }

    setIsSubmitting(true);
    setPaymentError("");

    try {
      // Ensure Firestore is ready before operation
      await ensureFirestoreReady();

      console.log("✅ Firestore ready for booking creation");

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
        console.log("📅 Using selected date from timeSlot:", dateString);
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
            "📅 Using calculated date from selectedDay:",
            dateString,
            "for day:",
            selectedDay
          );
        } else {
          // Fallback ultime : utiliser la date d'aujourd'hui
          dateString = format(today, "yyyy-MM-dd");
          console.log("📅 Using fallback date (today):", dateString);
        }
      }

      // Utiliser selectedTime ou selectedTimeSlot.time
      startTime = selectedTime || selectedTimeSlot?.time || "";

      if (!startTime) {
        throw new Error("Heure de début manquante");
      }

      console.log(
        "📅 Creating booking with date:",
        dateString,
        "time:",
        startTime
      );

      // IMPORTANT: Vérifier que les heures sont correctes avant de créer la réservation
      console.log(
        "⏰ Heures de réservation - Début:",
        startTime,
        "- Fin:",
        endTime
      );

      // Créer la réservation
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
      console.log("🔍 Booking Data to be saved:", bookingData);
      console.log(
        "👤 Current User ID (should match patientId):",
        currentUser.id
      );
      console.log("🩺 Professional ID:", professional.id);

      // Générer un ID temporaire pour le paiement (pas de création en base)
      const tempBookingId = `temp_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 9)}`;
      console.log(
        "🔔 [PAYMENT] Generated temporary booking ID:",
        tempBookingId
      );

      // Préparer les données de paiement sans créer le booking
      console.log("🔔 [PAYMENT] Preparing payment data for:", tempBookingId);

      // Initier le paiement PayTech
      try {
        // Utiliser le numéro de téléphone saisi par l'utilisateur si disponible
        const customerPhone =
          selectedPaymentMethod === "mobile" && phoneNumber
            ? `+221${phoneNumber}`
            : currentUser.phoneNumber || "";

        const paymentData = {
          amount: professionalPrice || 0,
          bookingId: tempBookingId,
          customerEmail: currentUser.email || "",
          customerPhone,
          customerName: currentUser.name || "Patient",
          professionalId: professional.id,
          professionalName: professional.name,
          description: `Consultation ${consultationType} avec ${professional.name}`,
          // Données supplémentaires pour l'IPN
          patientId: currentUser.id,
          date: selectedDay,
          startTime: selectedTimeSlot?.time || selectedTime,
          endTime: "01:00", // Valeur par défaut - 1 heure après
          type: consultationType,
        };

        console.log("🔔 [PAYTECH] Initiating payment with data:", paymentData);

        // Valider les données de paiement
        if (!paytechService.validatePaymentData(paymentData)) {
          throw new Error("Données de paiement invalides");
        }

        // Initier le paiement
        const response = await paytechService.initiatePayment(paymentData);

        console.log("✅ [PAYTECH] Payment initiated successfully:", response);

        // Rediriger vers PayTech
        paytechService.redirectToPayment(response.redirect_url);
      } catch (paymentError) {
        console.error("❌ [PAYTECH] Payment error:", paymentError);

        // En cas d'erreur de paiement, rediriger vers la page de succès avec un message d'erreur
        navigate(`/appointment-success/${tempBookingId}?payment_error=true`);
      }
    } catch (error) {
      console.error("❌ Error during booking creation:", error);
      setPaymentError(
        "Une erreur est survenue lors de la réservation. Veuillez réessayer."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    console.log("🔍 handleSubmit called with:", {
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
      console.log("❌ Validation failed: selectedTimeSlot is missing");
      alert("Veuillez sélectionner un créneau dans le calendrier");
      return;
    }

    // Utiliser selectedTimeSlot.time si selectedTime est vide
    const timeToUse = selectedTime || selectedTimeSlot?.time;
    if (!timeToUse) {
      console.log("❌ Validation failed: selectedTime is missing");
      console.log("❌ selectedTime:", selectedTime);
      console.log("❌ selectedTimeSlot.time:", selectedTimeSlot?.time);
      alert("Veuillez sélectionner une heure");
      return;
    }

    // Mettre à jour selectedTime si nécessaire
    if (!selectedTime && selectedTimeSlot?.time) {
      console.log("🔄 Updating selectedTime from selectedTimeSlot");
      setSelectedTime(selectedTimeSlot.time);
    }

    if (!consultationType) {
      console.log("❌ Validation failed: consultationType is missing");
      alert("Veuillez sélectionner un type de consultation");
      return;
    }

    console.log("✅ All validations passed, proceeding to payment");

    if (!isSlotAvailable && !selectedTimeSlot?.isBooked) {
      console.log("❌ Slot not available");
      alert("Ce créneau n'est plus disponible. Veuillez en choisir un autre.");
      return;
    }

    console.log("🔄 Opening payment step");
    setShowPaymentStep(true);
  };

  // Ne pas afficher le composant si l'utilisateur n'est pas connecté
  if (!isAuthenticated) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner size="lg" />
          <span className="ml-4 text-lg text-gray-600">
            Redirection en cours...
          </span>
        </div>
      </div>
    );
  }

  if (loading || professionalsLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner size="lg" />
          <span className="ml-4 text-lg text-gray-600">Chargement...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
          <strong className="font-bold">Erreur : </strong>
          <span className="block sm:inline">{error}</span>
        </div>
      </div>
    );
  }

  if (!professional) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded relative">
          <strong className="font-bold">Professionnel non trouvé</strong>
          <p className="mt-2">
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

  const serviceFee = professionalPrice === null ? 0 : 1000;
  const totalAmount =
    professionalPrice === null ? 0 : professionalPrice + serviceFee;

  if (showPaymentStep) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Paiement</h1>

        <div className="max-w-2xl mx-auto">
          {/* Payment Summary */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">
              Résumé de la consultation
            </h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Professionnel</span>
                <span className="font-medium">{professionalName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Date</span>
                <span className="font-medium">
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
                <span className="text-gray-600">Type</span>
                <span className="font-medium capitalize">
                  {consultationType}
                </span>
              </div>
              <div className="pt-3 border-t">
                <div className="flex justify-between">
                  <span className="text-gray-600">Consultation</span>
                  <span className="font-medium">
                    {professionalPrice === null
                      ? "Gratuit"
                      : `${professionalPrice.toLocaleString()} ${professionalCurrency}`}
                  </span>
                </div>
                <div className="flex justify-between mt-2">
                  <span className="text-gray-600">Frais de service</span>
                  <span className="font-medium">
                    {serviceFee === 0
                      ? "Gratuit"
                      : `${serviceFee.toLocaleString()} ${professionalCurrency}`}
                  </span>
                </div>
                <div className="flex justify-between mt-3 pt-3 border-t">
                  <span className="font-semibold">Total</span>
                  <span className="font-semibold">
                    {totalAmount === 0
                      ? "Gratuit"
                      : `${totalAmount.toLocaleString()} ${professionalCurrency}`}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Methods */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Méthode de paiement</h2>

            {paymentError && (
              <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg flex items-center">
                <AlertCircle className="h-5 w-5 mr-2" />
                {paymentError}
              </div>
            )}

            <div className="space-y-4">
              {paymentMethods.map((method) => (
                <button
                  key={method.id}
                  onClick={() => setSelectedPaymentMethod(method.id)}
                  className={`w-full flex items-center p-4 rounded-lg border-2 transition-colors ${
                    selectedPaymentMethod === method.id
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:border-blue-200"
                  }`}
                >
                  <div className="flex items-center flex-1">
                    <div className="mr-4">{method.icon}</div>
                    <div className="text-left">
                      <h3 className="font-medium">{method.name}</h3>
                      <p className="text-sm text-gray-500">
                        {method.description}
                      </p>
                    </div>
                  </div>
                  <ChevronRight
                    className={`h-5 w-5 ${
                      selectedPaymentMethod === method.id
                        ? "text-blue-500"
                        : "text-gray-400"
                    }`}
                  />
                </button>
              ))}
            </div>

            {selectedPaymentMethod && (
              <div className="mt-6 pt-6 border-t">
                <h3 className="font-medium mb-4">Informations de paiement</h3>

                {selectedPaymentMethod === "mobile" && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Numéro de téléphone
                    </label>
                    <div className="flex">
                      <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 sm:text-sm">
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
                        className="flex-1 min-w-0 block w-full px-3 py-2 rounded-none rounded-r-md border-gray-300 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      />
                    </div>
                    <p className="mt-2 text-sm text-gray-500">
                      Vous recevrez une demande de paiement sur votre téléphone
                    </p>
                  </div>
                )}

                {selectedPaymentMethod === "card" && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
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
                        className="block w-full px-3 py-2 rounded-md border-gray-300 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
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
                          className="block w-full px-3 py-2 rounded-md border-gray-300 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
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
                          className="block w-full px-3 py-2 rounded-md border-gray-300 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="mt-6 flex justify-between">
              <button
                onClick={() => setShowPaymentStep(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Retour
              </button>
              <button
                onClick={handlePayment}
                disabled={
                  isSubmitting ||
                  (selectedPaymentMethod === "mobile" && !phoneNumber.trim())
                }
                className={`px-6 py-2 rounded-lg transition-colors flex items-center ${
                  isSubmitting ||
                  (selectedPaymentMethod === "mobile" && !phoneNumber.trim())
                    ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                    : "bg-blue-500 text-white hover:bg-blue-600"
                }`}
              >
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
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Prendre rendez-vous</h1>

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {/* Professional info */}
        <div className="bg-gray-50 border-b border-gray-200 p-6">
          <div className="flex items-center">
            {professional?.profileImage ? (
              <img
                src={professional.profileImage}
                alt={professionalName}
                className="w-16 h-16 rounded-full object-cover mr-4"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center mr-4">
                <User className="h-8 w-8 text-gray-400" />
              </div>
            )}
            <div>
              <h2 className="text-xl font-bold">{professionalName}</h2>
              <p className="text-gray-600">{professionalSpecialty}</p>
              {isAvailableNow && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 mt-2">
                  <span className="w-2 h-2 bg-green-400 rounded-full mr-2"></span>
                  Disponible maintenant
                </span>
              )}
            </div>
          </div>
        </div>

        {isAvailableNow && (
          <div className="p-6 bg-green-50 border-b border-green-100">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-green-800">
                  Consultation immédiate disponible
                </h3>
                <p className="text-green-600 mt-1">
                  Ce professionnel est disponible pour une consultation
                  maintenant
                </p>
              </div>
              <button
                onClick={handleInstantConsultation}
                disabled={isRequestingInstant}
                className={`px-6 py-3 bg-green-500 text-white font-semibold rounded-lg hover:bg-green-600 transition-colors flex items-center ${
                  isRequestingInstant ? "opacity-75 cursor-not-allowed" : ""
                }`}
              >
                <Video className="h-5 w-5 mr-2" />
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
                  setSelectedDay(dayName);
                  setSelectedTime(slot.time || "");

                  console.log("🎯 Slot selected and state updated:", {
                    slot,
                    dayName,
                    time: slot.time,
                    selectedTimeSlot: slot,
                    selectedTime: slot.time,
                  });
                  console.log("🎯 Slot selected:", slot);
                } else {
                  // Si le slot est null (désélection), réinitialiser les valeurs
                  setSelectedDay("");
                  setSelectedTime("");
                  console.log("🔄 Slot deselected, state reset");
                }

                // Check availability
                if (professional && selectedDay && selectedTime) {
                  checkSlotAvailability();
                }
              } catch (error) {
                console.log("✅ Slot selection processed:", {
                  date: format(dateObj, "yyyy-MM-dd"),
                  dayName,
                  time: slot.time,
                });
                console.error("Erreur lors de la sélection du créneau:", error);
                // Réinitialiser en cas d'erreur
                console.log("🔄 Slot deselected, resetting values");
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
                <h3 className="text-lg font-semibold mb-4">
                  Type de consultation
                </h3>

                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={() => setConsultationType("video")}
                    className={`w-full flex items-center p-4 rounded-md transition-colors ${
                      consultationType === "video"
                        ? "bg-blue-50 border-2 border-blue-500 text-blue-700"
                        : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    <Video
                      className={`h-6 w-6 mr-3 ${
                        consultationType === "video"
                          ? "text-blue-500"
                          : "text-gray-500"
                      }`}
                    />
                    <div className="text-left">
                      <span className="font-medium block">Vidéo</span>
                      <span className="text-sm text-gray-500">
                        Face-à-face virtuel avec le professionnel
                      </span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setConsultationType("audio")}
                    className={`w-full flex items-center p-4 rounded-md transition-colors ${
                      consultationType === "audio"
                        ? "bg-blue-50 border-2 border-blue-500 text-blue-700"
                        : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    <PhoneCall
                      className={`h-6 w-6 mr-3 ${
                        consultationType === "audio"
                          ? "text-blue-500"
                          : "text-gray-500"
                      }`}
                    />
                    <div className="text-left">
                      <span className="font-medium block">Audio</span>
                      <span className="text-sm text-gray-500">
                        Consultation téléphonique
                      </span>
                    </div>
                  </button>
                </div>
              </section>

              {/* Selected slot info */}
              {selectedTimeSlot && (
                <section className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="text-md font-semibold mb-2 text-blue-700">
                    Créneau sélectionné
                  </h3>
                  <div className="flex items-center text-blue-600 mb-1">
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
                  <div className="flex items-center text-blue-600">
                    <Clock className="h-4 w-4 mr-2" />
                    <span>
                      {selectedTimeSlot.time || "Heure non disponible"}
                    </span>
                  </div>

                  {/* Debug info en mode développement */}
                  {process.env.NODE_ENV === "development" && (
                    <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs">
                      <p>
                        <strong>Debug:</strong>
                      </p>
                      <p>
                        selectedTimeSlot: {selectedTimeSlot ? "Oui" : "Non"}
                      </p>
                      <p>selectedTime: {selectedTime || "Vide"}</p>
                      <p>consultationType: {consultationType}</p>
                      <p>isSlotAvailable: {isSlotAvailable ? "Oui" : "Non"}</p>
                    </div>
                  )}
                </section>
              )}

              {/* Payment summary */}
              <section className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4">Résumé</h3>

                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Consultation</span>
                    <span className="font-medium">
                      {professionalPrice === null
                        ? "Gratuit"
                        : `${professionalPrice.toLocaleString()} ${professionalCurrency}`}
                    </span>
                  </div>
                  <div className="pt-3 border-t">
                    <div className="flex justify-between">
                      <span className="font-semibold">Total</span>
                      <span className="font-semibold">
                        {professionalPrice === null || professionalPrice === 0
                          ? "Gratuit"
                          : `${professionalPrice.toLocaleString()} ${professionalCurrency}`}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={
                    !isTesting &&
                    (!selectedTimeSlot ||
                      !consultationType ||
                      isSubmitting ||
                      !isSlotAvailable)
                  }
                  className={`w-full py-3 rounded-md font-semibold mt-4 transition-all duration-200 flex items-center justify-center shadow-md hover:shadow-lg ${
                    !isTesting &&
                    (!selectedTimeSlot ||
                      !consultationType ||
                      isSubmitting ||
                      !isSlotAvailable)
                      ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                      : "bg-green-600 text-white hover:bg-green-700 transform hover:-translate-y-0.5"
                  }`}
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Création de la facture...
                    </>
                  ) : (
                    <>
                      <CreditCard className="h-5 w-5 mr-2" />
                      Payer avec PayTech
                    </>
                  )}
                </button>
              </section>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default BookAppointment;
