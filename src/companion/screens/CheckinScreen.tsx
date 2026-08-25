import React, { useState } from "react";
import type { MoodType } from "../types";
import MoodSelector from "../components/MoodSelector";
import EnergySlider from "../components/EnergySlider";
import { BTN_PRIMARY } from "../theme";

export interface CheckinSubmission {
  mood: MoodType;
  energy: number;
  note?: string;
}

interface CheckinScreenProps {
  firstName?: string;
  onSubmit: (data: CheckinSubmission) => void;
  submitting?: boolean;
}

const CheckinScreen: React.FC<CheckinScreenProps> = ({
  firstName,
  onSubmit,
  submitting,
}) => {
  const [mood, setMood] = useState<MoodType | null>(null);
  const [energy, setEnergy] = useState(3);
  const [note, setNote] = useState("");
  const greeting = firstName ? `Bonjour ${firstName}` : "Bonjour";

  return (
    <div className="flex-1 overflow-y-auto px-6 pt-12 pb-8">
      <h1 className="text-xl font-display font-semibold text-ink mb-1">{greeting}</h1>
      <p className="text-ink-soft mb-6">Comment tu te sens aujourd'hui ?</p>

      <MoodSelector value={mood} onChange={setMood} />

      <div className="mt-8">
        <p className="text-sm font-medium text-ink-soft mb-3">
          Ton niveau d'énergie
        </p>
        <EnergySlider value={energy} onChange={setEnergy} />
      </div>

      <div className="mt-8">
        <label
          htmlFor="checkin-note"
          className="text-sm font-medium text-ink-soft mb-2 block"
        >
          Une note pour toi{" "}
          <span className="text-muted font-normal">(facultatif)</span>
        </label>
        <textarea
          id="checkin-note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          placeholder="Ce que tu as envie de garder pour toi..."
          className="w-full rounded-card border border-line bg-card px-4 py-3 text-sm text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent resize-none"
        />
      </div>

      <button
        onClick={() =>
          mood && onSubmit({ mood, energy, note: note.trim() || undefined })
        }
        disabled={!mood || submitting}
        className={`w-full mt-8 rounded-card py-3.5 font-medium disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100 ${BTN_PRIMARY}`}
      >
        {submitting ? "Un instant…" : "Continuer"}
      </button>
    </div>
  );
};

export default CheckinScreen;
