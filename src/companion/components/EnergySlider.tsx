import React from "react";

interface EnergySliderProps {
  value: number; // 1-5
  onChange: (value: number) => void;
}

const LEVELS = [1, 2, 3, 4, 5];

const EnergySlider: React.FC<EnergySliderProps> = ({ value, onChange }) => {
  return (
    <div>
      <div className="flex gap-2">
        {LEVELS.map((level) => (
          <button
            key={level}
            type="button"
            onClick={() => onChange(level)}
            aria-label={`Énergie ${level} sur 5`}
            aria-pressed={level === value}
            className={`flex-1 h-10 rounded-card transition-all ${
              level <= value
                ? "bg-accent shadow-soft"
                : "bg-line hover:bg-line/70"
            }`}
          />
        ))}
      </div>
      <div className="flex justify-between mt-2 text-xs text-muted">
        <span>Basse énergie</span>
        <span>Haute énergie</span>
      </div>
    </div>
  );
};

export default EnergySlider;
