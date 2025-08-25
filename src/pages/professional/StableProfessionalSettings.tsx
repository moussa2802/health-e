import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import {
  Wifi,
  WifiOff,
  Globe,
  AlertCircle,
  X,
  CheckCircle,
} from "lucide-react";
import {
  getProfessionalProfile,
  updateProfessionalProfile,
  subscribeToProfessionalProfile,
  type ProfessionalProfile as ServiceProfessionalProfile,
} from "../../services/profileService";
import {
  getFirestoreConnectionStatus,
  forceFirestoreOnline,
  resetFirestoreConnection,
} from "../../utils/firebase";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import StableProfileForm from "../../components/professional/StableProfileForm";

// Interface locale étendue pour le formulaire
interface LocalProfessionalProfile
  extends Omit<ServiceProfessionalProfile, "education"> {
  phone?: string;
  bio: string;
  consultationFee: number;
  education: string; // string au lieu de string[]
}

const StableProfessionalSettings: React.FC = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [profileData, setProfileData] = useState<LocalProfessionalProfile>({
    id: "",
    userId: "",
    name: "",
    email: "",
    phone: "",
    specialty: "Psychologue",
    experience: "",
    education: "",
    bio: "",
    consultationFee: 0,
    isApproved: false,
    isActive: false,
    type: "mental",
    signatureUrl: "",
    stampUrl: "",
    useElectronicSignature: false,
    languages: ["fr"],
    profileImage: "",
    description: "",
    price: null,
    currency: "FCFA",
    offersFreeConsultations: false,
    availability: [],
    isAvailableNow: false,
    rating: 0,
    reviews: 0,
    createdAt: {} as any,
    updatedAt: {} as any,
  });
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState({
    isOnline: false,
    isInitialized: false,
  });
  const [isLocalEnvironment, setIsLocalEnvironment] = useState(false);

  // Détection de l'environnement
  useEffect(() => {
    const isLocal =
      typeof window !== "undefined" &&
      (window.location.hostname === "localhost" ||
        window.location.hostname.includes("webcontainer") ||
        window.location.hostname.includes("health-e.sn"));
    setIsLocalEnvironment(isLocal);
  }, []);

  // Mise à jour du statut de connexion
  useEffect(() => {
    const updateConnectionStatus = () => {
      setConnectionStatus(getFirestoreConnectionStatus());
    };

    const interval = setInterval(updateConnectionStatus, 5000);
    updateConnectionStatus(); // Appel initial

    return () => clearInterval(interval);
  }, []);

  // Chargement du profil
  useEffect(() => {
    const loadProfile = async () => {
      if (!currentUser?.id) {
        setLoading(false);
        return;
      }

      try {
        const profile = await getProfessionalProfile(currentUser.id);
        if (profile) {
          setProfileData({
            id: profile.id || "",
            userId: profile.userId || "",
            name: profile.name || "",
            email: profile.email || "",
            phone: "", // Pas de phone dans le service
            specialty: profile.specialty || "Psychologue",
            experience: profile.experience || "",
            education: Array.isArray(profile.education)
              ? profile.education.join(", ")
              : "",
            bio: profile.description || "",
            consultationFee: profile.price || 0,
            isApproved: profile.isApproved || false,
            isActive: profile.isActive || false,
            type: profile.type || "mental",
            signatureUrl: profile.signatureUrl || "",
            stampUrl: profile.stampUrl || "",
            useElectronicSignature: profile.useElectronicSignature || false,
            languages: profile.languages || ["fr"],
            profileImage: profile.profileImage || "",
            description: profile.description || "",
            price: profile.price || null,
            currency: profile.currency || "FCFA",
            offersFreeConsultations: profile.offersFreeConsultations || false,
            availability: profile.availability || [],
            isAvailableNow: profile.isAvailableNow || false,
            rating: profile.rating || 0,
            reviews: profile.reviews || 0,
            createdAt: profile.createdAt || ({} as any),
            updatedAt: profile.updatedAt || ({} as any),
          });
        }

        // Abonnement aux changements du profil
        const unsubscribe = subscribeToProfessionalProfile(
          currentUser.id,
          (updatedProfile) => {
            if (updatedProfile) {
              setProfileData((prev) => ({
                ...prev,
                id: updatedProfile.id || "",
                userId: updatedProfile.userId || "",
                name: updatedProfile.name || "",
                email: updatedProfile.email || "",
                phone: "", // Pas de phone dans le service
                specialty: updatedProfile.specialty || "Psychologue",
                experience: updatedProfile.experience || "",
                education: Array.isArray(updatedProfile.education)
                  ? updatedProfile.education.join(", ")
                  : "",
                bio: updatedProfile.description || "",
                consultationFee: updatedProfile.price || 0,
                isApproved: updatedProfile.isApproved || false,
                isActive: updatedProfile.isActive || false,
                type: updatedProfile.type || "mental",
                signatureUrl: updatedProfile.signatureUrl || "",
                stampUrl: updatedProfile.stampUrl || "",
                useElectronicSignature:
                  updatedProfile.useElectronicSignature || false,
                languages: updatedProfile.languages || ["fr"],
                profileImage: updatedProfile.profileImage || "",
                description: updatedProfile.description || "",
                price: updatedProfile.price || null,
                currency: updatedProfile.currency || "FCFA",
                offersFreeConsultations:
                  updatedProfile.offersFreeConsultations || false,
                availability: updatedProfile.availability || [],
                isAvailableNow: updatedProfile.isAvailableNow || false,
                rating: updatedProfile.rating || 0,
                reviews: updatedProfile.reviews || 0,
                createdAt: updatedProfile.createdAt || ({} as any),
                updatedAt: updatedProfile.updatedAt || ({} as any),
              }));
            }
          }
        );

        setLoading(false);
        return unsubscribe;
      } catch (error) {
        console.error("Erreur lors du chargement du profil:", error);
        setErrorMessage("Erreur lors du chargement du profil");
        setLoading(false);
      }
    };

    loadProfile();
  }, [currentUser?.id]);

  // Fonction de reconnexion
  const handleReconnect = async () => {
    try {
      await forceFirestoreOnline();
      await resetFirestoreConnection();
      setErrorMessage("");
    } catch (error) {
      console.error("Erreur lors de la reconnexion:", error);
      setErrorMessage("Erreur lors de la reconnexion");
    }
  };

  // Fonction de sauvegarde
  const handleSaveProfile = async (
    updatedProfile: LocalProfessionalProfile
  ) => {
    if (!currentUser?.id) return;

    try {
      setIsSaving(true);
      setErrorMessage("");

      // Vérifier que l'image de profil respecte les limites Firestore
      if (
        updatedProfile.profileImage &&
        updatedProfile.profileImage.length > 900000
      ) {
        throw new Error(
          "L'image de profil est trop grande. Veuillez la compresser ou en choisir une plus petite."
        );
      }

      await updateProfessionalProfile(currentUser.id, {
        name: updatedProfile.name,
        specialty: updatedProfile.specialty,
        experience: updatedProfile.experience,
        education: updatedProfile.education.split(", ").filter(Boolean),
        description: updatedProfile.bio, // mapper bio vers description
        languages: updatedProfile.languages,
        profileImage: updatedProfile.profileImage,
        type: updatedProfile.type,
        price: updatedProfile.consultationFee, // ✅ SYNC: Ajouter le tarif des consultations
        signatureUrl: updatedProfile.signatureUrl,
        stampUrl: updatedProfile.stampUrl,
        useElectronicSignature: updatedProfile.useElectronicSignature,
      });

      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        navigate("/professional/dashboard");
      }, 2000);
    } catch (error) {
      console.error("Erreur lors de la sauvegarde:", error);
      setErrorMessage("Erreur lors de la sauvegarde du profil");
      throw error;
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <LoadingSpinner size="lg" />
            <p className="mt-4 text-lg text-gray-600">
              Chargement du profil...
            </p>
            <div className="mt-4 flex items-center justify-center">
              {connectionStatus.isOnline ? (
                <div className="flex items-center text-green-600">
                  <Wifi className="h-4 w-4 mr-1" />
                  <span className="text-sm">En ligne</span>
                </div>
              ) : (
                <div className="flex items-center text-red-600">
                  <WifiOff className="h-4 w-4 mr-1" />
                  <span className="text-sm">Hors ligne</span>
                </div>
              )}
            </div>
            <div className="mt-4">
              <button
                onClick={handleReconnect}
                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
              >
                Forcer la reconnexion
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Paramètres du profil
              </h1>
              <p className="text-gray-600 mt-2">
                Gérez vos informations professionnelles et votre disponibilité
              </p>
            </div>

            <div className="flex items-center gap-4">
              {isLocalEnvironment && (
                <div className="flex items-center px-3 py-1 rounded-full text-sm bg-yellow-100 text-yellow-800">
                  <Globe className="h-4 w-4 mr-1" />
                  Mode développement
                </div>
              )}

              <div
                className={`flex items-center px-3 py-1 rounded-full text-sm ${
                  connectionStatus.isOnline && connectionStatus.isInitialized
                    ? "bg-green-100 text-green-800"
                    : "bg-red-100 text-red-800"
                }`}
              >
                {connectionStatus.isOnline && connectionStatus.isInitialized ? (
                  <Wifi className="h-4 w-4 mr-1" />
                ) : (
                  <WifiOff className="h-4 w-4 mr-1" />
                )}
                {connectionStatus.isOnline && connectionStatus.isInitialized
                  ? "Connecté"
                  : "Hors ligne"}
              </div>
            </div>
          </div>
        </div>

        {/* Messages d'erreur et de succès */}
        {errorMessage && (
          <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-xl flex items-center justify-between">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 mr-2" />
              <span>{errorMessage}</span>
            </div>
            <button
              onClick={() => setErrorMessage("")}
              className="text-red-500 hover:text-red-700"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        )}

        {saveSuccess && (
          <div className="mb-6 p-4 bg-green-100 border border-green-400 text-green-700 rounded-xl flex items-center justify-between">
            <div className="flex items-center">
              <CheckCircle className="h-5 w-5 mr-2" />
              <span>Profil sauvegardé avec succès !</span>
            </div>
            <button
              onClick={() => setSaveSuccess(false)}
              className="text-green-500 hover:text-green-700"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        )}

        {/* Contenu principal */}
        <div className="space-y-8">
          {/* Statut du profil */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  Statut du profil
                </h2>
                <p className="text-gray-600 mt-1">
                  {profileData.isApproved
                    ? "Votre profil est approuvé et visible par les patients"
                    : "Votre profil est en attente d'approbation"}
                </p>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-3 h-3 rounded-full ${
                      profileData.isApproved ? "bg-green-500" : "bg-yellow-500"
                    }`}
                  ></div>
                  <span className="text-sm text-gray-600">
                    {profileData.isApproved ? "Approuvé" : "En attente"}
                  </span>
                </div>

                <button
                  onClick={async () => {
                    if (profileData.isApproved) {
                      try {
                        await updateProfessionalProfile(currentUser.id, {
                          isActive: !profileData.isActive,
                        });
                        setProfileData((prev) => ({
                          ...prev,
                          isActive: !prev.isActive,
                        }));
                      } catch (error) {
                        console.error(
                          "Erreur lors de la mise à jour du statut:",
                          error
                        );
                        setErrorMessage(
                          "Erreur lors de la mise à jour du statut"
                        );
                      }
                    }
                  }}
                  disabled={!profileData.isApproved}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    profileData.isActive
                      ? "bg-green-100 text-green-700 hover:bg-green-200 border border-green-300"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300"
                  } ${
                    !profileData.isApproved
                      ? "opacity-50 cursor-not-allowed"
                      : "cursor-pointer"
                  }`}
                >
                  {profileData.isActive ? "Profil actif" : "Activer mon profil"}
                </button>
              </div>
            </div>
          </div>

          {/* Formulaire de profil stable */}
          <StableProfileForm
            profile={profileData}
            onSave={handleSaveProfile}
            isSaving={isSaving}
          />
        </div>
      </div>
    </div>
  );
};

export default StableProfessionalSettings;
