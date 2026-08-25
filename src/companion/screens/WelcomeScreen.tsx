import React from "react";
import { Moon } from "lucide-react";
import { BTN_PRIMARY } from "../theme";

interface WelcomeScreenProps {
  onStart: () => void;
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onStart }) => {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
      <div className="w-16 h-16 rounded-full bg-sage-soft flex items-center justify-center mb-6 shadow-soft">
        <Moon className="w-8 h-8 text-sage" strokeWidth={1.5} />
      </div>
      <h1 className="text-2xl font-display font-semibold text-ink mb-3 leading-snug">
        Comprends enfin pourquoi tu te sens comme ça
      </h1>
      <p className="text-ink-soft mb-10 leading-relaxed">
        Chaque jour, prends un instant pour toi. Dr Lô t'aide à comprendre tes
        émotions et à en parler, à ton rythme.
      </p>
      <button
        onClick={onStart}
        className={`w-full rounded-card py-3.5 font-medium ${BTN_PRIMARY}`}
      >
        Commencer
      </button>
      <p className="mt-4 text-xs text-muted">
        Gratuit · Confidentiel · Rien à installer
      </p>
    </div>
  );
};

export default WelcomeScreen;
