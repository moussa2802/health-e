import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useProfessionals } from "../../hooks/useProfessionals";
import {
  CATEGORIES,
  getSpecialtiesByCategory,
  getCategoryLabel,
  type Category,
} from "../../constants/specialties";
import {
  getProfessionalCategory,
  getProfessionalSpecialtyLabel,
  getProfessionalCategoryLabel,
  getProfessionalSpecialties,
  getProfessionalSpecialtyLabels,
} from "../../services/profileService";
import {
  Star,
  Search,
  Filter,
  Clock,
  Calendar,
  CheckCircle2,
  User,
  AlertCircle,
  RefreshCw,
  Wifi,
  WifiOff,
  Globe,
} from "lucide-react";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import SpecialtyTags from "../../components/ui/SpecialtyTags";

const ProfessionalsList = () => {
  const { specialty } = useParams<{ specialty: string }>();
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredProfessionals, setFilteredProfessionals] = useState<any[]>([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(
    null
  );
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>("");
  const [realAvailabilities, setRealAvailabilities] = useState<
    Map<string, any>
  >(new Map());

  // Utiliser le hook useProfessionals avec le filtre de spécialité
  const { professionals, loading, error, refreshProfessionals } =
    useProfessionals(specialty);

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

  useEffect(() => {
    const filtered = professionals
      .filter(
        (professional) => professional.isActive && professional.isApproved
      )
      .filter((professional) => {
        // Filter by category if selected
        if (selectedCategory) {
          const professionalCategory = getProfessionalCategory(professional);
          if (professionalCategory !== selectedCategory) return false;
        }

        // Filter by specialty if selected
        if (selectedSpecialty) {
          const professionalSpecialties =
            getProfessionalSpecialties(professional);
          if (!professionalSpecialties.includes(selectedSpecialty))
            return false;
        }

        // Filter by search term
        if (searchTerm) {
          const searchLower = searchTerm.toLowerCase();
          const nameMatch = professional.name
            .toLowerCase()
            .includes(searchLower);
          const specialtyMatch = getProfessionalSpecialtyLabel(
            professional,
            "fr"
          )
            .toLowerCase()
            .includes(searchLower);
          const categoryMatch = getProfessionalCategoryLabel(professional, "fr")
            .toLowerCase()
            .includes(searchLower);

          if (!nameMatch && !specialtyMatch && !categoryMatch) return false;
        }

        return true;
      });
    setFilteredProfessionals(filtered);
  }, [searchTerm, professionals, selectedCategory, selectedSpecialty]);

  // Charger les vraies disponibilités pour chaque professionnel
  useEffect(() => {
    const loadRealAvailabilities = async () => {
      if (filteredProfessionals.length === 0) return;

      console.log(
        "Loading real availabilities for",
        filteredProfessionals.length,
        "professionals"
      );

      const availabilityPromises = filteredProfessionals.map(
        async (professional) => {
          try {
            const availability = await fetchRealAvailability(professional.id);
            return { professionalId: professional.id, availability };
          } catch (error) {
            console.error(
              `Error loading availability for ${professional.name}:`,
              error
            );
            return {
              professionalId: professional.id,
              availability: {
                upcomingDays: [],
                totalDays: 0,
                nextAvailableDay: null,
              },
            };
          }
        }
      );

      const results = await Promise.all(availabilityPromises);

      const newAvailabilities = new Map();
      results.forEach(({ professionalId, availability }) => {
        newAvailabilities.set(professionalId, availability);
      });

      setRealAvailabilities(newAvailabilities);
      console.log(
        "Real availabilities loaded for",
        results.length,
        "professionals"
      );
    };

    loadRealAvailabilities();
  }, [filteredProfessionals]);

  // Système de thème mappé pour éviter la purge Tailwind
  const categoryFromParam =
    selectedCategory ||
    (specialty === "mental" || specialty === "mental-health"
      ? "mental-health"
      : "sexual-health");

  const theme =
    categoryFromParam === "mental-health"
      ? {
          accentText: "text-sage",
          accentBorder: "border-sage",
          accentRing: "focus:ring-sage",
          chipIcon: "text-sage",
          badgeSoft: "bg-sage-soft text-sage",
          btnPrimary: "bg-sage text-white hover:bg-sage/90",
          btnOutline: "border border-sage text-sage hover:bg-sage-soft",
        }
      : {
          accentText: "text-accent",
          accentBorder: "border-accent",
          accentRing: "focus:ring-accent",
          chipIcon: "text-accent",
          badgeSoft: "bg-accent-soft text-accent",
          btnPrimary: "bg-accent text-white hover:bg-accent/90",
          btnOutline: "border border-accent text-accent hover:bg-accent-soft",
        };

  // Utility function to check if a value exists
  const safeValue = (value: any, defaultValue: any = "") => {
    return value !== undefined && value !== null ? value : defaultValue;
  };

  // Utility function to check if a value exists and is an array
  const safeArray = (arr: any): any[] => {
    return Array.isArray(arr) ? arr : [];
  };

  // Fonction pour récupérer les vraies disponibilités depuis calendar_events
  const fetchRealAvailability = async (professionalId: string) => {
    try {
      // Import dynamique pour éviter les erreurs côté serveur
      const { getFirestoreInstance } = await import("../../utils/firebase");
      const { collection, query, where, getDocs, startOfDay, addDays } =
        await import("firebase/firestore");
      const { format, addMonths } = await import("date-fns");

      const db = getFirestoreInstance();
      if (!db) {
        console.warn("Firestore not available for availability check");
        return { upcomingDays: [], totalDays: 0, nextAvailableDay: null };
      }

      const today = new Date();
      const endDate = addMonths(today, 2); // Chercher sur 2 mois

      // Requête pour récupérer tous les créneaux disponibles du professionnel
      const eventsRef = collection(db, "calendar_events");
      const availabilityQuery = query(
        eventsRef,
        where("professionalId", "==", professionalId),
        where("isAvailable", "==", true),
        where("start", ">=", today),
        where("start", "<=", endDate)
      );

      const querySnapshot = await getDocs(availabilityQuery);
      const availableSlots: { date: Date; time: string }[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.start && data.start.toDate) {
          const startDate = data.start.toDate();
          availableSlots.push({
            date: startDate,
            time: format(startDate, "HH:mm"),
          });
        }
      });

      if (availableSlots.length === 0) {
        return { upcomingDays: [], totalDays: 0, nextAvailableDay: null };
      }

      // Grouper par jour et calculer les statistiques
      const dayNames = [
        "Dimanche",
        "Lundi",
        "Mardi",
        "Mercredi",
        "Jeudi",
        "Vendredi",
        "Samedi",
      ];

      const availableDaysSet = new Set<string>();
      let nextAvailableDay: string | null = null;

      availableSlots.forEach((slot) => {
        const dayName = dayNames[slot.date.getDay()];
        availableDaysSet.add(dayName);

        // Déterminer le prochain jour disponible
        if (!nextAvailableDay) {
          nextAvailableDay = dayName;
        }
      });

      const upcomingDays = Array.from(availableDaysSet);

      return {
        upcomingDays,
        totalDays: upcomingDays.length,
        nextAvailableDay,
        totalSlots: availableSlots.length,
      };
    } catch (error) {
      console.error("Error fetching real availability:", error);
      return { upcomingDays: [], totalDays: 0, nextAvailableDay: null };
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-paper">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <LoadingSpinner size="lg" />
              <p className="mt-4 text-lg text-ink-soft">
                Chargement des professionnels...
              </p>
              <p className="mt-2 text-sm text-muted">
                {specialty === "mental" ? "Profil psychologique" : "Vie intime"}
              </p>
              <div className="mt-4 flex items-center justify-center">
                {isOnline ? (
                  <div className="flex items-center text-ok">
                    <Wifi className="h-4 w-4 mr-1" />
                    <span className="text-sm">En ligne</span>
                  </div>
                ) : (
                  <div className="flex items-center text-danger">
                    <WifiOff className="h-4 w-4 mr-1" />
                    <span className="text-sm">Hors ligne</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-paper">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto">
            <div className="bg-danger/10 border border-danger/20 text-danger px-6 py-4 rounded-card">
              <div className="flex items-center">
                <AlertCircle className="h-6 w-6 mr-3 flex-shrink-0" />
                <div>
                  <h3 className="font-display font-bold">
                    Erreur de chargement
                  </h3>
                  <p className="mt-1">{error}</p>
                </div>
              </div>
              <div className="mt-4 flex items-center space-x-4">
                <button
                  onClick={refreshProfessionals}
                  className="bg-danger text-white px-4 py-2 rounded-pill hover:bg-danger/90 transition-colors inline-flex items-center font-medium"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Réessayer
                </button>
                <div className="flex items-center">
                  {isOnline ? (
                    <div className="flex items-center text-ok">
                      <Wifi className="h-4 w-4 mr-1" />
                      <span className="text-sm">Connexion active</span>
                    </div>
                  ) : (
                    <div className="flex items-center text-danger">
                      <WifiOff className="h-4 w-4 mr-1" />
                      <span className="text-sm">Pas de connexion</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-paper">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1
            className={`font-display text-3xl font-bold mb-2 ${theme.accentText}`}
          >
            {categoryFromParam === "mental-health"
              ? "Profil psychologique"
              : "Vie intime"}
          </h1>
          <p className="text-ink-soft mb-4">
            {filteredProfessionals.length} professionnel
            {filteredProfessionals.length > 1 ? "s" : ""}
            {professionals.length !== filteredProfessionals.length &&
              ` sur ${professionals.length} disponible${
                professionals.length > 1 ? "s" : ""
              }`}
          </p>
          <div className="relative">
            <input
              type="text"
              placeholder="Rechercher un professionnel..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full px-4 py-3 pl-12 rounded-pill border border-line bg-card focus:outline-none focus:ring-2 ${theme.accentRing} focus:border-transparent`}
            />
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted h-5 w-5" />
          </div>

          {/* Filtres de catégorie et spécialité */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div>
              <label className="flex items-center text-sm font-medium text-ink-soft mb-2">
                <Filter className="h-4 w-4 mr-1" />
                Catégorie
              </label>
              <select
                value={selectedCategory || ""}
                onChange={(e) => {
                  const category = e.target.value as Category;
                  setSelectedCategory(category || null);
                  setSelectedSpecialty(""); // Reset specialty when category changes
                }}
                className="w-full px-3 py-2 border border-line rounded-xl bg-card focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
              >
                <option value="">Toutes les catégories</option>
                {CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {getCategoryLabel(category, "fr")}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="flex items-center text-sm font-medium text-ink-soft mb-2">
                <Filter className="h-4 w-4 mr-1" />
                Spécialité
              </label>
              <select
                value={selectedSpecialty}
                onChange={(e) => setSelectedSpecialty(e.target.value)}
                className="w-full px-3 py-2 border border-line rounded-xl bg-card focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!selectedCategory}
              >
                <option value="">Toutes les spécialités</option>
                {selectedCategory &&
                  getSpecialtiesByCategory(selectedCategory).map((specialty) => (
                    <option key={specialty.key} value={specialty.key}>
                      {specialty.labels.fr}
                    </option>
                  ))}
              </select>
            </div>
          </div>
        </div>

        {filteredProfessionals.length === 0 ? (
          <div className="text-center py-12">
            <User className="mx-auto h-12 w-12 text-muted" />
            <h3 className="mt-2 text-sm font-medium text-ink">
              Aucun professionnel trouvé
            </h3>
            <p className="mt-1 text-sm text-muted">
              {searchTerm
                ? "Essayez de modifier votre recherche."
                : "Aucun professionnel n'est encore disponible dans cette catégorie."}
            </p>
            {!isOnline && (
              <div className="mt-4 flex items-center justify-center text-danger">
                <WifiOff className="h-4 w-4 mr-1" />
                <span className="text-sm">Vérifiez votre connexion internet</span>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6 stagger">
            {filteredProfessionals.map((professional) => {
              // Safety checks for each professional
              const professionalName = safeValue(
                professional.name,
                "Nom non disponible"
              );
              const professionalSpecialties =
                getProfessionalSpecialties(professional);
              const professionalSpecialtyLabels = getProfessionalSpecialtyLabels(
                professional,
                "fr"
              );
              const professionalCategoryLabel = getProfessionalCategoryLabel(
                professional,
                "fr"
              );
              const professionalRating = safeValue(professional.rating, 0);
              const professionalReviews = safeValue(professional.reviews, 0);
              // Prix robuste avec fallback
              const professionalPrice =
                professional.price ?? professional.consultationFee ?? 0;
              const professionalCurrency = safeValue(
                professional.currency,
                "XOF"
              );
              const professionalLanguages = safeArray(professional.languages);

              const isAvailableNow = false; // Désactivé temporairement

              // Utiliser les vraies disponibilités si disponibles, sinon fallback
              const availabilityInfo = realAvailabilities.get(
                professional.id
              ) || {
                upcomingDays: [],
                totalDays: 0,
                nextAvailableDay: "Chargement...",
                totalSlots: 0,
              };

              // Vérifier si le professionnel est disponible aujourd'hui
              const today = new Date().toLocaleDateString("fr-FR", {
                weekday: "long",
              });
              const isAvailableToday = availabilityInfo.upcomingDays.some(
                (day: string) => day.toLowerCase() === today.toLowerCase()
              );

              return (
                <div
                  key={professional.id}
                  className="bg-card rounded-card shadow-soft hover:shadow-lift border border-line transition-shadow duration-300 overflow-hidden"
                >
                  <div className="flex flex-col md:flex-row">
                    <div className="md:w-1/4 bg-paper relative">
                      {professional.profileImage ? (
                        <img
                          src={professional.profileImage}
                          alt={professionalName}
                          className="h-40 md:h-full w-full object-cover object-center"
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
                        className={`h-40 md:h-full w-full flex items-center justify-center bg-paper-dark ${
                          professional.profileImage ? "hidden" : ""
                        }`}
                      >
                        <User className="h-16 w-16 text-muted" />
                      </div>
                      {isAvailableNow && (
                        <div className="absolute top-4 right-4 bg-ok text-white px-3 py-1 rounded-pill text-sm font-medium flex items-center shadow-lift">
                          <div className="w-2 h-2 bg-white rounded-full mr-2 animate-pulse"></div>
                          Disponible maintenant
                        </div>
                      )}
                      {isAvailableToday && !isAvailableNow && (
                        <div className="absolute top-4 right-4 bg-ok text-white px-3 py-1 rounded-pill text-sm font-medium flex items-center shadow-lift">
                          <Calendar className="h-3 w-3 mr-1" />
                          Disponible aujourd'hui
                        </div>
                      )}
                    </div>

                    <div className="p-6 md:w-3/4 flex flex-col min-h-[400px]">
                      <div className="flex flex-col md:flex-row md:justify-between md:items-start mb-4">
                        <div className="flex items-center gap-2">
                          <h2 className="font-display text-xl font-semibold text-ink">
                            {professionalName}
                          </h2>
                          <CheckCircle2 className="h-5 w-5 text-ok" />
                        </div>

                        <div className="flex items-center mt-2 md:mt-0">
                          <Star className="h-5 w-5 fill-gold text-gold" />
                          <span className="ml-1 font-semibold text-ink">
                            {professionalRating}
                          </span>
                          <span className="ml-1 text-muted">
                            ({professionalReviews} avis)
                          </span>
                        </div>
                      </div>

                      <div className="mb-2">
                        <SpecialtyTags
                          specialties={professionalSpecialties}
                          language="fr"
                          maxDisplay={2}
                          className="mb-1"
                        />
                        <p className="text-sm text-muted">
                          {professionalSpecialtyLabels.length > 0
                            ? `${professionalSpecialtyLabels.length} spécialités`
                            : "Spécialité non renseignée"}
                        </p>
                        <p className="text-sm text-ink-soft mt-1">
                          {professionalCategoryLabel}
                        </p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <div className="flex items-center">
                          <Globe className={`h-5 w-5 ${theme.chipIcon} mr-2 flex-shrink-0`} />
                          <span className="text-sm text-ink-soft">
                            {professionalLanguages.length > 0 ? (
                              <span className="flex flex-wrap gap-1">
                                {professionalLanguages.map(
                                  (lang: string, index: number) => (
                                    <span
                                      key={index}
                                      className="bg-paper border border-line text-ink-soft px-2 py-1 rounded-pill text-xs"
                                    >
                                      {lang}
                                    </span>
                                  )
                                )}
                              </span>
                            ) : (
                              "Langues non précisées"
                            )}
                          </span>
                        </div>

                        <div className="flex items-center">
                          <Clock className={`h-5 w-5 ${theme.chipIcon} mr-2 flex-shrink-0`} />
                          <span className="text-sm text-ink-soft">
                            {availabilityInfo.nextAvailableDay
                              ? availabilityInfo.nextAvailableDay
                              : "Disponibilité à définir"}
                          </span>
                        </div>

                        <div className="flex items-center">
                          <Calendar
                            className={`h-5 w-5 ${theme.chipIcon} mr-2 flex-shrink-0`}
                          />
                          <span className="text-sm text-ink-soft">
                            {availabilityInfo.totalDays} jour
                            {availabilityInfo.totalDays > 1 ? "s" : ""} disponible
                            {availabilityInfo.totalDays > 1 ? "s" : ""}
                            {availabilityInfo.totalSlots &&
                              availabilityInfo.totalSlots > 0 && (
                                <span className="text-xs text-ok ml-1">
                                  ({availabilityInfo.totalSlots} créneaux)
                                </span>
                              )}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row justify-between items-center mt-auto">
                        <div
                          className={`font-display text-lg font-bold ${theme.accentText} mb-4 sm:mb-0`}
                        >
                          {professionalPrice === 0 || professionalPrice === null
                            ? "Tarif sur demande"
                            : `${professionalPrice.toLocaleString(
                                "fr-FR"
                              )} ${professionalCurrency} / consultation`}
                        </div>

                        <div className="flex space-x-4">
                          <Link
                            to={`/professional/${professional.id}`}
                            className={`px-4 py-2 rounded-pill ${theme.btnOutline} transition-colors font-medium`}
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
                            Voir le profil
                          </Link>
                          <Link
                            to={`/book/${professional.id}`}
                            className={`px-4 py-2 rounded-pill ${
                              isAvailableNow
                                ? "bg-ok text-white hover:bg-ok/90"
                                : theme.btnPrimary
                            } transition-colors font-medium`}
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
                            {isAvailableNow
                              ? "Consulter maintenant"
                              : "Prendre RDV"}
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfessionalsList;
