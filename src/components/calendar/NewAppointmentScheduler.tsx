import React, { useState, useEffect, useCallback } from "react";
import {
  Calendar,
  Clock,
  Plus,
  Trash2,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  addDays,
  isValid,
  isBefore,
  getDay,
  startOfDay,
} from "date-fns";
import { fr } from "date-fns/locale";
import {
  getFirestoreInstance,
  ensureFirestoreReady,
} from "../../utils/firebase";
import {
  normalizeDate,
  areDatesEqual,
  generateSlotKey,
} from "../../utils/dateUtils";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { getUserBookings } from "../../services/bookingService";
import { useAuth } from "../../contexts/AuthContext";
import DatePickerModal from "./DatePickerModal";

// Types
export interface TimeSlot {
  id?: string | null;
  date: Date | string; // Allow Firestore Timestamp or Date
  time: string;
  isBooked?: boolean;
  bookingId?: string;
  day?: string;
}

export interface CalendarEvent {
  id: string;
  professionalId: string;
  title: string;
  start: Date;
  end: Date;
  isAvailable: boolean;
  isRecurring: boolean;
  recurringPattern?: {
    frequency: "daily" | "weekly" | "monthly";
    interval: number;
    endDate?: Date;
  };
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

interface NewAppointmentSchedulerProps {
  professionalId: string;
  isProfessional?: boolean;
  availableDays?: Date[];
  onSlotSelect?: (slot: TimeSlot | null) => void;
  existingSlots?: TimeSlot[];
  showAddModal?: boolean;
  setShowAddModal?: (show: boolean) => void;
  onSlotsChange?: (slots: TimeSlot[]) => void;
}

const NewAppointmentScheduler: React.FC<NewAppointmentSchedulerProps> = ({
  professionalId,
  isProfessional = false,
  availableDays = [],
  onSlotSelect,
  showAddModal: externalShowAddModal,
  setShowAddModal: externalSetShowAddModal,
  existingSlots = [],
  onSlotsChange,
}) => {
  const { currentUser } = useAuth();

  // State
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingSlots, setLoadingSlots] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [slotError, setSlotError] = useState<string | null>(null);
  const [internalShowAddModal, setInternalShowAddModal] =
    useState<boolean>(false);
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);
  const [isInfiniteLoopDetected, setIsInfiniteLoopDetected] =
    useState<boolean>(false);
  const loopDetectionCountRef = React.useRef<number>(0);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<TimeSlot | null>(
    null
  );
  const [reservedSlotKeys, setReservedSlotKeys] = useState<string[]>([]);

  // Add slot form state
  const [startTime, setStartTime] = useState<string>("09:00");
  const [endTime, setEndTime] = useState<string>("17:00");
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [slotDuration, setSlotDuration] = useState<number>(60); // minutes

  // State pour stocker les horaires spécifiques de chaque jour
  const [weeklySchedule, setWeeklySchedule] = useState<{
    [key: string]: { startTime: string; endTime: string };
  }>({
    monday: { startTime: "09:00", endTime: "17:00" },
    tuesday: { startTime: "09:00", endTime: "17:00" },
    wednesday: { startTime: "09:00", endTime: "17:00" },
    thursday: { startTime: "09:00", endTime: "17:00" },
    friday: { startTime: "09:00", endTime: "17:00" },
    saturday: { startTime: "09:00", endTime: "17:00" },
    sunday: { startTime: "09:00", endTime: "17:00" },
  });

  // Fonction pour gérer les changements du planning hebdomadaire
  const handleWeeklyScheduleChange = (schedule: {
    [key: string]: { startTime: string; endTime: string };
  }) => {
    setWeeklySchedule(schedule);
  };

  // Use external or internal modal state
  const showAddModal =
    externalShowAddModal !== undefined
      ? externalShowAddModal
      : internalShowAddModal;
  const setShowAddModal = externalSetShowAddModal || setInternalShowAddModal;

  // Fonction pour vérifier si une date est dans la liste des jours disponibles
  const isDateAvailable = (date: Date): boolean => {
    if (!availableDays || availableDays.length === 0) return false;

    const normalizedDate = normalizeDate(date);

    return availableDays.some((availableDay) => {
      const normalizedAvailableDay = normalizeDate(availableDay);
      return normalizedDate === normalizedAvailableDay;
    });
  };

  // Charger les créneaux déjà réservés pour tous les patients
  useEffect(() => {
    const fetchReservedSlots = async () => {
      if (!professionalId) {
        console.log(
          "🔍 [RESERVED DEBUG] No professionalId provided, skipping reserved slots fetch"
        );
        return;
      }

      try {
        console.log(
          "🔍 [RESERVED DEBUG] Loading reserved slots for professional:",
          professionalId
        );
        console.log("🔍 [RESERVED DEBUG] Current user:", currentUser?.id);

        // Get all bookings for this professional
        const bookings = await getUserBookings(professionalId, "professional");
        console.log("🔍 [RESERVED DEBUG] Fetched bookings:", bookings.length);

        if (bookings.length > 0) {
          console.log("🔍 [RESERVED DEBUG] Sample booking:", {
            id: bookings[0].id,
            date: bookings[0].date,
            startTime: bookings[0].startTime,
            status: bookings[0].status,
            patientName: bookings[0].patientName,
          });
        }

        // Filter active bookings (already filtered by professional in getUserBookings)
        const reserved = bookings.filter(
          (b) => b.status === "en_attente" || b.status === "confirmé"
        );

        console.log(
          `✅ [RESERVED DEBUG] Found ${reserved.length} active reservations out of ${bookings.length} total`
        );

        if (reserved.length > 0) {
          console.log("🔍 [RESERVED DEBUG] Sample reserved booking:", {
            date: reserved[0].date,
            startTime: reserved[0].startTime,
            status: reserved[0].status,
          });
        }

        // Créer des clés au format YYYY-MM-DD-HH:MM pour chaque réservation
        const reservedKeys = reserved.map((b) =>
          generateSlotKey(b.date, b.startTime)
        );
        console.log("🔑 [RESERVED DEBUG] Reservation keys:", reservedKeys);
        if (reservedKeys.length > 0) {
          console.log("📊 [RESERVED DEBUG] Sample key:", reservedKeys[0]);
        }

        setReservedSlotKeys(reservedKeys);

        console.log(
          "🔑 [RESERVED DEBUG] Reserved slot keys set:",
          reservedKeys.length
        );
      } catch (error) {
        console.error(
          "❌ [RESERVED DEBUG] Error loading reserved slots:",
          error
        );
        console.error("❌ [RESERVED DEBUG] Error details:", {
          code: error.code,
          message: error.message,
          professionalId,
          currentUser: currentUser?.id,
        });
        // Set empty array on error to avoid blocking the UI
        setReservedSlotKeys([]);
      }
    };

    if (professionalId) {
      fetchReservedSlots();
    }
  }, [professionalId, currentUser?.id, refreshTrigger]);

  // Load available slots for the selected date
  const loadAvailableSlots = useCallback(async () => {
    if (!selectedDate || !professionalId) return;

    // Infinite loop detection
    loopDetectionCountRef.current += 1;
    if (loopDetectionCountRef.current > 10) {
      console.warn("⚠️ Possible infinite loop detected in loadAvailableSlots");
      setIsInfiniteLoopDetected(true);
      setSlotError(
        "Problème de chargement détecté. Veuillez rafraîchir la page."
      );
      return;
    }

    console.log(
      "🔄 Loading available slots for date:",
      format(selectedDate, "yyyy-MM-dd")
    );
    console.log("🔍 Professional ID utilisé pour la requête:", professionalId);

    try {
      setLoadingSlots(true);
      setSlotError(null);

      // Ensure Firestore is ready
      await ensureFirestoreReady();

      const db = getFirestoreInstance();
      if (!db) throw new Error("Firestore not available");

      // Get the day of week for the selected date
      const dayNames = [
        "Dimanche",
        "Lundi",
        "Mardi",
        "Mercredi",
        "Jeudi",
        "Vendredi",
        "Samedi",
      ];
      const dayIndex = selectedDate.getDay();
      const dayName = dayNames[dayIndex];

      console.log(
        `🔍 Looking for slots on ${dayName} (${format(
          selectedDate,
          "yyyy-MM-dd"
        )}) - Day index: ${dayIndex}`
      );

      // Query for slots on this date
      const eventsRef = collection(db, "calendar_events");
      const startOfDay = new Date(selectedDate);
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date(selectedDate);
      endOfDay.setHours(23, 59, 59, 999);

      // Requête simplifiée pour éviter les problèmes de permissions
      const q = query(
        eventsRef,
        where("professionalId", "==", professionalId),
        where("start", ">=", startOfDay),
        where("start", "<=", endOfDay)
      );

      console.log("🔍 Exécution de la requête Firestore...");
      const snapshot = await getDocs(q);

      console.log(`📊 Found ${snapshot.docs.length} slots in Firestore`);

      // Convert to TimeSlot format
      const slots: TimeSlot[] = snapshot.docs
        .map((doc) => {
          const data = doc.data();
          let start: Date;

          try {
            // Handle potential invalid date formats
            start = data.start.toDate();

            if (!isValid(start)) {
              console.warn(`⚠️ Invalid date in slot:`, data);
              return null;
            }
          } catch (err) {
            console.error("❌ Error converting date:", err);
            return null;
          }

          return {
            id: doc.id,
            date: start,
            time: format(start, "HH:mm"),
            isBooked: !data.isAvailable,
            bookingId: data.bookingId,
          };
        })
        .filter(Boolean) as TimeSlot[];

      // Sort by time
      slots.sort((a, b) => {
        return a.time.localeCompare(b.time);
      });

      // Marquer les créneaux réservés en utilisant reservedSlotKeys
      const updatedSlots = slots.map((slot) => {
        const slotKey = generateSlotKey(slot.date, slot.time);
        const isBooked = reservedSlotKeys.includes(slotKey);

        console.log(`🔍 [SLOT CHECK] Créneau: ${slotKey}`);
        console.log(`🔍 [SLOT CHECK] Dans reservedSlotKeys: ${isBooked}`);
        console.log(`🔍 [SLOT CHECK] Firestore isAvailable: ${!slot.isBooked}`);
        console.log(
          `🔍 [SLOT CHECK] Final isBooked: ${isBooked || slot.isBooked}`
        );

        return {
          ...slot,
          isBooked: isBooked || slot.isBooked, // Combine Firestore status and booking status
        };
      });

      console.log(
        `✅ [SLOT CHECK] Updated ${updatedSlots.length} slots with booking status`
      );
      const bookedCount = updatedSlots.filter((s) => s.isBooked).length;
      console.log(`📊 [SLOT CHECK] ${bookedCount} slots marked as booked`);

      setAvailableSlots(updatedSlots);

      console.log(`✅ Successfully loaded ${slots.length} slots`);

      // If we have a callback, call it
      if (onSlotsChange) {
        // Convertir les slots pour le callback avec le bon format de date
        const formattedSlots = slots.map((slot) => {
          return {
            id: slot.id,
            date: format(slot.date, "yyyy-MM-dd"),
            time: slot.time,
            isBooked: slot.isBooked,
            bookingId: slot.bookingId,
          };
        });

        console.log(
          `Sending ${formattedSlots.length} slots to parent component`
        );
        if (formattedSlots.length > 0) {
          console.log(
            `Sample slot: date=${formattedSlots[0].date}, day=${formattedSlots[0].day}, time=${formattedSlots[0].time}`
          );
        }

        onSlotsChange(formattedSlots);
      }

      // Reset loop detection counter on successful load
      loopDetectionCountRef.current = 0;
      setIsInfiniteLoopDetected(false);
    } catch (err) {
      console.error("Error loading available slots:", err);
      setSlotError("Erreur lors du chargement des créneaux disponibles");
    } finally {
      setLoadingSlots(false);
    }
  }, [professionalId, selectedDate, onSlotsChange, reservedSlotKeys]);

  // Load slots when selected date changes
  useEffect(() => {
    if (selectedDate) {
      loadAvailableSlots();
    }

    return () => {
      loopDetectionCountRef.current = 0;
    };
  }, [selectedDate, professionalId, refreshTrigger, loadAvailableSlots]);

  // Charger les créneaux au montage du composant
  useEffect(() => {
    if (selectedDate) {
      loadAvailableSlots();
    }
  }, []);

  // Navigate to previous month
  const prevMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  // Navigate to next month
  const nextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  // Generate time slots between start and end time
  const generateTimeSlots = (
    start: string,
    end: string,
    intervalMinutes: number
  ): string[] => {
    const slots: string[] = [];
    if (!start || !end) return slots;

    const [startHour, startMinute] = start.split(":").map(Number);
    const [endHour, endMinute] = end.split(":").map(Number);

    const startDate = new Date();
    startDate.setHours(startHour, startMinute, 0, 0);

    const endDate = new Date();
    endDate.setHours(endHour, endMinute, 0, 0);

    const current = new Date(startDate);

    while (current < endDate) {
      slots.push(format(current, "HH:mm"));
      current.setMinutes(current.getMinutes() + intervalMinutes);
    }

    return slots;
  };

  // Add new availability slots
  const handleAddSlots = async () => {
    try {
      setLoading(true);
      setError(null);

      // Ensure Firestore is ready
      await ensureFirestoreReady();

      const db = getFirestoreInstance();
      if (!db) throw new Error("Firestore not available");

      // Vérifier que l'utilisateur est authentifié et est un professionnel
      if (!currentUser?.id) {
        throw new Error("Utilisateur non authentifié");
      }

      // Validation supplémentaire
      if (selectedDates.length === 0) {
        throw new Error("Veuillez sélectionner au moins une date.");
      }

      // For each selected date, create slots
      const createdSlots: TimeSlot[] = [];
      const eventsRef = collection(db, "calendar_events");

      // Fonction pour créer des créneaux pour une date donnée avec des horaires spécifiques
      const createSlotsForDate = async (
        targetDate: Date,
        startTime: string,
        endTime: string
      ) => {
        // Vérifier que la date n'est pas dans le passé
        if (isBefore(targetDate, startOfDay(new Date()))) {
          console.warn(
            `⚠️ Date dans le passé ignorée: ${format(targetDate, "yyyy-MM-dd")}`
          );
          return;
        }

        console.log(
          `📅 Création de créneaux pour: ${format(
            targetDate,
            "yyyy-MM-dd"
          )} (${startTime}-${endTime})`
        );

        // Generate time slots for this specific time range
        const timeSlots = generateTimeSlots(startTime, endTime, slotDuration);

        if (timeSlots.length === 0) {
          console.warn(`⚠️ Aucun créneau généré pour ${startTime}-${endTime}`);
          return;
        }

        // For each time slot, create an event
        for (const time of timeSlots) {
          const [hours, minutes] = time.split(":").map(Number);

          const start = new Date(targetDate);
          start.setHours(hours, minutes, 0, 0);

          const end = new Date(start);
          end.setMinutes(end.getMinutes() + slotDuration);

          // Create the event in Firestore
          const eventData = {
            professionalId: currentUser.id,
            title: "Available",
            start,
            end,
            isAvailable: true,
            isRecurring: false,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          };

          console.log(
            `📝 Création du créneau avec professionalId: ${currentUser.id}`
          );

          const docRef = await addDoc(eventsRef, eventData);

          // Add to created slots
          createdSlots.push({
            id: docRef.id,
            date: start,
            day: format(start, "EEEE", { locale: fr }),
            time: format(start, "HH:mm"),
          });
        }
      };

      // Créer les créneaux pour les dates sélectionnées
      for (const targetDate of selectedDates) {
        // Déterminer le jour de la semaine pour cette date
        const dayOfWeek = targetDate.getDay();
        const dayMap: { [key: number]: string } = {
          0: "sunday",
          1: "monday",
          2: "tuesday",
          3: "wednesday",
          4: "thursday",
          5: "friday",
          6: "saturday",
        };

        const dayName = dayMap[dayOfWeek];

        // Utiliser les horaires spécifiques du jour ou les horaires par défaut
        const daySchedule = weeklySchedule[dayName];
        const dayStartTime = daySchedule ? daySchedule.startTime : startTime;
        const dayEndTime = daySchedule ? daySchedule.endTime : endTime;

        console.log(
          `📅 Création pour ${dayName}: ${dayStartTime}-${dayEndTime}`
        );

        await createSlotsForDate(targetDate, dayStartTime, dayEndTime);
      }

      console.log(`Created ${createdSlots.length} slots`);

      // Fermer le modal et rafraîchir
      setShowAddModal(false);
      setRefreshTrigger((prev) => prev + 1);

      // Réinitialiser les dates sélectionnées
      setSelectedDates([]);
    } catch (err) {
      console.error("Error adding slots:", err);
      setError(
        `Erreur lors de l'ajout des créneaux: ${
          err instanceof Error ? err.message : "Erreur inconnue"
        }`
      );
    } finally {
      setLoading(false);
    }
  };

  // Delete a slot
  const handleDeleteSlot = async (slotId: string) => {
    if (!slotId) return;

    try {
      setLoading(true);
      setError(null);

      // Ensure Firestore is ready
      await ensureFirestoreReady();

      const db = getFirestoreInstance();
      if (!db) throw new Error("Firestore not available");

      // Delete the event
      const eventRef = doc(db, "calendar_events", slotId);
      await deleteDoc(eventRef);

      // Refresh slots
      setRefreshTrigger((prev) => prev + 1);
    } catch (err) {
      console.error("Error deleting slot:", err);
      setError("Erreur lors de la suppression du créneau");
    } finally {
      setLoading(false);
    }
  };

  // Handle slot selection (for patients)
  const handleSlotClick = (slot: TimeSlot) => {
    if (isProfessional || slot.isBooked) return;

    console.log("Slot cliqué:", slot);
    console.log("Slot actuel:", selectedTimeSlot);

    // Si le créneau est déjà sélectionné, le désélectionner
    if (
      selectedTimeSlot &&
      selectedTimeSlot.time === slot.time &&
      areDatesEqual(selectedTimeSlot.date, slot.date)
    ) {
      console.log("Désélection du créneau");
      setSelectedTimeSlot(null);
      if (onSlotSelect) {
        onSlotSelect(null);
      }
    } else {
      // Sinon, sélectionner le nouveau créneau
      console.log("Sélection du nouveau créneau");
      setSelectedTimeSlot(slot);
      if (onSlotSelect) {
        onSlotSelect(slot);
      }
    }
  };

  // Render calendar days
  const renderDays = () => {
    // Jours de la semaine en français
    const days = ["lun.", "mar.", "mer.", "jeu.", "ven.", "sam.", "dim."];

    return (
      <div className="grid grid-cols-7 mb-2">
        {days.map((day, i) => (
          <div
            key={i}
            className="text-center font-medium text-gray-500 text-sm py-2"
          >
            {day}
          </div>
        ))}
      </div>
    );
  };

  // Fonction utilitaire pour déboguer les jours de la semaine (utile pour le développement)
  const debugDayOfWeek = (date: Date): string => {
    try {
      if (!isValid(date)) return "Date invalide";

      const dayIndex = date.getDay(); // 0 = dimanche, 1 = lundi, etc.
      const dayNames = [
        "Dimanche",
        "Lundi",
        "Mardi",
        "Mercredi",
        "Jeudi",
        "Vendredi",
        "Samedi",
      ];
      return `${dayNames[dayIndex]} (index: ${dayIndex})`;
    } catch (error) {
      return "Erreur de conversion";
    }
  };

  // Render calendar cells
  const renderCells = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = monthStart;
    const endDate = monthEnd;

    const dateFormat = "d";

    // Créer un Map pour compter le nombre de créneaux par jour
    const availableDatesMap = new Map<string, number>();

    // Deux sources de données pour les jours disponibles:
    // 1. Les créneaux existants (existingSlots)
    // 2. Les jours disponibles fournis directement (availableDays)

    // Traiter les créneaux existants
    if (existingSlots && existingSlots.length > 0) {
      existingSlots.forEach((slot) => {
        try {
          if (slot.isBooked) return; // Ne prendre que les créneaux non réservés

          let normalizedDate = "";

          // Gérer tous les formats de date possibles
          if (typeof slot.date === "string") {
            // Format YYYY-MM-DD
            normalizedDate = slot.date.substring(0, 10);
          } else if (slot.date instanceof Date) {
            normalizedDate = format(slot.date, "yyyy-MM-dd");
          } else if (
            slot.date &&
            typeof slot.date === "object" &&
            "toDate" in slot.date
          ) {
            // Timestamp Firestore
            normalizedDate = format((slot.date as any).toDate(), "yyyy-MM-dd");
          }

          if (normalizedDate) {
            const count = availableDatesMap.get(normalizedDate) || 0;
            availableDatesMap.set(normalizedDate, count + 1);
            console.log(
              `✅ Jour disponible détecté (existingSlots): ${normalizedDate} (${
                count + 1
              } créneaux)`
            );
          }
        } catch (error) {
          console.error(
            "❌ Erreur lors de la normalisation de la date:",
            error,
            slot
          );
        }
      });
    }

    // Traiter les jours disponibles fournis directement
    if (availableDays && availableDays.length > 0) {
      availableDays.forEach((day) => {
        try {
          const normalizedDate = normalizeDate(day);
          if (normalizedDate) {
            // Si le jour n'est pas déjà dans la map, l'ajouter avec un compte de 1
            if (!availableDatesMap.has(normalizedDate)) {
              availableDatesMap.set(normalizedDate, 1);
              console.log(
                `✅ Jour disponible détecté (availableDays): ${normalizedDate}`
              );
            }
          }
        } catch (error) {
          console.error(
            "❌ Erreur lors de la normalisation du jour disponible:",
            error,
            day
          );
        }
      });
    }

    console.log("Jours disponibles:", Array.from(availableDatesMap.entries()));

    const days = eachDayOfInterval({
      start: startDate,
      end: endDate,
    });

    let formattedDays = [];

    // Add days from previous month to start on Monday
    const firstDayOfMonth = getDay(monthStart);
    const prevMonthDays: Date[] = [];
    console.log(`Premier jour du mois: ${debugDayOfWeek(monthStart)}`);

    for (
      let i = 0;
      i < (firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1);
      i++
    ) {
      prevMonthDays.unshift(addDays(monthStart, -i - 1));
    }

    // Add days from next month to end on Sunday
    const lastDayOfMonth = getDay(monthEnd);
    const nextMonthDays: Date[] = [];
    console.log(`Dernier jour du mois: ${debugDayOfWeek(monthEnd)}`);

    for (let i = 0; i < (lastDayOfMonth === 0 ? 0 : 7 - lastDayOfMonth); i++) {
      nextMonthDays.push(addDays(monthEnd, i + 1));
    }

    // Combine all days
    formattedDays = [...prevMonthDays, ...days, ...nextMonthDays];

    // Create weeks
    const weeks: Date[][] = [];
    let week: Date[] = [];

    formattedDays.forEach((day, i) => {
      week.push(day);

      if (i % 7 === 6) {
        weeks.push(week);
        week = [];
      }
    });

    // Render weeks
    return weeks.map((week, i) => (
      <div key={i} className="grid grid-cols-7">
        {week.map((day, idx) => {
          const dayStr = format(day, dateFormat);
          const isCurrentMonth = isSameMonth(day, currentMonth);
          const isSelected = selectedDate
            ? isSameDay(day, selectedDate)
            : false;
          const isTodayDate = isToday(day);
          const isPast = isBefore(day, new Date()) && !isToday(day);

          // Vérifier si le jour est disponible
          const formattedDay = format(day, "yyyy-MM-dd");
          const slotsCount = availableDatesMap.get(formattedDay) || 0;
          const hasAvailability = slotsCount > 0 || isDateAvailable(day);
          const isSelectable = isCurrentMonth && !isPast;

          return (
            <div
              key={idx}
              className={`h-12 border border-gray-100 flex items-center justify-center relative ${
                !isCurrentMonth
                  ? "text-gray-300 bg-gray-50"
                  : isPast
                  ? "text-gray-400 bg-gray-50"
                  : isSelected
                  ? "bg-blue-500 text-white"
                  : isTodayDate
                  ? "bg-blue-50 text-blue-600"
                  : "text-gray-700 hover:bg-gray-50"
              } ${isSelectable ? "cursor-pointer" : "cursor-not-allowed"}`}
              onClick={() => isSelectable && setSelectedDate(day)}
            >
              <div className="flex flex-col items-center justify-center relative">
                <span
                  className={`text-sm ${
                    isSelected
                      ? "font-bold"
                      : hasAvailability
                      ? "font-medium"
                      : ""
                  }`}
                >
                  {dayStr}
                </span>
                {hasAvailability && !isSelected && (
                  <div className="absolute -bottom-1 w-2 h-2 rounded-full bg-green-500"></div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    ));
  };

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-800 flex items-center">
          <Calendar className="w-6 h-6 text-blue-500 mr-2" />
          {isProfessional
            ? "Gérer mes disponibilités"
            : "Sélectionner un créneau"}
        </h2>

        {isProfessional && (
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-all duration-200 flex items-center shadow-sm hover:shadow-md transform hover:-translate-y-0.5"
          >
            <Plus className="w-4 h-4 mr-2" />
            Ajouter des créneaux
          </button>
        )}
      </div>

      {/* Error message */}
      {error && (
        <div className="m-4 p-3 bg-red-50 border border-red-200 rounded-md flex items-center">
          <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}

      <div className="flex flex-col md:flex-row">
        {/* Calendar */}
        <div className="md:w-1/2 p-4 border-r border-gray-200">
          <div className="flex justify-between items-center mb-4">
            <button
              onClick={prevMonth}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            </button>

            <h3 className="text-lg font-medium text-gray-800">
              {format(currentMonth, "MMMM yyyy", { locale: fr })}
            </h3>

            <button
              onClick={nextMonth}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <ChevronRight className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          {renderDays()}
          {renderCells()}
          <div className="mt-4 p-3 bg-green-50 border border-green-100 rounded-md text-center text-sm text-green-700">
            <div className="flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-green-500 mr-2"></div>
              <p>
                Les jours avec un point vert indiquent des créneaux disponibles
              </p>
            </div>
          </div>

          <div className="mt-4 flex justify-center">
            <button
              onClick={() => {
                setCurrentMonth(new Date());
              }}
              className="px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
            >
              Aujourd'hui
            </button>
          </div>
        </div>

        {/* Time slots */}
        <div className="md:w-1/2 p-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-800 flex items-center">
              <Clock className="w-5 h-5 text-blue-500 mr-2" />
              {selectedDate
                ? format(selectedDate, "EEEE d MMMM", { locale: fr })
                : "Sélectionnez une date"}
            </h3>

            <button
              onClick={() => setRefreshTrigger((prev) => prev + 1)}
              className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors"
              title="Rafraîchir"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          {/* Slot error message */}
          {(slotError || isInfiniteLoopDetected) && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md flex items-center">
              <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
              <p className="text-red-600 text-sm">
                {slotError ||
                  "Problème de chargement des créneaux. Veuillez rafraîchir la page."}
              </p>
            </div>
          )}

          {loadingSlots && !isInfiniteLoopDetected ? (
            <div className="flex flex-col justify-center items-center h-40">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              <p className="mt-4 text-gray-500">Chargement des créneaux...</p>
            </div>
          ) : availableSlots.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {availableSlots.map((slot) => (
                <div
                  key={
                    slot.id ||
                    `${format(
                      slot.date instanceof Date
                        ? slot.date
                        : new Date(slot.date),
                      "yyyy-MM-dd"
                    )}-${slot.time}`
                  }
                  className={`relative p-3 rounded-lg border ${
                    slot.isBooked
                      ? "bg-gray-100 border-gray-300 cursor-not-allowed"
                      : isProfessional
                      ? "bg-blue-50 border-blue-200 shadow-sm"
                      : selectedTimeSlot &&
                        selectedTimeSlot.time === slot.time &&
                        areDatesEqual(selectedTimeSlot.date, slot.date)
                      ? "bg-blue-600 text-white border-blue-700 shadow-md transform scale-105"
                      : "bg-blue-50 border-blue-200 hover:bg-blue-100 cursor-pointer hover:shadow-md transition-all duration-200"
                  }`}
                  onClick={() => {
                    if (slot.isBooked) return;
                    handleSlotClick(slot);
                  }}
                >
                  {slot.isBooked && (
                    <div className="absolute top-1 right-1 text-xs text-red-500 font-semibold">
                      Réservé
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-sm font-medium ${
                        slot.isBooked
                          ? "text-gray-500"
                          : selectedTimeSlot &&
                            selectedTimeSlot.time === slot.time &&
                            areDatesEqual(selectedTimeSlot.date, slot.date)
                          ? "text-white"
                          : "text-blue-700"
                      }`}
                    >
                      {slot.time} {/* Afficher l'heure brute */}
                    </span>

                    {isProfessional && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (slot.id) handleDeleteSlot(slot.id);
                        }}
                        className="p-1 text-red-500 hover:bg-red-100 rounded-full transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {slot.isBooked && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-200 bg-opacity-50 rounded-lg">
                      <span className="text-xs font-medium text-gray-600 bg-white px-2 py-1 rounded">
                        Réservé
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-40 text-gray-500">
              {isInfiniteLoopDetected ? (
                <>
                  <AlertCircle className="w-12 h-12 text-red-300 mb-2" />
                  <p className="text-center">
                    Problème de chargement des créneaux
                  </p>
                  <button
                    onClick={() => {
                      setIsInfiniteLoopDetected(false);
                      loopDetectionCountRef.current = 0;
                      setRefreshTrigger((prev) => prev + 1);
                    }}
                    className="mt-4 px-4 py-2 text-sm bg-blue-500 text-white hover:bg-blue-600 rounded-md transition-colors"
                  >
                    <RefreshCw className="w-4 h-4 mr-2 inline" />
                    Réessayer
                  </button>
                </>
              ) : (
                <>
                  <Clock className="w-12 h-12 text-gray-300 mb-2" />
                  <p className="text-center">
                    Aucun créneau disponible pour{" "}
                    {selectedDate
                      ? format(selectedDate, "EEEE d MMMM", { locale: fr })
                      : "cette date"}
                  </p>
                </>
              )}
              {isProfessional && (
                <button
                  onClick={() => setShowAddModal(true)}
                  className="mt-4 px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                >
                  Ajouter des créneaux
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Add slots modal */}
      {showAddModal && (
        <DatePickerModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          onAddSlots={handleAddSlots}
          loading={loading}
          startTime={startTime}
          setStartTime={setStartTime}
          endTime={endTime}
          setEndTime={setEndTime}
          slotDuration={slotDuration}
          setSlotDuration={setSlotDuration}
          selectedDates={selectedDates}
          setSelectedDates={setSelectedDates}
          onWeeklyScheduleChange={handleWeeklyScheduleChange}
        />
      )}
    </div>
  );
};

export default NewAppointmentScheduler;
