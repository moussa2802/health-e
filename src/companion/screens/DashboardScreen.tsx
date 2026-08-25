import React from "react";
import { Flame } from "lucide-react";
import type { CyclePhase, Checkin, MoodType } from "../types";
import type { DrLoResponse } from "../data/drLoResponses";
import { MOOD_META } from "../data/moodMeta";
import { PHASE_LABELS } from "../data/cyclePhases";
import { getWeeklyInsight } from "../data/insights";
import WeeklyMoodChart from "../components/WeeklyMoodChart";
import { BTN_PRIMARY } from "../theme";

interface DashboardScreenProps {
  firstName?: string;
  streak: number;
  cycleInfo?: { phase: CyclePhase; cycleDay: number } | null;
  todayCheckin: { mood: MoodType; response: DrLoResponse } | null;
  recentCheckins: Checkin[];
  onStartCheckin: () => void;
}

function formatToday(): string {
  const label = new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());
  return label.charAt(0).toUpperCase() + label.slice(1);
}

const DashboardScreen: React.FC<DashboardScreenProps> = ({
  firstName,
  streak,
  cycleInfo,
  todayCheckin,
  recentCheckins,
  onStartCheckin,
}) => {
  const greeting = firstName ? `Bonjour ${firstName}` : "Bonjour";
  const moodMeta = todayCheckin ? MOOD_META[todayCheckin.mood] : null;
  const MoodIcon = moodMeta?.icon;

  return (
    <div className="flex-1 overflow-y-auto px-6 pt-12 pb-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-xs text-muted">{formatToday()}</p>
          <h1 className="text-xl font-display font-semibold text-ink">{greeting}</h1>
        </div>
        {streak > 0 && (
          <span className="flex items-center gap-1 text-xs font-medium text-gold bg-gold-soft rounded-pill px-3 py-1.5 shrink-0">
            <Flame className="w-3.5 h-3.5" />
            {streak} jour{streak > 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Carte émotionnelle du jour */}
      <div className="rounded-block p-6 mb-6 bg-ink text-paper shadow-lift">
        {cycleInfo && (
          <span className="inline-block mb-3 text-xs font-medium bg-paper/15 rounded-pill px-3 py-1">
            Jour {cycleInfo.cycleDay} · {PHASE_LABELS[cycleInfo.phase]}
          </span>
        )}
        {todayCheckin && moodMeta && MoodIcon ? (
          <>
            <div className="flex items-center gap-2 mb-2">
              <MoodIcon className="w-6 h-6" strokeWidth={1.75} />
              <span className="text-lg font-display font-semibold">
                {moodMeta.label} aujourd'hui
              </span>
            </div>
            <p className="text-paper/80 text-sm leading-relaxed">
              {todayCheckin.response.message.split(". ")[0]}.
            </p>
          </>
        ) : (
          <>
            <p className="text-lg font-display font-semibold mb-2">
              Comment tu te sens aujourd'hui ?
            </p>
            <p className="text-paper/80 text-sm leading-relaxed">
              Prends un instant pour toi — ça ne prend qu'une minute.
            </p>
          </>
        )}
      </div>

      {recentCheckins.length > 0 && (
        <div className="mb-6">
          <p className="text-sm font-medium text-ink-soft mb-3">Ta semaine</p>
          <WeeklyMoodChart checkins={recentCheckins} />
        </div>
      )}

      <div className="rounded-card bg-gold-soft border border-line px-4 py-3.5 mb-8">
        <p className="text-sm text-ink-soft leading-relaxed">
          {getWeeklyInsight(recentCheckins)}
        </p>
      </div>

      <button
        onClick={onStartCheckin}
        className={`w-full rounded-card py-3.5 font-medium ${BTN_PRIMARY}`}
      >
        {todayCheckin ? "Revoir ma réponse du jour" : "Faire mon check-in du jour"}
      </button>
    </div>
  );
};

export default DashboardScreen;
