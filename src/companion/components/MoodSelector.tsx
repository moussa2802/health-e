import React from "react";
import { MOOD_LIST } from "../data/moodMeta";
import type { MoodType } from "../types";

interface MoodSelectorProps {
  value: MoodType | null;
  onChange: (mood: MoodType) => void;
}

const MoodSelector: React.FC<MoodSelectorProps> = ({ value, onChange }) => {
  return (
    <div className="grid grid-cols-2 gap-3">
      {MOOD_LIST.map(({ id, label, icon: Icon, color }) => {
        const selected = value === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onChange(id)}
            aria-pressed={selected}
            className={`flex flex-col items-center gap-2 rounded-card border px-4 py-5 transition-colors ${
              selected
                ? "border-accent bg-accent-soft shadow-soft"
                : "border-line hover:border-accent/40 hover:bg-accent-soft/40"
            }`}
          >
            <Icon
              className="w-6 h-6"
              style={{ color: selected ? color : "#6E7078" }}
              strokeWidth={1.75}
            />
            <span
              className={`text-sm font-medium ${selected ? "text-accent" : "text-ink-soft"}`}
            >
              {label}
            </span>
          </button>
        );
      })}
    </div>
  );
};

export default MoodSelector;
