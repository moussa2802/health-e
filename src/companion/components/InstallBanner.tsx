import React from "react";
import { Share, X } from "lucide-react";

interface InstallBannerProps {
  platform: "android" | "ios";
  onInstall: () => void;
  onDismiss: () => void;
}

const InstallBanner: React.FC<InstallBannerProps> = ({
  platform,
  onInstall,
  onDismiss,
}) => {
  return (
    <div className="mx-8 mb-6 rounded-card border border-line bg-sage-soft px-4 py-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-sage">
            Installe Health-e sur ton téléphone
          </p>
          <p className="text-xs text-ink-soft mt-1 leading-relaxed">
            {platform === "android"
              ? "Accède à ton compagnon en un geste, comme une vraie application."
              : 'Appuie sur Partager, puis "Sur l\'écran d\'accueil".'}
          </p>
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
          onClick={onInstall}
          className="mt-3 w-full bg-sage text-paper rounded-card py-2.5 text-sm font-medium hover:bg-sage/90 transition-colors"
        >
          Installer
        </button>
      )}

      {platform === "ios" && (
        <div className="mt-3 flex items-center gap-2 text-xs text-sage">
          <Share className="w-4 h-4" />
          <span>Partager → Sur l'écran d'accueil</span>
        </div>
      )}
    </div>
  );
};

export default InstallBanner;
