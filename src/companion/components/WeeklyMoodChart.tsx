import React from "react";
import { MOOD_META } from "../data/moodMeta";
import { toDateString } from "../utils";
import type { Checkin } from "../types";

interface WeeklyMoodChartProps {
  checkins: Checkin[];
}

const DAY_LABELS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

const WeeklyMoodChart: React.FC<WeeklyMoodChartProps> = ({ checkins }) => {
  const byDate = new Map(checkins.map((c) => [c.date, c]));
  const today = new Date();

  return (
    <div className="flex items-end justify-between gap-2">
      {Array.from({ length: 7 }).map((_, i) => {
        const d = new Date(today);
        d.setDate(d.getDate() - (6 - i));
        const dateStr = toDateString(d);
        const checkin = byDate.get(dateStr);
        const meta = checkin ? MOOD_META[checkin.mood] : null;
        const heightPx = checkin ? 24 + checkin.energy * 12 : 8;
        const isToday = i === 6;

        return (
          <div key={dateStr} className="flex flex-col items-center gap-1.5 flex-1">
            <div className="w-full h-24 flex items-end justify-center">
              <div
                className="w-3 rounded-md transition-all"
                style={{
                  height: `${heightPx}px`,
                  backgroundColor: meta ? meta.color : "#E7E4DA",
                }}
                title={meta ? meta.label : undefined}
              />
            </div>
            <span
              className={`text-[10px] ${
                isToday ? "text-accent font-semibold" : "text-muted"
              }`}
            >
              {DAY_LABELS[(d.getDay() + 6) % 7]}
            </span>
          </div>
        );
      })}
    </div>
  );
};

export default WeeklyMoodChart;
