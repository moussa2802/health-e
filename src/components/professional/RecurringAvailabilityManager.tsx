/**
 * RecurringAvailabilityManager
 *
 * Permet au professionnel de créer des créneaux hebdomadaires récurrents
 * en quelques clics (ex. "tous les lundis de 9h à 12h pendant 3 mois").
 *
 * Utilise `createAvailabilitySlot` du calendarService qui gère déjà
 * la persistance Firestore et la génération des instances.
 */
import { useState } from "react";
import { addMonths, addWeeks, format, setHours, setMinutes, startOfDay } from "date-fns";
import { fr } from "date-fns/locale";
import { createAvailabilitySlot } from "../../services/calendarService";

interface Props {
  professionalId: string;
  onSuccess?: (count: number) => void;
  onError?: (error: Error) => void;
}

const DAYS_OF_WEEK = [
  { label: "Lun", fullLabel: "Lundi",    value: 1 },
  { label: "Mar", fullLabel: "Mardi",    value: 2 },
  { label: "Mer", fullLabel: "Mercredi", value: 3 },
  { label: "Jeu", fullLabel: "Jeudi",    value: 4 },
  { label: "Ven", fullLabel: "Vendredi", value: 5 },
  { label: "Sam", fullLabel: "Samedi",   value: 6 },
  { label: "Dim", fullLabel: "Dimanche", value: 0 },
];

const DURATION_OPTIONS = [
  { label: "4 semaines",  weeks: 4  },
  { label: "2 mois",      weeks: 8  },
  { label: "3 mois",      weeks: 13 },
  { label: "6 mois",      weeks: 26 },
];

const SLOT_DURATIONS = [
  { label: "30 min",  minutes: 30  },
  { label: "45 min",  minutes: 45  },
  { label: "1 heure", minutes: 60  },
  { label: "1h30",    minutes: 90  },
  { label: "2 heures",minutes: 120 },
];

function parseTime(str: string): { h: number; m: number } {
  const [h, m] = str.split(":").map(Number);
  return { h, m };
}

/** Génère les dates de départ d'une récurrence hebdomadaire */
function generateWeeklyDates(dayOfWeek: number, durationWeeks: number): Date[] {
  const dates: Date[] = [];
  const today = startOfDay(new Date());
  // Trouver le prochain jour correspondant
  let cursor = new Date(today);
  while (cursor.getDay() !== dayOfWeek) {
    cursor.setDate(cursor.getDate() + 1);
  }
  const endDate = addWeeks(today, durationWeeks);
  while (cursor <= endDate) {
    dates.push(new Date(cursor));
    cursor = addWeeks(cursor, 1);
  }
  return dates;
}

export default function RecurringAvailabilityManager({ professionalId, onSuccess, onError }: Props) {
  const [selectedDays, setSelectedDays] = useState<number[]>([1]); // Lundi par défaut
  const [startTime, setStartTime] = useState("09:00");
  const [slotDuration, setSlotDuration] = useState(60);
  const [durationWeeks, setDurationWeeks] = useState(13); // 3 mois
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<string[]>([]);
  const [showPreview, setShowPreview] = useState(false);

  const toggleDay = (day: number) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const computeEndTime = (): string => {
    const { h, m } = parseTime(startTime);
    const totalMinutes = h * 60 + m + slotDuration;
    const endH = Math.floor(totalMinutes / 60) % 24;
    const endM = totalMinutes % 60;
    return `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`;
  };

  const handlePreview = () => {
    const endTime = computeEndTime();
    const lines: string[] = [];
    for (const day of [...selectedDays].sort()) {
      const dates = generateWeeklyDates(day, durationWeeks);
      const dayLabel = DAYS_OF_WEEK.find((d) => d.value === day)?.fullLabel ?? "";
      lines.push(`${dayLabel} (${dates.length} créneaux) — ${startTime} → ${endTime}`);
      // Afficher les 3 premières dates
      dates.slice(0, 3).forEach((d) => {
        lines.push(`  • ${format(d, "EEEE d MMMM yyyy", { locale: fr })}`);
      });
      if (dates.length > 3) lines.push(`  … et ${dates.length - 3} autre(s)`);
    }
    setPreview(lines);
    setShowPreview(true);
  };

  const handleCreate = async () => {
    if (selectedDays.length === 0) return;
    setLoading(true);

    const { h: startH, m: startM } = parseTime(startTime);
    const endTime = computeEndTime();
    const { h: endH, m: endM } = parseTime(endTime);
    const endDateGlobal = addWeeks(new Date(), durationWeeks);

    let totalCreated = 0;

    try {
      for (const day of selectedDays) {
        const firstDate = generateWeeklyDates(day, durationWeeks)[0];
        if (!firstDate) continue;

        const slotStart = setMinutes(setHours(firstDate, startH), startM);
        const slotEnd   = setMinutes(setHours(firstDate, endH),   endM);

        await createAvailabilitySlot(
          professionalId,
          slotStart,
          slotEnd,
          true,
          {
            frequency: "weekly",
            interval: 1,
            endDate: endDateGlobal,
          }
        );
        totalCreated += generateWeeklyDates(day, durationWeeks).length;
      }
      onSuccess?.(totalCreated);
      setShowPreview(false);
    } catch (err) {
      onError?.(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900">Disponibilités récurrentes</h3>
        <p className="text-sm text-gray-500 mt-1">
          Créez des créneaux répétés chaque semaine automatiquement.
        </p>
      </div>

      {/* Sélection des jours */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Jours de la semaine</label>
        <div className="flex flex-wrap gap-2">
          {DAYS_OF_WEEK.map((d) => (
            <button
              key={d.value}
              type="button"
              onClick={() => toggleDay(d.value)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                selectedDays.includes(d.value)
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>

      {/* Horaires */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Heure de début
          </label>
          <input
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Durée du créneau
          </label>
          <select
            value={slotDuration}
            onChange={(e) => setSlotDuration(Number(e.target.value))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          >
            {SLOT_DURATIONS.map((s) => (
              <option key={s.minutes} value={s.minutes}>{s.label}</option>
            ))}
          </select>
          <p className="text-xs text-gray-400 mt-1">Fin : {computeEndTime()}</p>
        </div>
      </div>

      {/* Durée de la récurrence */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Créer les créneaux pour les prochains…
        </label>
        <div className="flex flex-wrap gap-2">
          {DURATION_OPTIONS.map((opt) => (
            <button
              key={opt.weeks}
              type="button"
              onClick={() => setDurationWeeks(opt.weeks)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                durationWeeks === opt.weeks
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Aperçu */}
      {showPreview && preview.length > 0 && (
        <div className="bg-blue-50 rounded-lg p-4 text-sm space-y-1">
          <p className="font-semibold text-blue-800 mb-2">Aperçu des créneaux à créer :</p>
          {preview.map((line, i) => (
            <p key={i} className={line.startsWith("  ") ? "text-gray-600 ml-4" : "text-blue-700 font-medium"}>
              {line}
            </p>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={handlePreview}
          disabled={selectedDays.length === 0}
          className="flex-1 px-4 py-2 border border-blue-600 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-50 disabled:opacity-40 transition-colors"
        >
          Aperçu
        </button>
        <button
          type="button"
          onClick={handleCreate}
          disabled={selectedDays.length === 0 || loading}
          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-40 transition-colors"
        >
          {loading ? "Création…" : "Créer les créneaux"}
        </button>
      </div>
    </div>
  );
}
