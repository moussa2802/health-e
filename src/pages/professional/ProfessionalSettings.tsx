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
  const [retryCount, setRetryCount] = useState(0); // ✅ Added retry counter

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
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">
          Paramètres du profil professionnel
        </h1>

        <div className="flex items-center space-x-4">
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

      {errorMessage && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-md flex items-center justify-between">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 mr-2" />
            {errorMessage}
          </div>
          <div className="flex space-x-2">
            {(errorMessage.includes("Target ID already exists") ||
              errorMessage.includes("cache Firestore") ||
              errorMessage.includes("Firestore operation failed")) && (
              <button
                onClick={handleResetCache}
                disabled={isResettingCache}
                className="px-3 py-1 bg-orange-500 text-white rounded-md hover:bg-orange-600 disabled:opacity-50 flex items-center"
              >
                {isResettingCache ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Réinitialisation...
                  </>
                ) : (
                  <>
                    <Database className="h-4 w-4 mr-2" />
                    Réinitialiser le cache
                  </>
                )}
              </button>
            )}
            <button
              onClick={handleReconnect}
              disabled={isReconnecting}
              className="px-3 py-1 bg-red-500 text-white rounded-md hover:bg-red-600 disabled:opacity-50 flex items-center"
            >
              {isReconnecting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Reconnexion...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Reconnecter
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {saveSuccess && (
        <div className="mb-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded-md flex items-center">
          <CheckCircle className="h-5 w-5 mr-2" />
          <div>
            <p className="font-medium">
              {redirecting
                ? "Vos modifications ont été enregistrées avec succès. Redirection vers le tableau de bord..."
                : "Vos modifications ont été enregistrées avec succès"}
            </p>
            <p className="text-sm mt-1">
              Votre profil est maintenant visible dans la liste des
              professionnels disponibles avec les créneaux horaires.
            </p>
          </div>
        </div>
      )}

      {uploadError && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-md flex items-center justify-between">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 mr-2" />
            {uploadError}
          </div>
          <button
            onClick={() => setUploadError("")}
            className="text-red-500 hover:text-red-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <section className="bg-blue-50 border-l-4 border-blue-500 rounded-lg shadow p-6 mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-semibold text-blue-700">
              Statut du profil
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Ce bouton permet de rendre votre profil visible pour les patients.
            </p>
          </div>
          <div>
            <label
              htmlFor="isActive"
              className={`inline-flex items-center px-4 py-2 rounded-md font-medium text-sm shadow-sm transition-colors duration-150 ${
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
              {profileData.isActive ? "Profil actif" : "Activer mon profil"}
            </label>
          </div>
        </div>

        {!profileData.isApproved && (
          <p className="mt-4 text-sm text-red-600">
            ⚠️ Votre profil est en attente de validation par un administrateur.
            Vous ne pouvez pas l’activer pour le moment.
          </p>
        )}
      </section>

      <form onSubmit={handleSubmit} className="max-w-4xl mx-auto space-y-8">
        <section className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Type de service</h2>
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
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                required
              >
                <option value="">Sélectionnez une spécialité</option>
                {specialties[profileData.type || "mental"].map((spec) => (
                  <option key={spec} value={spec}>
                    {spec}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        <section className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">
            Informations personnelles
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nom complet *
              </label>
              <input
                type="text"
                value={profileData.name || ""}
                onChange={(e) =>
                  setProfileData((prev) => ({ ...prev, name: e.target.value }))
                }
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email *
              </label>
              <input
                type="email"
                value={profileData.email || ""}
                disabled
                className="mt-1 block w-full rounded-md border-gray-300 bg-gray-100 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                required
              />
              <p className="mt-1 text-sm text-gray-500">
                L'adresse email ne peut pas être modifiée pour des raisons de
                sécurité.
              </p>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
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
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                required
              />
              <p className="mt-1 text-sm text-gray-500">
                Décrivez votre pratique, votre approche et vos domaines
                d'expertise.
              </p>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
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
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
          </div>
        </section>

        <section className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Photo de profil</h2>
          <div className="flex items-center space-x-6">
            <div
              className="relative group cursor-pointer"
              onClick={handleImageClick}
            >
              {profileData.profileImage ? (
                <img
                  src={profileData.profileImage}
                  alt="Profile"
                  className="w-32 h-32 rounded-full object-cover group-hover:opacity-75 transition-opacity"
                />
              ) : (
                <div className="w-32 h-32 rounded-full bg-gray-200 flex items-center justify-center group-hover:bg-gray-300 transition-colors">
                  <Camera className="h-8 w-8 text-gray-400" />
                </div>
              )}
              {isUploadingImage && (
                <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-full">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
                    <div className="text-white text-xs">{uploadProgress}%</div>
                  </div>
                </div>
              )}
            </div>
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
                disabled={isUploadingImage}
              />
              <button
                type="button"
                onClick={handleImageClick}
                disabled={isUploadingImage}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {isUploadingImage ? (
                  <>
                    <Upload className="h-4 w-4 mr-2 animate-pulse" />
                    Téléchargement... {uploadProgress}%
                  </>
                ) : (
                  <>
                    <Camera className="h-4 w-4 mr-2" />
                    Changer la photo
                  </>
                )}
              </button>
              <p className="mt-2 text-sm text-gray-500">
                JPG, PNG. Taille maximale : 5MB
              </p>
              {isUploadingImage && (
                <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Signature électronique */}
        <section className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Signature électronique</h2>
          <div className="space-y-6">
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
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label
                htmlFor="useElectronicSignature"
                className="ml-2 block text-sm text-gray-700"
              >
                Utiliser la signature électronique pour les ordonnances
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Signature */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Signature manuscrite
                </label>
                <div className="border border-gray-300 rounded-lg p-4 flex flex-col items-center">
                  <div
                    className="relative w-full h-32 bg-gray-100 rounded-md mb-4 flex items-center justify-center cursor-pointer"
                    onClick={handleSignatureClick}
                  >
                    {profileData.signatureUrl ? (
                      <img
                        src={profileData.signatureUrl}
                        alt="Signature"
                        className="max-h-full max-w-full object-contain"
                      />
                    ) : (
                      <div className="text-center text-gray-500">
                        <PenTool className="h-8 w-8 mx-auto mb-2" />
                        <p>Cliquez pour ajouter votre signature</p>
                      </div>
                    )}
                    {isUploadingSignature && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-md">
                        <div className="text-center">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
                          <div className="text-white text-xs">
                            {signatureUploadProgress}%
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  <input
                    ref={signatureInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleSignatureChange}
                    className="hidden"
                    disabled={isUploadingSignature}
                  />
                  <button
                    type="button"
                    onClick={handleSignatureClick}
                    disabled={isUploadingSignature}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                  >
                    {isUploadingSignature ? (
                      <>
                        <Upload className="h-4 w-4 mr-2 animate-pulse" />
                        Téléchargement... {signatureUploadProgress}%
                      </>
                    ) : (
                      <>
                        <PenTool className="h-4 w-4 mr-2" />
                        {profileData.signatureUrl
                          ? "Changer la signature"
                          : "Ajouter une signature"}
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Cachet */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cachet professionnel
                </label>
                <div className="border border-gray-300 rounded-lg p-4 flex flex-col items-center">
                  <div
                    className="relative w-full h-32 bg-gray-100 rounded-md mb-4 flex items-center justify-center cursor-pointer"
                    onClick={handleStampClick}
                  >
                    {profileData.stampUrl ? (
                      <img
                        src={profileData.stampUrl}
                        alt="Cachet"
                        className="max-h-full max-w-full object-contain"
                      />
                    ) : (
                      <div className="text-center text-gray-500">
                        <PenTool className="h-8 w-8 mx-auto mb-2" />
                        <p>Cliquez pour ajouter votre cachet</p>
                      </div>
                    )}
                    {isUploadingStamp && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-md">
                        <div className="text-center">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
                          <div className="text-white text-xs">
                            {stampUploadProgress}%
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  <input
                    ref={stampInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleStampChange}
                    className="hidden"
                    disabled={isUploadingStamp}
                  />
                  <button
                    type="button"
                    onClick={handleStampClick}
                    disabled={isUploadingStamp}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                  >
                    {isUploadingStamp ? (
                      <>
                        <Upload className="h-4 w-4 mr-2 animate-pulse" />
                        Téléchargement... {stampUploadProgress}%
                      </>
                    ) : (
                      <>
                        <PenTool className="h-4 w-4 mr-2" />
                        {profileData.stampUrl
                          ? "Changer le cachet"
                          : "Ajouter un cachet"}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <AlertCircle className="h-5 w-5 text-blue-400" />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-blue-800">
                    Informations importantes
                  </h3>
                  <div className="mt-2 text-sm text-blue-700">
                    <p>
                      La signature électronique et le cachet seront
                      automatiquement ajoutés à vos ordonnances si vous activez
                      cette option.
                    </p>
                    <p className="mt-1">
                      Assurez-vous que votre signature et votre cachet sont
                      clairement lisibles et conformes à vos documents
                      officiels.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Langues parlées</h2>
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {profileData.languages?.map((language) => (
                <div
                  key={language}
                  className="flex items-center bg-blue-100 text-blue-800 px-3 py-1 rounded-full"
                >
                  <span>
                    {availableLanguages.find((l) => l.code === language)
                      ?.name || language}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemoveLanguage(language)}
                    className="ml-2 text-blue-600 hover:text-blue-800"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex space-x-2">
              <select
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="">Sélectionnez une langue</option>
                {availableLanguages
                  .filter((lang) => !profileData.languages?.includes(lang.code))
                  .map((lang) => (
                    <option key={lang.code} value={lang.code}>
                      {lang.name}
                    </option>
                  ))}
              </select>
              <button
                type="button"
                onClick={handleAddLanguage}
                disabled={!selectedLanguage}
                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Ajouter
              </button>
            </div>
          </div>
        </section>

        <section className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Formation</h2>
          <div className="space-y-4">
            <div>
              {profileData.education && profileData.education.length > 0 ? (
                <ul className="space-y-2">
                  {profileData.education.map((edu, index) => (
                    <li
                      key={index}
                      className="flex items-center justify-between bg-gray-50 p-3 rounded-md"
                    >
                      <span>{edu}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setProfileData((prev) => ({
                            ...prev,
                            education:
                              prev.education?.filter((_, i) => i !== index) ||
                              [],
                          }));
                        }}
                        className="text-red-500 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-500 italic">Aucune formation ajoutée</p>
              )}
            </div>

            <div className="flex space-x-2">
              <input
                type="text"
                value={newEducation}
                onChange={(e) => setNewEducation(e.target.value)}
                placeholder="Ajouter une formation ou un diplôme"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={handleAddEducation}
                disabled={!newEducation.trim()}
                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Ajouter
              </button>
            </div>
          </div>
        </section>

        <section className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Tarifs</h2>
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Prix par consultation
              </label>
              <div className="flex items-center">
                <input
                  type="number"
                  value={profileData.price === null ? "" : profileData.price}
                  onChange={(e) =>
                    setProfileData((prev) => ({
                      ...prev,
                      price:
                        e.target.value === "" ? null : Number(e.target.value),
                    }))
                  }
                  className="mt-1 block w-32 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  min="0"
                  step="100"
                />
                <select
                  value={profileData.currency || "XOF"}
                  onChange={(e) =>
                    setProfileData((prev) => ({
                      ...prev,
                      currency: e.target.value,
                    }))
                  }
                  className="ml-2 mt-1 block rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="XOF">XOF</option>
                  <option value="EUR">EUR</option>
                  <option value="USD">USD</option>
                </select>
              </div>
            </div>

            <div>
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
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label
                  htmlFor="offersFreeConsultations"
                  className="ml-2 block text-sm text-gray-700"
                >
                  Proposer des consultations gratuites
                </label>
              </div>

              {profileData.offersFreeConsultations && (
                <div className="mt-4 pl-6 space-y-4">
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
                      className="mt-1 block w-32 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
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
                      className="mt-1 block w-32 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      min="1"
                      max="20"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={
              isSaving || isUploadingImage || isReconnecting || redirecting
            }
            className={`flex items-center px-6 py-3 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors ${
              isSaving || isUploadingImage || isReconnecting || redirecting
                ? "opacity-50 cursor-not-allowed"
                : ""
            }`}
          >
            <Save className="h-5 w-5 mr-2" />
            {isSaving
              ? "Enregistrement..."
              : "Enregistrer et publier le profil"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ProfessionalSettings;
