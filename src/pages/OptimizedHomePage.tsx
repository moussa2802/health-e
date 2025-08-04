import React, { useState, useEffect, Suspense, lazy, useRef } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { Brain, Heart, User, Stethoscope, ShieldAlert } from "lucide-react";
import { useOptimizedProfessionals } from "../hooks/useOptimizedProfessionals";
import { useDebounce } from "../hooks/useDebounce";
import { useIntersectionObserver } from "../hooks/useIntersectionObserver";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import ErrorBoundary from "../components/ui/ErrorBoundary";

// Type local pour suggestions
// interface Professional {
//   id: string;
//   name?: string;
//   specialty?: string;
//   type?: string;
// }

// Lazy load heavy components
const FeaturedContentSection = lazy(
  () => import("../components/sections/FeaturedContentSection")
);

const OptimizedHomePage: React.FC = () => {
  const { isAuthenticated, currentUser } = useAuth();
  const [searchTerm] = useState("");
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
      <div className="flex flex-col min-h-screen">
        {/* Hero Section */}
        <section
          ref={heroRef}
          className="relative bg-gradient-to-br from-blue-500 via-teal-400 to-emerald-400 pt-24 pb-32 overflow-hidden"
        >
          <div className="absolute inset-0 bg-[url('https://images.pexels.com/photos/3376799/pexels-photo-3376799.jpeg?auto=compress&cs=tinysrgb&w=1920')] bg-cover bg-center mix-blend-overlay opacity-10"></div>

          <div className="container mx-auto px-4 relative">
            <div className="max-w-4xl mx-auto text-center">
              <h1 className="text-4xl md:text-6xl font-bold text-white mb-8">
                Santé mentale et sexuelle en toute confidentialité
              </h1>
              <p className="text-xl text-white/90 mb-12">
                Consultez des professionnels de santé qualifiés en ligne, en
                toute discrétion
              </p>

              {/* User Type Selection Buttons */}
              <div className="flex flex-col md:flex-row justify-center gap-6 mt-8">
                <Link
                  to="/patient"
                  className="bg-white text-blue-600 px-8 py-6 rounded-xl shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1 flex flex-col items-center"
                >
                  <User className="h-12 w-12 mb-4 text-blue-500" />
                  <span className="text-xl font-bold">Je suis un patient</span>
                  <span className="text-sm text-gray-600 mt-2">
                    Consulter un professionnel de santé
                  </span>
                </Link>

                <Link
                  to="/professional/access"
                  className="bg-white text-teal-600 px-8 py-6 rounded-xl shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1 flex flex-col items-center"
                >
                  <Stethoscope className="h-12 w-12 mb-4 text-teal-500" />
                  <span className="text-xl font-bold">
                    Je suis un professionnel de santé
                  </span>
                  <span className="text-sm text-gray-600 mt-2">
                    Offrir des consultations en ligne
                  </span>
                </Link>
              </div>

              {/* Real-time Statistics */}
              <div className="mt-8 flex justify-center items-center space-x-8 text-white/90">
                <div className="text-center">
                  <div className="text-2xl font-bold">
                    {professionals.length}
                  </div>
                  <div className="text-sm">Professionnels disponibles</div>
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
              <h2 className="text-3xl font-bold text-center mb-12">
                Nos services
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                {/* Mental Health Card */}
                <div className="bg-white rounded-xl p-8 shadow-lg hover:shadow-xl transition-all duration-300">
                  <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mb-6">
                    <Brain className="h-8 w-8 text-blue-500" />
                  </div>
                  <h3 className="text-2xl font-bold mb-4 text-gray-900">
                    Santé mentale
                  </h3>
                  <p className="text-gray-600 mb-6">
                    Consultez des psychologues et psychiatres qualifiés pour
                    votre bien-être mental. Un accompagnement professionnel et
                    confidentiel.
                  </p>
                  <div className="mb-4 text-sm text-gray-500">
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
                    className="w-full bg-blue-500 text-white px-4 py-2 rounded-lg text-center font-medium hover:bg-blue-600 transition-colors inline-block"
                  >
                    Prendre rendez-vous
                  </Link>
                </div>

                {/* Sexual Health Card */}
                <div className="bg-white rounded-xl p-8 shadow-lg hover:shadow-xl transition-all duration-300">
                  <div className="w-16 h-16 bg-rose-100 rounded-2xl flex items-center justify-center mb-6">
                    <Heart className="h-8 w-8 text-rose-500" />
                  </div>
                  <h3 className="text-2xl font-bold mb-4 text-gray-900">
                    Santé sexuelle
                  </h3>
                  <p className="text-gray-600 mb-6">
                    Échangez avec des gynécologues, sexologues et urologues
                    expérimentés dans un cadre sécurisé et bienveillant.
                  </p>
                  <div className="mb-4 text-sm text-gray-500">
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
                    className="w-full bg-rose-500 text-white px-4 py-2 rounded-lg text-center font-medium hover:bg-rose-600 transition-colors inline-block"
                  >
                    Prendre rendez-vous
                  </Link>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* How It Works Section */}
        <section className="py-20 bg-white">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold text-center mb-4">
              Comment ça marche
            </h2>
            <p className="text-gray-600 text-center mb-12 max-w-2xl mx-auto">
              Un processus simple en 3 étapes pour accéder à votre consultation
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              {[
                {
                  step: "1",
                  title: "Prenez rendez-vous",
                  description:
                    "Choisissez un professionnel et réservez un créneau qui vous convient",
                },
                {
                  step: "2",
                  title: "Consultation en ligne",
                  description:
                    "Connectez-vous à l'heure du rendez-vous pour votre consultation",
                },
                {
                  step: "3",
                  title: "Suivi personnalisé",
                  description: "Bénéficiez d'un suivi adapté à vos besoins",
                },
              ].map((step, index) => (
                <div key={index} className="text-center">
                  <div className="w-12 h-12 bg-blue-500 text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">
                    {step.step}
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
                  <p className="text-gray-600">{step.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 bg-gradient-to-br from-blue-600 to-teal-500 text-white">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              Prêt à prendre soin de votre santé ?
            </h2>
            <p className="text-xl mb-8 max-w-2xl mx-auto text-blue-50">
              Commencez dès aujourd'hui avec des professionnels qualifiés qui
              parlent votre langue.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Link
                to="/professionals/mental"
                className="bg-white text-blue-600 px-8 py-4 rounded-xl font-semibold hover:bg-blue-50 transition-colors"
              >
                Santé mentale
              </Link>
              <Link
                to="/professionals/sexual"
                className="bg-transparent border-2 border-white text-white px-8 py-4 rounded-xl font-semibold hover:bg-white/10 transition-colors"
              >
                Santé sexuelle
              </Link>
            </div>
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
