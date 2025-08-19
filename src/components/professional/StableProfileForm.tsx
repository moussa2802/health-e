import React, { useState, useEffect } from "react";
import {
  Save,
  User,
  Mail,
  Phone,
  MapPin,
  GraduationCap,
  Briefcase,
  FileText,
  Upload,
  X,
  Image,
  Languages,
} from "lucide-react";

interface ProfessionalProfile {
  name: string;
  email: string;
  phone?: string;
  specialty: string;
  experience: string;
  education: string;
  bio: string;
  consultationFee: number;
  signatureUrl?: string;
  stampUrl?: string;
  useElectronicSignature?: boolean;
  languages: string[];
  profileImage?: string;
  type: string;
}

interface StableProfileFormProps {
  profile: ProfessionalProfile;
  onSave: (profile: ProfessionalProfile) => Promise<void>;
  isSaving: boolean;
}

const StableProfileForm: React.FC<StableProfileFormProps> = ({
  profile,
  onSave,
  isSaving,
}) => {
  const [formData, setFormData] = useState<ProfessionalProfile>(profile);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleInputChange = (
    field: keyof ProfessionalProfile,
    value: string | number | boolean
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleImageUpload = (field: "signatureUrl" | "stampUrl" | "profileImage") => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        // Simuler l'upload d'image (dans un vrai projet, vous utiliseriez un service d'upload)
        const reader = new FileReader();
        reader.onload = (e) => {
          const result = e.target?.result as string;
          handleInputChange(field, result);
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  };

  const removeImage = (field: "signatureUrl" | "stampUrl" | "profileImage") => {
    handleInputChange(field, "");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    try {
      await onSave(formData);
      setSuccess(true);
    } catch (err) {
      setError("Erreur lors de la sauvegarde du profil");
      console.error("Erreur de sauvegarde:", err);
    }
  };

  const getSpecialtiesByType = (type: string) => {
    switch (type) {
      case "mental":
        return ["Psychologue", "Psychiatre"];
      case "sexual":
        return ["Sexologue", "Gynécologue", "Urologue"];
      default:
        return ["Psychologue", "Psychiatre", "Sexologue", "Gynécologue", "Urologue"];
    }
  };

  const specialties = getSpecialtiesByType(formData.type);

  // Réinitialiser la spécialité quand le type change
  useEffect(() => {
    const currentSpecialties = getSpecialtiesByType(formData.type);
    if (!currentSpecialties.includes(formData.specialty)) {
      // Si la spécialité actuelle n'est pas dans le nouveau type, on prend la première disponible
      handleInputChange("specialty", currentSpecialties[0]);
    }
  }, [formData.type]);

  return (
    <div className="space-y-6">
      {/* Message de succès */}
      {success && (
        <div className="p-4 bg-green-100 border border-green-400 text-green-700 rounded-lg">
          Profil mis à jour avec succès !
        </div>
      )}

      {/* Message d'erreur */}
      {error && (
        <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Informations personnelles */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <User className="h-5 w-5 mr-2 text-blue-600" />
            Informations personnelles
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nom complet
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                disabled
                className="w-full border border-gray-300 bg-gray-100 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
              <p className="text-sm text-gray-500 mt-1">
                L'adresse email ne peut pas être modifiée pour des raisons de
                sécurité.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Téléphone
              </label>
              <input
                type="tel"
                value={formData.phone || ""}
                onChange={(e) => handleInputChange("phone", e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Spécialité
              </label>
              <select
                value={formData.specialty}
                onChange={(e) => handleInputChange("specialty", e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                {specialties.map((specialty) => (
                  <option key={specialty} value={specialty}>
                    {specialty}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Type de service */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <Briefcase className="h-5 w-5 mr-2 text-blue-600" />
            Type de service
          </h3>
          
          <div className="space-y-4">
            <div className="flex space-x-4">
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  className="form-radio h-5 w-5 text-blue-600"
                  name="serviceType"
                  value="mental"
                  checked={formData.type === "mental"}
                  onChange={(e) =>
                    handleInputChange("type", e.target.value as "mental" | "sexual")
                  }
                />
                <span className="ml-2 text-gray-700">Santé mentale</span>
              </label>
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  className="form-radio h-5 w-5 text-blue-600"
                  name="serviceType"
                  value="sexual"
                  checked={formData.type === "sexual"}
                  onChange={(e) =>
                    handleInputChange("type", e.target.value as "mental" | "sexual")
                  }
                />
                <span className="ml-2 text-gray-700">Santé sexuelle</span>
              </label>
            </div>
          </div>
        </div>

        {/* Langues */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <Languages className="h-5 w-5 mr-2 text-blue-600" />
            Langues parlées
          </h3>

          <div className="space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {[
                { code: "fr", name: "Français" },
                { code: "en", name: "Anglais" },
                { code: "ar", name: "Arabe" },
                { code: "wo", name: "Wolof" },
                { code: "ff", name: "Peul" },
                { code: "sr", name: "Sérère" },
                { code: "mn", name: "Mandinka" },
                { code: "dy", name: "Diola" },
              ].map((lang) => (
                <label key={lang.code} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={formData.languages.includes(lang.code)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        handleInputChange("languages", [
                          ...formData.languages,
                          lang.code,
                        ]);
                      } else {
                        handleInputChange(
                          "languages",
                          formData.languages.filter((l) => l !== lang.code)
                        );
                      }
                    }}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="text-sm text-gray-700">{lang.name}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Photo de profil */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <User className="h-5 w-5 mr-2 text-blue-600" />
            Photo de profil
          </h3>

          <div className="space-y-3">
            {formData.profileImage ? (
              <div className="relative inline-block">
                <img
                  src={formData.profileImage}
                  alt="Photo de profil"
                  className="w-32 h-32 object-cover border border-gray-300 rounded-lg"
                />
                <button
                  type="button"
                  onClick={() => handleInputChange("profileImage", "")}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <User className="mx-auto h-12 w-12 text-gray-400" />
                <p className="mt-2 text-sm text-gray-600">
                  Aucune photo de profil
                </p>
              </div>
            )}
            <button
              type="button"
              onClick={() => handleImageUpload("profileImage")}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <Upload className="h-4 w-4" />
              {formData.profileImage ? "Changer la photo" : "Ajouter une photo"}
            </button>
          </div>
        </div>

        {/* Expérience et formation */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <GraduationCap className="h-5 w-5 mr-2 text-blue-600" />
            Expérience et formation
          </h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Expérience professionnelle
              </label>
              <textarea
                value={formData.experience}
                onChange={(e) =>
                  handleInputChange("experience", e.target.value)
                }
                rows={3}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Décrivez votre expérience..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Formation et diplômes
              </label>
              <textarea
                value={formData.education}
                onChange={(e) => handleInputChange("education", e.target.value)}
                rows={3}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Listez vos formations..."
              />
            </div>
          </div>
        </div>

        {/* Biographie */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <FileText className="h-5 w-5 mr-2 text-blue-600" />
            Biographie
          </h3>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Présentation
            </label>
            <textarea
              value={formData.bio}
              onChange={(e) => handleInputChange("bio", e.target.value)}
              rows={4}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Présentez-vous aux patients..."
            />
          </div>
        </div>

        {/* Tarifs */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <Briefcase className="h-5 w-5 mr-2 text-blue-600" />
            Tarifs
          </h3>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Frais de consultation (FCFA)
            </label>
            <input
              type="number"
              value={formData.consultationFee}
              onChange={(e) =>
                handleInputChange(
                  "consultationFee",
                  parseInt(e.target.value) || 0
                )
              }
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              min="0"
              required
            />
          </div>
        </div>

        {/* Signatures et cachets */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <FileText className="h-5 w-5 mr-2 text-blue-600" />
            Signatures et cachets
          </h3>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Signature électronique
              </label>
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={formData.useElectronicSignature || false}
                  onChange={(e) =>
                    handleInputChange(
                      "useElectronicSignature",
                      e.target.checked
                    )
                  }
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="text-sm text-gray-700">
                  Utiliser la signature électronique
                </span>
              </div>
            </div>

            {formData.useElectronicSignature && (
              <>
                {/* Signature */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Image de signature
                  </label>
                  <div className="space-y-3">
                    {formData.signatureUrl ? (
                      <div className="relative inline-block">
                        <img
                          src={formData.signatureUrl}
                          alt="Signature"
                          className="max-w-xs max-h-32 border border-gray-300 rounded-lg"
                        />
                        <button
                          type="button"
                          onClick={() => removeImage("signatureUrl")}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                        <Image className="mx-auto h-12 w-12 text-gray-400" />
                        <p className="mt-2 text-sm text-gray-600">
                          Aucune signature
                        </p>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => handleImageUpload("signatureUrl")}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2"
                    >
                      <Upload className="h-4 w-4" />
                      {formData.signatureUrl
                        ? "Changer la signature"
                        : "Ajouter une signature"}
                    </button>
                  </div>
                </div>

                {/* Cachet */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Image du cachet
                  </label>
                  <div className="space-y-3">
                    {formData.stampUrl ? (
                      <div className="relative inline-block">
                        <img
                          src={formData.stampUrl}
                          alt="Cachet"
                          className="max-w-xs max-h-32 border border-gray-300 rounded-lg"
                        />
                        <button
                          type="button"
                          onClick={() => removeImage("stampUrl")}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                        <Image className="mx-auto h-12 w-12 text-gray-300" />
                        <p className="mt-2 text-sm text-gray-600">
                          Aucun cachet
                        </p>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => handleImageUpload("stampUrl")}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2"
                    >
                      <Upload className="h-4 w-4" />
                      {formData.stampUrl
                        ? "Changer le cachet"
                        : "Ajouter un cachet"}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Bouton de sauvegarde */}
        <div className="flex justify-center">
          <button
            type="submit"
            disabled={isSaving}
            className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Save className="h-5 w-5" />
            {isSaving ? "Sauvegarde..." : "Sauvegarder le profil"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default StableProfileForm;
