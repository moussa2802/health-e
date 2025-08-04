import React from "react";

interface CooldownMessageProps {
  cooldownTime: number;
  isInCooldown: boolean;
  showInContext?: boolean;
}

const CooldownMessage: React.FC<CooldownMessageProps> = ({
  cooldownTime,
  isInCooldown,
  showInContext = true,
}) => {
  if (!isInCooldown || !showInContext) return null;

  const minutes = Math.floor(cooldownTime / 60);
  const seconds = cooldownTime % 60;

  return (
    <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
      <div className="flex items-center justify-center space-x-2 mb-2">
        <div className="w-4 h-4 bg-yellow-400 rounded-full animate-pulse"></div>
        <p className="text-sm font-medium text-yellow-800">
          ⏱️ Limite de tentatives atteinte
        </p>
      </div>
      <p className="text-sm text-yellow-700 text-center">
        Pour des raisons de sécurité, veuillez attendre{" "}
        <span className="font-semibold">
          {minutes > 0 ? `${minutes}m ` : ""}
          {seconds}s
        </span>{" "}
        avant de réessayer.
      </p>
      <p className="text-xs text-yellow-600 text-center mt-2">
        Cette limite protège contre l'abus de SMS.
      </p>
    </div>
  );
};

export default CooldownMessage;
