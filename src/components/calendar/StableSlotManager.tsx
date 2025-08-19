import React, { useState, useEffect, useMemo } from "react";
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
  date: Date | string;
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

interface StableSlotManagerProps {
  professionalId: string;
  isProfessional?: boolean;
  availableDays?: Date[];
  onSlotSelect?: (slot: TimeSlot | null) => void;
  existingSlots?: TimeSlot[];
  showAddModal?: boolean;
  setShowAddModal?: (show: boolean) => void;
  onSlotsChange?: (slots: TimeSlot[]) => void;
}

const StableSlotManager: React.FC<StableSlotManagerProps> = ({
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
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [slots, setSlots] = useState<TimeSlot[]>(existingSlots);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  // Utiliser useMemo pour éviter les recalculs constants
  const monthDays = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    
    // Créer un tableau stable de jours
    const days = eachDayOfInterval({ start, end });
    
    // Ajouter des jours pour compléter la semaine
    const firstDayOfWeek = getDay(start);
    const lastDayOfWeek = getDay(end);
    
    const beforeDays = Array.from({ length: firstDayOfWeek }, (_, i) => 
      subDays(start, firstDayOfWeek - i)
    );
    
    const afterDays = Array.from({ length: 6 - lastDayOfWeek }, (_, i) => 
      addDays(end, i + 1)
    );
    
    return [...beforeDays, ...days, ...afterDays];
  }, [currentMonth]);

  // Fonction stable pour naviguer entre les mois
  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentMonth(prev => {
      if (direction === 'prev') {
        return subMonths(prev, 1);
      } else {
        return addMonths(prev, 1);
      }
    });
  };

  // Fonction stable pour gérer les créneaux
  const handleSlotChange = (newSlots: TimeSlot[]) => {
    try {
      setSlots(newSlots);
      onSlotsChange?.(newSlots);
    } catch (error) {
      console.error("Erreur lors de la modification des créneaux:", error);
      setError("Erreur lors de la modification des créneaux");
    }
  };

  // Fonction stable pour ajouter un créneau
  const addSlot = (date: Date, time: string) => {
    try {
      const newSlot: TimeSlot = {
        id: generateSlotKey(date, time),
        date: format(date, 'yyyy-MM-dd'),
        time,
        isBooked: false,
      };
      
      const updatedSlots = [...slots, newSlot];
      handleSlotChange(updatedSlots);
    } catch (error) {
      console.error("Erreur lors de l'ajout du créneau:", error);
      setError("Erreur lors de l'ajout du créneau");
    }
  };

  // Fonction stable pour supprimer un créneau
  const removeSlot = (slotId: string) => {
    try {
      const updatedSlots = slots.filter(slot => slot.id !== slotId);
      handleSlotChange(updatedSlots);
    } catch (error) {
      console.error("Erreur lors de la suppression du créneau:", error);
      setError("Erreur lors de la suppression du créneau");
    }
  };

  // Fonction stable pour vérifier si un jour a des créneaux
  const hasSlotsForDay = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return slots.some(slot => slot.date === dateStr);
  };

  // Fonction stable pour obtenir les créneaux d'un jour
  const getSlotsForDay = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return slots.filter(slot => slot.date === dateStr);
  };

  // Fonction stable pour formater l'heure
  const formatTime = (time: string) => {
    try {
      return time;
    } catch (error) {
      console.error("Erreur lors du formatage de l'heure:", error);
      return time;
    }
  };

  // Rendu stable du calendrier
  const renderCalendar = () => {
    try {
      return (
        <div className="grid grid-cols-7 gap-1">
          {/* En-têtes des jours de la semaine */}
          {['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'].map(day => (
            <div key={day} className="p-2 text-center text-sm font-medium text-gray-500 bg-gray-50">
              {day}
            </div>
          ))}
          
          {/* Jours du mois */}
          {monthDays.map((day, index) => {
            const isCurrentMonth = isSameMonth(day, currentMonth);
            const isTodayDate = isToday(day);
            const hasSlots = hasSlotsForDay(day);
            const daySlots = getSlotsForDay(day);
            
            return (
              <div
                key={`${day.getTime()}-${index}`}
                className={`
                  p-2 min-h-[80px] border border-gray-200 cursor-pointer
                  ${isCurrentMonth ? 'bg-white' : 'bg-gray-50'}
                  ${isTodayDate ? 'ring-2 ring-blue-500' : ''}
                  ${hasSlots ? 'bg-blue-50' : ''}
                  hover:bg-gray-50 transition-colors
                `}
                onClick={() => setSelectedDate(day)}
              >
                <div className="text-sm font-medium text-gray-900 mb-1">
                  {format(day, 'd')}
                </div>
                
                {hasSlots && (
                  <div className="space-y-1">
                    {daySlots.slice(0, 2).map(slot => (
                      <div
                        key={slot.id}
                        className="text-xs bg-blue-100 text-blue-800 px-1 py-0.5 rounded truncate"
                      >
                        {formatTime(slot.time)}
                      </div>
                    ))}
                    {daySlots.length > 2 && (
                      <div className="text-xs text-gray-500">
                        +{daySlots.length - 2} autres
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      );
    } catch (error) {
      console.error("Erreur lors du rendu du calendrier:", error);
      return (
        <div className="text-center py-8 text-red-600">
          Erreur lors du chargement du calendrier
        </div>
      );
    }
  };

  return (
    <div className="space-y-6">
      {/* Navigation du mois */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigateMonth('prev')}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        
        <h3 className="text-lg font-semibold text-gray-900">
          {format(currentMonth, 'MMMM yyyy', { locale: fr })}
        </h3>
        
        <button
          onClick={() => navigateMonth('next')}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ChevronLeft className="h-5 w-5 rotate-180" />
        </button>
      </div>

      {/* Calendrier */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {renderCalendar()}
      </div>

      {/* Bouton d'ajout */}
      <div className="flex justify-center">
        <button
          onClick={() => setShowAddModal(true)}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <Plus className="h-5 w-5" />
          Ajouter des créneaux
        </button>
      </div>

      {/* Messages d'erreur */}
      {error && (
        <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg flex items-center justify-between">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 mr-2" />
            <span>{error}</span>
          </div>
          <button
            onClick={() => setError(null)}
            className="text-red-500 hover:text-red-700"
          >
            ×
          </button>
        </div>
      )}

      {/* Modal de sélection de date */}
      {showDatePicker && selectedDate && (
        <DatePickerModal
          isOpen={showDatePicker}
          onClose={() => setShowDatePicker(false)}
          selectedDate={selectedDate}
          onDateSelect={(date, time) => {
            addSlot(date, time);
            setShowDatePicker(false);
          }}
        />
      )}
    </div>
  );
};

export default StableSlotManager;
