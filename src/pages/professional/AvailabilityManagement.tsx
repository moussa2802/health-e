import React, { useState, useEffect, useMemo } from "react";
import { Plus, RefreshCw, Info } from "lucide-react";
import { format } from "date-fns";
import { useAuth } from "../../contexts/AuthContext";
import { resetFirestoreConnection } from "../../utils/firebase";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import NewAppointmentScheduler, {
  type TimeSlot,
} from "../../components/calendar/NewAppointmentScheduler";
import { getAvailableTimeSlots } from "../../services/slotService";

const AvailabilityManagement: React.FC = () => {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [existingSlots, setExistingSlots] = useState<TimeSlot[]>([]);

  // Gestionnaire d'erreur global pour éviter les pages d'erreur
  useEffect(() => {
    const handleGlobalError = (event: ErrorEvent) => {
      // Capturer les erreurs insertBefore/removeChild silencieusement
      if (
        event.error &&
        event.error.message &&
        (event.error.message.includes("insertBefore") ||
          event.error.message.includes("removeChild") ||
          event.error.message.includes("Failed to execute"))
      ) {
        console.warn("⚠️ Erreur DOM capturée et ignorée:", event.error.message);
        event.preventDefault();
        event.stopPropagation();
        return false;
      }
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      // Capturer les promesses rejetées liées aux erreurs DOM
      if (
        event.reason &&
        event.reason.message &&
        (event.reason.message.includes("insertBefore") ||
          event.reason.message.includes("removeChild") ||
          event.reason.message.includes("Failed to execute"))
      ) {
        console.warn(
          "⚠️ Promesse rejetée capturée et ignorée:",
          event.reason.message
        );
        event.preventDefault();
        event.stopPropagation();
        return false;
      }
    };

    window.addEventListener("error", handleGlobalError);
    window.addEventListener("unhandledrejection", handleUnhandledRejection);

    return () => {
      window.removeEventListener("error", handleGlobalError);
      window.removeEventListener(
        "unhandledrejection",
        handleUnhandledRejection
      );
    };
  }, []);

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

  // Fonction pour nettoyer automatiquement les créneaux passés
  const cleanupPastSlots = async () => {
    if (!currentUser?.id) return;

    try {
      console.log("🧹 Nettoyage automatique des créneaux passés...");

      // Récupérer tous les créneaux
      const today = new Date();
      const startDate = new Date(today.getFullYear(), today.getMonth() - 1, 1); // 2 mois en arrière
      const endDate = new Date(today.getFullYear(), today.getMonth() + 2, 0); // 2 mois en avant

      const allSlots = await getAvailableTimeSlots(
        startDate,
        endDate,
        currentUser.id
      );

      // Identifier les créneaux passés
      const pastSlots = allSlots.filter((slot) => {
        const slotDate = new Date(slot.date);
        return slotDate < today && !slot.isBooked; // Seulement les créneaux non réservés
      });

      if (pastSlots.length > 0) {
        console.log(
          `🗑️ ${pastSlots.length} créneaux passés identifiés pour suppression`
        );

        // Supprimer chaque créneau passé
        for (const slot of pastSlots) {
          if (slot.id) {
            try {
              // Importer la fonction de suppression
              const { deleteAvailabilitySlot } = await import(
                "../../services/calendarService"
              );
              await deleteAvailabilitySlot(slot.id);
              console.log(
                `✅ Créneau passé supprimé: ${slot.date} ${slot.time}`
              );
            } catch (error) {
              console.error(
                `❌ Erreur lors de la suppression du créneau passé:`,
                error
              );
            }
          }
        }

        console.log("✅ Nettoyage des créneaux passés terminé");
      } else {
        console.log("✅ Aucun créneau passé à nettoyer");
      }
    } catch (error) {
      console.error("❌ Erreur lors du nettoyage des créneaux passés:", error);
    }
  };

  // Fonction pour charger les créneaux pour le mois en cours
  const loadSlotsForCurrentMonth = async () => {
    if (!currentUser?.id) return;

    try {
      setLoading(true);

      // Nettoyer d'abord les créneaux passés
      await cleanupPastSlots();

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
        )} au ${format(endOfCurrentMonth, "yyyy-MM-dd")}`
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
    } finally {
      setLoading(false);
    }
  };

  // Load professional profile and availability data
  useEffect(() => {
    const loadProfile = async () => {
      // Vérifier que l'utilisateur est toujours connecté
      if (!currentUser?.id) {
        console.warn("⚠️ Utilisateur non connecté, arrêt du chargement");
        return;
      }

      console.log(
        "🔐 Chargement du profil pour l'utilisateur:",
        currentUser.id
      );
      await loadSlotsForCurrentMonth();
    };

    loadProfile();
  }, [currentUser?.id]);

  // Function to load profile (for refresh)
  const loadProfile = async () => {
    if (!currentUser?.id) return;
    await loadSlotsForCurrentMonth();
  };

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

      // Normaliser les dates pour éviter les problèmes de comparaison
      const normalizedSlots = validSlots
        .map((slot) => {
          try {
            let normalizedDate: string;
            if (typeof slot.date === "string") {
              normalizedDate = slot.date;
            } else if (slot.date instanceof Date) {
              normalizedDate = format(slot.date, "yyyy-MM-dd");
            } else {
              console.warn("⚠️ Format de date non reconnu:", slot.date);
              return null;
            }

            return {
              ...slot,
              date: normalizedDate,
            };
          } catch (error) {
            console.error("❌ Erreur lors de la normalisation:", error);
            return null;
          }
        })
        .filter(Boolean) as TimeSlot[];

      // Mettre à jour l'état seulement si les créneaux ont vraiment changé
      const hasChanged =
        JSON.stringify(normalizedSlots) !== JSON.stringify(existingSlots);

      if (hasChanged) {
        console.log("🎯 Créneaux modifiés, mise à jour de l'état");
        setExistingSlots(normalizedSlots);
        setNoSlotsMessage(null);
        console.log("✅ Slots updated");
      } else {
        console.log("ℹ️ Aucun changement détecté");
      }
    }
  };

  // Function to refresh data
  const handleRefresh = async () => {
    setRefreshing(true);

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
    } finally {
      setRefreshing(false);
    }
  };

  // Vérification d'authentification avec délai de grâce
  const [authGracePeriod, setAuthGracePeriod] = useState(true);

  useEffect(() => {
    // Délai de 3 secondes avant de vérifier l'authentification
    const timer = setTimeout(() => {
      setAuthGracePeriod(false);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  if (!currentUser?.id && !authGracePeriod) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="text-red-500 mb-4">
              <svg
                className="w-16 h-16 mx-auto"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Session expirée
            </h2>
            <p className="text-gray-600 mb-4">
              Votre session a expiré. Veuillez vous reconnecter.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              Recharger la page
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Pendant la période de grâce, afficher un loader
  if (!currentUser?.id && authGracePeriod) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-4 text-lg text-gray-600">
              Vérification de la session...
            </p>
          </div>
        </div>
      </div>
    );
  }

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
      </div>
    </div>
  );
};

export default AvailabilityManagement;
