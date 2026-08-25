import React from "react";
import { SITUATIONS, type SituationOption } from "../data/situations";

interface SituationScreenProps {
  onSelect: (situation: SituationOption) => void;
}

const SituationScreen: React.FC<SituationScreenProps> = ({ onSelect }) => {
  return (
    <div className="flex-1 flex flex-col justify-center px-8">
      <h1 className="text-xl font-display font-semibold text-ink mb-8 text-center">
        Pour mieux t'accompagner, dis-moi ce qui te correspond
      </h1>
      <div className="space-y-3">
        {SITUATIONS.map((situation) => (
          <button
            key={situation.id}
            onClick={() => onSelect(situation)}
            className="w-full text-left px-5 py-4 rounded-card border border-line bg-card shadow-soft hover:border-accent hover:bg-accent-soft transition-all"
          >
            <span className="block text-ink font-medium">
              {situation.label}
            </span>
            <span className="block text-ink-soft text-sm mt-0.5">
              {situation.subtitle}
            </span>
          </button>
        ))}
      </div>
      <p className="mt-6 text-xs text-muted text-center">
        Tes réponses restent confidentielles.
      </p>
    </div>
  );
};

export default SituationScreen;
