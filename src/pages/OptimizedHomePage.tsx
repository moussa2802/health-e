import React, { useState, useEffect, Suspense, lazy, useRef } from "react";
import { Link, Navigate } from "react-router-dom";
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
  MessageCircle
} from "lucide-react";
import { useOptimizedProfessionals } from "../hooks/useOptimizedProfessionals";
import { useDebounce } from "../hooks/useDebounce";
import { useIntersectionObserver } from "../hooks/useIntersectionObserver";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import ErrorBoundary from "../components/ui/ErrorBoundary";

// Lazy load heavy components
const FeaturedContentSection = lazy(
  () => import("../components/sections/FeaturedContentSection")
);

const OptimizedHomePage: React.FC = () => {
  const { isAuthenticated, currentUser } = useAuth();
  const [searchTerm] = useState("");
  const [isScrolled, setIsScrolled] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

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

  // Handle scroll for sticky header
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
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

  // Redirect authenticated users to their dashboard
  if (isAuthenticated && currentUser) {
    const dashboardPath =
      currentUser.type === "patient"
        ? "/patient/dashboard"
        : currentUser.type === "professional"
        ? "/professional/dashboard"
        : "/admin/dashboard";

    return <Navigate to={dashboardPath} replace />;
  }

  return (
    <ErrorBoundary>
      <div className="flex flex-col min-h-screen pt-16">
        {/* Sticky Header */}
        <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isScrolled 
            ? 'bg-white/95 backdrop-blur-md shadow-lg' 
            : 'bg-transparent'
        }`}>
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between py-4">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-teal-400 rounded-xl flex items-center justify-center mr-3">
                  <Heart className="h-6 w-6 text-white" />
                </div>
                <span className={`text-xl font-bold ${
                  isScrolled ? 'text-gray-900' : 'text-white'
                }`}>
                  Health-e
                </span>
              </div>
              
              <div className="flex items-center space-x-4">
                <Link
                  to="/patient"
                  className={`px-6 py-3 rounded-xl font-semibold transition-all duration-200 ${
                    isScrolled
                      ? 'bg-blue-500 text-white hover:bg-blue-600'
                      : 'bg-white/20 text-white hover:bg-white/30 backdrop-blur-sm'
                  }`}
                >
                  Prendre rendez-vous
                </Link>
              </div>
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <section
          ref={heroRef}
          className="relative bg-gradient-to-br from-blue-500 via-teal-400 to-emerald-400 pt-24 pb-32 overflow-hidden"
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
              <p className="text-xl md:text-2xl text-white/90 mb-12 animate-fade-in-delay">
                Consultez des professionnels de santé qualifiés en ligne, en
                toute discrétion. Une plateforme pensée pour les Sénégalais, au Sénégal et dans la diaspora.
              </p>

              {/* User Type Selection Buttons */}
              <div className="flex flex-col md:flex-row justify-center gap-6 mt-12 animate-fade-in-delay-2">
                <Link
                  to="/patient"
                  className="group bg-white text-blue-600 px-8 py-8 rounded-2xl shadow-xl hover:shadow-2xl transition-all transform hover:-translate-y-2 flex flex-col items-center border-2 border-transparent hover:border-blue-200"
                >
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <User className="h-8 w-8 text-white" />
                  </div>
                  <span className="text-2xl font-bold mb-2">Je suis un patient</span>
                  <span className="text-sm text-gray-600 text-center">
                    Je souhaite consulter un professionnel de santé
                  </span>
                </Link>

                <Link
                  to="/professional/access"
                  className="group bg-white text-teal-600 px-8 py-8 rounded-2xl shadow-xl hover:shadow-2xl transition-all transform hover:-translate-y-2 flex flex-col items-center border-2 border-transparent hover:border-teal-200"
                >
                  <div className="w-16 h-16 bg-gradient-to-br from-teal-500 to-teal-600 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Stethoscope className="h-8 w-8 text-white" />
                  </div>
                  <span className="text-2xl font-bold mb-2">
                    Je suis un professionnel de santé
                  </span>
                  <span className="text-sm text-gray-600 text-center">
                    Je souhaite offrir des consultations en ligne
                  </span>
                </Link>
              </div>

              {/* Real-time Statistics */}
              <div className="mt-12 flex justify-center items-center space-x-12 text-white/90 animate-fade-in-delay-3">
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

        {/* Featured Content Section */}
        <section ref={featuredContentRef} className="py-20 bg-white">
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
                Des soins spécialisés avec des professionnels qualifiés qui comprennent votre culture et vos besoins
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
                    Un soutien mental bienveillant et confidentiel. Nos psychologues et psychiatres vous accompagnent 
                    avec empathie et professionnalisme pour votre bien-être mental.
                  </p>
                  <div className="mb-6 text-sm text-gray-500 flex items-center">
                    <Users className="h-4 w-4 mr-2" />
                    {professionals.filter((p) => p.type === "mental").length}{" "}
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
                    Votre intimité respectée, votre santé écoutée. Échangez avec des gynécologues, sexologues 
                    et urologues expérimentés dans un cadre sécurisé et bienveillant.
                  </p>
                  <div className="mb-6 text-sm text-gray-500 flex items-center">
                    <Users className="h-4 w-4 mr-2" />
                    {professionals.filter((p) => p.type === "sexual").length}{" "}
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

        {/* How It Works Section */}
        <section className="py-20 bg-white">
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
                <div key={index} className="text-center group">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-2xl flex items-center justify-center text-xl font-bold mx-auto mb-6 group-hover:scale-110 transition-transform shadow-lg">
                    <step.icon className="h-8 w-8" />
                  </div>
                  <h3 className="text-xl font-semibold mb-3">{step.title}</h3>
                  <p className="text-gray-600 leading-relaxed">{step.description}</p>
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
        <section className="py-20 bg-gradient-to-br from-blue-600 to-teal-500 text-white">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Prêt à prendre soin de votre santé ?
            </h2>
            <p className="text-xl md:text-2xl mb-8 max-w-3xl mx-auto text-blue-50 leading-relaxed">
              Rejoignez des milliers de patients accompagnés avec humanité et confidentialité. 
              Une plateforme pensée pour les Sénégalais, au Sénégal et dans la diaspora.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-6">
              <Link
                to="/professionals/mental"
                className="bg-white text-blue-600 px-8 py-4 rounded-xl font-semibold hover:bg-blue-50 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-1 flex items-center justify-center"
              >
                <Brain className="h-5 w-5 mr-2" />
                Santé mentale
              </Link>
              <Link
                to="/professionals/sexual"
                className="bg-transparent border-2 border-white text-white px-8 py-4 rounded-xl font-semibold hover:bg-white/10 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-1 flex items-center justify-center"
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
        <footer className="bg-gray-800 text-white py-12">
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
              <p>
                &copy; {new Date().getFullYear()} Health-e. Tous droits
                réservés.
              </p>
            </div>
          </div>
        </footer>
      </div>
    </ErrorBoundary>
  );
};

export default OptimizedHomePage;
