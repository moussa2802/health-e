import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import {
  Clock,
  Save,
  Plus,
  Trash2,
  CheckCircle,
  Camera,
  Upload,
  AlertCircle,
  RefreshCw,
  Wifi,
  WifiOff,
  Globe,
  X,
  Database,
  PenTool,
  User,
  Mail,
  Phone,
  MapPin,
  GraduationCap,
  Languages,
  Award,
  FileText,
  CreditCard,
  Calendar,
  Settings,
  Star,
  Info,
  Edit3,
  Shield,
  Check,
  ChevronRight,
} from "lucide-react";
import {
  getProfessionalProfile,
  updateProfessionalProfile,
  uploadAndSaveProfileImage,
  validateProfessionalProfile,
  getOrCreateProfessionalProfile,
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
  icon: React.ComponentType<any>;
  placeholder?: string;
  type?: string;
  required?: boolean;
  error?: string;
}> = ({ label, value, onChange, icon: Icon, placeholder, type = "text", required = false, error }) => {
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
  icon: React.ComponentType<any>;
  required?: boolean;
  error?: string;
}> = ({ label, value, onChange, options, icon: Icon, required = false, error }) => {
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
    <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium border ${colorClasses[color]}`}>
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
              <LoadingSpinner size="sm" color="white" />
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
}> = ({ signatureUrl, stampUrl, onSignatureClick, onStampClick, isUploadingSignature, isUploadingStamp }) => {
  return (
    <div className="bg-white rounded-2xl shadow-lg p-6">
      <div className="flex items-center gap-2 mb-4">
        <PenTool className="h-5 w-5 text-blue-600" />
        <h3 className="text-lg font-semibold text-gray-900">Signature & Cachet</h3>
        <div className="flex items-center gap-1 text-gray-500" title="Ces éléments seront utilisés pour signer électroniquement vos prescriptions">
          <Info className="h-4 w-4" />
          <span className="text-xs">Électronique</span>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Signature */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-700">Signature</label>
          <div className="border-2 border-dashed border-gray-300 rounded-xl p-4 hover:border-blue-400 transition-colors cursor-pointer" onClick={onSignatureClick}>
            {signatureUrl ? (
              <div className="relative">
                <img src={signatureUrl} alt="Signature" className="w-full h-20 object-contain" />
                {isUploadingSignature && (
                  <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                    <LoadingSpinner size="sm" />
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <PenTool className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-500">Cliquez pour ajouter votre signature</p>
              </div>
            )}
          </div>
        </div>
        
        {/* Stamp */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-700">Cachet</label>
          <div className="border-2 border-dashed border-gray-300 rounded-xl p-4 hover:border-blue-400 transition-colors cursor-pointer" onClick={onStampClick}>
            {stampUrl ? (
              <div className="relative">
                <img src={stampUrl} alt="Cachet" className="w-full h-20 object-contain" />
                {isUploadingStamp && (
                  <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                    <LoadingSpinner size="sm" />
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <Shield className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-500">Cliquez pour ajouter votre cachet</p>
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
  const [redirecting, setRedirecting] = useState(false);
  const [isUploadingSignature, setIsUploadingSignature] = useState(false);
  const [isUploadingStamp, setIsUploadingStamp] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [signatureUploadProgress, setSignatureUploadProgress] = useState(0);
  const [stampUploadProgress, setStampUploadProgress] = useState(0);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [isResettingCache, setIsResettingCache] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState(
    getFirestoreConnectionStatus()
  );
  const [isLocalEnvironment, setIsLocalEnvironment] = useState(false);
  const [uploadError, setUploadError] = useState("");
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
    languages: ["fr"],
    description: "",
    education: [],
    experience: "",
    profileImage: "",
    price: 100,
    currency: "XOF",
    offersFreeConsultations: false,
    freeConsultationDuration: 30,
    freeConsultationsPerWeek: 5,
    availability: [],
    isAvailableNow: false,
    isActive: true,
    rating: 4.5,
    reviews: 0,
    signatureUrl: "",
    stampUrl: "",
    useElectronicSignature: false,
  });

  const [consultationDurations, setConsultationDurations] = useState<
    ConsultationDuration[]
  >([
    { duration: 30, price: 100 },
    { duration: 45, price: 150 },
    { duration: 60, price: 200 },
  ]);
  const [newDuration, setNewDuration] = useState<ConsultationDuration>({
    duration: 30,
    price: 100,
  });
  const [showDurationModal, setShowDurationModal] = useState(false);
  const [newEducation, setNewEducation] = useState("");
  const [selectedLanguage, setSelectedLanguage] = useState("");

  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);

  const daysOfWeek = [
    "Lundi",
    "Mardi",
    "Mercredi",
    "Jeudi",
    "Vendredi",
    "Samedi",
  ];

  const specialties = {
    mental: ["Psychologue", "Psychiatre"],
    sexual: ["Sexologue", "Gynécologue", "Urologue"],
  };

  const availableLanguages = [
    { code: "fr", name: "Français 🇫🇷" },
    { code: "en", name: "Anglais 🇬🇧" },
    { code: "ar", name: "Arabe 🇸🇦" },
    { code: "wo", name: "Wolof 🗣️" },
    { code: "ff", name: "Pulaar" },
    { code: "sr", name: "Sérère" },
    { code: "mn", name: "Mandingue" },
    { code: "di", name: "Diola" },
  ];

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

  useEffect(() => {
    console.log("🔍 Connection status monitoring effect running");
    const updateConnectionStatus = () => {
      const status = getFirestoreConnectionStatus();
      console.log("🔍 Connection status updated:", status);
      setConnectionStatus(status);
    };

    const interval = setInterval(updateConnectionStatus, 5000);

    window.addEventListener("online", updateConnectionStatus);
    window.addEventListener("offline", updateConnectionStatus);

    return () => {
      console.log("🔍 Connection status monitoring effect cleanup");
      clearInterval(interval);
      window.removeEventListener("online", updateConnectionStatus);
      window.removeEventListener("offline", updateConnectionStatus);
    };
  }, []);

  // Convert availability to time slots for editing
  const convertAvailabilityToTimeSlots = (availability: any[]): TimeSlot[] => {
    console.log("🔄 Converting availability to time slots for editing...");
    console.log("📋 Input availability:", availability);

    if (!availability || !Array.isArray(availability)) {
      console.warn("⚠️ Availability is not an array, returning empty array");
      return [];
    }

    const timeSlots: TimeSlot[] = [];

    availability.forEach((avail) => {
      if (avail && avail.day && avail.startTime && avail.endTime) {
        timeSlots.push({
          day: avail.day,
          startTime: avail.startTime,
          endTime: avail.endTime,
        });
      }
    });

    console.log("✅ Converted time slots:", timeSlots);
    return timeSlots;
  };

  // ✅ FIXED: Added retry mechanism and better error handling
  useEffect(() => {
    console.log("🔍 Profile loading effect running, retry count:", retryCount);
    console.log("🔍 currentUser in profile loading effect:", currentUser);

    const loadProfile = async () => {
      // CRITICAL: Check if currentUser exists and has an ID
      if (!currentUser?.id) {
        console.log("⚠️ No currentUser.id available, skipping profile load");
        setLoading(false); // ✅ FIXED: Set loading to false when no user
        return;
      }

      try {
        setLoading(true);
        setErrorMessage("");
        setLoadingStep("starting");

        console.log(
          "🔄 Loading professional profile for user:",
          currentUser.id
        );

        setLoadingStep("ensuring_firestore_ready");
        await ensureFirestoreReady();
        console.log("✅ Firestore ready");

        setLoadingStep("getting_profile");
        // ✅ FIXED: Direct document access by userId
        const profile = await getProfessionalProfile(currentUser.id);

        if (!profile) {
          console.log("⚠️ No profile found, creating default profile");
          setLoadingStep("creating_profile");

          // Get user data
          const db = getFirestoreInstance();
          if (!db) throw new Error("Firestore not available");

          const userRef = doc(db, "users", currentUser.id);
          const userSnap = await getDoc(userRef);

          if (!userSnap.exists()) {
            throw new Error("Utilisateur non trouvé");
          }

          const userData = userSnap.data();

          // Create default profile
          const newProfile = await createDefaultProfessionalProfile(
            currentUser.id,
            userData.name || currentUser.name || "Professionnel",
            userData.email || currentUser.email || "",
            userData.serviceType || "mental"
          );

          if (isMountedRef.current) {
            setProfileData(newProfile);

            if (
              newProfile.availability &&
              Array.isArray(newProfile.availability)
            ) {
              const convertedTimeSlots = convertAvailabilityToTimeSlots(
                newProfile.availability
              );
              setTimeSlots(convertedTimeSlots);
            }
          }
        } else {
          console.log("✅ Profile found successfully:", profile);

          if (isMountedRef.current) {
            setProfileData(profile);
            console.log("✅ profileData:", profileData);

            if (profile.availability && Array.isArray(profile.availability)) {
              const convertedTimeSlots = convertAvailabilityToTimeSlots(
                profile.availability
              );
              setTimeSlots(convertedTimeSlots);
            }
          }
        }

        setLoadingStep("setting_up_subscription");
        // ✅ FIXED: Direct document subscription
        try {
          const unsubscribe = subscribeToProfessionalProfile(
            currentUser.id,
            (updatedProfile) => {
              if (updatedProfile && isMountedRef.current) {
                console.log("🔄 Profile updated from Firestore");
                setProfileData(updatedProfile);

                if (
                  updatedProfile.availability &&
                  Array.isArray(updatedProfile.availability)
                ) {
                  const convertedTimeSlots = convertAvailabilityToTimeSlots(
                    updatedProfile.availability
                  );
                  setTimeSlots(convertedTimeSlots);
                }
              }
            }
          );

          unsubscribeRef.current = unsubscribe;
          setLoadingStep("complete");

          if (isMountedRef.current) {
            setLoading(false);
          }
        } catch (e) {
          console.error("❌ Failed to subscribe to profile:", e);
          setErrorMessage(
            "Erreur lors de la souscription au profil. Veuillez réessayer."
          );
          setLoading(false);
        }
      } catch (error) {
        console.error("❌ Error loading profile:", error);
        setLoadingStep("error");

        if (error instanceof Error) {
          if (
            error.message.includes("Target ID already exists") ||
            error.message.includes("Firestore operation failed")
          ) {
            setErrorMessage(
              'Problème de cache Firestore détecté. Cliquez sur "Réinitialiser le cache" pour résoudre le problème.'
            );
          } else if (isLocalEnvironment) {
            setErrorMessage(
              "Mode développement détecté. Certaines fonctionnalités Firestore peuvent être limitées. Déployez l'application pour un test complet."
            );
          } else if (error.message.includes("connexion internet")) {
            setErrorMessage(
              'Problème de connexion à la base de données. Vérifiez votre connexion internet et cliquez sur "Reconnecter".'
            );
          } else if (error.message.includes("Accès refusé")) {
            setErrorMessage(
              "Accès refusé à vos données. Veuillez vous reconnecter à votre compte."
            );
          } else {
            setErrorMessage(
              'Erreur lors du chargement du profil. Cliquez sur "Reconnecter" pour réessayer.'
            );
          }
        } else {
          setErrorMessage("Erreur inconnue lors du chargement du profil.");
        }

        // ✅ FIXED: Set loading to false on error
        if (isMountedRef.current) {
          setLoading(false);
        }
      }
    };

    loadProfile();

    return () => {
      console.log("🔍 Profile loading effect cleanup");
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [currentUser, isLocalEnvironment, retryCount]); // ✅ FIXED: Added retryCount dependency

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
    if (!isUploadingImage) {
      fileInputRef.current?.click();
    }
  };

  const handleSignatureClick = () => {
    if (!isUploadingSignature) {
      signatureInputRef.current?.click();
    }
  };

  const handleStampClick = () => {
    if (!isUploadingStamp) {
      stampInputRef.current?.click();
    }
  };

  const handleImageChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file || !currentUser?.id) return;

    setErrorMessage("");
    setUploadError("");
    setUploadProgress(0);

    if (file.size > 5 * 1024 * 1024) {
      setUploadError("L'image ne doit pas dépasser 5MB");
      return;
    }

    if (!file.type.startsWith("image/")) {
      setUploadError("Veuillez sélectionner un fichier image valide");
      return;
    }

    setIsUploadingImage(true);

    try {
      console.log("📤 Starting complete image upload and save process...");

      await ensureFirestoreReady();
      const downloadURL = await uploadAndSaveProfileImage(
        file,
        currentUser.id,
        "professional",
        (progress) => {
          if (isMountedRef.current) {
            setUploadProgress(progress);
          }
          console.log(`📊 Upload progress: ${progress}%`);
        }
      );

      if (isMountedRef.current) {
        setProfileData((prev) => ({ ...prev, profileImage: downloadURL }));
      }

      if (isMountedRef.current) {
        setSaveSuccess(true);
        setTimeout(() => {
          if (isMountedRef.current) {
            setSaveSuccess(false);
          }
        }, 3000);
      }

      console.log("✅ Profile image upload and save completed successfully");
    } catch (error: any) {
      console.error("❌ Error uploading and saving image:", error);

      if (error.message.includes("Timeout")) {
        setUploadError(
          "L'opération a pris trop de temps. Vérifiez votre connexion internet et réessayez."
        );
      } else if (error.message.includes("Accès refusé")) {
        setUploadError("Accès refusé au stockage. Veuillez vous reconnecter.");
      } else if (error.message.includes("connexion internet")) {
        setUploadError(
          "Problème de connexion. Vérifiez votre connexion internet et réessayez."
        );
      } else if (isLocalEnvironment) {
        setUploadError(
          "Upload impossible en environnement local. Déployez l'application pour tester l'upload d'images."
        );
      } else {
        setUploadError(
          error.message ||
            "Erreur lors du téléchargement de l'image. Veuillez réessayer."
        );
      }
    } finally {
      if (isMountedRef.current) {
        setIsUploadingImage(false);
        setUploadProgress(0);
      }

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleSignatureChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file || !currentUser?.id) return;

    setErrorMessage("");
    setUploadError("");
    setSignatureUploadProgress(0);

    if (file.size > 2 * 1024 * 1024) {
      setUploadError("L'image de signature ne doit pas dépasser 2MB");
      return;
    }

    if (!file.type.startsWith("image/")) {
      setUploadError("Veuillez sélectionner un fichier image valide");
      return;
    }

    setIsUploadingSignature(true);

    try {
      console.log("📤 Starting signature image upload and save process...");

      await ensureFirestoreReady();
      const downloadURL = await uploadAndSaveSignatureImage(
        file,
        currentUser.id,
        "signature",
        (progress) => {
          if (isMountedRef.current) {
            setSignatureUploadProgress(progress);
          }
          console.log(`📊 Signature upload progress: ${progress}%`);
        }
      );

      if (isMountedRef.current) {
        setProfileData((prev) => ({ ...prev, signatureUrl: downloadURL }));
      }

      if (isMountedRef.current) {
        setSaveSuccess(true);
        setTimeout(() => {
          if (isMountedRef.current) {
            setSaveSuccess(false);
          }
        }, 3000);
      }

      console.log("✅ Signature image upload and save completed successfully");
    } catch (error: any) {
      console.error("❌ Error uploading and saving signature image:", error);

      if (error.message.includes("Timeout")) {
        setUploadError(
          "L'opération a pris trop de temps. Vérifiez votre connexion internet et réessayez."
        );
      } else if (error.message.includes("Accès refusé")) {
        setUploadError("Accès refusé au stockage. Veuillez vous reconnecter.");
      } else if (error.message.includes("connexion internet")) {
        setUploadError(
          "Problème de connexion. Vérifiez votre connexion internet et réessayez."
        );
      } else if (isLocalEnvironment) {
        setUploadError(
          "Upload impossible en environnement local. Déployez l'application pour tester l'upload d'images."
        );
      } else {
        setUploadError(
          error.message ||
            "Erreur lors du téléchargement de la signature. Veuillez réessayer."
        );
      }
    } finally {
      if (isMountedRef.current) {
        setIsUploadingSignature(false);
        setSignatureUploadProgress(0);
      }

      if (signatureInputRef.current) {
        signatureInputRef.current.value = "";
      }
    }
  };

  const handleStampChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file || !currentUser?.id) return;

    setErrorMessage("");
    setUploadError("");
    setStampUploadProgress(0);

    if (file.size > 2 * 1024 * 1024) {
      setUploadError("L'image du cachet ne doit pas dépasser 2MB");
      return;
    }

    if (!file.type.startsWith("image/")) {
      setUploadError("Veuillez sélectionner un fichier image valide");
      return;
    }

    setIsUploadingStamp(true);

    try {
      console.log("📤 Starting stamp image upload and save process...");

      await ensureFirestoreReady();
      const downloadURL = await uploadAndSaveSignatureImage(
        file,
        currentUser.id,
        "stamp",
        (progress) => {
          if (isMountedRef.current) {
            setStampUploadProgress(progress);
          }
          console.log(`📊 Stamp upload progress: ${progress}%`);
        }
      );

      if (isMountedRef.current) {
        setProfileData((prev) => ({ ...prev, stampUrl: downloadURL }));
      }

      if (isMountedRef.current) {
        setSaveSuccess(true);
        setTimeout(() => {
          if (isMountedRef.current) {
            setSaveSuccess(false);
          }
        }, 3000);
      }

      console.log("✅ Stamp image upload and save completed successfully");
    } catch (error: any) {
      console.error("❌ Error uploading and saving stamp image:", error);

      if (error.message.includes("Timeout")) {
        setUploadError(
          "L'opération a pris trop de temps. Vérifiez votre connexion internet et réessayez."
        );
      } else if (error.message.includes("Accès refusé")) {
        setUploadError("Accès refusé au stockage. Veuillez vous reconnecter.");
      } else if (error.message.includes("connexion internet")) {
        setUploadError(
          "Problème de connexion. Vérifiez votre connexion internet et réessayez."
        );
      } else if (isLocalEnvironment) {
        setUploadError(
          "Upload impossible en environnement local. Déployez l'application pour tester l'upload d'images."
        );
      } else {
        setUploadError(
          error.message ||
            "Erreur lors du téléchargement du cachet. Veuillez réessayer."
        );
      }
    } finally {
      if (isMountedRef.current) {
        setIsUploadingStamp(false);
        setStampUploadProgress(0);
      }

      if (stampInputRef.current) {
        stampInputRef.current.value = "";
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

    if (!currentUser?.id) return;

    setErrorMessage("");
    setSaveSuccess(false);

    await ensureFirestoreReady();

    // Convert time slots to availability format
    const formattedAvailability: any[] = [];

    // Group time slots by day
    const slotsByDay = timeSlots.reduce((acc, slot) => {
      if (!acc[slot.day]) {
        acc[slot.day] = [];
      }
      acc[slot.day].push(slot);
      return acc;
    }, {} as Record<string, TimeSlot[]>);

    // For each day, merge overlapping time slots
    Object.entries(slotsByDay).forEach(([day, slots]) => {
      // Sort slots by start time
      slots.sort((a, b) => a.startTime.localeCompare(b.startTime));

      // Merge overlapping slots
      let mergedSlots: TimeSlot[] = [];
      let currentSlot = slots[0];

      for (let i = 1; i < slots.length; i++) {
        const nextSlot = slots[i];

        // If slots overlap or are adjacent, merge them
        if (nextSlot.startTime <= currentSlot.endTime) {
          currentSlot.endTime =
            nextSlot.endTime > currentSlot.endTime
              ? nextSlot.endTime
              : currentSlot.endTime;
        } else {
          mergedSlots.push(currentSlot);
          currentSlot = nextSlot;
        }
      }

      mergedSlots.push(currentSlot);

      // Create availability slots for each merged slot
      mergedSlots.forEach((slot) => {
        formattedAvailability.push({
          day,
          startTime: slot.startTime,
          endTime: slot.endTime,
          slots: generateTimeSlots(slot.startTime, slot.endTime),
        });
      });
    });

    console.log(
      "💾 Saving professional profile with formatted availability..."
    );
    console.log(
      "📋 Formatted availability being saved:",
      formattedAvailability
    );

    const updatedProfileData = {
      ...profileData,
      availability: formattedAvailability,
    };

    const validationErrors = validateProfessionalProfile(updatedProfileData);
    if (validationErrors.length > 0) {
      setErrorMessage(
        `Veuillez corriger les erreurs suivantes: ${validationErrors.join(
          ", "
        )}`
      );
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    setIsSaving(true);

    try {
      console.log("💾 Saving professional profile...");
      console.log("📋 Profile data being saved:", {
        name: updatedProfileData.name,
        specialty: updatedProfileData.specialty,
        type: updatedProfileData.type,
        isActive: updatedProfileData.isActive,
        languages: updatedProfileData.languages,
        availabilityCount: updatedProfileData.availability?.length,
        availabilityDetails: updatedProfileData.availability,
      });

      // ✅ FIXED: Direct document update by userId
      await updateProfessionalProfile(currentUser.id, updatedProfileData);

      // ✅ Clear cache to ensure fresh data
      try {
        sessionStorage.removeItem(`professional_${currentUser.id}`);
        console.log("🗑️ Cache cleared for professional profile");
      } catch (cacheError) {
        console.warn("⚠️ Failed to clear cache:", cacheError);
      }

      // ✅ Refresh user data in AuthContext to update the name everywhere
      try {
        await refreshUser();
        console.log("🔄 User data refreshed in AuthContext");
      } catch (refreshError) {
        console.warn("⚠️ Failed to refresh user data:", refreshError);
      }

      if (isMountedRef.current) {
        setSaveSuccess(true);
        console.log("✅ Profile saved successfully");
        console.log(
          "🎉 Professional should now be visible in the professionals list with proper availability slots!"
        );

        // Redirect to dashboard after successful save
        setRedirecting(true);
        setTimeout(() => {
          if (isMountedRef.current) {
            navigate("/professional/dashboard");
          }
        }, 2000);
      }
    } catch (error: any) {
      console.error("❌ Error saving profile:", error);

      if (isLocalEnvironment) {
        setErrorMessage(
          "Sauvegarde impossible en environnement local. Les données seront sauvegardées lors du déploiement."
        );
      } else if (
        error.message &&
        error.message.includes("connexion internet")
      ) {
        setErrorMessage(
          "Problème de connexion. Vérifiez votre connexion internet et réessayez."
        );
      } else if (error.message && error.message.includes("Accès refusé")) {
        setErrorMessage(
          "Accès refusé. Veuillez vous reconnecter à votre compte."
        );
      } else {
        setErrorMessage(
          error.message || "Erreur lors de la sauvegarde. Veuillez réessayer."
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
              <h1 className="text-3xl font-bold text-gray-900">Paramètres du profil</h1>
              <p className="text-gray-600 mt-2">Gérez vos informations professionnelles et votre disponibilité</p>
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

        {/* Main Content - Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Personal Information */}
          <div className="lg:col-span-2 space-y-6">
            {/* Personal Information Section */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <div className="flex items-center gap-2 mb-6">
                <User className="h-6 w-6 text-blue-600" />
                <h2 className="text-xl font-semibold text-gray-900">Informations personnelles</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <ModernInput
                  label="Nom complet"
                  value={profileData.name || ""}
                  onChange={(value) => setProfileData({ ...profileData, name: value })}
                  icon={User}
                  placeholder="Votre nom complet"
                  required
                />
                
                <ModernInput
                  label="Email"
                  value={profileData.email || ""}
                  onChange={(value) => setProfileData({ ...profileData, email: value })}
                  icon={Mail}
                  type="email"
                  placeholder="votre@email.com"
                  required
                />
                
                <ModernInput
                  label="Téléphone"
                  value={profileData.phone || ""}
                  onChange={(value) => setProfileData({ ...profileData, phone: value })}
                  icon={Phone}
                  type="tel"
                  placeholder="Votre numéro de téléphone"
                />
                
                <ModernInput
                  label="Localisation"
                  value={profileData.location || ""}
                  onChange={(value) => setProfileData({ ...profileData, location: value })}
                  icon={MapPin}
                  placeholder="Votre ville ou région"
                />
              </div>
            </div>

            {/* Professional Information Section */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <div className="flex items-center gap-2 mb-6">
                <GraduationCap className="h-6 w-6 text-blue-600" />
                <h2 className="text-xl font-semibold text-gray-900">Informations professionnelles</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <ModernSelect
                  label="Spécialité"
                  value={profileData.specialty || ""}
                  onChange={(value) => setProfileData({ ...profileData, specialty: value })}
                  options={[
                    { value: "mental", label: "Santé mentale" },
                    { value: "sexual", label: "Santé sexuelle" },
                    { value: "general", label: "Médecine générale" },
                  ]}
                  icon={Award}
                  required
                />
                
                <ModernInput
                  label="Expérience"
                  value={profileData.experience || ""}
                  onChange={(value) => setProfileData({ ...profileData, experience: value })}
                  icon={Star}
                  placeholder="Nombre d'années d'expérience"
                />
                
                <ModernInput
                  label="Description"
                  value={profileData.description || ""}
                  onChange={(value) => setProfileData({ ...profileData, description: value })}
                  icon={FileText}
                  placeholder="Description de votre pratique"
                />
                
                <ModernInput
                  label="Éducation"
                  value={profileData.education || ""}
                  onChange={(value) => setProfileData({ ...profileData, education: value })}
                  icon={GraduationCap}
                  placeholder="Formation et diplômes"
                />
              </div>
            </div>

            {/* Languages Section */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <div className="flex items-center gap-2 mb-6">
                <Languages className="h-6 w-6 text-blue-600" />
                <h2 className="text-xl font-semibold text-gray-900">Langues parlées</h2>
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
                    options={availableLanguages.map(lang => ({ value: lang.code, label: lang.name }))}
                    icon={Languages}
                  />
                </div>
                
                <div className="flex flex-wrap gap-2">
                  {profileData.languages?.map((language) => (
                    <Tag
                      key={language}
                      label={availableLanguages.find((l) => l.code === language)?.name || language}
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
                <h2 className="text-xl font-semibold text-gray-900">Tarification</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <ModernInput
                  label="Prix par consultation (FCFA)"
                  value={profileData.price?.toString() || ""}
                  onChange={(value) => setProfileData({ ...profileData, price: Number(value) })}
                  icon={CreditCard}
                  type="number"
                  placeholder="5000"
                  required
                />
                
                <ModernInput
                  label="Durée par consultation (minutes)"
                  value={profileData.duration?.toString() || ""}
                  onChange={(value) => setProfileData({ ...profileData, duration: Number(value) })}
                  icon={Clock}
                  type="number"
                  placeholder="30"
                  required
                />
              </div>
            </div>

            {/* Availability Section */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <div className="flex items-center gap-2 mb-6">
                <Calendar className="h-6 w-6 text-blue-600" />
                <h2 className="text-xl font-semibold text-gray-900">Disponibilités</h2>
              </div>
              
              <div className="space-y-4">
                {profileData.availability?.map((slot, index) => (
                  <div key={index} className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
                    <ModernSelect
                      label="Jour"
                      value={slot.day}
                      onChange={(value) => handleTimeSlotChange(index, "day", value)}
                      options={[
                        { value: "lundi", label: "Lundi" },
                        { value: "mardi", label: "Mardi" },
                        { value: "mercredi", label: "Mercredi" },
                        { value: "jeudi", label: "Jeudi" },
                        { value: "vendredi", label: "Vendredi" },
                        { value: "samedi", label: "Samedi" },
                        { value: "dimanche", label: "Dimanche" },
                      ]}
                      icon={Calendar}
                    />
                    
                    <ModernInput
                      label="Début"
                      value={slot.startTime}
                      onChange={(value) => handleTimeSlotChange(index, "startTime", value)}
                      icon={Clock}
                      type="time"
                    />
                    
                    <ModernInput
                      label="Fin"
                      value={slot.endTime}
                      onChange={(value) => handleTimeSlotChange(index, "endTime", value)}
                      icon={Clock}
                      type="time"
                    />
                    
                    <button
                      onClick={() => handleRemoveTimeSlot(index)}
                      className="mt-6 p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                ))}
                
                <button
                  onClick={handleAddTimeSlot}
                  className="w-full p-4 border-2 border-dashed border-gray-300 rounded-xl hover:border-blue-400 hover:bg-blue-50 transition-colors flex items-center justify-center gap-2"
                >
                  <Plus className="h-5 w-5 text-gray-400" />
                  <span className="text-gray-600">Ajouter un créneau</span>
                </button>
              </div>
            </div>
          </div>

          {/* Right Column - Profile Image & Signature */}
          <div className="space-y-6">
            {/* Profile Image */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <div className="flex items-center gap-2 mb-6">
                <Camera className="h-6 w-6 text-blue-600" />
                <h2 className="text-xl font-semibold text-gray-900">Photo de profil</h2>
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
                <h3 className="text-lg font-semibold text-gray-900">Signature électronique</h3>
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
