import React, { useState, useEffect, Suspense, lazy, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import {
  Brain,
  Heart,
  User,
  Stethoscope,
  ShieldAlert,
  Calendar,
  Video,
  CheckCircle,
  Star,
  ArrowRight,
  Users,
  MessageCircle,
  UsersRound,
  X,
} from "lucide-react";
import { useOptimizedProfessionals } from "../hooks/useOptimizedProfessionals";
import { useDebounce } from "../hooks/useDebounce";
import { useIntersectionObserver } from "../hooks/useIntersectionObserver";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import ErrorBoundary from "../components/ui/ErrorBoundary";
import {
  getActiveGroupTherapySessions,
  registerUserToSession,
  isUserRegisteredInSession,
  GroupTherapySession,
} from "../services/groupTherapyService";
import { getProfessionalPublicById } from "../services/professionalService";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

// Lazy load heavy components
const FeaturedContentSection = lazy(
  () => import("../components/sections/FeaturedContentSection")
);

const OptimizedHomePage: React.FC = () => {
  const { isAuthenticated, currentUser } = useAuth();
  const navigate = useNavigate();
  const [searchTerm] = useState("");
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const [groupTherapySessions, setGroupTherapySessions] = useState<
    GroupTherapySession[]
  >([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [selectedSession, setSelectedSession] =
    useState<GroupTherapySession | null>(null);
  const [showRegistrationModal, setShowRegistrationModal] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [registrationLoading, setRegistrationLoading] = useState(false);
  const [registrationError, setRegistrationError] = useState<string | null>(
    null
  );
  const [professionalNames, setProfessionalNames] = useState<
    Record<string, { name: string; specialty?: string; profileImage?: string }>
  >({});

  // Debounce search to reduce API calls
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  // Use optimized professionals hook
  const { professionals } = useOptimizedProfessionals();

  // Intersection observer for lazy loading sections
  const { targetRef: heroRef } = useIntersectionObserver();
  const { targetRef: servicesRef, isIntersecting: servicesVisible } =
    useIntersectionObserver();
  const {
    targetRef: featuredContentRef,
    isIntersecting: featuredContentVisible,
  } = useIntersectionObserver();

  // Gestion du scroll pour le header
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Intersection Observer pour le contenu en vedette
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          // setFeaturedContentVisible(true); // supprimé car inutilisé
        }
      },
      { threshold: 0.1 }
    );

    if (featuredContentRef.current) {
      observer.observe(featuredContentRef.current);
    }

    return () => observer.disconnect();
  }, []);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target as Node)
      ) {
        // setShowSuggestions(false); // supprimé car inutilisé
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Charger les sessions de thérapie de groupe et les noms des professionnels avec retry robuste
  useEffect(() => {
    let cancelled = false;
    let retryCount = 0;
    const MAX_RETRIES = 3;
    const RETRY_DELAYS = [1000, 2000, 3000]; // Delays en ms pour chaque retry

    const fetchSessions = async (): Promise<void> => {
      if (cancelled) return;

      try {
        if (retryCount === 0) {
          setLoadingSessions(true);
        }
        console.log(
          `🔄 [HOMEPAGE] Fetching group therapy sessions (attempt ${
            retryCount + 1
          }/${MAX_RETRIES + 1})...`
        );

        const sessions = await getActiveGroupTherapySessions();

        if (cancelled) return;

        // Si aucune session n'est retournée mais qu'on n'est pas au dernier retry, réessayer
        if (sessions.length === 0 && retryCount < MAX_RETRIES) {
          console.warn(
            `⚠️ [HOMEPAGE] No sessions found, retrying in ${RETRY_DELAYS[retryCount]}ms...`
          );
          const currentRetry = retryCount;
          retryCount++;
          setTimeout(() => {
            if (!cancelled) {
              fetchSessions();
            }
          }, RETRY_DELAYS[currentRetry]);
          return;
        }

        console.log(
          `✅ [HOMEPAGE] Group therapy sessions loaded: ${sessions.length} sessions`
        );
        setGroupTherapySessions(sessions);

        // Charger les noms des professionnels
        const professionalIds = new Set<string>();
        sessions.forEach((session) => {
          if (session.primaryHostId) professionalIds.add(session.primaryHostId);
          session.secondaryHostIds?.forEach((id) => professionalIds.add(id));
        });

        const namesMap: Record<
          string,
          { name: string; specialty?: string; profileImage?: string }
        > = {};

        // Charger les noms des professionnels depuis professionals (public, pas besoin d'auth)
        console.log(
          `[HOMEPAGE] Loading host profiles from professionals for ${professionalIds.size} professionals`
        );
        await Promise.all(
          Array.from(professionalIds).map(async (id) => {
            try {
              const prof = await getProfessionalPublicById(id);
              if (prof && !cancelled) {
                namesMap[id] = {
                  name: prof.name,
                  specialty: prof.specialty || prof.primarySpecialty,
                  profileImage: prof.profileImage,
                };
              } else if (!cancelled) {
                console.warn(
                  `⚠️ [HOMEPAGE] Professional ${id} not found in professionals`
                );
              }
            } catch (error) {
              console.warn(
                `⚠️ [HOMEPAGE] Failed to load professional ${id}:`,
                error
              );
              // Continue même si un professionnel ne charge pas
            }
          })
        );
        console.log(
          `[HOMEPAGE] Loaded ${
            Object.keys(namesMap).length
          } professional profiles`
        );

        if (!cancelled) {
          setProfessionalNames(namesMap);
          setLoadingSessions(false);
        }
      } catch (error) {
        console.error(
          "❌ [HOMEPAGE] Error fetching group therapy sessions:",
          error
        );

        // Retry si on n'a pas atteint le maximum
        if (retryCount < MAX_RETRIES) {
          const currentRetry = retryCount;
          console.log(
            `🔄 [HOMEPAGE] Retrying after error (attempt ${
              currentRetry + 1
            }/${MAX_RETRIES})...`
          );
          retryCount++;
          setTimeout(() => {
            if (!cancelled) {
              fetchSessions();
            }
          }, RETRY_DELAYS[currentRetry]);
          return;
        }

        // Après tous les retries, définir un tableau vide
        if (!cancelled) {
          setGroupTherapySessions([]);
          setLoadingSessions(false);
        }
      }
    };

    // Démarrer le chargement
    fetchSessions();

    // Cleanup function
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (debouncedSearchTerm.length >= 2) {
      const filtered = professionals.filter((professional) => {
        const searchLower = debouncedSearchTerm.toLowerCase();
        const nameLower = professional.name?.toLowerCase() || "";
        const specialtyLower = professional.specialty?.toLowerCase() || "";
        const typeLower = professional.type?.toLowerCase() || "";

        return (
          nameLower.includes(searchLower) ||
          specialtyLower.includes(searchLower) ||
          typeLower.includes(searchLower)
        );
      });

      // setSuggestions(filtered); // supprimé car inutilisé
      // setShowSuggestions(true); // supprimé car inutilisé
      // setNoResults(filtered.length === 0); // supprimé car inutilisé
    } else {
      // setSuggestions([]); // supprimé car inutilisé
      // setShowSuggestions(false); // supprimé car inutilisé
      // setNoResults(false); // supprimé car inutilisé
    }
  }, [debouncedSearchTerm, professionals]);

  const handleRegisterToSession = async (session: GroupTherapySession) => {
    if (!isAuthenticated || !currentUser) {
      // Si non connecté, rediriger vers /patient/access avec sessionId en query param
      navigate(`/patient/access?groupSessionId=${session.id}`);
      return;
    }

    // Vérifier si déjà inscrit
    try {
      const alreadyRegistered = await isUserRegisteredInSession(
        session.id,
        currentUser.id
      );
      if (alreadyRegistered) {
        alert("Vous êtes déjà inscrit à cette session ✅");
        return;
      }

      // Vérifier si complet (utiliser registrationsCount mis à jour par transaction atomique)
      const registrationsCount = session.registrationsCount ?? 0;
      if (registrationsCount >= session.capacity) {
        alert("Cette session est complète");
        return;
      }

      // Inscription
      setRegistrationLoading(true);
      setRegistrationError(null);
      const result = await registerUserToSession(session.id, currentUser.id);
      if (result.status === "alreadyRegistered") {
        alert("Vous êtes déjà inscrit à cette session ✅");
      } else {
        alert("Inscription réussie ! ✅");
      }

      // Recharger les sessions et les noms des professionnels
      const sessions = await getActiveGroupTherapySessions();
      setGroupTherapySessions(sessions);

      // Recharger les noms des professionnels
      const professionalIds = new Set<string>();
      sessions.forEach((s) => {
        if (s.primaryHostId) professionalIds.add(s.primaryHostId);
        s.secondaryHostIds?.forEach((id) => professionalIds.add(id));
      });

      const namesMap: Record<
        string,
        { name: string; specialty?: string; profileImage?: string }
      > = {};
      await Promise.all(
        Array.from(professionalIds).map(async (id) => {
          const prof = await getProfessionalPublicById(id);
          if (prof) {
            namesMap[id] = {
              name: prof.name,
              specialty: prof.specialty || prof.primarySpecialty,
              profileImage: prof.profileImage,
            };
          }
        })
      );
      setProfessionalNames(namesMap);
    } catch (error) {
      console.error("Error registering to session:", error);
      setRegistrationError(
        error instanceof Error ? error.message : "Erreur lors de l'inscription"
      );
      alert(
        error instanceof Error ? error.message : "Erreur lors de l'inscription"
      );
    } finally {
      setRegistrationLoading(false);
    }
  };

  const handlePhoneRegistration = async () => {
    if (!selectedSession) return;
    if (!phoneNumber.trim()) {
      setRegistrationError("Veuillez entrer un numéro de téléphone");
      return;
    }

    try {
      setRegistrationLoading(true);
      setRegistrationError(null);

      // Normaliser le numéro de téléphone
      const normalizedPhone = phoneNumber.startsWith("+")
        ? phoneNumber
        : `+${phoneNumber}`;

      // Rediriger vers la page de création de compte patient
      navigate("/patient/access", {
        state: {
          phone: normalizedPhone,
          redirectAfterAuth: true,
          groupTherapySessionId: selectedSession.id,
        },
      });
    } catch (error) {
      console.error("Error initiating phone registration:", error);
      setRegistrationError(
        error instanceof Error ? error.message : "Erreur lors de l'inscription"
      );
    } finally {
      setRegistrationLoading(false);
    }
  };

  // Note: On permet aux utilisateurs de voir la page d'accueil même s'ils sont connectés
  // pour qu'ils puissent s'inscrire aux thérapies de groupe

  return (
    <ErrorBoundary>
      <div className="flex flex-col min-h-screen">
        {/* Transparent Header */}
        <header
          className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
            isScrolled
              ? "bg-white/95 backdrop-blur-md shadow-lg text-gray-900"
              : "bg-white/20 backdrop-blur-md text-white"
          }`}
        >
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between py-4">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-teal-400 rounded-xl flex items-center justify-center mr-3">
                  <Heart className="h-6 w-6 text-white" />
                </div>
                <span className="text-xl font-bold">Health-e</span>
              </div>

              <div className="flex items-center space-x-4">
                <Link
                  to="/patient"
                  className={`px-6 py-3 rounded-xl font-semibold transition-all duration-200 border ${
                    isScrolled
                      ? "bg-blue-500 text-white hover:bg-blue-600 border-blue-500 shadow-md hover:shadow-lg"
                      : "bg-white/20 text-white hover:bg-white/30 backdrop-blur-sm border-white/30 shadow-md hover:shadow-lg"
                  }`}
                >
                  Prendre rendez-vous
                </Link>

                <Link
                  to="/professional/access"
                  className={`px-6 py-3 rounded-xl font-semibold transition-all duration-200 border ${
                    isScrolled
                      ? "bg-teal-500 text-white hover:bg-teal-600 border-teal-500 shadow-md hover:shadow-lg"
                      : "bg-white/20 text-white hover:bg-white/30 backdrop-blur-sm border-white/30 shadow-md hover:shadow-lg"
                  }`}
                >
                  Espace professionnel
                </Link>
              </div>
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <section
          ref={heroRef}
          className="relative bg-gradient-to-br from-blue-500 via-teal-400 to-emerald-400 pt-32 pb-32 overflow-hidden"
        >
          {/* Background illustration */}
          <div className="absolute inset-0 bg-[url('https://images.pexels.com/photos/3376799/pexels-photo-3376799.jpeg?auto=compress&cs=tinysrgb&w=1920')] bg-cover bg-center mix-blend-overlay opacity-10"></div>

          {/* Medical illustration overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-blue-400/20 to-teal-400/20"></div>

          {/* Floating medical icons */}
          <div className="absolute top-20 right-10 opacity-20">
            <Stethoscope className="h-16 w-16 text-white animate-pulse" />
          </div>
          <div className="absolute bottom-20 left-10 opacity-20">
            <Brain className="h-12 w-12 text-white animate-pulse delay-1000" />
          </div>

          <div className="container mx-auto px-4 relative">
            <div className="max-w-4xl mx-auto text-center">
              <h1 className="text-5xl md:text-7xl font-bold text-white mb-8 animate-fade-in">
                Santé mentale et sexuelle en toute confidentialité
              </h1>
              <p className="text-xl md:text-2xl text-white/90 mb-16 animate-fade-in-delay">
                Consultez des professionnels de santé qualifiés en ligne, en
                toute discrétion. Une plateforme pensée pour tous, où que vous
                soyez.
              </p>

              {/* User Type Selection Buttons */}
              <div className="flex justify-center mt-16 animate-fade-in-delay-2">
                <Link
                  to="/patient"
                  className="group bg-white text-blue-600 px-8 py-8 rounded-2xl shadow-xl hover:shadow-2xl transition-all transform hover:-translate-y-2 flex flex-col items-center border border-white/30 shadow-md hover:shadow-lg"
                >
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <User className="h-8 w-8 text-white" />
                  </div>
                  <span className="text-2xl font-bold mb-2">
                    Je veux consulter un professionnel
                  </span>
                  <span className="text-sm text-gray-600 text-center">
                    Prenez rendez-vous avec nos spécialistes
                  </span>
                </Link>
              </div>

              {/* Real-time Statistics */}
              <div className="mt-16 flex justify-center items-center space-x-12 text-white/90 animate-fade-in-delay-3">
                <div className="text-center">
                  <div className="text-3xl font-bold flex items-center justify-center">
                    <Users className="h-6 w-6 mr-2" />
                    {professionals.length}
                  </div>
                  <div className="text-sm">Professionnels disponibles</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold flex items-center justify-center">
                    <MessageCircle className="h-6 w-6 mr-2" />
                    1000+
                  </div>
                  <div className="text-sm">Consultations réalisées</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Group Therapy Section */}
        <section className="py-20 bg-white">
          <div className="container mx-auto px-4">
            <h2 className="text-4xl font-bold text-center mb-4">
              Thérapies de groupe
            </h2>
            <p className="text-gray-600 text-center mb-16 max-w-2xl mx-auto">
              Rejoignez nos sessions de thérapie de groupe animées par des
              professionnels qualifiés
            </p>

            {loadingSessions ? (
              <div className="flex justify-center items-center py-12">
                <LoadingSpinner size="lg" />
                <span className="ml-3 text-gray-600">
                  Chargement des sessions...
                </span>
              </div>
            ) : groupTherapySessions.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
                {groupTherapySessions.map((session) => {
                  // Utiliser uniquement registrationsCount (mis à jour par transaction atomique)
                  const registrationsCount = session.registrationsCount ?? 0;
                  const isFull = registrationsCount >= session.capacity;
                  const isFree = session.price === 0;

                  // Formater la date
                  const formattedDate = session.date
                    ? format(
                        new Date(session.date + "T00:00:00"),
                        "EEEE d MMMM yyyy",
                        {
                          locale: fr,
                        }
                      )
                    : "";

                  // Récupérer les infos des hôtes
                  const primaryHost = professionalNames[session.primaryHostId];
                  const secondaryHosts =
                    session.secondaryHostIds
                      ?.map((id) => professionalNames[id])
                      .filter(Boolean) || [];

                  return (
                    <div
                      key={session.id}
                      className="bg-white rounded-xl shadow-lg border border-gray-200 hover:shadow-xl transition-all duration-300 overflow-hidden"
                    >
                      {/* Header avec gradient */}
                      <div className="bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 p-6 text-white">
                        <h3 className="text-xl font-bold mb-4">
                          {session.title}
                        </h3>
                        {session.date && (
                          <div className="flex items-center space-x-2 mb-2 text-sm">
                            <Calendar className="h-4 w-4" />
                            <span>{formattedDate}</span>
                          </div>
                        )}
                        {session.time && (
                          <div className="flex items-center space-x-2 text-sm">
                            <Video className="h-4 w-4" />
                            <span>{session.time}</span>
                          </div>
                        )}
                      </div>

                      {/* Body */}
                      <div className="p-6">
                        <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                          {session.description}
                        </p>

                        {/* Hôtes */}
                        {(primaryHost || secondaryHosts.length > 0) && (
                          <div className="mb-4">
                            <p className="font-semibold text-sm text-gray-700 mb-2">
                              Hôte(s):
                            </p>
                            {primaryHost && (
                              <Link
                                to={`/professional/${session.primaryHostId}`}
                                className="flex items-center space-x-2 mb-2 p-2 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer group"
                              >
                                {primaryHost.profileImage ? (
                                  <img
                                    src={primaryHost.profileImage}
                                    alt={primaryHost.name}
                                    className="w-8 h-8 rounded-full object-cover"
                                  />
                                ) : (
                                  <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                                    <User className="h-4 w-4 text-purple-600" />
                                  </div>
                                )}
                                <div className="flex-1">
                                  <div className="flex items-center space-x-2">
                                    <span className="text-sm font-medium group-hover:text-purple-600 transition-colors">
                                      {primaryHost.name}
                                    </span>
                                    <span className="bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full text-xs font-semibold">
                                      Principal
                                    </span>
                                  </div>
                                  {primaryHost.specialty && (
                                    <p className="text-xs text-gray-500">
                                      {primaryHost.specialty}
                                    </p>
                                  )}
                                </div>
                              </Link>
                            )}
                            {secondaryHosts.map((host, idx) => {
                              const hostId = session.secondaryHostIds?.[idx];
                              return (
                                <Link
                                  key={idx}
                                  to={`/professional/${hostId}`}
                                  className="flex items-center space-x-2 mb-2 p-2 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer group"
                                >
                                  {host.profileImage ? (
                                    <img
                                      src={host.profileImage}
                                      alt={host.name}
                                      className="w-8 h-8 rounded-full object-cover"
                                    />
                                  ) : (
                                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                                      <User className="h-4 w-4 text-gray-600" />
                                    </div>
                                  )}
                                  <div className="flex-1">
                                    <span className="text-sm font-medium group-hover:text-purple-600 transition-colors">
                                      {host.name}
                                    </span>
                                    {host.specialty && (
                                      <p className="text-xs text-gray-500">
                                        {host.specialty}
                                      </p>
                                    )}
                                  </div>
                                </Link>
                              );
                            })}
                          </div>
                        )}

                        {/* Places et prix */}
                        <div className="flex items-center justify-between mb-4 text-sm">
                          <div className="flex items-center text-gray-600">
                            <Users className="h-4 w-4 mr-1" />
                            <span>
                              {session.registrationsCount !== undefined
                                ? `${session.registrationsCount} / ${session.capacity} places`
                                : "Places limitées"}
                            </span>
                          </div>
                          <div className="flex items-center">
                            {isFree ? (
                              <>
                                <Heart className="h-4 w-4 text-green-600 mr-1" />
                                <span className="text-green-600 font-semibold">
                                  Gratuit
                                </span>
                              </>
                            ) : (
                              <span className="text-gray-700 font-semibold">
                                {session.price} XOF
                              </span>
                            )}
                          </div>
                        </div>

                        <button
                          onClick={() => {
                            sessionStorage.setItem(
                              "pendingGroupTherapySessionId",
                              session.id
                            );
                            sessionStorage.setItem(
                              "pendingGroupTherapyRegistration",
                              "1"
                            );
                            navigate("/patient/access");
                          }}
                          disabled={isFull}
                          className={`w-full py-3 rounded-xl font-semibold transition-all duration-200 flex items-center justify-center ${
                            isFull
                              ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                              : "bg-gradient-to-r from-purple-500 to-pink-600 text-white hover:from-purple-600 hover:to-pink-700 shadow-md hover:shadow-lg"
                          }`}
                        >
                          {isFull ? "Complet" : "S'inscrire"}
                          {!isFull && <ArrowRight className="h-4 w-4 ml-2" />}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12">
                <UsersRound className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">
                  Aucune session de thérapie de groupe disponible pour le
                  moment.
                </p>
                <p className="text-gray-400 text-sm mt-2">
                  Revenez bientôt pour découvrir nos prochaines sessions !
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Social Media Section */}
        <section className="py-16 bg-gradient-to-r from-blue-50 to-teal-50">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                Suivez-nous sur nos réseaux sociaux
              </h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                Restez connectés avec Health-e pour des conseils santé, des
                témoignages et des actualités
              </p>
            </div>

            <div className="flex flex-col md:flex-row justify-center items-center gap-8 max-w-4xl mx-auto">
              {/* TikTok */}
              <a
                href="https://www.tiktok.com/@healthesn?_t=ZS-8z6ypqqlr4j&_r=1"
                target="_blank"
                rel="noopener noreferrer"
                className="group bg-black text-white px-8 py-6 rounded-2xl shadow-lg hover:shadow-2xl transition-all transform hover:-translate-y-2 flex flex-col items-center w-full md:w-auto"
              >
                <div className="w-16 h-16 bg-gradient-to-br from-pink-500 to-blue-500 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <svg
                    className="h-8 w-8 text-white"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-.88-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
                  </svg>
                </div>
                <span className="text-xl font-bold mb-2">TikTok</span>
                <span className="text-sm text-gray-300 text-center">
                  Conseils santé et témoignages
                </span>
              </a>

              {/* Instagram */}
              <a
                href="https://www.instagram.com/health_e.sn?igsh=c3pjaXVoY2F1ZW85&utm_source=qr"
                target="_blank"
                rel="noopener noreferrer"
                className="group bg-gradient-to-br from-purple-600 via-pink-600 to-orange-500 text-white px-8 py-6 rounded-2xl shadow-lg hover:shadow-2xl transition-all transform hover:-translate-y-2 flex flex-col items-center w-full md:w-auto"
              >
                <div className="w-16 h-16 bg-white bg-opacity-20 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <svg
                    className="h-8 w-8 text-white"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                  </svg>
                </div>
                <span className="text-xl font-bold mb-2">Instagram</span>
                <span className="text-sm text-white text-center">
                  Photos et stories santé
                </span>
              </a>
            </div>
          </div>
        </section>

        {/* Featured Content Section */}
        <section ref={featuredContentRef} className="py-20 bg-gray-50">
          {featuredContentVisible && (
            <Suspense
              fallback={
                <div className="flex justify-center items-center h-32">
                  <LoadingSpinner size="lg" />
                  <span className="ml-3 text-gray-600">
                    Chargement du contenu...
                  </span>
                </div>
              }
            >
              <FeaturedContentSection />
            </Suspense>
          )}
        </section>

        {/* Services Section */}
        <section ref={servicesRef} className="py-20 bg-gray-50">
          {servicesVisible && (
            <div className="container mx-auto px-4">
              <h2 className="text-4xl font-bold text-center mb-4">
                Nos services
              </h2>
              <p className="text-gray-600 text-center mb-16 max-w-2xl mx-auto">
                Des soins spécialisés avec des professionnels qualifiés qui
                comprennent votre culture et vos besoins
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
                {/* Mental Health Card */}
                <div className="group bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-100 hover:border-blue-200">
                  <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <Brain className="h-10 w-10 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold mb-4 text-gray-900">
                    Santé mentale
                  </h3>
                  <p className="text-gray-600 mb-6 leading-relaxed">
                    Un soutien mental bienveillant et confidentiel. Nos
                    psychologues et psychiatres vous accompagnent avec empathie
                    et professionnalisme pour votre bien-être mental.
                  </p>
                  <div className="mb-6 text-sm text-gray-500 flex items-center">
                    <Users className="h-4 w-4 mr-2" />
                    {
                      professionals.filter((p) => p.type === "mental").length
                    }{" "}
                    professionnel
                    {professionals.filter((p) => p.type === "mental").length > 1
                      ? "s"
                      : ""}{" "}
                    disponible
                    {professionals.filter((p) => p.type === "mental").length > 1
                      ? "s"
                      : ""}
                  </div>
                  <Link
                    to="/professionals/mental"
                    className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-3 rounded-xl text-center font-semibold hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-md hover:shadow-lg flex items-center justify-center group"
                  >
                    Prendre rendez-vous
                    <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </div>

                {/* Sexual Health Card */}
                <div className="group bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-100 hover:border-rose-200">
                  <div className="w-20 h-20 bg-gradient-to-br from-rose-500 to-rose-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <Heart className="h-10 w-10 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold mb-4 text-gray-900">
                    Santé sexuelle
                  </h3>
                  <p className="text-gray-600 mb-6 leading-relaxed">
                    Votre intimité respectée, votre santé écoutée. Échangez avec
                    des gynécologues, sexologues et urologues expérimentés dans
                    un cadre sécurisé et bienveillant.
                  </p>
                  <div className="mb-6 text-sm text-gray-500 flex items-center">
                    <Users className="h-4 w-4 mr-2" />
                    {
                      professionals.filter((p) => p.type === "sexual").length
                    }{" "}
                    professionnel
                    {professionals.filter((p) => p.type === "sexual").length > 1
                      ? "s"
                      : ""}{" "}
                    disponible
                    {professionals.filter((p) => p.type === "sexual").length > 1
                      ? "s"
                      : ""}
                  </div>
                  <Link
                    to="/professionals/sexual"
                    className="w-full bg-gradient-to-r from-rose-500 to-rose-600 text-white px-6 py-3 rounded-xl text-center font-semibold hover:from-rose-600 hover:to-rose-700 transition-all duration-200 shadow-md hover:shadow-lg flex items-center justify-center group"
                  >
                    Prendre rendez-vous
                    <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Registration Modal */}
        {showRegistrationModal && selectedSession && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold">
                  Inscription à la thérapie de groupe
                </h3>
                <button
                  onClick={() => {
                    setShowRegistrationModal(false);
                    setSelectedSession(null);
                    setPhoneNumber("");
                    setRegistrationError(null);
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="mb-4">
                <h4 className="font-semibold mb-2">{selectedSession.title}</h4>
                <p className="text-sm text-gray-600 mb-4">
                  {selectedSession.description}
                </p>
                <div className="text-sm text-gray-500 mb-4">
                  <div>
                    Places disponibles:{" "}
                    {selectedSession.registrationsCount !== undefined
                      ? `${selectedSession.registrationsCount} / ${selectedSession.capacity}`
                      : `Places limitées (${selectedSession.capacity} max)`}
                  </div>
                  {selectedSession.price === 0 ? (
                    <div className="text-green-600 font-semibold">Gratuit</div>
                  ) : (
                    <div>Prix: {selectedSession.price} XOF</div>
                  )}
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Numéro de téléphone *
                </label>
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="+221 XX XXX XX XX"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Nous créerons votre compte et vous inscrirons automatiquement
                </p>
              </div>

              {registrationError && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                  {registrationError}
                </div>
              )}

              <div className="flex justify-end space-x-4">
                <button
                  onClick={() => {
                    setShowRegistrationModal(false);
                    setSelectedSession(null);
                    setPhoneNumber("");
                    setRegistrationError(null);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Annuler
                </button>
                <button
                  onClick={handlePhoneRegistration}
                  disabled={registrationLoading || !phoneNumber.trim()}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {registrationLoading ? "Inscription..." : "Continuer"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* How It Works Section */}
        <section className="py-20 bg-gray-100">
          <div className="container mx-auto px-4">
            <h2 className="text-4xl font-bold text-center mb-4">
              Comment ça marche
            </h2>
            <p className="text-gray-600 text-center mb-16 max-w-2xl mx-auto">
              Un processus simple en 3 étapes pour accéder à votre consultation
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto mb-12">
              {[
                {
                  step: "1",
                  icon: Calendar,
                  title: "Prenez rendez-vous",
                  description:
                    "Choisissez un professionnel et réservez un créneau qui vous convient",
                },
                {
                  step: "2",
                  icon: Video,
                  title: "Consultation en ligne",
                  description:
                    "Connectez-vous à l'heure du rendez-vous pour votre consultation",
                },
                {
                  step: "3",
                  icon: CheckCircle,
                  title: "Suivi personnalisé",
                  description: "Bénéficiez d'un suivi adapté à vos besoins",
                },
              ].map((step, index) => (
                <div
                  key={index}
                  className="text-center group hover:bg-white/30 p-6 rounded-xl transition-all duration-200"
                >
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-xl flex items-center justify-center text-xl font-bold mx-auto mb-6 group-hover:scale-110 transition-transform shadow-lg">
                    <step.icon className="h-8 w-8" />
                  </div>
                  <h3 className="text-xl font-semibold mb-3">{step.title}</h3>
                  <p className="text-gray-600 leading-relaxed">
                    {step.description}
                  </p>
                </div>
              ))}
            </div>

            {/* CTA Button */}
            <div className="text-center">
              <Link
                to="/patient"
                className="inline-flex items-center bg-gradient-to-r from-blue-500 to-blue-600 text-white px-8 py-4 rounded-xl font-semibold hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
              >
                Voir les professionnels disponibles
                <ArrowRight className="h-5 w-5 ml-2" />
              </Link>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 bg-gradient-to-br from-blue-700 via-blue-600 to-teal-600 text-white">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Prêt à prendre soin de votre santé ?
            </h2>
            <p className="text-xl md:text-2xl mb-8 max-w-3xl mx-auto text-blue-50 leading-relaxed">
              Rejoignez des milliers de patients accompagnés avec humanité et
              confidentialité. Une plateforme pensée pour les Sénégalais, au
              Sénégal et dans la diaspora.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-6">
              <Link
                to="/professionals/mental"
                className="bg-white text-blue-600 px-8 py-4 rounded-xl font-semibold hover:bg-blue-50 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center justify-center"
              >
                <Brain className="h-5 w-5 mr-2" />
                Santé mentale
              </Link>
              <Link
                to="/professionals/sexual"
                className="bg-transparent border-2 border-white text-white px-8 py-4 rounded-xl font-semibold hover:bg-white/10 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center justify-center"
              >
                <Heart className="h-5 w-5 mr-2" />
                Santé sexuelle
              </Link>
            </div>
          </div>
        </section>

        {/* Inspirational Quote */}
        <section className="py-12 bg-gray-50">
          <div className="container mx-auto px-4 text-center">
            <p className="text-xl text-gray-700 italic font-medium">
              "La santé mentale et sexuelle, c'est votre droit. Parlons-en."
            </p>
          </div>
        </section>

        {/* Footer */}
        <footer className="bg-gray-800 text-white py-12 border-t border-gray-700">
          <div className="container mx-auto px-4">
            {/* Admin Login Link */}
            <div className="text-center mb-8">
              <Link
                to="/admin/login"
                className="inline-flex items-center text-gray-400 hover:text-white text-sm transition-colors"
              >
                <ShieldAlert className="h-4 w-4 mr-2" />
                Se connecter en tant qu'administrateur
              </Link>
            </div>

            <div className="mt-8 pt-8 border-t border-gray-700 text-center text-gray-400">
              <p className="mb-4">
                &copy; 2025 Health-e. Plateforme de téléconsultation en santé
                mentale et sexuelle.
              </p>
              <p className="text-sm">Tous droits réservés.</p>
            </div>
          </div>
        </footer>
      </div>
    </ErrorBoundary>
  );
};

export default OptimizedHomePage;
