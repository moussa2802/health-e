import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  Star,
  Calendar,
  Languages,
  MapPin,
  Clock,
  Video,
  PhoneCall,
  User,
  AlertCircle,
  ArrowLeft,
  RefreshCw,
  Wifi,
  WifiOff,
  Check,
} from "lucide-react";
import { useProfessionals } from "../../hooks/useProfessionals";
import { getProfessionalAvailabilityData } from "../../services/calendarService";
import { getAvailableDays } from "../../services/slotService";
import { useAuth } from "../../contexts/AuthContext";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import { format, addDays } from "date-fns";
import { fr } from "date-fns/locale";
import {
  getProfessionalSpecialties,
  getProfessionalSpecialtyLabels,
  getProfessionalCategoryLabel,
  getProfessionalPrimarySpecialty,
} from "../../services/profileService";
import SpecialtyTags from "../../components/ui/SpecialtyTags";

const ProfessionalProfile: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [professional, setProfessional] = useState<any | null>(null);
  const [selectedDay, setSelectedDay] = useState<string>("");
  const [isRequestingConsultation, setIsRequestingConsultation] =
    useState(false);
  const [notFound, setNotFound] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [availabilityData, setAvailabilityData] = useState<any[]>([]);
  const [loadingFromCache, setLoadingFromCache] = useState(false);
  const [availableDays, setAvailableDays] = useState<Date[]>([]);

  const { professionals, loading, error, refreshProfessionals } =
    useProfessionals();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Monitor connection status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Charger les jours disponibles pour le professionnel
  useEffect(() => {
    if (!id) return;

    const loadAvailableDays = async () => {
      try {
        // Calculer le premier et le dernier jour du mois en cours
        const today = new Date();
        const startOfCurrentMonth = new Date(
          today.getFullYear(),
          today.getMonth(),
          1
        );
        const endOfNextMonth = new Date(
          today.getFullYear(),
          today.getMonth() + 2,
          0
        );

        console.log(
          `🔍 Chargement des jours disponibles du ${format(
            startOfCurrentMonth,
            "dd/MM/yyyy"
          )} au ${format(endOfNextMonth, "dd/MM/yyyy")}`
        );

        // Récupérer tous les jours disponibles pour cette période
        const days = await getAvailableDays(
          startOfCurrentMonth,
          endOfNextMonth,
          id
        );
        setAvailableDays(days);

        console.log(`✅ ${days.length} jours disponibles trouvés`);
      } catch (error) {
        console.error(
          "❌ Erreur lors du chargement des jours disponibles:",
          error
        );
      }
    };

    loadAvailableDays();
  }, [id]);

  // Fetch availability data directly from the professional document
  useEffect(() => {
    if (!id) return;

    const fetchAvailabilityData = async () => {
      try {
        console.log("🔍 Fetching availability data for professional:", id);
        const data = await getProfessionalAvailabilityData(id);
        setAvailabilityData(data);
        console.log("✅ Availability data fetched successfully:", data);
      } catch (error) {
        console.error("❌ Error fetching availability data:", error);
      }
    };

    fetchAvailabilityData();
  }, [id]);

  // Try to load from cache first
  useEffect(() => {
    if (!id) return;

    try {
      const cachedData = sessionStorage.getItem(`professional_${id}`);
      if (cachedData) {
        console.log("📦 Loading professional from cache");
        setLoadingFromCache(true);
        const parsedData = JSON.parse(cachedData);
        setProfessional(parsedData);

        // Initialize selected day if available
        if (
          parsedData?.availability &&
          Array.isArray(parsedData.availability) &&
          parsedData.availability.length > 0
        ) {
          setSelectedDay(parsedData.availability[0]?.day || "");
        }
      }
    } catch (error) {
      console.warn("Failed to load professional from cache:", error);
    }
  }, [id]);

  // Load from Firestore
  useEffect(() => {
    if (!id) return;

    if (professionals.length > 0) {
      console.log("🔍 Looking for professional with ID:", id);

      const found = professionals.find((p) => p.id === id);
      if (found) {
        console.log("✅ Professional found:", found.name || "Unknown");
        if (!found.isActive || !found.isApproved) {
          console.warn(
            "⛔️ Professional is inactive or not approved, redirecting..."
          );
          navigate("/"); // ou vers une page "non disponible"
          return;
        }
        setProfessional(found);
        setNotFound(false);
        setLoadingFromCache(false);

        // Update cache
        try {
          sessionStorage.setItem(`professional_${id}`, JSON.stringify(found));
        } catch (error) {
          console.warn("Failed to cache professional data:", error);
        }

        // Initialize selected day if available
        if (
          found?.availability &&
          Array.isArray(found.availability) &&
          found.availability.length > 0
        ) {
          setSelectedDay(found.availability[0]?.day || "");
        }
      } else if (!loadingFromCache) {
        // Don't mark as not found if we have data from cache
        console.warn("❌ Professional not found with ID:", id);
        setNotFound(true);
        setProfessional(null);
      }
    } else if (!loading && professionals.length === 0 && !loadingFromCache) {
      // If loading is complete and there are no professionals
      console.warn("⚠️ No professionals available");
      setNotFound(true);
    }
  }, [id, professionals, loading, loadingFromCache]);

  const handleInstantConsultation = () => {
    if (!isAuthenticated) {
      navigate("/patient");
      return;
    }

    if (!professional) {
      console.error("❌ No professional selected for instant consultation");
      return;
    }

    setIsRequestingConsultation(true);

    // For demo purposes, directly navigate to consultation room
    setTimeout(() => {
      setIsRequestingConsultation(false);
      navigate(`/consultation/instant-${professional.id}`);
    }, 1500);
  };

  // Utility function to check if a value exists and is an array
  const safeArray = (arr: any): any[] => {
    return Array.isArray(arr) ? arr : [];
  };

  // Fonction pour convertir les codes de langue en noms complets
  const getLanguageName = (code: string): string => {
    const languageMap: Record<string, string> = {
      fr: "Français",
      en: "Anglais",
      wo: "Wolof",
      ar: "Arabe",
      es: "Espagnol",
      pt: "Portugais",
      de: "Allemand",
      it: "Italien",
      zh: "Chinois",
      ru: "Russe",
      ja: "Japonais",
      ko: "Coréen",
    };

    return languageMap[code.toLowerCase()] || code;
  };

  // Utility function to check if a value exists
  const safeValue = (value: any, defaultValue: any = "") => {
    return value !== undefined && value !== null ? value : defaultValue;
  };

  if (loading && !loadingFromCache) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <LoadingSpinner size="lg" />
            <p className="mt-4 text-lg text-gray-600">
              Chargement du professionnel...
            </p>
            <div className="mt-4 flex items-center justify-center">
              {isOnline ? (
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
          </div>
        </div>
      </div>
    );
  }

  if (error && !loadingFromCache && !professional) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-red-100 border border-red-400 text-red-700 px-6 py-4 rounded-lg">
            <div className="flex items-center">
              <AlertCircle className="h-6 w-6 mr-3" />
              <div>
                <h3 className="font-bold">Erreur de chargement</h3>
                <p className="mt-1">{error}</p>
              </div>
            </div>
            <div className="mt-4 flex space-x-3">
              <button
                onClick={refreshProfessionals}
                className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition-colors inline-flex items-center"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Réessayer
              </button>
              <Link
                to="/professionals/mental"
                className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 transition-colors"
              >
                Voir tous les professionnels
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (notFound && !professional) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-6 py-4 rounded-lg">
            <div className="flex items-center">
              <AlertCircle className="h-6 w-6 mr-3" />
              <div>
                <h3 className="font-bold">Professionnel introuvable</h3>
                <p className="mt-1">
                  Ce professionnel n'existe pas ou n'est plus disponible. Il se
                  peut qu'il ait désactivé son profil ou que le lien soit
                  incorrect.
                </p>
              </div>
            </div>
            <div className="mt-4 flex space-x-3">
              <Link
                to="/professionals/mental"
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors inline-flex items-center"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voir les professionnels en santé mentale
              </Link>
              <Link
                to="/professionals/sexual"
                className="bg-pink-500 text-white px-4 py-2 rounded hover:bg-pink-600 transition-colors"
              >
                Voir les professionnels en santé sexuelle
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!professional) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <LoadingSpinner size="lg" />
            <p className="mt-4 text-lg text-gray-600">
              Chargement du professionnel...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Safety checks for professional data
  const professionalName = safeValue(professional.name, "Nom non disponible");
  const professionalSpecialties = getProfessionalSpecialties(professional);
  const professionalSpecialtyLabels = getProfessionalSpecialtyLabels(
    professional,
    "fr"
  );
  const professionalCategoryLabel = getProfessionalCategoryLabel(
    professional,
    "fr"
  );
  const primarySpecialtyLabel =
    professionalSpecialtyLabels[0] ?? "Spécialité non renseignée";
  const professionalDescription = safeValue(
    professional.description,
    "Description non disponible"
  );
  const professionalExperience = safeValue(
    professional.experience,
    "Expérience non renseignée"
  );
  const professionalRating = safeValue(professional.rating, 0);
  const professionalReviews = safeValue(professional.reviews, 0);
  // Prix robuste avec fallback
  const professionalPrice =
    professional.price ?? professional.consultationFee ?? 0;
  const professionalCurrency = safeValue(professional.currency, "XOF");
  const professionalLanguages = safeArray(professional.languages).map(
    getLanguageName
  );
  const professionalEducation = safeArray(professional.education);
  const professionalAvailability = safeArray(professional.availability);
  const isAvailableNow = false; // Désactivé temporairement
  const professionalType = safeValue(professional.type, "mental");

  return (
    <div className="container mx-auto px-4 py-8">
      <Link
        to={`/professionals/${professionalType}`}
        className="inline-flex items-center text-blue-500 hover:text-blue-600 mb-6 transition-colors"
      >
        <ArrowLeft className="h-5 w-5 mr-1" />
        Retour aux professionnels
      </Link>

      {loadingFromCache && loading && (
        <div className="mb-4 bg-blue-100 text-blue-800 px-4 py-2 rounded-md flex items-center">
          <LoadingSpinner size="sm" className="mr-2" />
          <span>Mise à jour des données en cours...</span>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="bg-gradient-to-r from-blue-500 to-teal-400 text-white p-6">
          <div className="flex flex-col md:flex-row">
            <div className="md:w-1/4 mb-6 md:mb-0">
              {professional.profileImage ? (
                <img
                  src={professional.profileImage}
                  alt={professionalName}
                  className="w-48 h-48 rounded-full object-cover border-4 border-white shadow-lg mx-auto md:mx-0"
                  onError={(e) => {
                    // Fallback if image fails to load
                    e.currentTarget.style.display = "none";
                    e.currentTarget.nextElementSibling?.classList.remove(
                      "hidden"
                    );
                  }}
                />
              ) : null}
              <div
                className={`w-48 h-48 rounded-full bg-white/20 border-4 border-white shadow-lg mx-auto md:mx-0 flex items-center justify-center ${
                  professional.profileImage ? "hidden" : ""
                }`}
              >
                <User className="h-24 w-24 text-white/60" />
              </div>
              {isAvailableNow && (
                <div className="mt-4 text-center md:text-left">
                  <span className="inline-flex items-center px-3 py-1 rounded-full bg-green-500 text-white text-sm">
                    <span className="w-2 h-2 bg-white rounded-full mr-2 animate-pulse"></span>
                    {availabilityData.length > 0
                      ? availabilityData[0]?.day || "Disponibilité à définir"
                      : "Disponibilité à définir"}
                  </span>
                </div>
              )}
            </div>

            <div className="md:w-3/4 md:pl-8">
              <div className="flex flex-col md:flex-row md:justify-between md:items-start">
                <div>
                  <h1 className="text-3xl font-bold mb-1">
                    {professionalName}
                  </h1>
                  <p className="text-xl opacity-90 mb-2">
                    {primarySpecialtyLabel}
                  </p>

                  <div className="flex items-center mb-4">
                    <Star className="h-5 w-5 text-yellow-300 fill-current" />
                    <span className="ml-1 font-medium">
                      {professionalRating}
                    </span>
                    <span className="ml-1 opacity-80">
                      ({professionalReviews} avis
                      {professionalReviews > 1 ? "" : ""})
                    </span>
                  </div>

                  {professionalLanguages.length > 0 && (
                    <div className="flex items-center mb-2">
                      <Languages className="h-5 w-5 mr-2" />
                      <span>{professionalLanguages.join(", ")}</span>
                    </div>
                  )}

                  <div className="flex items-center">
                    <MapPin className="h-5 w-5 mr-2" />
                    <span>Consultations en ligne uniquement</span>
                  </div>
                </div>

                <div className="mt-6 md:mt-0">
                  <div className="text-2xl font-bold mb-2">
                    {professionalPrice === 0 || professionalPrice === null ? (
                      <span>Tarif sur demande</span>
                    ) : (
                      `${professionalPrice.toLocaleString(
                        "fr-FR"
                      )} ${professionalCurrency}`
                    )}
                  </div>
                  {professionalPrice !== 0 && professionalPrice !== null && (
                    <p className="opacity-80">par consultation</p>
                  )}

                  <div className="flex flex-col sm:flex-row gap-4 mt-4">
                    {isAvailableNow ? (
                      <button
                        onClick={handleInstantConsultation}
                        disabled={isRequestingConsultation || !isOnline}
                        className={`px-6 py-3 bg-green-500 text-white font-semibold rounded-lg hover:bg-green-600 transition-colors flex items-center justify-center ${
                          isRequestingConsultation || !isOnline
                            ? "opacity-75 cursor-not-allowed"
                            : ""
                        }`}
                      >
                        <Video className="h-5 w-5 mr-2" />
                        {isRequestingConsultation
                          ? "Connexion..."
                          : "Consulter maintenant"}
                      </button>
                    ) : (
                      <Link
                        to={`/book/${professional.id}`}
                        className="px-6 py-3 bg-blue-500 text-white font-semibold rounded-lg hover:bg-blue-600 transition-colors flex items-center justify-center"
                        onClick={() => {
                          // Preload professional data in sessionStorage
                          try {
                            sessionStorage.setItem(
                              `professional_${professional.id}`,
                              JSON.stringify(professional)
                            );
                          } catch (error) {
                            console.warn(
                              "Failed to cache professional data:",
                              error
                            );
                          }
                        }}
                      >
                        <Calendar className="h-5 w-5 mr-2" />
                        Prendre rendez-vous
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-2">
              <section className="mb-8">
                <h2 className="text-2xl font-bold mb-4">À propos</h2>
                <p className="text-gray-700 mb-4">{professionalDescription}</p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-bold mb-4">Spécialités</h2>
                {professionalSpecialtyLabels.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {professionalSpecialtyLabels.map((label) => (
                      <span
                        key={label}
                        className="px-3 py-1 rounded-full bg-blue-100 text-blue-800 text-sm font-medium"
                      >
                        {label}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500">Spécialité non renseignée</p>
                )}
              </section>

              {professionalEducation.length > 0 && (
                <section className="mb-8">
                  <h2 className="text-2xl font-bold mb-4">Formation</h2>
                  <ul className="space-y-2">
                    {professionalEducation.map((edu: string, index: number) => (
                      <li key={index} className="flex items-start">
                        <div className="h-2 w-2 rounded-full bg-blue-500 mt-2 mr-3 flex-shrink-0"></div>
                        <span className="text-gray-700">{edu}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              <section>
                <h2 className="text-2xl font-bold mb-4">Expérience</h2>
                <p className="text-gray-700">{professionalExperience}</p>
              </section>
            </div>

            <div>
              {availabilityData.length > 0 ? (
                <section className="bg-gray-50 rounded-lg p-6 mb-6">
                  <h2 className="text-xl font-bold mb-4 flex items-center">
                    <Calendar className="h-5 w-5 mr-2 text-blue-500" />
                    Disponibilités
                  </h2>

                  {availableDays.length > 0 ? (
                    <>
                      <div className="flex flex-wrap gap-2 mb-4">
                        {availableDays.slice(0, 7).map((day, index) => (
                          <div
                            key={index}
                            className="bg-white border border-gray-200 rounded-lg p-3 flex items-center"
                          >
                            <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                            <span className="text-sm font-medium">
                              {format(day, "EEEE d MMMM", { locale: fr })}
                            </span>
                          </div>
                        ))}
                      </div>

                      {availableDays.length > 7 && (
                        <p className="text-sm text-gray-500 mt-2">
                          + {availableDays.length - 7} autres jours disponibles
                        </p>
                      )}
                    </>
                  ) : (
                    <div className="text-center py-4 text-gray-500">
                      Aucune disponibilité trouvée pour ce professionnel
                    </div>
                  )}

                  <Link
                    to={`/book/${professional.id}`}
                    className="mt-6 block w-full text-center px-4 py-2 bg-blue-500 text-white font-semibold rounded-md hover:bg-blue-600 transition-colors"
                    onClick={() => {
                      // Preload professional data in sessionStorage
                      try {
                        sessionStorage.setItem(
                          `professional_${professional.id}`,
                          JSON.stringify(professional)
                        );
                      } catch (error) {
                        console.warn(
                          "Failed to cache professional data:",
                          error
                        );
                      }
                    }}
                  >
                    Voir plus d'horaires
                  </Link>
                </section>
              ) : (
                <section className="bg-gray-50 rounded-lg p-6 mb-6">
                  <h2 className="text-xl font-bold mb-4">Disponibilités</h2>

                  {availableDays.length > 0 ? (
                    <>
                      <div className="flex flex-wrap gap-2 mb-4">
                        {availableDays.slice(0, 7).map((day, index) => (
                          <div
                            key={index}
                            className="bg-white border border-gray-200 rounded-lg p-3 flex items-center"
                          >
                            <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                            <span className="text-sm font-medium">
                              {format(day, "EEEE d MMMM", { locale: fr })}
                            </span>
                          </div>
                        ))}
                      </div>

                      {availableDays.length > 7 && (
                        <p className="text-sm text-gray-500 mt-2">
                          + {availableDays.length - 7} autres jours disponibles
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="text-gray-500 text-sm mb-4">
                      Les disponibilités ne sont pas encore configurées pour ce
                      professionnel.
                    </p>
                  )}

                  <Link
                    to={`/book/${professional.id}`}
                    className="block w-full text-center px-4 py-2 bg-blue-500 text-white font-semibold rounded-md hover:bg-blue-600 transition-colors"
                    onClick={() => {
                      // Preload professional data in sessionStorage
                      try {
                        sessionStorage.setItem(
                          `professional_${professional.id}`,
                          JSON.stringify(professional)
                        );
                      } catch (error) {
                        console.warn(
                          "Failed to cache professional data:",
                          error
                        );
                      }
                    }}
                  >
                    Prendre rendez-vous
                  </Link>
                </section>
              )}

              <section className="bg-gray-50 rounded-lg p-6 mb-6">
                <h2 className="text-xl font-bold mb-4">Informations</h2>
                <div className="space-y-3">
                  <div>
                    <span className="text-gray-500 text-sm">Catégorie :</span>
                    <p className="font-medium">{professionalCategoryLabel}</p>
                  </div>
                  {Array.isArray(professional.languages) &&
                    professional.languages.length > 0 && (
                      <div>
                        <span className="text-gray-500 text-sm">Langues :</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {professional.languages.map(
                            (lang: string, index: number) => (
                              <span
                                key={index}
                                className="bg-gray-100 text-gray-700 px-2 py-1 rounded-full text-xs"
                              >
                                {lang}
                              </span>
                            )
                          )}
                        </div>
                      </div>
                    )}
                </div>
              </section>

              <section className="bg-gray-50 rounded-lg p-6">
                <h2 className="text-xl font-bold mb-4">
                  Types de consultation
                </h2>

                <div className="space-y-4">
                  <div className="flex items-center p-3 bg-white rounded-md border border-gray-200">
                    <Video className="h-5 w-5 text-blue-500 mr-3" />
                    <span className="font-medium">Vidéo</span>
                  </div>
                  <div className="flex items-center p-3 bg-white rounded-md border border-gray-200">
                    <PhoneCall className="h-5 w-5 text-blue-500 mr-3" />
                    <span className="font-medium">Audio</span>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfessionalProfile;
