import React, { useState, useEffect, useMemo } from "react";
import { Plus, AlertCircle, CheckCircle, RefreshCw, Info } from "lucide-react";
import { format, isValid } from "date-fns";
import { useAuth } from "../../contexts/AuthContext";
import {
  updateProfessionalProfile,
  type AvailabilitySlot,
} from "../../services/profileService";
import {
  ensureFirestoreReady,
  resetFirestoreConnection,
} from "../../utils/firebase";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import NewAppointmentScheduler, {
  type TimeSlot,
} from "../../components/calendar/NewAppointmentScheduler";
import { getAvailableTimeSlots } from "../../services/slotService";

const AvailabilityManagement: React.FC = () => {
  const { currentUser } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [existingSlots, setExistingSlots] = useState<TimeSlot[]>([]);

  const availableSlots = useMemo(() => {
    // Assurons-nous que tous les slots ont des dates valides
    return existingSlots
      .filter((slot) => {
        if (!slot.date || !slot.time) {
          console.warn("⚠️ Slot invalide détecté:", slot);
          return false;
        }
        if (slot.isBooked) {
          return false;
        }
        return true;
      })
      .map((slot) => {
        // Normaliser le format de date pour éviter les problèmes
        if (
          typeof slot.date === "string" &&
          slot.date.match(/^\d{4}-\d{2}-\d{2}$/)
        ) {
          return slot; // Déjà au bon format
        }

        try {
          const normalizedDate =
            typeof slot.date === "string"
              ? slot.date
              : format(new Date(slot.date), "yyyy-MM-dd");

          return {
            ...slot,
            date: normalizedDate,
          };
        } catch (error) {
          console.error(
            "❌ Erreur lors de la normalisation de la date:",
            error,
            slot
          );
          return slot; // Retourner le slot original en cas d'erreur
        }
      });
  }, [existingSlots]);
  const [noSlotsMessage, setNoSlotsMessage] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [showAddModal, setShowAddModal] = useState<boolean>(false);

  // Fonction pour charger les créneaux pour le mois en cours
  const loadSlotsForCurrentMonth = async () => {
    if (!currentUser?.id) return;

    try {
      setLoading(true);

      // Calculer le premier et le dernier jour du mois en cours
      const today = new Date();
      const startOfCurrentMonth = new Date(
        today.getFullYear(),
        today.getMonth(),
        1
      );
      const endOfCurrentMonth = new Date(
        today.getFullYear(),
        today.getMonth() + 2,
        0
      ); // Inclure le mois suivant

      console.log(
        `🔍 Chargement des créneaux du ${format(
          startOfCurrentMonth,
          "dd/MM/yyyy"
        )} au ${format(endOfCurrentMonth, "dd/MM/yyyy")}`
      );

      // Récupérer tous les créneaux pour cette période
      const slots = await getAvailableTimeSlots(
        startOfCurrentMonth,
        endOfCurrentMonth,
        currentUser.id
      );

      // Convertir en format TimeSlot attendu par le composant
      const formattedSlots: TimeSlot[] = slots.map((slot) => ({
        date: format(slot.date, "yyyy-MM-dd"),
        time: slot.time,
        isBooked: slot.isBooked,
      }));

      console.log(
        `✅ ${formattedSlots.length} créneaux chargés pour la période`
      );

      setExistingSlots(formattedSlots);

      if (formattedSlots.length === 0) {
        setNoSlotsMessage(
          "Aucun créneau n'a été trouvé pour cette période. Utilisez le bouton 'Ajouter des créneaux' pour en créer."
        );
      } else {
        setNoSlotsMessage(null);
      }
    } catch (error) {
      console.error("❌ Erreur lors du chargement des créneaux:", error);
      setError("Erreur lors du chargement des créneaux. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  };

  // Fonction pour obtenir le nom du jour à partir d'une date
  const getWeekdayName = (date: Date | string): string => {
    const days = [
      "Dimanche",
      "Lundi",
      "Mardi",
      "Mercredi",
      "Jeudi",
      "Vendredi",
      "Samedi",
    ];
    const dateObj = typeof date === "string" ? new Date(date) : date;
    return days[dateObj.getDay()];
  };

  // Load professional profile and availability data
  useEffect(() => {
    const loadProfile = async () => {
      await loadSlotsForCurrentMonth();
    };

    loadProfile();
  }, [currentUser?.id]);

  // Function to load profile (for refresh)
  const loadProfile = async () => {
    if (!currentUser?.id) return;
    await loadSlotsForCurrentMonth();
  };

  // Gérer le timeout de saveSuccess
  useEffect(() => {
    let timeoutId: NodeJS.Timeout | null = null;

    if (saveSuccess) {
      try {
        timeoutId = setTimeout(() => {
          setSaveSuccess(false);
        }, 3000);
      } catch (error) {
        console.warn("Erreur lors de la création du timeout:", error);
        // Fallback : désactiver saveSuccess immédiatement
        setSaveSuccess(false);
      }
    }

    return () => {
      if (timeoutId) {
        try {
          clearTimeout(timeoutId);
        } catch (error) {
          console.warn("Erreur lors du nettoyage du timeout:", error);
        }
      }
    };
  }, [saveSuccess]);

  // Handle slots change from AppointmentScheduler
  const handleSlotsChange = (slots: TimeSlot[]) => {
    console.log(
      "🔄 Slots changed in AvailabilityManagement:",
      slots.length,
      "slots"
    );

    if (slots.length === 0) {
      // Only update if we don't already have slots to avoid infinite loop
      if (existingSlots.length === 0) {
        setNoSlotsMessage(
          "Aucun créneau disponible pour cette date. Utilisez le bouton 'Ajouter des créneaux' pour en créer."
        );
      }
    } else {
      // Vérifier et filtrer les slots invalides avant de mettre à jour l'état
      const validSlots = slots.filter((slot) => {
        if (!slot.date || !slot.time) {
          console.warn("⚠️ Invalid slot data: missing date or time", slot);
          return false;
        }
        return true;
      });

      const normalizeSlots = (slots: TimeSlot[]) =>
        slots
          .map((slot) => `${slot.date}-${slot.time}`)
          .sort()
          .join("|");

      const newKey = normalizeSlots(validSlots);
      const currentKey = normalizeSlots(existingSlots);

      if (newKey !== currentKey) {
        console.log("🎯 Nouvelle clé:", newKey);
        console.log("🎯 Clé actuelle:", currentKey);
        setExistingSlots(validSlots);
        setNoSlotsMessage(null);
        console.log("✅ Slots updated");
      } else {
        console.log("ℹ️ Same slots received, no update triggered");
      }
    }

    // Convert to availability format
    const availabilityMap = new Map<string, AvailabilitySlot>();

    slots.forEach((slot) => {
      try {
        if (!slot.date || !slot.time) {
          console.warn("⚠️ Invalid slot data: missing date or time");
          return false;
        }

        // Calculer le jour à partir de la date
        const dateObj =
          typeof slot.date === "string" ? new Date(slot.date) : slot.date;
        const dayName = getWeekdayName(dateObj);

        if (availabilityMap.has(dayName)) {
          // Add to existing day
          const existing = availabilityMap.get(dayName)!;
          if (!existing.slots.includes(slot.time)) {
            existing.slots.push(slot.time);
            existing.slots.sort();
            console.log(`✅ Added slot ${slot.time} to day ${dayName}`);
            return true;
          }
        } else {
          // Create new day
          availabilityMap.set(dayName, {
            day: dayName,
            startTime: slot.time,
            endTime: slot.time,
            slots: [slot.time],
          });
          console.log(`✅ Created new day ${dayName} with slot ${slot.time}`);
          return true;
        }
      } catch (error) {
        console.error("❌ Error processing slot:", slot, error);
        return false;
      }
    });
  };

  const handleSave = async () => {
    if (!currentUser?.id) {
      setError("Utilisateur non connecté");
      return;
    }
    const dayNames = [
      "Dimanche",
      "Lundi",
      "Mardi",
      "Mercredi",
      "Jeudi",
      "Vendredi",
      "Samedi",
    ];
    if (existingSlots.length === 0) {
      console.log("⚠️ No slots to save");
      setError("Veuillez ajouter au moins un créneau de disponibilité");
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      console.log(
        "💾 Starting save process with",
        existingSlots.length,
        "slots"
      );

      // Convert to the format expected by the booking system
      // Get the availability from the existing slots
      const availabilityMap = new Map<string, AvailabilitySlot>();

      existingSlots.forEach((slot) => {
        try {
          console.log(`Processing slot: ${slot.date} at ${slot.time}`);
          // Vérifier et convertir la date correctement
          let date: Date;
          if (typeof slot.date === "string") {
            date = new Date(slot.date + "T00:00:00");
          } else if (
            slot.date &&
            typeof slot.date === "object" &&
            "getTime" in slot.date
          ) {
            date = slot.date as Date;
          } else {
            console.warn(`⚠️ Invalid date format:`, slot.date);
            return;
          }

          // Validate date
          if (!isValid(date)) {
            console.warn(
              `⚠️ Invalid date: ${
                typeof slot.date === "string" ? slot.date : "Date object"
              }`
            );
            return;
          }

          // Calculer le jour à partir de la date
          const dayIndex = date.getDay(); // 0 = dimanche, 1 = lundi, etc.
          const dayName = dayNames[dayIndex];

          if (!dayName) {
            console.warn(
              `⚠️ Invalid day index: ${dayIndex} for date ${format(
                date,
                "yyyy-MM-dd"
              )}`
            );
            return;
          }

          console.log(
            `Date: ${format(
              date,
              "yyyy-MM-dd"
            )}, Jour: ${dayName} (index: ${dayIndex})`
          );

          if (availabilityMap.has(dayName)) {
            // Add to existing day
            const existing = availabilityMap.get(dayName)!;
            if (!existing.slots.includes(slot.time)) {
              existing.slots.push(slot.time);
              existing.slots.sort((a, b) => a.localeCompare(b));
              console.log(`Added slot ${slot.time} to existing day ${dayName}`);
              console.log(`✅ Added slot ${slot.time} to day ${dayName}`);
            }
          } else {
            // Create new day
            availabilityMap.set(dayName, {
              day: dayName,
              startTime: slot.time,
              endTime: slot.time,
              slots: [slot.time],
            });
            console.log(`Created new day ${dayName} with slot ${slot.time}`);
            console.log(`✅ Created new day ${dayName} with slot ${slot.time}`);
          }
        } catch (error) {
          console.error(
            `❌ Error processing slot ${slot.date} at ${slot.time}:`,
            error
          );
        }
      });

      // Update start and end times
      availabilityMap.forEach((avail) => {
        if (avail.slots.length > 0) {
          try {
            avail.slots.sort((a, b) => a.localeCompare(b));
            avail.startTime = avail.slots[0];
            avail.endTime = avail.slots[avail.slots.length - 1];
          } catch (error) {
            console.error(
              `❌ Error updating start/end times for day ${avail.day}:`,
              error
            );
          }
        }
      });

      console.log("Converted map to array with", availabilityMap.size, "days");
      // Convert map to array
      const formattedAvailability = Array.from(availabilityMap.values());

      console.log(
        "💾 Saving availability with",
        formattedAvailability.length,
        "days and",
        formattedAvailability.reduce((sum, day) => sum + day.slots.length, 0),
        "total slots"
      );

      // Ensure Firestore is ready
      await ensureFirestoreReady();

      // Update professional profile
      console.log(
        "Updating professional profile with",
        formattedAvailability.length,
        "days"
      );
      await updateProfessionalProfile(currentUser.id, {
        availability: formattedAvailability,
      });

      setSaveSuccess(true);
      // Le timeout est maintenant géré par le useEffect
    } catch (error) {
      console.error("Error saving availabilities:", error);
      console.error("❌ Error saving availabilities:", error);
      setError(
        error instanceof Error
          ? error.message
          : "Erreur lors de l'enregistrement des disponibilités"
      );
    } finally {
      setIsSaving(false);
    }
  };

  // Function to refresh data
  const handleRefresh = async () => {
    setRefreshing(true);
    setError(null);

    try {
      // Reset Firestore connection to ensure fresh data
      await resetFirestoreConnection();
      console.log("✅ Firestore connection reset");

      // Clear existing slots and reload
      setExistingSlots([]);
      console.log("✅ Existing slots cleared");

      // Reload profile data
      await loadProfile();
      console.log("✅ Profile data reloaded");

      // Update refresh trigger to force component re-render
      setRefreshTrigger((prev) => prev + 1);
    } catch (error) {
      console.error("❌ Error refreshing data:", error);
      setError("Erreur lors du rafraîchissement des données");
    } finally {
      setRefreshing(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <LoadingSpinner size="lg" />
            <p className="mt-4 text-lg text-gray-600">
              Chargement des disponibilités...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <h1 className="text-2xl font-bold">Gérer mes disponibilités</h1>
          <div className="flex space-x-3">
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all duration-200 flex items-center shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
            >
              <Plus className="h-4 w-4 mr-2" />
              Ajouter des créneaux
            </button>
            <div className="text-sm text-gray-500 flex items-center">
              {existingSlots.length} créneaux disponibles
            </div>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center"
            >
              {refreshing ? (
                <LoadingSpinner size="sm" className="mr-2" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}{" "}
              Rafraîchir
            </button>
          </div>
        </div>

        {saveSuccess && (
          <div className="mb-6 p-4 bg-green-100 border border-green-400 text-green-700 rounded-lg flex items-center">
            <CheckCircle className="h-5 w-5 mr-2" />
            Vos disponibilités ont été enregistrées avec succès
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg flex items-center">
            <AlertCircle className="h-5 w-5 mr-2" />
            {error}
          </div>
        )}

        {noSlotsMessage && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 text-yellow-700 rounded-lg flex items-center">
            <Info className="h-5 w-5 mr-2" />
            <span>{noSlotsMessage}</span>
          </div>
        )}

        {/* Calendar view */}
        <NewAppointmentScheduler
          professionalId={currentUser?.id || ""}
          isProfessional={true}
          existingSlots={availableSlots}
          onSlotsChange={handleSlotsChange}
          showAddModal={showAddModal}
          setShowAddModal={setShowAddModal}
          key={`scheduler-${refreshTrigger}`} // Force re-render on refresh
        />

        <div className="mt-6 flex justify-end">
          <button
            onClick={handleSave}
            disabled={isSaving || existingSlots.length === 0}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all duration-200 flex items-center shadow-md hover:shadow-lg transform hover:-translate-y-0.5 disabled:opacity-50 disabled:transform-none disabled:hover:shadow-md"
          >
            {isSaving ? (
              <>
                <LoadingSpinner size="sm" className="mr-2" />
                Enregistrement...
              </>
            ) : (
              <>
                <CheckCircle className="h-5 w-5 mr-2" />
                Enregistrer les modifications
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AvailabilityManagement;
