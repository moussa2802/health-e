import React from "react";
import { X, Check, Calendar, Clock, Loader2, Info } from "lucide-react";
import { format, isSameDay, isBefore, isToday, startOfDay } from "date-fns";

interface DatePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddSlots: () => Promise<void>;
  loading: boolean;
  startTime: string;
  setStartTime: (time: string) => void;
  endTime: string;
  setEndTime: (time: string) => void;
  slotDuration: number;
  setSlotDuration: (duration: number) => void;
  selectedDates: Date[];
  setSelectedDates: React.Dispatch<React.SetStateAction<Date[]>>;
  onWeeklyScheduleChange?: (schedule: WeeklySchedule) => void;
}

// Types pour le nouveau système
interface WeeklySchedule {
  [key: string]: {
    active: boolean;
    startTime: string;
    endTime: string;
  };
}

interface RepetitionConfig {
  type: "weekly" | "biweekly" | "monthly";
  startDate: Date;
  endDate: Date;
}

const DatePickerModal: React.FC<DatePickerModalProps> = ({
  isOpen,
  onClose,
  onAddSlots,
  loading,
  startTime,
  setStartTime,
  endTime,
  setEndTime,
  slotDuration,
  setSlotDuration,
  selectedDates,
  setSelectedDates,
  onWeeklyScheduleChange,
}) => {
  const today = new Date();
  const currentMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  const firstDayOfWeek = currentMonth.getDay();
  const daysInMonth = lastDay.getDate();

  // Nouveau state pour le système de modèles
  const [weeklySchedule, setWeeklySchedule] = React.useState<WeeklySchedule>({
    monday: { active: false, startTime: "09:00", endTime: "17:00" },
    tuesday: { active: false, startTime: "09:00", endTime: "17:00" },
    wednesday: { active: false, startTime: "09:00", endTime: "17:00" },
    thursday: { active: false, startTime: "09:00", endTime: "17:00" },
    friday: { active: false, startTime: "09:00", endTime: "17:00" },
    saturday: { active: false, startTime: "09:00", endTime: "17:00" },
    sunday: { active: false, startTime: "09:00", endTime: "17:00" },
  });

  const [repetitionConfig, setRepetitionConfig] =
    React.useState<RepetitionConfig>({
      type: "weekly",
      startDate: new Date(),
      endDate: new Date(today.getFullYear(), today.getMonth() + 1, 0),
    });

  // Générer les créneaux horaires
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

  // Générer toutes les dates basées sur le planning hebdomadaire
  const generateAllDates = (): Date[] => {
    const dates: Date[] = [];
    const dayMap = {
      monday: 1,
      tuesday: 2,
      wednesday: 3,
      thursday: 4,
      friday: 5,
      saturday: 6,
      sunday: 0,
    };

    // Vérifier qu'au moins un jour est actif
    const activeDays = Object.entries(weeklySchedule).filter(
      ([, config]) => config.active
    );
    if (activeDays.length === 0) return dates;

    // Parcourir chaque jour de la période
    let currentDate = new Date(repetitionConfig.startDate);
    const endDate = new Date(repetitionConfig.endDate);

    // S'assurer que currentDate commence au début de la journée
    currentDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);

    console.log(
      `Génération des dates du ${format(
        currentDate,
        "dd/MM/yyyy"
      )} au ${format(endDate, "dd/MM/yyyy")}`
    );

    while (currentDate <= endDate) {
      const dayOfWeek = currentDate.getDay();

      // Vérifier si ce jour est actif dans le planning
      const activeDay = activeDays.find(
        ([dayName]) => dayMap[dayName as keyof typeof dayMap] === dayOfWeek
      );

      if (activeDay) {
        console.log(
          `Date trouvée: ${format(currentDate, "EEEE dd/MM/yyyy")} (${
            activeDay[0]
          })`
        );
        dates.push(new Date(currentDate));
      }

      // Passer au jour suivant
      currentDate.setDate(currentDate.getDate() + 1);
    }

    console.log(`Total des dates générées: ${dates.length}`);

    return dates;
  };

  // Calculer l'aperçu
  const generatePreview = () => {
    const allDates = generateAllDates();
    let totalSlots = 0;

    // Filtrer les dates selon la fréquence de répétition
    const filteredDates = allDates.filter((date, index) => {
      switch (repetitionConfig.type) {
        case "weekly":
          return true; // Toutes les dates
        case "biweekly":
          return index % 2 === 0; // Une semaine sur deux
        case "monthly": {
          // Pour le mensuel, on garde seulement la première occurrence de chaque mois
          const month = date.getMonth();
          const year = date.getFullYear();
          const firstOccurrence = allDates.find(
            (d) => d.getMonth() === month && d.getFullYear() === year
          );
          return date === firstOccurrence;
        }
        default:
          return true;
      }
    });

    filteredDates.forEach((date) => {
      const dayOfWeek = date.getDay();
      const dayMap = {
        monday: 1,
        tuesday: 2,
        wednesday: 3,
        thursday: 4,
        friday: 5,
        saturday: 6,
        sunday: 0,
      };

      const dayName = Object.keys(dayMap).find(
        (key) => dayMap[key as keyof typeof dayMap] === dayOfWeek
      );
      if (dayName && weeklySchedule[dayName].active) {
        const timeSlots = generateTimeSlots(
          weeklySchedule[dayName].startTime,
          weeklySchedule[dayName].endTime,
          slotDuration
        );
        totalSlots += timeSlots.length;
      }
    });

    return {
      totalDates: filteredDates.length,
      totalSlots,
      activeDays: Object.entries(weeklySchedule).filter(
        ([, config]) => config.active
      ).length,
    };
  };

  // Mettre à jour les dates sélectionnées quand le planning change
  React.useEffect(() => {
    const allDates = generateAllDates();

    // Filtrer les dates selon la fréquence de répétition
    const filteredDates = allDates.filter((date, index) => {
      switch (repetitionConfig.type) {
        case "weekly":
          return true; // Toutes les dates
        case "biweekly":
          return index % 2 === 0; // Une semaine sur deux
        case "monthly": {
          // Pour le mensuel, on garde seulement la première occurrence de chaque mois
          const month = date.getMonth();
          const year = date.getFullYear();
          const firstOccurrence = allDates.find(
            (d) => d.getMonth() === month && d.getFullYear() === year
          );
          return date === firstOccurrence;
        }
        default:
          return true;
      }
    });

    setSelectedDates(filteredDates);
  }, [weeklySchedule, repetitionConfig, slotDuration]);

  const handleDayToggle = (dayName: string) => {
    const newSchedule = {
      ...weeklySchedule,
      [dayName]: {
        ...weeklySchedule[dayName],
        active: !weeklySchedule[dayName].active,
      },
    };
    setWeeklySchedule(newSchedule);

    // Notifier le composant parent
    if (onWeeklyScheduleChange) {
      onWeeklyScheduleChange(newSchedule);
    }
  };

  const handleDayTimeChange = (
    dayName: string,
    field: "startTime" | "endTime",
    value: string
  ) => {
    const newSchedule = {
      ...weeklySchedule,
      [dayName]: {
        ...weeklySchedule[dayName],
        [field]: value,
      },
    };
    setWeeklySchedule(newSchedule);

    // Notifier le composant parent
    if (onWeeklyScheduleChange) {
      onWeeklyScheduleChange(newSchedule);
    }
  };

  const preview = generatePreview();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-ink/50 flex items-center justify-center z-50 px-4">
      <div className="bg-card rounded-block shadow-lift w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-line flex justify-between items-center">
          <h2 className="font-display text-xl font-semibold text-ink flex items-center">
            <Calendar className="w-6 h-6 text-accent mr-2" />
            Créer un modèle de créneaux
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-paper rounded-pill transition-colors"
          >
            <X className="w-5 h-5 text-ink-soft" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <>
            {/* Planning hebdomadaire */}
            <div className="mb-6">
              <h3 className="text-lg font-medium text-ink mb-4 flex items-center">
                <Clock className="w-5 h-5 text-accent mr-2" />
                Planning hebdomadaire
              </h3>

              <div className="space-y-3">
                {Object.entries(weeklySchedule).map(([dayName, config]) => {
                  const dayLabels = {
                    monday: "Lundi",
                    tuesday: "Mardi",
                    wednesday: "Mercredi",
                    thursday: "Jeudi",
                    friday: "Vendredi",
                    saturday: "Samedi",
                    sunday: "Dimanche",
                  };

                  return (
                    <div
                      key={dayName}
                      className="flex items-center space-x-4 p-3 border border-line rounded-xl"
                    >
                      <label className="flex items-center space-x-3 flex-1">
                        <input
                          type="checkbox"
                          checked={config.active}
                          onChange={() => handleDayToggle(dayName)}
                          className="w-4 h-4 text-accent border-line rounded focus:ring-accent"
                        />
                        <span className="font-medium text-ink-soft min-w-[80px]">
                          {dayLabels[dayName as keyof typeof dayLabels]}
                        </span>
                      </label>

                      {config.active && (
                        <div className="flex items-center space-x-2">
                          <input
                            type="time"
                            value={config.startTime}
                            onChange={(e) =>
                              handleDayTimeChange(
                                dayName,
                                "startTime",
                                e.target.value
                              )
                            }
                            className="px-3 py-1 border border-line rounded-xl text-sm focus:outline-none focus:border-accent"
                          />
                          <span className="text-muted">à</span>
                          <input
                            type="time"
                            value={config.endTime}
                            onChange={(e) =>
                              handleDayTimeChange(
                                dayName,
                                "endTime",
                                e.target.value
                              )
                            }
                            className="px-3 py-1 border border-line rounded-xl text-sm focus:outline-none focus:border-accent"
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Durée des créneaux */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-ink-soft mb-2">
                Durée des créneaux
              </label>
              <select
                value={slotDuration}
                onChange={(e) => setSlotDuration(Number(e.target.value))}
                className="w-full px-3 py-2 border border-line rounded-xl focus:outline-none focus:border-accent"
              >
                <option value={15}>15 minutes</option>
                <option value={30}>30 minutes</option>
                <option value={45}>45 minutes</option>
                <option value={60}>1 heure</option>
                <option value={90}>1h30</option>
                <option value={120}>2 heures</option>
              </select>
            </div>

            {/* Période de validité */}
            <div className="mb-6">
              <h3 className="text-lg font-medium text-ink mb-4">
                Période de validité
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-ink-soft mb-2">
                    Date de début
                  </label>
                  <input
                    type="date"
                    value={format(repetitionConfig.startDate, "yyyy-MM-dd")}
                    onChange={(e) =>
                      setRepetitionConfig((prev) => ({
                        ...prev,
                        startDate: new Date(e.target.value),
                      }))
                    }
                    className="w-full px-3 py-2 border border-line rounded-xl focus:outline-none focus:border-accent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-ink-soft mb-2">
                    Date de fin
                  </label>
                  <input
                    type="date"
                    value={format(repetitionConfig.endDate, "yyyy-MM-dd")}
                    onChange={(e) =>
                      setRepetitionConfig((prev) => ({
                        ...prev,
                        endDate: new Date(e.target.value),
                      }))
                    }
                    className="w-full px-3 py-2 border border-line rounded-xl focus:outline-none focus:border-accent"
                  />
                </div>
              </div>
            </div>

            {/* Fréquence de répétition */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-ink-soft mb-2">
                Fréquence de répétition
              </label>
              <select
                value={repetitionConfig.type}
                onChange={(e) =>
                  setRepetitionConfig((prev) => ({
                    ...prev,
                    type: e.target.value as "weekly" | "biweekly" | "monthly",
                  }))
                }
                className="w-full px-3 py-2 border border-line rounded-xl focus:outline-none focus:border-accent"
              >
                <option value="weekly">Chaque semaine</option>
                <option value="biweekly">Chaque 2 semaines</option>
                <option value="monthly">Chaque mois</option>
              </select>
            </div>
          </>

          {/* Aperçu */}
          <div className="bg-paper p-4 rounded-xl border border-line">
            <h4 className="text-sm font-medium text-ink-soft mb-2">Aperçu</h4>
            <div className="space-y-2 text-sm text-ink-soft">
              <p>
                <span className="font-medium text-ink">{preview.activeDays}</span>{" "}
                jour(s) actif(s) par semaine
              </p>
              <p>
                <span className="font-medium text-ink">{preview.totalDates}</span>{" "}
                occurrence(s) générée(s)
              </p>
              <p>
                <span className="font-medium text-ink">{preview.totalSlots}</span>{" "}
                créneau(x) au total
              </p>
              <p className="flex items-start gap-1.5 text-xs text-accent bg-accent-soft p-2 rounded-xl">
                <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                <span>
                  Période : du{" "}
                  {format(repetitionConfig.startDate, "dd/MM/yyyy")} au{" "}
                  {format(repetitionConfig.endDate, "dd/MM/yyyy")} (
                  {repetitionConfig.type === "weekly"
                    ? "chaque semaine"
                    : repetitionConfig.type === "biweekly"
                    ? "chaque 2 semaines"
                    : "chaque mois"}
                  )
                </span>
              </p>
              <p className="text-lg font-semibold text-accent">
                Total: <span className="font-bold">{preview.totalSlots}</span>{" "}
                créneau(x) à créer
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-line flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-ink-soft bg-paper rounded-pill hover:bg-line/50 transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={onAddSlots}
            disabled={loading || preview.totalSlots === 0}
            className="px-6 py-2 bg-accent text-white rounded-pill hover:bg-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Création...
              </>
            ) : (
              <>
                <Check className="w-4 h-4 mr-2" />
                Créer les créneaux
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DatePickerModal;
