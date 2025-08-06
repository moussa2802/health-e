import React, { useState, useEffect, useMemo } from "react";
import { Plus, AlertCircle, CheckCircle, RefreshCw, Info, Clock, Calendar, Save, Settings } from "lucide-react";
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

      const slots = await getAvailableTimeSlots(
        currentUser.id,
        format(startOfCurrentMonth, "yyyy-MM-dd"),
        format(endOfCurrentMonth, "yyyy-MM-dd")
      );

      console.log("✅ Créneaux chargés:", slots);
      setExistingSlots(slots);

      if (slots.length === 0) {
        setNoSlotsMessage(
          "Aucun créneau disponible pour le mois en cours. Ajoutez des créneaux pour commencer."
        );
      } else {
        setNoSlotsMessage(null);
      }
    } catch (error) {
      console.error("❌ Erreur lors du chargement des créneaux:", error);
      setError("Erreur lors du chargement des créneaux");
    } finally {
      setLoading(false);
    }
  };

  const getWeekdayName = (date: Date | string): string => {
    try {
      const dateObj = typeof date === "string" ? new Date(date) : date;
      return format(dateObj, "EEEE", { locale: require("date-fns/locale/fr") });
    } catch (error) {
      console.error("❌ Erreur lors du formatage de la date:", error);
      return "Inconnu";
    }
  };

  useEffect(() => {
    const loadProfile = async () => {
      if (!currentUser?.id) return;

      try {
        setLoading(true);
        await ensureFirestoreReady();
        await loadSlotsForCurrentMonth();
      } catch (error) {
        console.error("❌ Erreur lors du chargement du profil:", error);
        setError("Erreur lors du chargement du profil");
      } finally {
        setLoading(false);
      }
    };

    const loadProfile = async () => {
      if (!currentUser?.id) return;

      try {
        setLoading(true);
        await ensureFirestoreReady();
        await loadSlotsForCurrentMonth();
      } catch (error) {
        console.error("❌ Erreur lors du chargement du profil:", error);
        setError("Erreur lors du chargement du profil");
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [currentUser]);

  const handleSlotsChange = (slots: TimeSlot[]) => {
    console.log("🔄 Créneaux modifiés:", slots);
    setExistingSlots(slots);
  };

  const handleSave = async () => {
    if (!currentUser?.id) {
      setError("Utilisateur non connecté");
      return;
    }

    try {
      setIsSaving(true);
      setError(null);

      // Normaliser les créneaux avant sauvegarde
      const normalizeSlots = (slots: TimeSlot[]) =>
        slots
          .filter((slot) => slot.date && slot.time && !slot.isBooked)
          .map((slot) => {
            // S'assurer que la date est au bon format
            let normalizedDate = slot.date;
            if (typeof slot.date === "string") {
              if (slot.date.match(/^\d{4}-\d{2}-\d{2}$/)) {
                normalizedDate = slot.date;
              } else {
                try {
                  normalizedDate = format(new Date(slot.date), "yyyy-MM-dd");
                } catch (error) {
                  console.error("❌ Erreur de formatage de date:", error);
                  return null;
                }
              }
            } else {
              try {
                normalizedDate = format(new Date(slot.date), "yyyy-MM-dd");
              } catch (error) {
                console.error("❌ Erreur de formatage de date:", error);
                return null;
              }
            }

            return {
              ...slot,
              date: normalizedDate,
            };
          })
          .filter(Boolean) as TimeSlot[];

      const normalizedSlots = normalizeSlots(existingSlots);
      console.log("💾 Sauvegarde des créneaux normalisés:", normalizedSlots);

      // Convertir les créneaux en format de disponibilité
      const availabilitySlots: AvailabilitySlot[] = normalizedSlots.map(
        (slot) => ({
          date: slot.date as string,
          time: slot.time as string,
          isAvailable: true,
          isBooked: false,
        })
      );

      // Mettre à jour le profil professionnel
      await updateProfessionalProfile(currentUser.id, {
        availability: availabilitySlots,
      });

      console.log("✅ Créneaux sauvegardés avec succès");
      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
      }, 3000);

      // Recharger les créneaux pour s'assurer de la cohérence
      await loadSlotsForCurrentMonth();
    } catch (error) {
      console.error("❌ Erreur lors de la sauvegarde:", error);
      setError(
        error instanceof Error
          ? error.message
          : "Erreur lors de l'enregistrement des disponibilités"
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleRefresh = async () => {
    if (!currentUser?.id) return;

    try {
      setRefreshing(true);
      setError(null);
      setRefreshTrigger((prev) => prev + 1);
      await loadSlotsForCurrentMonth();
    } catch (error) {
      console.error("❌ Erreur lors du rafraîchissement:", error);
      setError("Erreur lors du rafraîchissement");
    } finally {
      setRefreshing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <LoadingSpinner size="lg" />
                <p className="mt-4 text-lg text-gray-600">
                  Chargement des disponibilités...
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header Section */}
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-100 rounded-xl">
                  <Calendar className="h-8 w-8 text-blue-600" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">Gérer mes disponibilités</h1>
                  <p className="text-gray-600 mt-1">Planifiez vos créneaux de consultation</p>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-xl">
                  <Clock className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-700">
                    {existingSlots.length} créneaux disponibles
                  </span>
                </div>
                
                <button
                  onClick={() => setShowAddModal(true)}
                  className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200 flex items-center gap-2 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                >
                  <Plus className="h-5 w-5" />
                  <span className="font-medium">Ajouter des créneaux</span>
                </button>
                
                <button
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="px-4 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-all duration-200 flex items-center gap-2 disabled:opacity-50"
                >
                  {refreshing ? (
                    <LoadingSpinner size="sm" />
                  ) : (
                    <RefreshCw className="h-5 w-5" />
                  )}
                  <span className="font-medium">Rafraîchir</span>
                </button>
              </div>
            </div>
          </div>

          {/* Success Message */}
          {saveSuccess && (
            <div className="mb-6 p-4 bg-green-100 border border-green-400 text-green-700 rounded-xl flex items-center justify-between">
              <div className="flex items-center">
                <CheckCircle className="h-5 w-5 mr-3" />
                <span className="font-medium">Vos disponibilités ont été enregistrées avec succès</span>
              </div>
              <button
                onClick={() => setSaveSuccess(false)}
                className="text-green-500 hover:text-green-700"
              >
                <AlertCircle className="h-5 w-5" />
              </button>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-xl flex items-center justify-between">
              <div className="flex items-center">
                <AlertCircle className="h-5 w-5 mr-3" />
                <span className="font-medium">{error}</span>
              </div>
              <button
                onClick={() => setError(null)}
                className="text-red-500 hover:text-red-700"
              >
                <AlertCircle className="h-5 w-5" />
              </button>
            </div>
          )}

          {/* Info Message */}
          {noSlotsMessage && (
            <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 text-yellow-700 rounded-xl flex items-center justify-between">
              <div className="flex items-center">
                <Info className="h-5 w-5 mr-3" />
                <span className="font-medium">{noSlotsMessage}</span>
              </div>
              <button
                onClick={() => setNoSlotsMessage(null)}
                className="text-yellow-500 hover:text-yellow-700"
              >
                <AlertCircle className="h-5 w-5" />
              </button>
            </div>
          )}

          {/* Calendar Section */}
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <Settings className="h-6 w-6 text-gray-600" />
                <h2 className="text-xl font-semibold text-gray-900">Calendrier des disponibilités</h2>
              </div>
            </div>
            
            <div className="p-6">
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

          {/* Save Button Section */}
          <div className="mt-8 flex justify-center">
            <button
              onClick={handleSave}
              disabled={isSaving || existingSlots.length === 0}
              className="px-8 py-4 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl hover:from-green-700 hover:to-green-800 transition-all duration-200 flex items-center gap-3 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:opacity-50 disabled:transform-none disabled:hover:shadow-lg disabled:cursor-not-allowed"
            >
              {isSaving ? (
                <>
                  <LoadingSpinner size="sm" color="white" />
                  <span className="font-medium">Enregistrement...</span>
                </>
              ) : (
                <>
                  <Save className="h-5 w-5" />
                  <span className="font-medium">Enregistrer les modifications</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AvailabilityManagement;
