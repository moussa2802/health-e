import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import {
  Save,
  Edit2,
  Camera,
  Upload,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Wifi,
  WifiOff,
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Heart,
  Stethoscope,
  Pill,
  XCircle,
  Shield,
  Users,
  ArrowLeft,
} from "lucide-react";
import {
  getPatientProfile,
  updatePatientProfile,
  validatePatientProfile,
  createDefaultPatientProfile,
  subscribeToPatientProfile,
  type PatientProfile as PatientProfileType,
} from "../../services/profileService";
import {
  getFirestoreConnectionStatus,
  forceFirestoreOnline,
  getFirestoreInstance,
} from "../../utils/firebase";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import { getDoc, doc as firestoreDoc, Timestamp } from "firebase/firestore";
import { uploadAndSaveProfileImage } from "../../services/profileService";

// Helper pour éviter les blocages Firestore
function withTimeout<T>(
  p: Promise<T>,
  ms = 7000,
  label = "operation"
): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => {
      reject(new Error(`Timeout ${ms}ms on ${label}`));
    }, ms);
    p.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      }
    );
  });
}

// Helper pour normaliser les données Firestore
function normalizeProfile(p: any, currentUser?: any) {
  const toDateStr = (d: any) => {
    if (!d) return "";
    if (typeof d === "string") return d; // déjà ISO
    if (d instanceof Date) return d.toISOString().slice(0, 10);
    if (d instanceof Timestamp) return d.toDate().toISOString().slice(0, 10);
    return ""; // fallback
  };

  return {
    name: p?.name || currentUser?.name || "",
    email: p?.email || currentUser?.email || "",
    phone: p?.phone ? String(p.phone) : "",
    address: p?.address || "",
    gender: p?.gender || "F",
    dateOfBirth: toDateStr(p?.dateOfBirth),
    profileImage: p?.profileImage || currentUser?.profileImage || "",
    medicalHistory: p?.medicalHistory || "",
    medications: p?.medications || "",
    allergies: p?.allergies || "",
    emergencyContact: {
      name: p?.emergencyContact?.name || "",
      phone: p?.emergencyContact?.phone || "",
      relationship: p?.emergencyContact?.relationship || "",
    },
  } as Partial<PatientProfileType>;
}

const PatientProfile: React.FC = () => {
  const { currentUser } = useAuth();
  console.log("🔎 currentUser:", currentUser);
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const [redirectAttempted, setRedirectAttempted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isRetrying, setIsRetrying] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState(
    getFirestoreConnectionStatus()
  );
  const [isLocalEnvironment, setIsLocalEnvironment] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [retryCount, setRetryCount] = useState(0); // ✅ Added retry counter

  const fileInputRef = useRef<HTMLInputElement>(null);
  const isMountedRef = useRef(true);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const hasLoadedRef = useRef(false);

  // Gestion du cycle de vie du composant
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // État du profil patient - initialiser avec les données utilisateur actuelles
  const [patientInfo, setPatientInfo] = useState<Partial<PatientProfileType>>({
    name: currentUser?.name || "",
    email: currentUser?.email || "",
    phone: "",
    dateOfBirth: "",
    gender: "F",
    address: "",
    profileImage: currentUser?.profileImage || "",
    medicalHistory: "",
    allergies: "",
    medications: "",
    emergencyContact: {
      name: "",
      phone: "",
      relationship: "",
    },
  });

  // Déterminer le mode d'inscription (email ou téléphone)
  const getRegistrationMethod = () => {
    if (!patientInfo) return null;

    // Si l'email contient un @, c'est probablement un email valide
    const hasValidEmail = patientInfo.email && patientInfo.email.includes("@");
    // Si le téléphone contient des chiffres et est assez long, c'est probablement un téléphone
    const hasValidPhone =
      patientInfo.phone && patientInfo.phone.replace(/\D/g, "").length >= 8;

    if (hasValidEmail && !hasValidPhone) return "email";
    if (hasValidPhone && !hasValidEmail) return "phone";
    if (hasValidEmail && hasValidPhone) return "both";
    return null;
  };

  const registrationMethod = getRegistrationMethod();
  const isRunningInBolt =
    typeof window !== "undefined" &&
    (window.location.hostname.includes("localhost") ||
      window.location.hostname.includes("bolt.run") ||
      window.location.hostname.includes("webcontainer"));

  // Check if running in local environment
  useEffect(() => {
    const isLocal =
      typeof window !== "undefined" &&
      (window.location.hostname === "localhost" ||
        window.location.hostname.includes("webcontainer"));
    setIsLocalEnvironment(isLocal);
  }, []);

  // Monitor connection status
  useEffect(() => {
    const updateConnectionStatus = () => {
      setConnectionStatus(getFirestoreConnectionStatus());
    };

    const interval = setInterval(updateConnectionStatus, 5000);

    window.addEventListener("online", updateConnectionStatus);
    window.addEventListener("offline", updateConnectionStatus);

    return () => {
      clearInterval(interval);
      window.removeEventListener("online", updateConnectionStatus);
      window.removeEventListener("offline", updateConnectionStatus);
    };
  }, []);

  // ✅ FIXED: Added retry mechanism and better error handling
  useEffect(() => {
    const loadProfile = async () => {
      if (!currentUser?.id) {
        setLoading(false); // ✅ FIXED: Set loading to false when no user
        return;
      }

      // Ne relance pas si déjà chargé et pas de retry explicite
      if (hasLoadedRef.current && retryCount === 0) {
        return;
      }

      try {
        // Éviter de flasher le spinner si on a déjà des données
        if (!hasLoadedRef.current) setLoading(true);
        setErrorMessage("");

        // ✅ FIXED: Direct document access by userId
        const profile = await withTimeout(
          getPatientProfile(currentUser.id),
          8000,
          "getPatientProfile"
        );
        if (!profile) {
          // Get user data
          const db = getFirestoreInstance();
          if (!db) throw new Error("Firestore not available");

          const userRef = firestoreDoc(db, "users", currentUser.id);
          const userSnap = await withTimeout(
            getDoc(userRef),
            6000,
            "getDoc(users)"
          );

          if (!userSnap.exists()) {
            throw new Error("Utilisateur non trouvé");
          }

          const userData = userSnap.data();

          // Create default profile
          const newProfile = await withTimeout(
            createDefaultPatientProfile(
              currentUser.id,
              userData.name || currentUser.name || "Patient",
              userData.email || currentUser.email || ""
            ),
            8000,
            "createDefaultPatientProfile"
          );

          if (isMountedRef.current) {
            setPatientInfo(normalizeProfile(newProfile, currentUser));
            setLoading(false);
            hasLoadedRef.current = true;
          }
        } else {
          // Mettre à jour l'état avec les données du profil
          if (isMountedRef.current) {
            // Utiliser la fonction de normalisation
            const syncedProfile = normalizeProfile(profile, currentUser);

            setPatientInfo(normalizeProfile(profile, currentUser));
            setLoading(false);
            hasLoadedRef.current = true;
          }
        }

        // ❌ Abonnement déplacé dans un useEffect séparé pour éviter les conflits
      } catch (error) {
        console.error("❌ Error loading profile:", error);

        // Détecter les timeouts et afficher un message approprié
        if ((error as Error)?.message?.includes("Timeout")) {
          setErrorMessage(
            "Connexion Firestore lente/instable. Affichage des infos de base. Vous pouvez réessayer."
          );
        }

        // Initialiser avec les données de base de l'utilisateur même en cas d'erreur
        if (isMountedRef.current) {
          setPatientInfo((prev) => ({
            ...prev,
            name: currentUser.name || prev?.name || "",
            email: currentUser.email || prev?.email || "",
            profileImage: currentUser.profileImage || prev?.profileImage || "",
            gender: prev?.gender || "F",
            emergencyContact: {
              name: prev?.emergencyContact?.name || "",
              phone: prev?.emergencyContact?.phone || "",
              relationship: prev?.emergencyContact?.relationship || "",
            },
          }));
        }

        if (isLocalEnvironment) {
          setErrorMessage(
            "Mode développement détecté. Certaines fonctionnalités Firestore peuvent être limitées."
          );
        } else if (
          error instanceof Error &&
          error.message.includes("Target ID already exists")
        ) {
          setErrorMessage(
            'Problème de cache Firestore. Cliquez sur "Réessayer" pour résoudre le problème.'
          );
        } else if (!navigator.onLine) {
          setErrorMessage(
            "Vous êtes hors ligne. Les modifications seront enregistrées lorsque vous serez de nouveau en ligne."
          );
        } else {
          setErrorMessage(
            'Erreur lors du chargement du profil. Cliquez sur "Réessayer".'
          );
        }

        // ✅ FIXED: Set loading to false on error
        if (isMountedRef.current) {
          setLoading(false);
        }
      }
    };

    loadProfile();

    return () => {
      // Nettoyer l'abonnement lors du démontage du composant
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [currentUser?.id, isLocalEnvironment, retryCount]); // ✅ FIXED: Stable ID dependency

  // Abonnement Firestore séparé pour éviter les conflits
  useEffect(() => {
    if (!currentUser?.id) return;

    const unsub = subscribeToPatientProfile(
      currentUser.id,
      (updatedProfile) => {
        if (updatedProfile && isMountedRef.current) {
          setPatientInfo(normalizeProfile(updatedProfile, currentUser));
          setLoading(false);
        }
      }
    );

    unsubscribeRef.current = unsub;
    return () => {
      unsub?.();
    };
  }, [currentUser?.id]);

  const handleRetry = async () => {
    setIsRetrying(true);
    setErrorMessage("");

    try {
      await forceFirestoreOnline();

      setConnectionStatus(getFirestoreConnectionStatus());

      // ✅ FIXED: Trigger a retry by incrementing retryCount
      setRetryCount((prev) => prev + 1);
    } catch (error) {
      console.error("❌ Error retrying profile load:", error);

      if (isLocalEnvironment) {
        setErrorMessage(
          "Reconnexion impossible en environnement local. Déployez l'application pour tester la connectivité Firestore."
        );
      } else if (!navigator.onLine) {
        setErrorMessage(
          "Vous êtes hors ligne. Les modifications seront enregistrées lorsque vous serez de nouveau en ligne."
        );
      } else {
        setErrorMessage(
          "Impossible de se reconnecter. Vérifiez votre connexion internet et réessayez dans quelques instants."
        );
      }
    } finally {
      if (isMountedRef.current) {
        setIsRetrying(false);
      }
    }
  };

  const handleImageClick = () => {
    if (!isUploadingImage) {
      fileInputRef.current?.click();
    }
  };

  const handleImageChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file || !currentUser?.id) return;

    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage("L'image ne doit pas dépasser 5MB");
      return;
    }

    if (!file.type.startsWith("image/")) {
      setErrorMessage("Veuillez sélectionner un fichier image valide");
      return;
    }

    setIsUploadingImage(true);
    setErrorMessage("");
    setUploadProgress(0);

    try {
      const downloadURL = await uploadAndSaveProfileImage(
        file,
        currentUser.id,
        "patient",
        (progress) => {
          if (isMountedRef.current) {
            setUploadProgress(progress);
          }
        }
      );

      if (isMountedRef.current) {
        setPatientInfo((prev) => ({ ...prev, profileImage: downloadURL }));
      }

      if (isMountedRef.current) {
        setSaveSuccess(true);
        setTimeout(() => {
          if (isMountedRef.current) {
            setSaveSuccess(false);
          }
        }, 3000);
      }
    } catch (error) {
      console.error("❌ Error uploading image:", error);
      setErrorMessage(
        error instanceof Error ? error.message : "Erreur lors du téléchargement"
      );
    } finally {
      if (isMountedRef.current) {
        setIsUploadingImage(false);
        setUploadProgress(0);
      }

      // Clear the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleSave = async () => {
    if (!currentUser?.id) return;

    setErrorMessage("");
    setSaveSuccess(false);

    // Validation
    const validationErrors = validatePatientProfile(patientInfo);
    if (validationErrors.length > 0) {
      setErrorMessage(validationErrors.join(", "));
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    setIsSaving(true);

    try {
      // ✅ FIXED: Direct document update by userId
      await updatePatientProfile(currentUser.id, patientInfo);

      setSaveSuccess(true);

      // Recharger les données mises à jour avant la redirection
      try {
        const updatedProfile = await withTimeout(
          getPatientProfile(currentUser.id),
          8000,
          "getPatientProfile(afterSave)"
        );
        if (updatedProfile && isMountedRef.current) {
          setPatientInfo(normalizeProfile(updatedProfile, currentUser));
        }
      } catch (reloadError) {
        console.error(
          "❌ Erreur lors du rechargement des données:",
          reloadError
        );
      }

      // Redirect to dashboard after successful save
      setRedirecting(true);
      setRedirectAttempted(true);

      // Redirection via window.location (contourne React Router)
      if (isMountedRef.current) {
        try {
          window.location.replace("/patient/dashboard");
        } catch (error) {
          try {
            window.location.assign("/patient/dashboard");
          } catch (assignError) {
            try {
              window.location.href = "/patient/dashboard";
            } catch (hrefError) {
              // Dernier recours : redirection forcée via JavaScript
              const link = document.createElement("a");
              link.href = "/patient/dashboard";
              link.click();
            }
          }
        }

        // Si on arrive ici, la redirection a échoué, forcer avec un délai
        setTimeout(() => {
          window.location.href = "/patient/dashboard";
        }, 500);
      }
    } catch (error) {
      console.error("❌ Error saving profile:", error);

      if (isLocalEnvironment) {
        setErrorMessage(
          "Mode développement détecté. Les modifications seront enregistrées lors du déploiement."
        );
      } else if (!navigator.onLine) {
        setErrorMessage(
          "Vous êtes hors ligne. Les modifications seront enregistrées lorsque vous serez de nouveau en ligne."
        );
      } else {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Erreur lors de la sauvegarde"
        );
      }
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleChange = (
    field: keyof PatientProfileType,
    value: string | number | undefined
  ) => {
    setPatientInfo((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleEmergencyContactChange = (field: string, value: string) => {
    setPatientInfo((prev) => ({
      ...prev,
      emergencyContact: {
        name: prev.emergencyContact?.name ?? "",
        phone: prev.emergencyContact?.phone ?? "",
        relationship: prev.emergencyContact?.relationship ?? "",
        [field]: value,
      },
    }));
  };

  // Empêcher les re-rendus si la redirection est en cours
  if (redirectAttempted) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-4 text-lg text-gray-600" translate="no">
              Redirection vers le tableau de bord...
            </p>
            <p className="mt-2 text-sm text-gray-500" translate="no">
              Si la redirection ne se fait pas automatiquement,
              <button
                translate="no"
                data-action="manual-redirect"
                onClick={() => {
                  window.location.href = "/patient/dashboard";
                }}
                className="text-blue-600 hover:text-blue-800 underline ml-1"
              >
                cliquez ici
              </button>
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!patientInfo) {
    return (
      <div className="text-center p-6" translate="no">
        Chargement du profil...
      </div>
    );
  }
  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <LoadingSpinner size="lg" />
            <p className="mt-4 text-lg text-gray-600" translate="no">
              Chargement du profil...
            </p>
            <div className="mt-4 flex items-center justify-center">
              {connectionStatus.isOnline ? (
                <div className="flex items-center text-green-600">
                  <Wifi className="h-4 w-4 mr-1" />
                  <span className="text-sm" translate="no">
                    En ligne
                  </span>
                </div>
              ) : (
                <div className="flex items-center text-red-600">
                  <WifiOff className="h-4 w-4 mr-1" />
                  <span className="text-sm" translate="no">
                    Hors ligne
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold" translate="no">
            Mon profil
          </h1>
          <div className="flex items-center space-x-3">
            {/* Connection Status Indicator */}
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
                  <span translate="no">Connecté</span>
                </>
              ) : (
                <>
                  <WifiOff className="h-4 w-4 mr-1" />
                  <span translate="no">Hors ligne</span>
                </>
              )}
            </div>

            <button
              translate="no"
              data-action={isEditing ? "save" : "edit"}
              onClick={isEditing ? handleSave : () => setIsEditing(true)}
              disabled={
                isSaving || isUploadingImage || isRetrying || redirecting
              }
              className={`flex items-center px-6 py-3 rounded-xl font-semibold transition-all duration-200 shadow-md hover:shadow-lg ${
                isEditing
                  ? "bg-gradient-to-r from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700"
                  : "bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700"
              } ${
                isSaving || isUploadingImage || isRetrying || redirecting
                  ? "opacity-50 cursor-not-allowed"
                  : ""
              }`}
            >
              {isEditing ? (
                <>
                  <Save className="h-5 w-5 mr-2" />
                  {isSaving ? "Enregistrement..." : "Enregistrer"}
                </>
              ) : (
                <>
                  <Edit2 className="h-5 w-5 mr-2" />
                  Modifier
                </>
              )}
            </button>
          </div>
        </div>

        {/* Messages de succès et d'erreur */}
        {saveSuccess && (
          <div className="mb-6 p-4 bg-green-100 border border-green-400 text-green-700 rounded-lg">
            <div className="flex items-center">
              <CheckCircle className="h-5 w-5 mr-2" />
              <span className="font-medium" translate="no">
                ✅ Vos modifications ont été enregistrées avec succès !
              </span>
            </div>
            {redirecting && (
              <div className="mt-3 flex items-center text-green-600">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-500 mr-2"></div>
                <span translate="no">
                  🔄 Redirection vers le tableau de bord...
                </span>
              </div>
            )}
          </div>
        )}

        {errorMessage && (
          <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg flex items-center justify-between">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 mr-2" />
              {errorMessage}
            </div>
            <button
              translate="no"
              data-action="retry"
              onClick={handleRetry}
              disabled={isRetrying}
              className="px-3 py-1 bg-red-500 text-white rounded-md hover:bg-red-600 disabled:opacity-50 flex items-center"
            >
              {isRetrying ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Reconnexion...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Réessayer
                </>
              )}
            </button>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          {/* Photo de profil */}
          <div className="p-8 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
            <h2
              className="text-xl font-bold text-gray-900 mb-6 flex items-center"
              translate="no"
            >
              <User className="h-6 w-6 mr-3 text-blue-600" />
              Photo de profil
            </h2>
            <div className="flex items-center space-x-6">
              <div
                className="relative group cursor-pointer"
                onClick={handleImageClick}
              >
                {patientInfo.profileImage ? (
                  <img
                    src={patientInfo.profileImage}
                    alt="Profile"
                    className="w-32 h-32 rounded-2xl object-cover group-hover:opacity-75 transition-all duration-300 shadow-lg"
                  />
                ) : (
                  <div className="w-32 h-32 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300">
                    <User className="h-12 w-12 text-white" />
                  </div>
                )}
                {isUploadingImage && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-2xl">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
                      <div className="text-white text-xs font-medium">
                        {uploadProgress}%
                      </div>
                    </div>
                  </div>
                )}
                {!isUploadingImage && isEditing && (
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
                    <div className="bg-black bg-opacity-50 rounded-2xl p-4">
                      <Camera className="h-8 w-8 text-white" />
                    </div>
                  </div>
                )}
              </div>
              {isEditing && (
                <div className="flex-1">
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
                    translate="no"
                    data-action="change-photo"
                    onClick={handleImageClick}
                    disabled={isUploadingImage}
                    className="px-6 py-3 border-2 border-blue-300 rounded-xl text-sm font-semibold text-blue-700 hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center transition-all duration-200"
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
                  <p className="mt-3 text-sm text-gray-600" translate="no">
                    JPG, PNG. Taille maximale : 5MB
                  </p>
                  {isUploadingImage && (
                    <div className="mt-3 w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-blue-500 to-indigo-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      ></div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Informations personnelles */}
          <div className="p-8 border-b border-gray-100">
            <h2
              className="text-xl font-bold text-gray-900 mb-6 flex items-center"
              translate="no"
            >
              <User className="h-6 w-6 mr-3 text-green-600" />
              Informations personnelles
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gray-50 rounded-xl p-4">
                <label
                  className="block text-sm font-semibold text-gray-700 mb-2 flex items-center"
                  translate="no"
                >
                  <User className="h-4 w-4 mr-2 text-blue-500" />
                  Nom complet
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    translate="no"
                    data-field="name"
                    value={patientInfo.name || ""}
                    onChange={(e) => handleChange("name", e.target.value)}
                    className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 bg-white"
                  />
                ) : (
                  <p className="text-gray-900 font-medium">
                    {patientInfo.name || "Non renseigné"}
                  </p>
                )}
              </div>

              <div className="bg-gray-50 rounded-xl p-4">
                <label
                  className="block text-sm font-semibold text-gray-700 mb-2 flex items-center"
                  translate="no"
                >
                  <Mail className="h-4 w-4 mr-2 text-blue-500" />
                  Email
                  {registrationMethod === "email" && (
                    <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded-full font-medium">
                      Mode d'inscription
                    </span>
                  )}
                </label>
                {isEditing ? (
                  <input
                    type="email"
                    translate="no"
                    data-field="email"
                    value={patientInfo?.email || ""}
                    onChange={(e) => handleChange("email", e.target.value)}
                    className={`w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 bg-white ${
                      registrationMethod === "email"
                        ? "bg-gray-100 cursor-not-allowed"
                        : ""
                    }`}
                    disabled={registrationMethod === "email"}
                    placeholder={
                      registrationMethod === "email"
                        ? "Email utilisé pour l'inscription"
                        : "Votre email"
                    }
                  />
                ) : (
                  <p className="text-gray-900 font-medium">
                    {patientInfo.email || "Non renseigné"}
                  </p>
                )}
                {registrationMethod === "email" && (
                  <p className="mt-1 text-xs text-gray-500" translate="no">
                    Cet email ne peut pas être modifié car il a été utilisé pour
                    l'inscription
                  </p>
                )}
              </div>

              <div className="bg-gray-50 rounded-xl p-4">
                <label
                  className="block text-sm font-semibold text-gray-700 mb-2 flex items-center"
                  translate="no"
                >
                  <Phone className="h-4 w-4 mr-2 text-blue-500" />
                  Téléphone
                  {registrationMethod === "phone" && (
                    <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded-full font-medium">
                      Mode d'inscription
                    </span>
                  )}
                </label>
                {isEditing ? (
                  <input
                    type="tel"
                    translate="no"
                    data-field="phone"
                    value={patientInfo?.phone || ""}
                    onChange={(e) => handleChange("phone", e.target.value)}
                    className={`w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 bg-white ${
                      registrationMethod === "phone"
                        ? "bg-gray-100 cursor-not-allowed"
                        : ""
                    }`}
                    disabled={registrationMethod === "phone"}
                    placeholder={
                      registrationMethod === "phone"
                        ? "Téléphone utilisé pour l'inscription"
                        : "Votre téléphone"
                    }
                  />
                ) : (
                  <p className="text-gray-900 font-medium">
                    {patientInfo.phone || "Non renseigné"}
                  </p>
                )}
                {registrationMethod === "phone" && (
                  <p className="mt-1 text-xs text-gray-500">
                    Ce téléphone ne peut pas être modifié car il a été utilisé
                    pour l'inscription
                  </p>
                )}
              </div>

              <div className="bg-gray-50 rounded-xl p-4">
                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center">
                  <Calendar className="h-4 w-4 mr-2 text-blue-500" />
                  Date de naissance
                </label>
                {isEditing ? (
                  <input
                    type="date"
                    value={patientInfo.dateOfBirth || ""}
                    onChange={(e) =>
                      handleChange("dateOfBirth", e.target.value)
                    }
                    className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 bg-white"
                  />
                ) : (
                  <p className="text-gray-900 font-medium">
                    {patientInfo.dateOfBirth
                      ? new Date(patientInfo.dateOfBirth).toLocaleDateString()
                      : "Non renseigné"}
                  </p>
                )}
              </div>

              <div className="bg-gray-50 rounded-xl p-4">
                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center">
                  <Heart className="h-4 w-4 mr-2 text-blue-500" />
                  Genre
                </label>
                {isEditing ? (
                  <select
                    value={patientInfo?.gender || "F"}
                    onChange={(e) => handleChange("gender", e.target.value)}
                    className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 bg-white"
                  >
                    <option value="M">Masculin</option>
                    <option value="F">Féminin</option>
                    <option value="O">Autre</option>
                  </select>
                ) : (
                  <p className="text-gray-900 font-medium">
                    {patientInfo.gender === "M"
                      ? "Masculin"
                      : patientInfo.gender === "F"
                      ? "Féminin"
                      : patientInfo.gender === "O"
                      ? "Autre"
                      : "Non renseigné"}
                  </p>
                )}
              </div>

              <div className="bg-gray-50 rounded-xl p-4 md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center">
                  <MapPin className="h-4 w-4 mr-2 text-blue-500" />
                  Adresse
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={patientInfo?.address || ""}
                    onChange={(e) => handleChange("address", e.target.value)}
                    className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 bg-white"
                  />
                ) : (
                  <p className="text-gray-900 font-medium">
                    {patientInfo.address || "Non renseigné"}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Informations médicales */}
          <div className="p-8 border-b border-gray-100">
            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
              <Stethoscope className="h-6 w-6 mr-3 text-red-600" />
              Informations médicales
            </h2>
            <div className="space-y-6">
              <div className="bg-red-50 rounded-xl p-6 border border-red-100">
                <label
                  className="block text-sm font-semibold text-gray-700 mb-3 flex items-center"
                  translate="no"
                >
                  <Stethoscope className="h-4 w-4 mr-2 text-red-500" />
                  Antécédents médicaux
                </label>
                {isEditing ? (
                  <textarea
                    translate="no"
                    data-field="medicalHistory"
                    value={patientInfo?.medicalHistory || ""}
                    onChange={(e) =>
                      handleChange("medicalHistory", e.target.value)
                    }
                    rows={3}
                    className="w-full rounded-lg border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500 bg-white"
                    placeholder="Décrivez vos antécédents médicaux..."
                  />
                ) : (
                  <p className="text-gray-900 font-medium">
                    {patientInfo.medicalHistory ||
                      "Aucun antécédent médical particulier"}
                  </p>
                )}
              </div>

              <div className="bg-yellow-50 rounded-xl p-6 border border-yellow-100">
                <label className="block text-sm font-semibold text-gray-700 mb-3 flex items-center">
                  <XCircle className="h-4 w-4 mr-2 text-yellow-600" />
                  Allergies
                </label>
                {isEditing ? (
                  <textarea
                    value={patientInfo?.allergies || ""}
                    onChange={(e) => handleChange("allergies", e.target.value)}
                    rows={2}
                    className="w-full rounded-lg border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500 bg-white"
                    placeholder="Listez vos allergies..."
                  />
                ) : (
                  <p className="text-gray-900 font-medium">
                    {patientInfo.allergies || "Aucune allergie connue"}
                  </p>
                )}
              </div>

              <div className="bg-blue-50 rounded-xl p-6 border border-blue-100">
                <label className="block text-sm font-semibold text-gray-700 mb-3 flex items-center">
                  <Pill className="h-4 w-4 mr-2 text-blue-600" />
                  Médicaments en cours
                </label>
                {isEditing ? (
                  <textarea
                    value={patientInfo?.medications || ""}
                    onChange={(e) =>
                      handleChange("medications", e.target.value)
                    }
                    rows={2}
                    className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 bg-white"
                    placeholder="Listez vos médicaments en cours..."
                  />
                ) : (
                  <p className="text-gray-900 font-medium">
                    {patientInfo.medications || "Aucun médicament en cours"}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Contact d'urgence */}
          <div className="p-8">
            <h2
              className="text-xl font-bold text-gray-900 mb-6 flex items-center"
              translate="no"
            >
              <Shield className="h-6 w-6 mr-3 text-orange-600" />
              Contact d'urgence
            </h2>
            <div className="bg-orange-50 rounded-xl p-6 border border-orange-100">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label
                    className="block text-sm font-semibold text-gray-700 mb-2 flex items-center"
                    translate="no"
                  >
                    <Users className="h-4 w-4 mr-2 text-orange-500" />
                    Nom du contact
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      translate="no"
                      data-field="emergencyContactName"
                      value={patientInfo?.emergencyContact?.name || ""}
                      onChange={(e) =>
                        handleEmergencyContactChange("name", e.target.value)
                      }
                      className="w-full rounded-lg border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 bg-white"
                      placeholder="Nom du contact d'urgence"
                    />
                  ) : (
                    <p className="text-gray-900 font-medium">
                      {patientInfo.emergencyContact?.name || "Non renseigné"}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center">
                    <Phone className="h-4 w-4 mr-2 text-orange-500" />
                    Téléphone du contact
                  </label>
                  {isEditing ? (
                    <input
                      type="tel"
                      value={patientInfo?.emergencyContact?.phone || ""}
                      onChange={(e) =>
                        handleEmergencyContactChange("phone", e.target.value)
                      }
                      className="w-full rounded-lg border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 bg-white"
                      placeholder="Numéro de téléphone"
                    />
                  ) : (
                    <p className="text-gray-900 font-medium">
                      {patientInfo.emergencyContact?.phone || "Non renseigné"}
                    </p>
                  )}
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center">
                    <User className="h-4 w-4 mr-2 text-orange-500" />
                    Relation
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={patientInfo?.emergencyContact?.relationship || ""}
                      onChange={(e) =>
                        handleEmergencyContactChange(
                          "relationship",
                          e.target.value
                        )
                      }
                      className="w-full rounded-lg border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 bg-white"
                      placeholder="Relation avec le contact (ex: conjoint, parent, ami...)"
                    />
                  ) : (
                    <p className="text-gray-900 font-medium">
                      {patientInfo.emergencyContact?.relationship ||
                        "Non renseigné"}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PatientProfile;
// Firestore doc helper for compatibility (if not imported from firebase/firestore)

import type { Firestore } from "firebase/firestore";

function doc(db: Firestore, collectionPath: string, id: string) {
  return firestoreDoc(db, collectionPath, id);
}
