import React, { useState, useMemo } from "react";
import { Plus, Calendar, Clock, Trash2 } from "lucide-react";
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday } from "date-fns";
import { fr } from "date-fns/locale";

// Types simplifiés
export interface SimpleTimeSlot {
  id: string;
  date: string;
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
  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentMonth(prev => {
      if (direction === 'prev') {
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
      const updatedSlots = existingSlots.filter(slot => slot.id !== slotId);
      onSlotsChange(updatedSlots);
    } catch (error) {
      console.error("Erreur lors de la suppression du créneau:", error);
    }
  };

  // Vérifier si un jour a des créneaux
  const getSlotsForDay = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return existingSlots.filter(slot => slot.date === dateStr);
  };

  // Générer des heures disponibles
  const timeSlots = [
    "08:00", "08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
    "14:00", "14:30", "15:00", "15:30", "16:00", "16:30", "17:00", "17:30"
  ];

  return (
    <div className="space-y-6">
      {/* Navigation du mois */}
      <div className="flex items-center justify-between bg-white p-4 rounded-lg shadow-sm">
        <button
          onClick={() => navigateMonth('prev')}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          ←
        </button>
        
        <h3 className="text-lg font-semibold text-gray-900">
          {format(currentMonth, 'MMMM yyyy', { locale: fr })}
        </h3>
        
        <button
          onClick={() => navigateMonth('next')}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          →
        </button>
      </div>

      {/* Formulaire d'ajout simple */}
      {showAddForm && (
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <h4 className="font-medium text-gray-900 mb-3">Ajouter un créneau</h4>
          <div className="flex gap-3">
            <input
              type="date"
              value={newSlotDate}
              onChange={(e) => setNewSlotDate(e.target.value)}
              className="border border-gray-300 rounded px-3 py-2"
            />
            <select
              value={newSlotTime}
              onChange={(e) => setNewSlotTime(e.target.value)}
              className="border border-gray-300 rounded px-3 py-2"
            >
              {timeSlots.map(time => (
                <option key={time} value={time}>{time}</option>
              ))}
            </select>
            <button
              onClick={addSlot}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Ajouter
            </button>
            <button
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* Bouton pour afficher le formulaire */}
      {!showAddForm && (
        <div className="text-center">
          <button
            onClick={() => setShowAddForm(true)}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 mx-auto"
          >
            <Plus className="h-5 w-5" />
            Ajouter des créneaux
          </button>
        </div>
      )}

      {/* Calendrier ultra-simple */}
      <div className="bg-white rounded-lg border overflow-hidden">
        {/* En-têtes des jours */}
        <div className="grid grid-cols-7 bg-gray-50">
          {['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'].map(day => (
            <div key={day} className="p-3 text-center text-sm font-medium text-gray-500 border-r border-gray-200">
              {day}
            </div>
          ))}
        </div>
        
        {/* Jours du mois */}
        <div className="grid grid-cols-7">
          {monthDays.map((day, index) => {
            const isCurrentMonth = isSameMonth(day, currentMonth);
            const isTodayDate = isToday(day);
            const daySlots = getSlotsForDay(day);
            
            return (
              <div
                key={`${day.getTime()}-${index}`}
                className={`
                  min-h-[100px] p-2 border-r border-b border-gray-200
                  ${isCurrentMonth ? 'bg-white' : 'bg-gray-50'}
                  ${isTodayDate ? 'ring-2 ring-blue-500' : ''}
                `}
              >
                <div className="text-sm font-medium text-gray-900 mb-2">
                  {format(day, 'd')}
                </div>
                
                {/* Créneaux du jour */}
                {daySlots.map(slot => (
                  <div
                    key={slot.id}
                    className="flex items-center justify-between bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs mb-1"
                  >
                    <span>{slot.time}</span>
                    <button
                      onClick={() => removeSlot(slot.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>

      {/* Liste des créneaux existants */}
      {existingSlots.length > 0 && (
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <h4 className="font-medium text-gray-900 mb-3">Créneaux existants</h4>
          <div className="space-y-2">
            {existingSlots.map(slot => (
              <div
                key={slot.id}
                className="flex items-center justify-between bg-gray-50 p-3 rounded"
              >
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <span className="font-medium">{slot.date}</span>
                  <Clock className="h-4 w-4 text-gray-500" />
                  <span>{slot.time}</span>
                </div>
                <button
                  onClick={() => removeSlot(slot.id)}
                  className="text-red-600 hover:text-red-800 p-1"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default UltraStableSlotManager;
