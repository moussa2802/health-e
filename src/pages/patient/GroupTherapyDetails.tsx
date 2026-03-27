import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  Calendar,
  Video,
  Users,
  Heart,
  User,
  ArrowLeft,
  ArrowRight,
  Clock,
} from "lucide-react";
import {
  getGroupTherapySession,
  isUserRegisteredInSession,
  registerUserToSession,
  GroupTherapySession,
} from "../../services/groupTherapyService";
import { getProfessionalById } from "../../services/professionalService";
import { useAuth } from "../../contexts/AuthContext";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { paytechService } from "../../services/paytechService";
import { CreditCard } from "lucide-react";

const GroupTherapyDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAuthenticated, currentUser } = useAuth();
  const [session, setSession] = useState<GroupTherapySession | null>(null);
  const [loading, setLoading] = useState(true);
  const [professionalNames, setProfessionalNames] = useState<
    Record<string, { name: string; specialty?: string; profileImage?: string }>
  >({});
  const [isRegistered, setIsRegistered] = useState(false);
  const [isFull, setIsFull] = useState(false);
  const [checkingRegistration, setCheckingRegistration] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  useEffect(() => {
    const fetchSession = async () => {
      if (!id) return;

      try {
        setLoading(true);
        const sessionData = await getGroupTherapySession(id);
        if (!sessionData) {
          navigate("/");
          return;
        }
        setSession(sessionData);

        // Vérifier si la session est complète
        const registrationsCount = sessionData.registrationsCount ?? 0;
        setIsFull(registrationsCount >= sessionData.capacity);

        // Charger les noms des professionnels
        const professionalIds = new Set<string>();
        if (sessionData.primaryHostId)
          professionalIds.add(sessionData.primaryHostId);
        sessionData.secondaryHostIds?.forEach((id) => professionalIds.add(id));

        const namesMap: Record<
          string,
          { name: string; specialty?: string; profileImage?: string }
        > = {};
        await Promise.all(
          Array.from(professionalIds).map(async (profId) => {
            const prof = await getProfessionalById(profId);
            if (prof) {
              namesMap[profId] = prof;
            }
          })
        );
        setProfessionalNames(namesMap);

        // Vérifier si l'utilisateur est déjà inscrit (si connecté)
        if (isAuthenticated && currentUser) {
          setCheckingRegistration(true);
          const registered = await isUserRegisteredInSession(
            id,
            currentUser.id
          );
          setIsRegistered(registered);
          setCheckingRegistration(false);
        }
      } catch (error) {
        console.error("Error fetching session:", error);
        navigate("/");
      } finally {
        setLoading(false);
      }
    };

    fetchSession();
  }, [id, isAuthenticated, currentUser, navigate]);

  const handleRegister = () => {
    if (!session) return;

    if (!isAuthenticated || !currentUser) {
      // Rediriger vers la page de connexion/inscription avec l'ID de la session
      navigate("/patient/access", {
        state: {
          groupTherapySessionId: session.id,
          redirectAfterAuth: `/group-therapy/${session.id}`,
        },
      });
      return;
    }

    // Si déjà connecté, inscrire directement
    handleDirectRegistration();
  };

  const handleDirectRegistration = async () => {
    if (!session || !currentUser) return;

    const isFree = session.price === 0;

    // Si c'est gratuit, inscrire directement
    if (isFree) {
      try {
        setCheckingRegistration(true);
        const result = await registerUserToSession(session.id, currentUser.id);
        if (result.status === "alreadyRegistered") {
          alert("Vous êtes déjà inscrit à cette session ✅");
          setIsRegistered(true);
        } else {
          setIsRegistered(true);
          alert("Inscription réussie ! ✅");
        }
      } catch (error) {
        console.error("Error registering:", error);
        alert(
          error instanceof Error
            ? error.message
            : "Erreur lors de l'inscription"
        );
      } finally {
        setCheckingRegistration(false);
      }
      return;
    }

    // Si c'est payant, initier le paiement
    try {
      setIsProcessingPayment(true);
      setPaymentError(null);

      const primaryHost = professionalNames[session.primaryHostId];
      const professionalName = primaryHost?.name || "Professionnel";

      const successUrl = `${window.location.origin}/group-therapy/${session.id}/meeting?payment=success`;
      const cancelUrl = `${window.location.origin}/group-therapy/${session.id}?payment=cancelled`;

      const paymentData = {
        amount: Math.round(Number(session.price || 0)),
        bookingId: `group_therapy_${session.id}`, // Préfixe pour identifier les thérapies de groupe
        method: "mobile" as const, // Par défaut mobile, pourrait être choisi par l'utilisateur
        customerEmail: currentUser.email || null,
        customerPhone: currentUser.phoneNumber || "",
        customerName: currentUser.name || "Patient",
        professionalId: session.primaryHostId,
        professionalName,
        description: `Inscription à la thérapie de groupe: ${session.title}`,
        successUrl,
        cancelUrl,
        patientId: currentUser.id,
        // Champs spécifiques aux thérapies de groupe
        sessionId: session.id,
        paymentType: "group_therapy",
        date: session.date || new Date().toISOString().split("T")[0],
        type: "group_therapy",
      };

      console.log(
        "🔔 [PAYTECH] Initiating payment for group therapy:",
        paymentData
      );

      // Valider les données de paiement
      if (!paytechService.validatePaymentData(paymentData)) {
        throw new Error("Données de paiement invalides");
      }

      // Initier le paiement
      const response = await paytechService.initiatePayment(paymentData);

      console.log(
        "✅ [PAYTECH] Payment initiated, redirecting to:",
        response.redirect_url
      );

      // Rediriger vers la page de paiement PayTech
      paytechService.redirectToPayment(response.redirect_url);
    } catch (error) {
      console.error("❌ [PAYTECH] Payment error:", error);
      setPaymentError(
        error instanceof Error
          ? error.message
          : "Erreur lors de l'initialisation du paiement"
      );
      setIsProcessingPayment(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!session) {
    return null;
  }

  const registrationsCount = session.registrationsCount ?? 0;
  const isFree =
    session.price === 0 ||
    session.price === null ||
    session.price === undefined;
  const formattedDate = session.date
    ? format(new Date(session.date + "T00:00:00"), "EEEE d MMMM yyyy", {
        locale: fr,
      })
    : "";

  const primaryHost = professionalNames[session.primaryHostId];
  const secondaryHosts =
    session.secondaryHostIds
      ?.map((id) => professionalNames[id])
      .filter(Boolean) || [];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 text-white py-12">
        <div className="container mx-auto px-4">
          <button
            onClick={() => navigate("/")}
            className="mb-4 flex items-center text-white hover:text-gray-200 transition-colors"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Retour à l'accueil
          </button>
          <h1 className="text-4xl font-bold mb-4">{session.title}</h1>
          <div className="flex flex-wrap items-center gap-4 text-sm">
            {session.date && (
              <div className="flex items-center">
                <Calendar className="h-5 w-5 mr-2" />
                <span>{formattedDate}</span>
              </div>
            )}
            {session.time && (
              <div className="flex items-center">
                <Clock className="h-5 w-5 mr-2" />
                <span>{session.time}</span>
              </div>
            )}
            <div className="flex items-center">
              <Users className="h-5 w-5 mr-2" />
              <span>
                {registrationsCount} / {session.capacity} participants
              </span>
            </div>
            {isFree ? (
              <div className="flex items-center">
                <Heart className="h-5 w-5 mr-2" />
                <span>Gratuit</span>
              </div>
            ) : (
              <div className="text-lg font-semibold">{session.price} XOF</div>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-xl shadow-lg p-8 mb-6">
            <h2 className="text-2xl font-bold mb-4">Description</h2>
            <p className="text-gray-700 leading-relaxed whitespace-pre-line">
              {session.description}
            </p>
          </div>

          {/* Hôtes */}
          {(primaryHost || secondaryHosts.length > 0) && (
            <div className="bg-white rounded-xl shadow-lg p-8 mb-6">
              <h2 className="text-2xl font-bold mb-4">Hôte(s)</h2>
              <div className="space-y-4">
                {primaryHost && (
                  <Link
                    to={`/professional/${session.primaryHostId}`}
                    className="flex items-center space-x-4 p-4 rounded-lg hover:bg-gray-50 transition-colors group"
                  >
                    {primaryHost.profileImage ? (
                      <img
                        src={primaryHost.profileImage}
                        alt={primaryHost.name}
                        className="w-16 h-16 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center">
                        <User className="h-8 w-8 text-purple-600" />
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <h3 className="text-lg font-semibold group-hover:text-purple-600 transition-colors">
                          {primaryHost.name}
                        </h3>
                        <span className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-xs font-semibold">
                          Principal
                        </span>
                      </div>
                      {primaryHost.specialty && (
                        <p className="text-gray-600 mt-1">
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
                      className="flex items-center space-x-4 p-4 rounded-lg hover:bg-gray-50 transition-colors group"
                    >
                      {host.profileImage ? (
                        <img
                          src={host.profileImage}
                          alt={host.name}
                          className="w-16 h-16 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
                          <User className="h-8 w-8 text-gray-600" />
                        </div>
                      )}
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold group-hover:text-purple-600 transition-colors">
                          {host.name}
                        </h3>
                        {host.specialty && (
                          <p className="text-gray-600 mt-1">{host.specialty}</p>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {/* Informations supplémentaires */}
          <div className="bg-white rounded-xl shadow-lg p-8 mb-6">
            <h2 className="text-2xl font-bold mb-4">Informations</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600 mb-1">Capacité</p>
                <p className="text-lg font-semibold">
                  {session.capacity} participants maximum
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Places disponibles</p>
                <p className="text-lg font-semibold">
                  {session.capacity - registrationsCount} places restantes
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Prix</p>
                <p className="text-lg font-semibold">
                  {isFree ? "Gratuit" : `${session.price} XOF`}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Statut</p>
                <p className="text-lg font-semibold">
                  {session.isActive
                    ? isFull
                      ? "Complet"
                      : "Ouvert aux inscriptions"
                    : "Fermé"}
                </p>
              </div>
            </div>
          </div>

          {/* Bouton d'inscription */}
          <div className="bg-white rounded-xl shadow-lg p-8">
            {isRegistered ? (
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">
                  <svg
                    className="w-8 h-8 text-green-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  Vous êtes inscrit à cette session ✅
                </h3>
                <p className="text-gray-600 mb-4">
                  Cliquez sur le bouton ci-dessous pour rejoindre la réunion.
                </p>
                <Link
                  to={`/group-therapy/${session.id}/meeting`}
                  className="inline-flex items-center justify-center w-full py-3 rounded-xl font-semibold transition-all duration-200 bg-gradient-to-r from-purple-500 to-pink-600 text-white hover:from-purple-600 hover:to-pink-700 shadow-md hover:shadow-lg"
                >
                  <Video className="h-5 w-5 mr-2" />
                  Rejoindre la réunion
                </Link>
              </div>
            ) : isFull ? (
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
                  <Users className="w-8 h-8 text-gray-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  Session complète
                </h3>
                <p className="text-gray-600">
                  Toutes les places ont été réservées pour cette session.
                </p>
              </div>
            ) : (
              <div>
                {paymentError && (
                  <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                    {paymentError}
                  </div>
                )}
                <button
                  onClick={handleRegister}
                  disabled={
                    checkingRegistration ||
                    isProcessingPayment ||
                    !session.isActive
                  }
                  className={`w-full py-4 rounded-xl font-semibold transition-all duration-200 flex items-center justify-center text-lg ${
                    !session.isActive ||
                    checkingRegistration ||
                    isProcessingPayment
                      ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                      : "bg-gradient-to-r from-purple-500 to-pink-600 text-white hover:from-purple-600 hover:to-pink-700 shadow-md hover:shadow-lg"
                  }`}
                >
                  {checkingRegistration || isProcessingPayment ? (
                    <>
                      <LoadingSpinner size="sm" />
                      <span className="ml-2">
                        {isProcessingPayment
                          ? "Traitement du paiement..."
                          : "Inscription en cours..."}
                      </span>
                    </>
                  ) : isAuthenticated ? (
                    <>
                      {isFree ? (
                        <>
                          S'inscrire maintenant
                          <ArrowRight className="h-5 w-5 ml-2" />
                        </>
                      ) : (
                        <>
                          <CreditCard className="h-5 w-5 mr-2" />
                          Payer et s'inscrire ({session.price} XOF)
                        </>
                      )}
                    </>
                  ) : (
                    <>
                      S'inscrire
                      <ArrowRight className="h-5 w-5 ml-2" />
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GroupTherapyDetails;
