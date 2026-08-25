import React from "react";
import { Bell, X } from "lucide-react";

interface ReminderOptInProps {
  platform: "android" | "ios";
  onEnable: () => void;
  onDismiss: () => void;
}

const ReminderOptIn: React.FC<ReminderOptInProps> = ({
  platform,
  onEnable,
  onDismiss,
}) => {
  return (
    <div className="mx-8 mb-6 rounded-card border border-line bg-sage-soft px-4 py-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <Bell className="w-4 h-4 text-sage mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-sage">
              Un petit rappel chaque jour ?
            </p>
            <p className="text-xs text-ink-soft mt-1 leading-relaxed">
              {platform === "android"
                ? "On te fait signe si tu n'as pas encore pris ton moment du jour."
                : "Pas encore possible sur iPhone — reviens quand tu veux, Dr Lô t'attend."}
            </p>
          </div>
        </div>
        <button
          onClick={onDismiss}
          aria-label="Fermer"
          className="text-sage/50 hover:text-sage shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {platform === "android" && (
        <button
          onClick={onEnable}
          className="mt-3 w-full bg-sage text-paper rounded-card py-2.5 text-sm font-medium hover:bg-sage/90 transition-colors"
        >
          Activer les rappels
        </button>
      )}
    </div>
  );
};

export default ReminderOptIn;
