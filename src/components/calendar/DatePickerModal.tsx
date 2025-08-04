import React from "react";
import { X, Check, Calendar, Clock } from "lucide-react";
import { format, isSameDay, isBefore, isToday, startOfDay } from "date-fns";

interface DatePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddSlots: () => void;
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

  const [viewMode, setViewMode] = React.useState<"simple" | "advanced">(
    "advanced"
  );

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
      `🔍 Génération des dates du ${format(
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
          `✅ Date trouvée: ${format(currentDate, "EEEE dd/MM/yyyy")} (${
            activeDay[0]
          })`
        );
        dates.push(new Date(currentDate));
      }

      // Passer au jour suivant
      currentDate.setDate(currentDate.getDate() + 1);
    }

    console.log(`📊 Total des dates générées: ${dates.length}`);

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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-800 flex items-center">
            <Calendar className="w-6 h-6 text-blue-500 mr-2" />
            Créer un modèle de créneaux
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {/* Mode Toggle */}
          <div className="mb-6">
            <div className="flex space-x-2 bg-gray-100 p-1 rounded-lg">
              <button
                onClick={() => setViewMode("advanced")}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                  viewMode === "advanced"
                    ? "bg-white text-blue-600 shadow-sm"
                    : "text-gray-600 hover:text-gray-800"
                }`}
              >
                Modèle avancé
              </button>
              <button
                onClick={() => setViewMode("simple")}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                  viewMode === "simple"
                    ? "bg-white text-blue-600 shadow-sm"
                    : "text-gray-600 hover:text-gray-800"
                }`}
              >
                Sélection simple
              </button>
            </div>
          </div>

          {viewMode === "advanced" ? (
            <>
              {/* Planning hebdomadaire */}
              <div className="mb-6">
                <h3 className="text-lg font-medium text-gray-800 mb-4 flex items-center">
                  <Clock className="w-5 h-5 text-blue-500 mr-2" />
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
                        className="flex items-center space-x-4 p-3 border border-gray-200 rounded-lg"
                      >
                        <label className="flex items-center space-x-3 flex-1">
                          <input
                            type="checkbox"
                            checked={config.active}
                            onChange={() => handleDayToggle(dayName)}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                          <span className="font-medium text-gray-700 min-w-[80px]">
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
                              className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <span className="text-gray-500">à</span>
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
                              className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Durée des créneaux
                </label>
                <select
                  value={slotDuration}
                  onChange={(e) => setSlotDuration(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                <h3 className="text-lg font-medium text-gray-800 mb-4">
                  Période de validité
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Fréquence de répétition */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="weekly">Chaque semaine</option>
                  <option value="biweekly">Chaque 2 semaines</option>
                  <option value="monthly">Chaque mois</option>
                </select>
              </div>
            </>
          ) : (
            <>
              {/* Mode simple - garder l'ancienne interface */}
              <div className="mb-6">
                <h3 className="text-lg font-medium text-gray-800 mb-4">
                  Horaires
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Heure de début
                    </label>
                    <input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Heure de fin
                    </label>
                    <input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Durée des créneaux
                    </label>
                    <select
                      value={slotDuration}
                      onChange={(e) => setSlotDuration(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value={15}>15 minutes</option>
                      <option value={30}>30 minutes</option>
                      <option value={45}>45 minutes</option>
                      <option value={60}>1 heure</option>
                      <option value={90}>1h30</option>
                      <option value={120}>2 heures</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Sélection de dates simple */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Sélectionner des dates
                </label>

                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="grid grid-cols-7 gap-1 mb-4">
                    {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map(
                      (day) => (
                        <div
                          key={day}
                          className="text-center text-xs font-medium text-gray-500 py-1"
                        >
                          {day}
                        </div>
                      )
                    )}

                    {(() => {
                      const days = [];

                      for (
                        let i = 0;
                        i < (firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1);
                        i++
                      ) {
                        days.push(
                          <div key={`empty-${i}`} className="h-8"></div>
                        );
                      }

                      for (let day = 1; day <= daysInMonth; day++) {
                        const date = new Date(
                          today.getFullYear(),
                          today.getMonth(),
                          day
                        );
                        const isSelected = selectedDates.some((selectedDate) =>
                          isSameDay(selectedDate, date)
                        );
                        const isPast = isBefore(date, startOfDay(today));
                        const isTodayDate = isToday(date);

                        days.push(
                          <button
                            key={day}
                            onClick={() =>
                              !isPast &&
                              setSelectedDates((prev) => {
                                const isAlreadySelected = prev.some((d) =>
                                  isSameDay(d, date)
                                );
                                if (isAlreadySelected) {
                                  return prev.filter(
                                    (d) => !isSameDay(d, date)
                                  );
                                } else {
                                  return [...prev, date];
                                }
                              })
                            }
                            disabled={isPast}
                            className={`h-8 w-full text-sm rounded-md transition-colors ${
                              isPast
                                ? "text-gray-300 cursor-not-allowed"
                                : isSelected
                                ? "bg-blue-500 text-white hover:bg-blue-600"
                                : isTodayDate
                                ? "bg-blue-100 text-blue-700 hover:bg-blue-200"
                                : "text-gray-700 hover:bg-gray-100"
                            }`}
                          >
                            {day}
                          </button>
                        );
                      }

                      return days;
                    })()}
                  </div>

                  {selectedDates.length > 0 && (
                    <div className="mt-4">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">
                        Dates sélectionnées ({selectedDates.length})
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedDates.map((date, index) => (
                          <div
                            key={index}
                            className="flex items-center bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm"
                          >
                            <span>{format(date, "EEEE dd/MM/yyyy")}</span>
                            <button
                              onClick={() =>
                                setSelectedDates((prev) =>
                                  prev.filter((d) => !isSameDay(d, date))
                                )
                              }
                              className="ml-2 text-blue-500 hover:text-blue-700"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Aperçu */}
          <div className="bg-gray-50 p-4 rounded-md">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Aperçu</h4>
            {viewMode === "advanced" ? (
              <div className="space-y-2 text-sm text-gray-600">
                <p>
                  <span className="font-medium">{preview.activeDays}</span>{" "}
                  jour(s) actif(s) par semaine
                </p>
                <p>
                  <span className="font-medium">{preview.totalDates}</span>{" "}
                  occurrence(s) générée(s)
                </p>
                <p>
                  <span className="font-medium">{preview.totalSlots}</span>{" "}
                  créneau(x) au total
                </p>
                <p className="text-xs text-blue-600 bg-blue-50 p-2 rounded">
                  💡 Période : du{" "}
                  {format(repetitionConfig.startDate, "dd/MM/yyyy")} au{" "}
                  {format(repetitionConfig.endDate, "dd/MM/yyyy")}(
                  {repetitionConfig.type === "weekly"
                    ? "chaque semaine"
                    : repetitionConfig.type === "biweekly"
                    ? "chaque 2 semaines"
                    : "chaque mois"}
                  )
                </p>
                <p className="text-lg font-semibold text-blue-600">
                  Total: <span className="font-bold">{preview.totalSlots}</span>{" "}
                  créneau(x) à créer
                </p>
              </div>
            ) : (
              <div className="space-y-2 text-sm text-gray-600">
                <p>
                  <span className="font-medium">{selectedDates.length}</span>{" "}
                  date(s) sélectionnée(s)
                </p>
                <p>
                  <span className="font-medium">
                    {generateTimeSlots(startTime, endTime, slotDuration).length}
                  </span>{" "}
                  créneau(x) par date
                </p>
                <p className="text-lg font-semibold text-blue-600">
                  Total:{" "}
                  <span className="font-bold">
                    {selectedDates.length *
                      generateTimeSlots(startTime, endTime, slotDuration)
                        .length}
                  </span>{" "}
                  créneau(x) à créer
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={onAddSlots}
            disabled={
              loading ||
              (viewMode === "advanced"
                ? preview.totalSlots === 0
                : selectedDates.length === 0)
            }
            className="px-6 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
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
