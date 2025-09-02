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
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import {
  compressImageForFirestore,
  getDataUrlSize,
  isValidForFirestore,
} from "../../utils/imageCompression";

interface ProfessionalProfile {
  id: string;
  userId: string;
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
  description: string;
  price: number | null;
  currency: string;
  offersFreeConsultations: boolean;
  availability: any[];
  isAvailableNow: boolean;
  rating: number;
  reviews: number;
  createdAt: any;
  updatedAt: any;
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
  const [isCompressing, setIsCompressing] = useState(false);
  const [compressionInfo, setCompressionInfo] = useState<{
    originalSize: number;
    compressedSize: number;
    compressionRatio: number;
  } | null>(null);

  const handleInputChange = (
    field: keyof ProfessionalProfile,
    value: string | number | boolean
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleImageUpload = async (
    field: "signatureUrl" | "stampUrl" | "profileImage"
  ) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      // Vérifier la taille du fichier
      if (file.size > 5 * 1024 * 1024) {
        setError("L'image ne doit pas dépasser 5MB");
        return;
      }

      if (!file.type.startsWith("image/")) {
        setError("Veuillez sélectionner un fichier image valide");
        return;
      }

      try {
        setIsCompressing(true);
        setError(null);
        setCompressionInfo(null);

        // Compresser l'image pour Firestore
        const compressedResult = await compressImageForFirestore(file, {
          maxWidth: 800,
          maxHeight: 800,
          quality: 0.8,
          maxSizeBytes: 900000, // 900KB pour être sûr
        });

        // Vérifier que la compression a réussi
        if (!isValidForFirestore(compressedResult.dataUrl)) {
          throw new Error("L'image est encore trop grande après compression");
        }

        // Mettre à jour le formulaire avec l'image compressée
        handleInputChange(field, compressedResult.dataUrl);

        // Afficher les informations de compression
        setCompressionInfo({
          originalSize: compressedResult.originalSize,
          compressedSize: compressedResult.compressedSize,
          compressionRatio: compressedResult.compressionRatio,
        });

        console.log("✅ Image compressée avec succès:", {
          original: `${(compressedResult.originalSize / 1024).toFixed(1)} KB`,
          compressed: `${(compressedResult.compressedSize / 1024).toFixed(
            1
          )} KB`,
          ratio: `${compressedResult.compressionRatio.toFixed(1)}%`,
        });
      } catch (error) {
        console.error("❌ Erreur lors de la compression:", error);
        setError(
          `Erreur lors de la compression : ${
            error instanceof Error ? error.message : "Erreur inconnue"
          }`
        );
      } finally {
        setIsCompressing(false);
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
        return [
          "Psychologue",
          "Psychiatre",
          "Sexologue",
          "Gynécologue",
          "Urologue",
        ];
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
                    handleInputChange(
                      "type",
                      e.target.value as "mental" | "sexual"
                    )
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
                    handleInputChange(
                      "type",
                      e.target.value as "mental" | "sexual"
                    )
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

            {/* Bouton d'upload avec indicateur de compression */}
            <button
              type="button"
              onClick={() => handleImageUpload("profileImage")}
              disabled={isCompressing}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isCompressing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Compression en cours...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  {formData.profileImage
                    ? "Changer la photo"
                    : "Ajouter une photo"}
                </>
              )}
            </button>

            {/* Informations de compression */}
            {compressionInfo && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2 text-green-700 mb-2">
                  <CheckCircle className="h-4 w-4" />
                  <span className="text-sm font-medium">
                    Image compressée avec succès
                  </span>
                </div>
                <div className="text-xs text-green-600 space-y-1">
                  <div>
                    Taille originale :{" "}
                    {(compressionInfo.originalSize / 1024).toFixed(1)} KB
                  </div>
                  <div>
                    Taille compressée :{" "}
                    {(compressionInfo.compressedSize / 1024).toFixed(1)} KB
                  </div>
                  <div>
                    Réduction : {compressionInfo.compressionRatio.toFixed(1)}%
                  </div>
                  <div>✅ Compatible Firestore</div>
                </div>
              </div>
            )}

            {/* Aide sur la compression */}
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start gap-2 text-blue-700">
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <div className="text-xs">
                  <p className="font-medium mb-1">Optimisation automatique</p>
                  <p>
                    Vos images sont automatiquement compressées pour respecter
                    les limites de la base de données. La qualité reste
                    excellente pour les profils professionnels.
                  </p>
                </div>
              </div>
            </div>
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
                  Number(e.target.value) || 0
                )
              }
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              min="0"
              required
            />
          </div>
        </div>

        {/* Signatures et cachets - MASQUÉ TEMPORAIREMENT */}
        {/* 
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
        */}

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
