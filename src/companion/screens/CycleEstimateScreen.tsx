import React from "react";
import type { CycleEstimateChoice } from "../data/cyclePhases";
import { BTN_ACCENT } from "../theme";

interface CycleEstimateScreenProps {
  onEstimate: (choice: CycleEstimateChoice) => void;
}

const CHOICES: { id: CycleEstimateChoice; label: string; emphasize?: boolean }[] = [
  { id: "this_week", label: "Cette semaine" },
  { id: "last_week", label: "La semaine dernière" },
  { id: "two_three_weeks_ago", label: "Il y a 2 ou 3 semaines" },
  { id: "unknown", label: "Je ne sais pas trop", emphasize: true },
];

const CycleEstimateScreen: React.FC<CycleEstimateScreenProps> = ({
  onEstimate,
}) => {
  return (
    <div className="flex-1 flex flex-col justify-center px-8">
      <h1 className="text-xl font-display font-semibold text-ink mb-3 text-center">
        Une dernière chose, entre nous
      </h1>
      <p className="text-ink-soft text-sm mb-8 text-center leading-relaxed">
        Tes dernières règles t'aident à mieux comprendre tes émotions.
        Aucune pression si tu ne sais pas exactement.
      </p>
      <div className="space-y-3">
        {CHOICES.map((choice) => (
          <button
            key={choice.id}
            onClick={() => onEstimate(choice.id)}
            className={
              choice.emphasize
                ? `w-full text-center px-5 py-4 rounded-card font-medium ${BTN_ACCENT}`
                : "w-full text-center px-5 py-4 rounded-card border border-line bg-card text-ink-soft shadow-soft hover:border-accent hover:bg-accent-soft transition-all"
            }
          >
            {choice.label}
          </button>
        ))}
      </div>
      <p className="mt-6 text-xs text-muted text-center">
        Tes réponses restent confidentielles.
      </p>
    </div>
  );
};

export default CycleEstimateScreen;
