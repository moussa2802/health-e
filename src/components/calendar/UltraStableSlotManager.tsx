import React, { useState, useMemo } from "react";
import { Plus, Calendar, Clock, Trash2 } from "lucide-react";
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isToday,
} from "date-fns";
import { fr } from "date-fns/locale";

// Types simplifiés
export interface SimpleTimeSlot {
  id: string;
  date: string | Date;
  time: string;
  isBooked?: boolean;
}

interface UltraStableSlotManagerProps {
  professionalId: string;
  existingSlots: SimpleTimeSlot[];
  onSlotsChange: (slots: SimpleTimeSlot[]) => void;
}

const UltraStableSlotManager: React.FC<UltraStableSlotManagerProps> = ({
  professionalId,
  existingSlots,
  onSlotsChange,
}) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showAddForm, setShowAddForm] = useState(false);
  const [newSlotDate, setNewSlotDate] = useState("");
  const [newSlotTime, setNewSlotTime] = useState("09:00");

  // Générer les jours du mois de manière stable
  const monthDays = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  // Navigation stable entre les mois
  const navigateMonth = (direction: "prev" | "next") => {
    setCurrentMonth((prev) => {
      if (direction === "prev") {
        return subMonths(prev, 1);
      } else {
        return addMonths(prev, 1);
      }
    });
  };

  // Ajouter un créneau de manière stable
  const addSlot = () => {
    if (!newSlotDate || !newSlotTime) return;

    try {
      const newSlot: SimpleTimeSlot = {
        id: `${newSlotDate}-${newSlotTime}`,
        date: newSlotDate,
        time: newSlotTime,
        isBooked: false,
      };

      const updatedSlots = [...existingSlots, newSlot];
      onSlotsChange(updatedSlots);

      // Réinitialiser le formulaire
      setNewSlotDate("");
      setNewSlotTime("09:00");
      setShowAddForm(false);
    } catch (error) {
      console.error("Erreur lors de l'ajout du créneau:", error);
    }
  };

  // Supprimer un créneau de manière stable
  const removeSlot = (slotId: string) => {
    try {
      const updatedSlots = existingSlots.filter((slot) => slot.id !== slotId);
      onSlotsChange(updatedSlots);
    } catch (error) {
      console.error("Erreur lors de la suppression du créneau:", error);
    }
  };

  // Vérifier si un jour a des créneaux
  const getSlotsForDay = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    return existingSlots.filter((slot) => {
      if (typeof slot.date === "string") {
        return slot.date === dateStr;
      } else {
        return format(slot.date, "yyyy-MM-dd") === dateStr;
      }
    });
  };

  // Générer des heures disponibles
  const timeSlots = [
    "08:00",
    "08:30",
    "09:00",
    "09:30",
    "10:00",
    "10:30",
    "11:00",
    "11:30",
    "14:00",
    "14:30",
    "15:00",
    "15:30",
    "16:00",
    "16:30",
    "17:00",
    "17:30",
  ];

  return (
    <div className="space-y-6">
      {/* En-tête avec titre et bouton d'ajout */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">
          Gérer mes disponibilités
        </h2>
        <button
          onClick={() => setShowAddForm(true)}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <Plus className="h-5 w-5" />+ Ajouter des créneaux
        </button>
      </div>

      {/* Informations sur les créneaux */}
      <div className="flex items-center justify-between bg-white p-4 rounded-lg shadow-sm">
        <span className="text-gray-600">
          {existingSlots.length} créneaux disponibles
        </span>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          Rafraîchir
        </button>
      </div>

      {/* Message si aucun créneau */}
      {existingSlots.length === 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <svg
              className="h-5 w-5 text-yellow-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span className="text-yellow-800">Aucun créneau disponible</span>
          </div>
        </div>
      )}

      {/* Modal d'ajout de créneaux */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-lg font-semibold text-gray-900">
                Ajouter des créneaux
              </h3>
              <button
                onClick={() => setShowAddForm(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Heure de début */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Heure de début
                </label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="time"
                    value={newSlotDate}
                    onChange={(e) => setNewSlotDate(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Heure de fin */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Heure de fin
                </label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="time"
                    value={newSlotTime}
                    onChange={(e) => setNewSlotTime(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Durée des créneaux */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Durée des créneaux
                </label>
                <select className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                  <option>30 minutes</option>
                  <option>1 heure</option>
                  <option>1h30</option>
                  <option>2 heures</option>
                </select>
              </div>

              {/* Jours de la semaine */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Jours de la semaine
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    "Lundi",
                    "Mardi",
                    "Mercredi",
                    "Jeudi",
                    "Vendredi",
                    "Samedi",
                    "Dimanche",
                  ].map((day) => (
                    <label key={day} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="text-sm text-gray-700">{day}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Répéter pendant */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Répéter pendant
                </label>
                <select className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                  <option>1 semaine</option>
                  <option>2 semaines</option>
                  <option>1 mois</option>
                  <option>3 mois</option>
                </select>
              </div>

              {/* Aperçu */}
              <div className="bg-gray-50 p-3 rounded-md">
                <span className="text-sm text-gray-600">
                  1 jour(s) × 1 semaine(s) × 8 créneau(x) = 8 créneaux au total
                </span>
              </div>
            </div>

            <div className="flex gap-3 p-6 border-t bg-gray-50">
              <button
                onClick={() => setShowAddForm(false)}
                className="flex-1 px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={addSlot}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
              >
                <svg
                  className="h-4 w-4"
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
                Ajouter
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Calendrier visuel */}
      <div className="bg-white rounded-lg border overflow-hidden">
        {/* Navigation du mois */}
        <div className="flex items-center justify-between p-4 border-b bg-gray-50">
          <button
            onClick={() => navigateMonth("prev")}
            className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>

          <h3 className="text-lg font-semibold text-gray-900">
            {format(currentMonth, "MMMM yyyy", { locale: fr })}
          </h3>

          <button
            onClick={() => navigateMonth("next")}
            className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </button>
        </div>

        {/* En-têtes des jours */}
        <div className="grid grid-cols-7 bg-gray-50">
          {["lun.", "mar.", "mer.", "jeu.", "ven.", "sam.", "dim."].map(
            (day) => (
              <div
                key={day}
                className="p-3 text-center text-sm font-medium text-gray-500 border-r border-gray-200"
              >
                {day}
              </div>
            )
          )}
        </div>

        {/* Jours du mois */}
        <div className="grid grid-cols-7">
          {monthDays.map((day, index) => {
            const isCurrentMonth = isSameMonth(day, currentMonth);
            const isTodayDate = isToday(day);
            const daySlots = getSlotsForDay(day);
            const hasSlots = daySlots.length > 0;

            return (
              <div
                key={`${day.getTime()}-${index}`}
                className={`
                  min-h-[80px] p-2 border-r border-b border-gray-200 relative
                  ${isCurrentMonth ? "bg-white" : "bg-gray-50"}
                  ${isTodayDate ? "ring-2 ring-blue-500" : ""}
                  ${hasSlots ? "bg-blue-50" : ""}
                `}
              >
                <div className="text-sm font-medium text-gray-900 mb-2">
                  {format(day, "d")}
                </div>

                {/* Indicateur de créneaux disponibles */}
                {hasSlots && (
                  <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Légende */}
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
        <span>
          Les jours avec un point vert indiquent des créneaux disponibles
        </span>
      </div>
    </div>
  );
};

export default UltraStableSlotManager;
