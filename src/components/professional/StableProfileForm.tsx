import React, { useState } from "react";
import { Save, User, Mail, Phone, MapPin, GraduationCap, Briefcase, FileText } from "lucide-react";

interface ProfessionalProfile {
  name: string;
  email: string;
  phone?: string;
  specialty: string;
  experience: string;
  education: string;
  bio: string;
  consultationFee: number;
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

  const handleInputChange = (field: keyof ProfessionalProfile, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
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

  const specialties = [
    "Psychologue",
    "Psychiatre", 
    "Sexologue",
    "Gynécologue",
    "Urologue"
  ];

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
                onChange={(e) => handleInputChange('name', e.target.value)}
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
                onChange={(e) => handleInputChange('email', e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Téléphone
              </label>
              <input
                type="tel"
                value={formData.phone || ''}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Spécialité
              </label>
              <select
                value={formData.specialty}
                onChange={(e) => handleInputChange('specialty', e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                {specialties.map(specialty => (
                  <option key={specialty} value={specialty}>
                    {specialty}
                  </option>
                ))}
              </select>
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
                onChange={(e) => handleInputChange('experience', e.target.value)}
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
                onChange={(e) => handleInputChange('education', e.target.value)}
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
              onChange={(e) => handleInputChange('bio', e.target.value)}
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
              onChange={(e) => handleInputChange('consultationFee', parseInt(e.target.value) || 0)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              min="0"
              required
            />
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
            {isSaving ? 'Sauvegarde...' : 'Sauvegarder le profil'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default StableProfileForm;
