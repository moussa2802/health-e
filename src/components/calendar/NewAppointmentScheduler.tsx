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
  Loader2,
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
        return;
      }

      // Skip if user is not authenticated (for public view)
      if (!currentUser && !isProfessional) {
        return;
      }

      try {
        // Get all bookings for this professional
        const bookings = await getUserBookings(professionalId, "professional");

        // Filter active bookings (already filtered by professional in getUserBookings)
        const reserved = bookings.filter(
          (b) =>
            b.status === "en_attente" ||
            b.status === "confirmé" ||
            b.status === "confirmed"
        );

        // Créer des clés au format YYYY-MM-DD-HH:MM pour chaque réservation
        const reservedKeys = reserved.map((b) =>
          generateSlotKey(b.date, b.startTime)
        );
        console.log("[RESERVED DEBUG] Reservation keys:", reservedKeys);
        if (reservedKeys.length > 0) {
          console.log("[RESERVED DEBUG] Sample key:", reservedKeys[0]);
        }

        setReservedSlotKeys(reservedKeys);

        console.log(
          "[RESERVED DEBUG] Reserved slot keys set:",
          reservedKeys.length
        );
      } catch (error) {
        console.error(
          "[RESERVED DEBUG] Error loading reserved slots:",
          error
        );
        console.error("[RESERVED DEBUG] Error details:", {
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

    // Skip if user is not authenticated (for public view)
    if (!currentUser && !isProfessional) {
      console.log(
        "[SLOTS DEBUG] User not authenticated, skipping slots fetch"
      );
      return;
    }

    // Loop detection
    loopDetectionCountRef.current += 1;
    if (loopDetectionCountRef.current > 10) {
      console.warn("Infinite loop detected, stopping execution");
      setIsInfiniteLoopDetected(true);
      return;
    }

    try {
      setLoadingSlots(true);
      setSlotError(null);

      console.log(
        `Loading available slots for date: ${format(
          selectedDate,
          "yyyy-MM-dd"
        )}`
      );
      console.log(
        `Professional ID utilisé pour la requête: ${professionalId}`
      );

      await ensureFirestoreReady();

      const db = getFirestoreInstance();
      if (!db) {
        throw new Error("Firestore not available");
      }
      const slotsRef = collection(db, "calendar_events");

      // Query for slots on this specific date
      const dateQuery = query(
        slotsRef,
        where("professionalId", "==", professionalId),
        where("start", ">=", startOfDay(selectedDate)),
        where("start", "<", addDays(startOfDay(selectedDate), 1))
      );

      console.log("Exécution de la requête Firestore...");
      const querySnapshot = await getDocs(dateQuery);
      const slots: TimeSlot[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.isAvailable) {
          slots.push({
            id: doc.id,
            date: data.start.toDate(),
            time: format(data.start.toDate(), "HH:mm"),
            isBooked: false,
          });
        }
      });

      console.log(`Found ${slots.length} slots in Firestore`);

      // Update slots with booking status
      const updatedSlots = slots.map((slot) => {
        const slotKey = generateSlotKey(slot.date, slot.time);
        console.log(`[SLOT CHECK] Créneau: ${slotKey}`);
        console.log(
          `[SLOT CHECK] Dans reservedSlotKeys: ${reservedSlotKeys.includes(
            slotKey
          )}`
        );
        console.log(
          `[SLOT CHECK] Firestore isAvailable: ${slot.isBooked !== true}`
        );

        const isBooked = reservedSlotKeys.includes(slotKey);
        console.log(`[SLOT CHECK] Final isBooked: ${isBooked}`);

        return {
          ...slot,
          isBooked,
        };
      });

      console.log(
        `[SLOT CHECK] Updated ${updatedSlots.length} slots with booking status`
      );
      console.log(
        `[SLOT CHECK] ${
          updatedSlots.filter((s) => s.isBooked).length
        } slots marked as booked`
      );

      // Debug: Afficher les créneaux réservés
      const bookedSlots = updatedSlots.filter((s) => s.isBooked);
      if (bookedSlots.length > 0) {
        console.log(
          "[RESERVED DEBUG] Créneaux réservés:",
          bookedSlots.map((s) => ({
            date: format(s.date, "yyyy-MM-dd"),
            time: s.time,
            isBooked: s.isBooked,
          }))
        );
      }

      setAvailableSlots(updatedSlots);

      console.log(`Successfully loaded ${slots.length} slots`);

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
            `Sample slot: date=${formattedSlots[0].date}, time=${formattedSlots[0].time}`
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
  }, [professionalId, selectedDate, reservedSlotKeys]);

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

      // Vérifier l'authentification AVANT toute opération
      if (!currentUser?.id) {
        console.error(
          "Utilisateur non authentifié lors de la création des créneaux"
        );
        throw new Error("Utilisateur non authentifié");
      }

      console.log("Vérification de l'authentification:", {
        currentUser: currentUser.id,
        isProfessional,
        professionalId,
      });

      // Ensure Firestore is ready
      await ensureFirestoreReady();

      const db = getFirestoreInstance();
      if (!db) {
        throw new Error("Firestore not available");
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
            `Date dans le passé ignorée: ${format(targetDate, "yyyy-MM-dd")}`
          );
          return;
        }

        console.log(
          `Création de créneaux pour: ${format(
            targetDate,
            "yyyy-MM-dd"
          )} (${startTime}-${endTime})`
        );

        // Generate time slots for this specific time range
        const timeSlots = generateTimeSlots(startTime, endTime, slotDuration);

        if (timeSlots.length === 0) {
          console.warn(`Aucun créneau généré pour ${startTime}-${endTime}`);
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
            `Création du créneau avec professionalId: ${currentUser.id}`
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
          `Création pour ${dayName}: ${dayStartTime}-${dayEndTime}`
        );

        await createSlotsForDate(targetDate, dayStartTime, dayEndTime);
      }

      console.log(`Created ${createdSlots.length} slots`);

      // Vérifier l'état de l'authentification
      console.log("État de l'authentification après création:", {
        currentUser: currentUser?.id,
        isProfessional,
        professionalId,
      });

      // Fermer le modal et rafraîchir
      setShowAddModal(false);
      setRefreshTrigger((prev) => prev + 1);

      // Réinitialiser les dates sélectionnées
      setSelectedDates([]);

      // Afficher une notification de succès
      if (createdSlots.length > 0) {
        // Créer une notification temporaire
        const notification = document.createElement("div");
        notification.className =
          "fixed top-4 right-4 bg-ok text-white px-6 py-3 rounded-pill shadow-lift z-50 transform transition-all duration-300 translate-x-full";
        notification.innerHTML = `
          <div class="flex items-center space-x-2">
            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
            </svg>
            <span class="font-medium">${createdSlots.length} créneau(x) créé(s) avec succès !</span>
          </div>
        `;

        document.body.appendChild(notification);

        // Animer l'entrée
        setTimeout(() => {
          notification.classList.remove("translate-x-full");
        }, 100);

        // Supprimer après 3 secondes
        setTimeout(() => {
          notification.classList.add("translate-x-full");
          setTimeout(() => {
            if (notification.parentNode) {
              notification.parentNode.removeChild(notification);
            }
          }, 300);
        }, 3000);
      }
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
      if (!db) {
        throw new Error("Firestore not available");
      }

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
    const days = ["Lun.", "Mar.", "Mer.", "Jeu.", "Ven.", "Sam.", "Dim."];

    return (
      <div className="grid grid-cols-7 mb-2">
        {days.map((day, i) => (
          <div
            key={i}
            className="text-center font-medium text-muted text-sm py-2"
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
              `Jour disponible détecté (existingSlots): ${normalizedDate} (${
                count + 1
              } créneaux)`
            );
          }
        } catch (error) {
          console.error(
            "Erreur lors de la normalisation de la date:",
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
                `Jour disponible détecté (availableDays): ${normalizedDate}`
              );
            }
          }
        } catch (error) {
          console.error(
            "Erreur lors de la normalisation du jour disponible:",
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
              className={`h-12 border border-line flex items-center justify-center relative ${
                !isCurrentMonth
                  ? "text-muted bg-paper"
                  : isPast
                  ? "text-muted bg-paper"
                  : isSelected
                  ? "bg-accent text-white"
                  : isTodayDate
                  ? "ring-1 ring-inset ring-accent text-accent"
                  : "text-ink-soft hover:bg-paper"
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
                  <div className="absolute -bottom-1 w-2 h-2 rounded-full bg-ok"></div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    ));
  };

  return (
    <div className="bg-card rounded-block border border-line shadow-soft overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-line flex justify-between items-center">
        <h2 className="font-display text-xl font-semibold text-ink flex items-center">
          <Calendar className="w-6 h-6 text-accent mr-2" />
          {isProfessional
            ? "Gérer mes disponibilités"
            : "Sélectionner un créneau"}
        </h2>

        {isProfessional && (
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-accent text-white rounded-pill hover:bg-accent/90 transition-colors flex items-center shadow-soft"
          >
            <Plus className="w-4 h-4 mr-2" />
            Ajouter des créneaux
          </button>
        )}
      </div>

      {/* Error message */}
      {error && (
        <div className="m-4 p-3 bg-danger/10 border border-danger/20 rounded-xl flex items-center">
          <AlertCircle className="w-5 h-5 text-danger mr-2 flex-shrink-0" />
          <p className="text-danger text-sm">{error}</p>
        </div>
      )}

      <div className="flex flex-col md:flex-row">
        {/* Calendar */}
        <div className="md:w-1/2 p-4 border-r border-line">
          <div className="flex justify-between items-center mb-4">
            <button
              onClick={prevMonth}
              className="p-2 hover:bg-paper rounded-pill transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-ink-soft" />
            </button>

            <h3 className="text-lg font-medium text-ink">
              {format(currentMonth, "MMMM yyyy", { locale: fr })}
            </h3>

            <button
              onClick={nextMonth}
              className="p-2 hover:bg-paper rounded-pill transition-colors"
            >
              <ChevronRight className="w-5 h-5 text-ink-soft" />
            </button>
          </div>

          {renderDays()}
          {renderCells()}
          <div className="mt-4 p-3 bg-sage-soft border border-sage/20 rounded-xl text-center text-sm text-sage">
            <div className="flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-ok mr-2"></div>
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
              className="px-4 py-2 text-sm text-accent hover:bg-accent-soft rounded-pill transition-colors"
            >
              Aujourd'hui
            </button>
          </div>
        </div>

        {/* Time slots */}
        <div className="md:w-1/2 p-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-ink flex items-center">
              <Clock className="w-5 h-5 text-accent mr-2" />
              {selectedDate
                ? format(selectedDate, "EEEE d MMMM", { locale: fr })
                : "Sélectionnez une date"}
            </h3>

            <button
              onClick={() => setRefreshTrigger((prev) => prev + 1)}
              className="p-2 text-ink-soft hover:bg-paper rounded-pill transition-colors"
              title="Rafraîchir"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          {/* Slot error message */}
          {(slotError || isInfiniteLoopDetected) && (
            <div className="mb-4 p-3 bg-danger/10 border border-danger/20 rounded-xl flex items-center">
              <AlertCircle className="w-5 h-5 text-danger mr-2 flex-shrink-0" />
              <p className="text-danger text-sm">
                {slotError ||
                  "Problème de chargement des créneaux. Veuillez rafraîchir la page."}
              </p>
            </div>
          )}

          {loadingSlots && !isInfiniteLoopDetected ? (
            <div className="flex flex-col justify-center items-center h-40">
              <Loader2 className="w-8 h-8 text-accent animate-spin" />
              <p className="mt-4 text-muted">Chargement des créneaux...</p>
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
                  className={`relative p-3 rounded-xl border transition-all duration-200 ${
                    slot.isBooked
                      ? "bg-line/40 border-line cursor-not-allowed opacity-75"
                      : isProfessional
                      ? "bg-accent-soft border-accent/20 shadow-soft"
                      : selectedTimeSlot &&
                        selectedTimeSlot.time === slot.time &&
                        areDatesEqual(selectedTimeSlot.date, slot.date)
                      ? "bg-accent text-white border-accent shadow-soft scale-105"
                      : "bg-accent-soft border-accent/20 hover:bg-accent-soft/70 cursor-pointer hover:shadow-soft"
                  }`}
                  onClick={() => {
                    if (slot.isBooked) {
                      console.log("Créneau réservé, clic ignoré:", slot);
                      return;
                    }
                    handleSlotClick(slot);
                  }}
                >
                  {slot.isBooked && (
                    <div className="absolute top-1 right-1 text-xs text-danger font-bold bg-card px-2 py-1 rounded-pill border border-danger/30 shadow-soft">
                      RÉSERVÉ
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-sm font-medium ${
                        slot.isBooked
                          ? "text-muted"
                          : selectedTimeSlot &&
                            selectedTimeSlot.time === slot.time &&
                            areDatesEqual(selectedTimeSlot.date, slot.date)
                          ? "text-white"
                          : "text-accent"
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
                        className="p-1 text-danger hover:bg-danger/10 rounded-pill transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {slot.isBooked && (
                    <div className="absolute inset-0 flex items-center justify-center bg-line/50 rounded-xl">
                      <span className="text-xs font-medium text-ink-soft bg-card px-2 py-1 rounded-pill">
                        Réservé
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-40 text-muted">
              {isInfiniteLoopDetected ? (
                <>
                  <AlertCircle className="w-12 h-12 text-danger/40 mb-2" />
                  <p className="text-center">
                    Problème de chargement des créneaux
                  </p>
                  <button
                    onClick={() => {
                      setIsInfiniteLoopDetected(false);
                      loopDetectionCountRef.current = 0;
                      setRefreshTrigger((prev) => prev + 1);
                    }}
                    className="mt-4 px-4 py-2 text-sm bg-accent text-white hover:bg-accent/90 rounded-pill transition-colors"
                  >
                    <RefreshCw className="w-4 h-4 mr-2 inline" />
                    Réessayer
                  </button>
                </>
              ) : (
                <>
                  <Clock className="w-12 h-12 text-muted/50 mb-2" />
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
                  className="mt-4 px-4 py-2 text-sm text-accent hover:bg-accent-soft rounded-pill transition-colors"
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
