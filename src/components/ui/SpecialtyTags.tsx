import React from "react";
import { getSpecialtyLabel } from "../../constants/specialties";

interface SpecialtyTagsProps {
  specialties: string[];
  language?: "fr" | "en";
  maxDisplay?: number;
  className?: string;
}

const SpecialtyTags: React.FC<SpecialtyTagsProps> = ({
  specialties,
  language = "fr",
  maxDisplay = 3,
  className = "",
}) => {
  if (!specialties || specialties.length === 0) {
    return (
      <span className={`text-gray-500 text-sm ${className}`}>
        Spécialité non précisée
      </span>
    );
  }

  const displaySpecialties = specialties.slice(0, maxDisplay);
  const remainingCount = specialties.length - maxDisplay;

  return (
    <div className={`flex flex-wrap gap-1 ${className}`}>
      {displaySpecialties.map((specialty, index) => (
        <span
          key={specialty}
          className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
        >
          {getSpecialtyLabel(specialty, language)}
        </span>
      ))}
      {remainingCount > 0 && (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
          +{remainingCount} autre{remainingCount > 1 ? "s" : ""}
        </span>
      )}
    </div>
  );
};

export default SpecialtyTags;
