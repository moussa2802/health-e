import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import {
  Save,
  CheckCircle,
  Camera,
  AlertCircle,
  Wifi,
  WifiOff,
  Globe,
  X,
  User,
  Mail,
  GraduationCap,
  Languages,
  Award,
  FileText,
  CreditCard,
  Settings,
  Info,
  Edit3,
  Shield,
  ChevronRight,
} from "lucide-react";
import {
  getProfessionalProfile,
  updateProfessionalProfile,
  uploadAndSaveProfileImage,
  validateProfessionalProfile,
  subscribeToProfessionalProfile,
  generateTimeSlots,
  createDefaultProfessionalProfile,
  uploadAndSaveSignatureImage,
  type ProfessionalProfile as ProfessionalProfileType,
} from "../../services/profileService";
import {
  getFirestoreConnectionStatus,
  forceFirestoreOnline,
  resetFirestoreConnection,
  ensureFirestoreReady,
  getFirestoreInstance,
} from "../../utils/firebase";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import { getDoc, doc } from "firebase/firestore";

interface TimeSlot {
  day: string;
  startTime: string;
  endTime: string;
}

interface ConsultationDuration {
  duration: number;
  price: number;
}

// Modern Input Component
const ModernInput: React.FC<{
  label: string;
  value: string;
  onChange: (value: string) => void;
  icon: React.ComponentType<{ className?: string }>;
  placeholder?: string;
  type?: string;
  required?: boolean;
  error?: string;
}> = ({
  label,
  value,
  onChange,
  icon: Icon,
  placeholder,
  type = "text",
  required = false,
  error,
}) => {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700 flex items-center gap-2">
        <Icon className="h-4 w-4 text-gray-500" />
        {label}
        {required && <span className="text-red-500">*</span>}
      </label>
      <div className="relative">
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`w-full px-4 py-3 pl-12 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 ${
            error ? "border-red-300 bg-red-50" : "border-gray-300 bg-white"
          }`}
        />
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Icon className="h-5 w-5 text-gray-400" />
        </div>
      </div>
      {error && (
        <p className="text-sm text-red-600 flex items-center gap-1">
          <AlertCircle className="h-4 w-4" />
          {error}
        </p>
      )}
    </div>
  );
};

// Modern Select Component
const ModernSelect: React.FC<{
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  icon: React.ComponentType<{ className?: string }>;
  required?: boolean;
  error?: string;
}> = ({
  label,
  value,
  onChange,
  options,
  icon: Icon,
  required = false,
  error,
}) => {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700 flex items-center gap-2">
        <Icon className="h-4 w-4 text-gray-500" />
        {label}
        {required && <span className="text-red-500">*</span>}
      </label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full px-4 py-3 pl-12 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 appearance-none ${
            error ? "border-red-300 bg-red-50" : "border-gray-300 bg-white"
          }`}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Icon className="h-5 w-5 text-gray-400" />
        </div>
        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
          <ChevronRight className="h-4 w-4 text-gray-400" />
        </div>
      </div>
      {error && (
        <p className="text-sm text-red-600 flex items-center gap-1">
          <AlertCircle className="h-4 w-4" />
          {error}
        </p>
      )}
    </div>
  );
};

// Tag Component
const Tag: React.FC<{
  label: string;
  onRemove?: () => void;
  color?: "blue" | "green" | "purple" | "orange" | "red";
}> = ({ label, onRemove, color = "blue" }) => {
  const colorClasses = {
    blue: "bg-blue-100 text-blue-700 border-blue-200",
    green: "bg-green-100 text-green-700 border-green-200",
    purple: "bg-purple-100 text-purple-700 border-purple-200",
    orange: "bg-orange-100 text-orange-700 border-orange-200",
    red: "bg-red-100 text-red-700 border-red-200",
  };

  return (
    <span
      className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium border ${colorClasses[color]}`}
    >
      {label}
      {onRemove && (
        <button
          onClick={onRemove}
          className="hover:bg-black/10 rounded-full p-0.5 transition-colors"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </span>
  );
};

// Profile Image Component
const ProfileImage: React.FC<{
  imageUrl?: string;
  onImageClick: () => void;
  isUploading: boolean;
  uploadProgress: number;
}> = ({ imageUrl, onImageClick, isUploading, uploadProgress }) => {
  return (
    <div className="relative group">
      <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-white shadow-lg bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt="Photo de profil"
            className="w-full h-full object-cover"
          />
        ) : (
          <User className="h-16 w-16 text-gray-400" />
        )}

        {/* Upload overlay */}
        {isUploading && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-full">
            <div className="text-center text-white">
              <LoadingSpinner size="sm" color="gray" />
              <p className="text-xs mt-1">{uploadProgress}%</p>
            </div>
          </div>
        )}

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center rounded-full cursor-pointer">
          <Camera className="h-8 w-8 text-white" />
        </div>
      </div>

      <button
        onClick={onImageClick}
        className="absolute -bottom-2 -right-2 bg-blue-600 text-white p-2 rounded-full shadow-lg hover:bg-blue-700 transition-colors"
      >
        <Edit3 className="h-4 w-4" />
      </button>
    </div>
  );
};

// Signature Section Component
const SignatureSection: React.FC<{
  signatureUrl?: string;
  stampUrl?: string;
  onSignatureClick: () => void;
  onStampClick: () => void;
  isUploadingSignature: boolean;
  isUploadingStamp: boolean;
}> = ({
  signatureUrl,
  stampUrl,
  onSignatureClick,
  onStampClick,
  isUploadingSignature,
  isUploadingStamp,
}) => {
  return (
    <div className="bg-white rounded-2xl shadow-lg p-6">
      <div className="flex items-center gap-2 mb-4">
        <FileText className="h-5 w-5 text-blue-600" />
        <h3 className="text-lg font-semibold text-gray-900">
          Signature & Cachet
        </h3>
        <div
          className="flex items-center gap-1 text-gray-500"
          title="Ces éléments seront utilisés pour signer électroniquement vos prescriptions"
        >
          <Info className="h-4 w-4" />
          <span className="text-xs">Électronique</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Signature */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-700">
            Signature
          </label>
          <div
            className="border-2 border-dashed border-gray-300 rounded-xl p-4 hover:border-blue-400 transition-colors cursor-pointer"
            onClick={onSignatureClick}
          >
            {signatureUrl ? (
              <div className="relative">
                <img
                  src={signatureUrl}
                  alt="Signature"
                  className="w-full h-20 object-contain"
                />
                {isUploadingSignature && (
                  <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                    <LoadingSpinner size="sm" />
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <FileText className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-500">
                  Cliquez pour ajouter votre signature
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Stamp */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-700">
            Cachet
          </label>
          <div
            className="border-2 border-dashed border-gray-300 rounded-xl p-4 hover:border-blue-400 transition-colors cursor-pointer"
            onClick={onStampClick}
          >
            {stampUrl ? (
              <div className="relative">
                <img
                  src={stampUrl}
                  alt="Cachet"
                  className="w-full h-20 object-contain"
                />
                {isUploadingStamp && (
                  <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                    <LoadingSpinner size="sm" />
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <Shield className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-500">
                  Cliquez pour ajouter votre cachet
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const ProfessionalSettings: React.FC = () => {
  console.log("🔍 ProfessionalSettings component rendering");

  const navigate = useNavigate();
  const { currentUser, refreshUser } = useAuth();
  console.log("🔍 currentUser:", currentUser);

  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isUploadingSignature, setIsUploadingSignature] = useState(false);
  const [isUploadingStamp, setIsUploadingStamp] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [connectionStatus, setConnectionStatus] = useState(
    getFirestoreConnectionStatus()
  );
  const [isLocalEnvironment, setIsLocalEnvironment] = useState(false);
  const [loadingStep, setLoadingStep] = useState("initializing");
  const [retryCount, setRetryCount] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const signatureInputRef = useRef<HTMLInputElement>(null);
  const stampInputRef = useRef<HTMLInputElement>(null);
  const isMountedRef = useRef(true);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const [profileData, setProfileData] = useState<
    Partial<ProfessionalProfileType>
  >({
    name: "",
    email: "",
    specialty: "",
    type: "mental",
    description: "",
    experience: "",
    education: [] as string[],
    price: null,
    currency: "XOF",
    languages: [],
    profileImage: "",
    signatureUrl: "",
    stampUrl: "",
    useElectronicSignature: false,
    isActive: false,
    isApproved: false,
    offersFreeConsultations: false,
    freeConsultationDuration: 30,
    freeConsultationsPerWeek: 5,
  });

  const [selectedLanguage, setSelectedLanguage] = useState("");
  const [newEducation, setNewEducation] = useState("");

  const availableLanguages = [
    { code: "fr", name: "Français" },
    { code: "en", name: "Anglais" },
    { code: "ar", name: "Arabe" },
    { code: "wo", name: "Wolof" },
    { code: "ff", name: "Peul" },
    { code: "sr", name: "Sérère" },
    { code: "mn", name: "Mandinka" },
    { code: "dy", name: "Diola" },
  ];

  const [consultationDurations, setConsultationDurations] = useState<
    ConsultationDuration[]
  >([]);
  const [showDurationModal, setShowDurationModal] = useState(false);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);

  const specialties = {
    mental: ["Psychologue", "Psychiatre", "Thérapeute", "Counselor"],
    sexual: ["Sexologue", "Gynécologue", "Urologue"],
  };

  const timeOptions = Array.from({ length: 24 }, (_, i) => {
    const hour = i.toString().padStart(2, "0");
    return [`${hour}:00`, `${hour}:30`];
  }).flat();

  useEffect(() => {
    console.log("🔍 Environment detection effect running");
    const isLocal =
      typeof window !== "undefined" &&
      (window.location.hostname === "localhost" ||
        window.location.hostname.includes("webcontainer") ||
        window.location.hostname.includes("health-e.sn"));
    setIsLocalEnvironment(isLocal);
    console.log("🔍 isLocalEnvironment set to:", isLocal);

    return () => {
      console.log("🔍 Environment detection effect cleanup");
      isMountedRef.current = false;
    };
  }, []);

  const updateConnectionStatus = () => {
    setConnectionStatus(getFirestoreConnectionStatus());
  };

  useEffect(() => {
    const interval = setInterval(updateConnectionStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const convertAvailabilityToTimeSlots = (
    availability: TimeSlot[]
  ): TimeSlot[] => {
    return availability.map((slot) => ({
      day: slot.day,
      startTime: slot.startTime,
      endTime: slot.endTime,
    }));
  };

  const loadProfile = async () => {
    if (!currentUser) {
      console.log("❌ No current user, cannot load profile");
      setLoading(false);
      return;
    }

    try {
      setLoadingStep("loading_profile");
      console.log("🔍 Loading profile for user:", currentUser.id);

      const profile = await getProfessionalProfile(currentUser.id);
      console.log("✅ Profile loaded:", profile);

      if (profile) {
        setProfileData({
          ...profile,
          education: profile.education || [],
        });
      } else {
        console.log("⚠️ No profile found, creating default");
        const defaultProfile = createDefaultProfessionalProfile(currentUser.id);
        setProfileData({
          ...defaultProfile,
          education: defaultProfile.education || [],
        });
      }

      setLoadingStep("setting_up_subscription");
      const unsubscribe = subscribeToProfessionalProfile(
        currentUser.id,
        (updatedProfile) => {
          if (isMountedRef.current && updatedProfile) {
            console.log("🔄 Profile updated:", updatedProfile);
            setProfileData({
              ...updatedProfile,
              education: updatedProfile.education || [],
            });
          }
        }
      );

      unsubscribeRef.current = unsubscribe;
      setLoadingStep("complete");
    } catch (error) {
      console.error("❌ Error loading profile:", error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Erreur lors du chargement du profil"
      );
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    if (currentUser) {
      loadProfile();
    }
  }, [currentUser]);

  const handleReconnect = async () => {
    console.log("🔍 handleReconnect called");
    setIsReconnecting(true);
    setErrorMessage("");

    try {
      console.log("🔄 Attempting to reconnect to Firestore...");

      await resetFirestoreConnection(); // ✅ FIXED: Reset connection first
      await ensureFirestoreReady();
      await forceFirestoreOnline();

      setConnectionStatus(getFirestoreConnectionStatus());

      // ✅ FIXED: Trigger a retry by incrementing retryCount
      setRetryCount((prev) => prev + 1);

      console.log("✅ Reconnection successful");
    } catch (error) {
      console.error("❌ Error reconnecting:", error);

      if (isLocalEnvironment) {
        setErrorMessage(
          "Reconnexion impossible en environnement local. Déployez l'application pour tester la connectivité Firestore."
        );
      } else {
        setErrorMessage(
          "Impossible de se reconnecter. Vérifiez votre connexion internet et réessayez dans quelques instants."
        );
      }
    } finally {
      if (isMountedRef.current) {
        setIsReconnecting(false);
      }
    }
  };

  const handleResetCache = async () => {
    console.log("🔍 handleResetCache called");
    setIsResettingCache(true);
    setErrorMessage("");

    try {
      console.log("🔄 Resetting Firestore cache...");

      await resetFirestoreConnection();
      await ensureFirestoreReady();

      setConnectionStatus(getFirestoreConnectionStatus());

      // ✅ FIXED: Trigger a retry by incrementing retryCount
      setRetryCount((prev) => prev + 1);

      console.log("✅ Cache reset successful");
    } catch (error) {
      console.error("❌ Error resetting cache:", error);
      setErrorMessage(
        "Erreur lors de la réinitialisation du cache. Veuillez rafraîchir la page manuellement."
      );
    } finally {
      if (isMountedRef.current) {
        setIsResettingCache(false);
      }
    }
  };

  const handleImageClick = () => {
    fileInputRef.current?.click();
  };

  const handleSignatureClick = () => {
    signatureInputRef.current?.click();
  };

  const handleStampClick = () => {
    stampInputRef.current?.click();
  };

  const handleImageChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIsUploadingImage(true);
      setUploadProgress(0);

      const imageUrl = await uploadAndSaveProfileImage(
        file,
        currentUser!.id,
        (progress) => {
          if (isMountedRef.current) {
            setUploadProgress(progress);
          }
        }
      );

      if (isMountedRef.current) {
        setProfileData((prev) => ({
          ...prev,
          profileImage: imageUrl,
        }));
        setUploadProgress(100);
      }
    } catch (error) {
      console.error("❌ Error uploading image:", error);
      if (isMountedRef.current) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Erreur lors du téléchargement de l'image"
        );
      }
    } finally {
      if (isMountedRef.current) {
        setIsUploadingImage(false);
      }
    }
  };

  const handleSignatureChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIsUploadingSignature(true);

      const signatureUrl = await uploadAndSaveSignatureImage(
        file,
        currentUser!.id
      );

      if (isMountedRef.current) {
        setProfileData((prev) => ({
          ...prev,
          signatureUrl,
        }));
      }
    } catch (error) {
      console.error("❌ Error uploading signature:", error);
      if (isMountedRef.current) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Erreur lors du téléchargement de la signature"
        );
      }
    } finally {
      if (isMountedRef.current) {
        setIsUploadingSignature(false);
      }
    }
  };

  const handleStampChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIsUploadingStamp(true);

      const stampUrl = await uploadAndSaveSignatureImage(file, currentUser!.id);

      if (isMountedRef.current) {
        setProfileData((prev) => ({
          ...prev,
          stampUrl,
        }));
      }
    } catch (error) {
      console.error("❌ Error uploading stamp:", error);
      if (isMountedRef.current) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Erreur lors du téléchargement du cachet"
        );
      }
    } finally {
      if (isMountedRef.current) {
        setIsUploadingStamp(false);
      }
    }
  };

  const handleAddTimeSlot = () => {
    setTimeSlots([
      ...timeSlots,
      { day: "Lundi", startTime: "09:00", endTime: "17:00" },
    ]);
  };

  const handleRemoveTimeSlot = (index: number) => {
    setTimeSlots(timeSlots.filter((_, i) => i !== index));
  };

  const handleTimeSlotChange = (
    index: number,
    field: keyof TimeSlot,
    value: string
  ) => {
    setTimeSlots(
      timeSlots.map((slot, i) =>
        i === index ? { ...slot, [field]: value } : slot
      )
    );
  };

  const handleAddEducation = () => {
    if (newEducation.trim()) {
      setProfileData((prev) => ({
        ...prev,
        education: [...(prev.education || []), newEducation.trim()],
      }));
      setNewEducation("");
    }
  };

  const handleAddLanguage = () => {
    if (
      selectedLanguage &&
      !profileData.languages?.includes(selectedLanguage)
    ) {
      setProfileData((prev) => ({
        ...prev,
        languages: [...(prev.languages || []), selectedLanguage],
      }));
      setSelectedLanguage("");
    }
  };

  const handleRemoveLanguage = (language: string) => {
    setProfileData((prev) => ({
      ...prev,
      languages: prev.languages?.filter((lang) => lang !== language) || [],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      setErrorMessage("Utilisateur non connecté");
      return;
    }

    try {
      setIsSaving(true);
      setErrorMessage("");

      console.log("💾 Saving profile data:", profileData);

      const updatedProfile = await updateProfessionalProfile(
        currentUser.id,
        profileData
      );

      console.log("✅ Profile saved successfully:", updatedProfile);

      if (isMountedRef.current) {
        setSaveSuccess(true);
        
        // Redirection vers le tableau de bord après 2 secondes
        setTimeout(() => {
          if (isMountedRef.current) {
            setSaveSuccess(false);
            navigate("/professional/dashboard");
          }
        }, 2000);
      }
    } catch (error) {
      console.error("❌ Error saving profile:", error);
      if (error instanceof Error && error.message.includes("permission")) {
        setErrorMessage(
          "Accès refusé. Veuillez vous reconnecter à votre compte."
        );
      } else {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Erreur lors de la sauvegarde. Veuillez réessayer."
        );
      }
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      if (isMountedRef.current) {
        setIsSaving(false);
      }
    }
  };

  console.log(
    "🔍 Render state - loading:",
    loading,
    "loadingStep:",
    loadingStep,
    "currentUser:",
    !!currentUser
  );

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <LoadingSpinner size="lg" />
            <p className="mt-4 text-lg text-gray-600">
              Chargement du profil... ({loadingStep})
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
                  <>
                    <Wifi className="h-4 w-4 mr-1" />
                    Connecté
                  </>
                ) : (
                  <>
                    <WifiOff className="h-4 w-4 mr-1" />
                    Hors ligne
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Error Message */}
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

        {/* Success Message */}
        {saveSuccess && (
          <div className="mb-6 p-4 bg-green-100 border border-green-400 text-green-700 rounded-xl flex items-center justify-between">
            <div className="flex items-center">
              <CheckCircle className="h-5 w-5 mr-2" />
              <span>Profil sauvegardé avec succès ! Redirection vers le tableau de bord...</span>
            </div>
            <button
              onClick={() => setSaveSuccess(false)}
              className="text-green-500 hover:text-green-700"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        )}

        {/* Main Content - Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Personal Information */}
          <div className="lg:col-span-2 space-y-6">
            {/* Profile Status Section */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <div className="flex items-center gap-2 mb-4">
                <Settings className="h-6 w-6 text-blue-600" />
                <h2 className="text-xl font-semibold text-gray-900">
                  Statut du profil
                </h2>
              </div>

              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm text-gray-600 mb-2">
                    Ce bouton permet de rendre votre profil visible pour les
                    patients.
                  </p>
                  {!profileData.isApproved && (
                    <p className="text-sm text-red-600">
                      ⚠️ Votre profil est en attente de validation par un
                      administrateur. Vous ne pouvez pas l'activer pour le
                      moment.
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="isActive"
                    className={`inline-flex items-center px-4 py-2 rounded-xl font-medium text-sm shadow-sm transition-colors duration-150 ${
                      profileData.isApproved
                        ? profileData.isActive
                          ? "bg-green-600 text-white hover:bg-green-700"
                          : "bg-gray-300 text-gray-800 hover:bg-gray-400"
                        : "bg-gray-200 text-gray-500 cursor-not-allowed"
                    }`}
                  >
                    <input
                      type="checkbox"
                      id="isActive"
                      checked={profileData.isActive || false}
                      disabled={!profileData.isApproved}
                      onChange={(e) => {
                        if (profileData.isApproved) {
                          setProfileData((prev) => ({
                            ...prev,
                            isActive: e.target.checked,
                          }));
                        }
                      }}
                      className="sr-only"
                    />
                    {profileData.isActive
                      ? "Profil actif"
                      : "Activer mon profil"}
                  </label>
                </div>
              </div>
            </div>

            {/* Personal Information Section */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <div className="flex items-center gap-2 mb-6">
                <User className="h-6 w-6 text-blue-600" />
                <h2 className="text-xl font-semibold text-gray-900">
                  Informations personnelles
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <ModernInput
                  label="Nom complet"
                  value={profileData.name || ""}
                  onChange={(value) =>
                    setProfileData({ ...profileData, name: value })
                  }
                  icon={User}
                  placeholder="Votre nom complet"
                  required
                />

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 flex items-center gap-2">
                    <Mail className="h-4 w-4 text-gray-500" />
                    Email *
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      value={profileData.email || ""}
                      disabled
                      className="w-full px-4 py-3 pl-12 border border-gray-300 bg-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                    />
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail className="h-5 w-5 text-gray-400" />
                    </div>
                  </div>
                  <p className="text-sm text-gray-500">
                    L'adresse email ne peut pas être modifiée pour des raisons
                    de sécurité.
                  </p>
                </div>
              </div>
            </div>

            {/* Service Type Section */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <div className="flex items-center gap-2 mb-6">
                <Award className="h-6 w-6 text-blue-600" />
                <h2 className="text-xl font-semibold text-gray-900">
                  Type de service
                </h2>
              </div>

              <div className="space-y-4">
                <div className="flex space-x-4">
                  <label className="inline-flex items-center">
                    <input
                      type="radio"
                      className="form-radio h-5 w-5 text-blue-600"
                      name="serviceType"
                      value="mental"
                      checked={profileData.type === "mental"}
                      onChange={(e) =>
                        setProfileData((prev) => ({
                          ...prev,
                          type: e.target.value as "mental" | "sexual",
                        }))
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
                      checked={profileData.type === "sexual"}
                      onChange={(e) =>
                        setProfileData((prev) => ({
                          ...prev,
                          type: e.target.value as "mental" | "sexual",
                        }))
                      }
                    />
                    <span className="ml-2 text-gray-700">Santé sexuelle</span>
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Spécialité *
                  </label>
                  <select
                    value={profileData.specialty || ""}
                    onChange={(e) =>
                      setProfileData((prev) => ({
                        ...prev,
                        specialty: e.target.value,
                      }))
                    }
                    className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                    required
                  >
                    <option value="">Sélectionnez une spécialité</option>
                    {profileData.type === "mental" && (
                      <>
                        <option value="psychologue">Psychologue</option>
                        <option value="psychiatre">Psychiatre</option>
                      </>
                    )}
                    {profileData.type === "sexual" && (
                      <>
                        <option value="gynecologue">Gynécologue</option>
                        <option value="urologue">Urologue</option>
                        <option value="sexologue">Sexologue</option>
                      </>
                    )}
                  </select>
                </div>
              </div>
            </div>

            {/* Professional Information Section */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <div className="flex items-center gap-2 mb-6">
                <GraduationCap className="h-6 w-6 text-blue-600" />
                <h2 className="text-xl font-semibold text-gray-900">
                  Informations professionnelles
                </h2>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Formation et diplômes
                  </label>
                  <textarea
                    value={profileData.education || ""}
                    onChange={(e) =>
                      setProfileData((prev) => ({
                        ...prev,
                        education: e.target.value,
                      }))
                    }
                    rows={4}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                    placeholder="Décrivez votre formation, diplômes et certifications..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description professionnelle *
                  </label>
                  <textarea
                    value={profileData.description || ""}
                    onChange={(e) =>
                      setProfileData((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                    rows={4}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                    placeholder="Décrivez votre pratique, votre approche et vos domaines d'expertise..."
                    required
                  />
                  <p className="mt-1 text-sm text-gray-500">
                    Décrivez votre pratique, votre approche et vos domaines
                    d'expertise.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Expérience professionnelle
                  </label>
                  <textarea
                    value={profileData.experience || ""}
                    onChange={(e) =>
                      setProfileData((prev) => ({
                        ...prev,
                        experience: e.target.value,
                      }))
                    }
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                    placeholder="Décrivez votre expérience professionnelle..."
                  />
                </div>
              </div>
            </div>

            {/* Languages Section */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <div className="flex items-center gap-2 mb-6">
                <Languages className="h-6 w-6 text-blue-600" />
                <h2 className="text-xl font-semibold text-gray-900">
                  Langues parlées
                </h2>
              </div>

              <div className="space-y-4">
                <div className="flex gap-2">
                  <ModernSelect
                    label="Ajouter une langue"
                    value=""
                    onChange={(value) => {
                      if (value && !profileData.languages?.includes(value)) {
                        setProfileData({
                          ...profileData,
                          languages: [...(profileData.languages || []), value],
                        });
                      }
                    }}
                    options={availableLanguages.map((lang) => ({
                      value: lang.code,
                      label: lang.name,
                    }))}
                    icon={Languages}
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  {profileData.languages?.map((language) => (
                    <Tag
                      key={language}
                      label={
                        availableLanguages.find((l) => l.code === language)
                          ?.name || language
                      }
                      onRemove={() => handleRemoveLanguage(language)}
                      color="blue"
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Pricing Section */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <div className="flex items-center gap-2 mb-6">
                <CreditCard className="h-6 w-6 text-blue-600" />
                <h2 className="text-xl font-semibold text-gray-900">
                  Tarification
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <ModernInput
                  label="Prix par consultation (FCFA)"
                  value={profileData.price?.toString() || ""}
                  onChange={(value) =>
                    setProfileData({ ...profileData, price: Number(value) })
                  }
                  icon={CreditCard}
                  type="number"
                  placeholder="5000"
                  required
                />

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Devise
                  </label>
                  <select
                    value={profileData.currency || "XOF"}
                    onChange={(e) =>
                      setProfileData((prev) => ({
                        ...prev,
                        currency: e.target.value,
                      }))
                    }
                    className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                  >
                    <option value="XOF">XOF</option>
                    <option value="EUR">EUR</option>
                    <option value="USD">USD</option>
                  </select>
                </div>
              </div>

              <div className="mt-6">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="offersFreeConsultations"
                    checked={profileData.offersFreeConsultations || false}
                    onChange={(e) =>
                      setProfileData((prev) => ({
                        ...prev,
                        offersFreeConsultations: e.target.checked,
                      }))
                    }
                    className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label
                    htmlFor="offersFreeConsultations"
                    className="ml-3 block text-sm text-gray-700"
                  >
                    Proposer des consultations gratuites
                  </label>
                </div>

                {profileData.offersFreeConsultations && (
                  <div className="mt-4 pl-8 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Durée des consultations gratuites (minutes)
                        </label>
                        <input
                          type="number"
                          value={profileData.freeConsultationDuration || 30}
                          onChange={(e) =>
                            setProfileData((prev) => ({
                              ...prev,
                              freeConsultationDuration: Number(e.target.value),
                            }))
                          }
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                          min="15"
                          max="60"
                          step="15"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Nombre de consultations gratuites par semaine
                        </label>
                        <input
                          type="number"
                          value={profileData.freeConsultationsPerWeek || 5}
                          onChange={(e) =>
                            setProfileData((prev) => ({
                              ...prev,
                              freeConsultationsPerWeek: Number(e.target.value),
                            }))
                          }
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                          min="1"
                          max="20"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column - Profile Image & Signature */}
          <div className="space-y-6">
            {/* Profile Image */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <div className="flex items-center gap-2 mb-6">
                <Camera className="h-6 w-6 text-blue-600" />
                <h2 className="text-xl font-semibold text-gray-900">
                  Photo de profil
                </h2>
              </div>

              <div className="flex justify-center">
                <ProfileImage
                  imageUrl={profileData.profileImage}
                  onImageClick={handleImageClick}
                  isUploading={isUploadingImage}
                  uploadProgress={uploadProgress}
                />
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
                disabled={isUploadingImage}
              />
            </div>

            {/* Signature Section */}
            <SignatureSection
              signatureUrl={profileData.signatureUrl}
              stampUrl={profileData.stampUrl}
              onSignatureClick={handleSignatureClick}
              onStampClick={handleStampClick}
              isUploadingSignature={isUploadingSignature}
              isUploadingStamp={isUploadingStamp}
            />

            <input
              ref={signatureInputRef}
              type="file"
              accept="image/*"
              onChange={handleSignatureChange}
              className="hidden"
              disabled={isUploadingSignature}
            />

            <input
              ref={stampInputRef}
              type="file"
              accept="image/*"
              onChange={handleStampChange}
              className="hidden"
              disabled={isUploadingStamp}
            />

            {/* Electronic Signature Toggle */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <div className="flex items-center gap-2 mb-4">
                <Settings className="h-6 w-6 text-blue-600" />
                <h3 className="text-lg font-semibold text-gray-900">
                  Signature électronique
                </h3>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="useElectronicSignature"
                  checked={profileData.useElectronicSignature || false}
                  onChange={(e) =>
                    setProfileData((prev) => ({
                      ...prev,
                      useElectronicSignature: e.target.checked,
                    }))
                  }
                  className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label
                  htmlFor="useElectronicSignature"
                  className="ml-3 block text-sm text-gray-700"
                >
                  Utiliser la signature électronique pour les ordonnances
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="mt-8 flex justify-center">
          <button
            onClick={handleSubmit}
            disabled={isSaving}
            className="px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-semibold text-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3"
          >
            {isSaving ? (
              <>
                <LoadingSpinner size="sm" color="white" />
                Sauvegarde en cours...
              </>
            ) : (
              <>
                <Save className="h-5 w-5" />
                Enregistrer et publier le profil
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProfessionalSettings;
