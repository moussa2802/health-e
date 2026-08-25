import React from "react";
import { Link } from "react-router-dom";
import { Sparkles } from "lucide-react";
import type { CyclePhase } from "../types";
import type { DrLoResponse } from "../data/drLoResponses";
import { PHASE_LABELS } from "../data/cyclePhases";

interface DrLoResponseScreenProps {
  response: DrLoResponse;
  cycleInfo?: { phase: CyclePhase; cycleDay: number } | null;
  vigilance?: boolean;
}

const DrLoResponseScreen: React.FC<DrLoResponseScreenProps> = ({
  response,
  cycleInfo,
  vigilance,
}) => {
  return (
    <div className="flex-1 overflow-y-auto px-8 pt-12 pb-8">
      {cycleInfo && (
        <span className="inline-block w-fit mb-4 text-xs font-medium text-sage bg-sage-soft rounded-pill px-3 py-1.5">
          Jour {cycleInfo.cycleDay} · {PHASE_LABELS[cycleInfo.phase]}
        </span>
      )}
      <div className="rounded-block bg-card border border-line shadow-soft px-5 py-5 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <img
            src="/dr-lo.png"
            alt="Dr Lô"
            className="w-10 h-10 rounded-full object-cover"
          />
          <span className="text-sm text-muted">Ton accompagnant</span>
        </div>
        <p className="text-ink-soft leading-relaxed">{response.message}</p>

        {response.suggestions.length > 0 && (
          <div className="mt-5">
            <p className="text-sm font-medium text-ink-soft mb-2">
              Ce qui peut t'aider aujourd'hui
            </p>
            <ul className="space-y-1.5">
              {response.suggestions.map((suggestion) => (
                <li
                  key={suggestion}
                  className="text-sm text-ink-soft flex items-start gap-2"
                >
                  <span className="text-accent mt-0.5">•</span>
                  {suggestion}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {vigilance && (
        <Link
          to="/assessment"
          className="block mb-6 text-sm font-medium text-sage bg-sage-soft rounded-card px-4 py-3 text-center hover:bg-sage-soft/70 transition-colors"
        >
          Faire le point avec une évaluation →
        </Link>
      )}

      <span className="inline-flex items-center gap-1.5 w-fit text-sm text-muted border border-line rounded-pill px-4 py-2">
        <Sparkles className="w-3.5 h-3.5" />
        Parler à Dr Lô — Bientôt disponible
      </span>
    </div>
  );
};

export default DrLoResponseScreen;
