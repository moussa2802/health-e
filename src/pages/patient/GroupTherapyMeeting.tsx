import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Video, ArrowLeft, Users, Calendar, Clock } from "lucide-react";
import {
  getGroupTherapySession,
  isUserRegisteredInSession,
  openGroupTherapyMeeting,
  GroupTherapySession,
} from "../../services/groupTherapyService";
import { useAuth } from "../../contexts/AuthContext";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { doc, onSnapshot, Timestamp } from "firebase/firestore";
import { getFirestoreInstance } from "../../utils/firebase";

const GroupTherapyMeeting: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAuthenticated, currentUser } = useAuth();
  const [session, setSession] = useState<GroupTherapySession | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRegistered, setIsRegistered] = useState(false);
  const [isPatient, setIsPatient] = useState(false);
  const [isHost, setIsHost] = useState(false);
  const [isOpeningMeeting, setIsOpeningMeeting] = useState(false);
  // État pour les informations de réunion privées
  const [meetingInfo, setMeetingInfo] = useState<{
    meetingLink: string;
    meetingStatus: "closed" | "open";
    openedBy: string | null;
    openedAt: Timestamp | null;
  } | null>(null);

  // Charger la session initiale et configurer le listener temps réel
  useEffect(() => {
    if (!id) {
      navigate("/");
      return;
    }

    let isMounted = true;
    let unsubscribe: (() => void) | null = null;
    let initialMeetingLink: string | undefined = undefined;

    const initializeSession = async () => {
      try {
        setLoading(true);
        const sessionData = await getGroupTherapySession(id);

        if (!isMounted) return;

        if (!sessionData) {
          navigate("/");
          return;
        }

        // Vérifier si l'utilisateur est inscrit ou si c'est un professionnel host
        if (!isAuthenticated || !currentUser) {
          navigate(`/group-therapy/${id}`);
          return;
        }

        const registered = await isUserRegisteredInSession(id, currentUser.id);
        const userIsHost =
          sessionData.primaryHostId === currentUser.id ||
          sessionData.secondaryHostIds?.includes(currentUser.id);

        if (!registered && !userIsHost) {
          navigate(`/group-therapy/${id}`);
          return;
        }

        setIsRegistered(registered || userIsHost);
        setIsPatient(currentUser.type === "patient" && !userIsHost);
        setIsHost(userIsHost);
        setSession(sessionData);
        setLoading(false);

        // Configurer le listener temps réel pour les mises à jour du document principal
        const db = getFirestoreInstance();
        if (!db) {
          console.error("Firestore not available for realtime listener");
          return;
        }

        const sessionRef = doc(db, "group_therapy_sessions", id);
        const sessionUnsubscribe = onSnapshot(
          sessionRef,
          (snapshot) => {
            if (!isMounted || !snapshot.exists()) return;

            const data = snapshot.data();
            const participants = Array.isArray(data.participants)
              ? data.participants
              : [];

            const updatedSession: GroupTherapySession = {
              id: snapshot.id,
              title: data.title || "",
              description: data.description || "",
              price: data.price ?? 0,
              date: data.date || "",
              time: data.time || "",
              capacity: data.capacity || 0,
              participants: participants,
              participantsCount: participants.length,
              registrationsCount: data.registrationsCount ?? 0,
              primaryHostId: data.primaryHostId || "",
              secondaryHostIds: data.secondaryHostIds || [],
              isActive: data.isActive !== undefined ? data.isActive : true,
              isCompleted: data.isCompleted ?? false,
              // Ne pas inclure les champs privés ici
              meetingLink: undefined,
              meetingStatus: undefined,
              openedBy: undefined,
              openedAt: undefined,
              createdAt: data.createdAt || Timestamp.now(),
              updatedAt: data.updatedAt || null,
            };

            setSession(updatedSession);
          },
          (error) => {
            console.error("Error in session realtime listener:", error);
          }
        );

        // Si l'utilisateur est inscrit (patient) ou host, écouter private/meeting
        if (registered || userIsHost) {
          const privateMeetingRef = doc(
            db,
            "group_therapy_sessions",
            id,
            "private",
            "meeting"
          );
          const meetingUnsubscribe = onSnapshot(
            privateMeetingRef,
            (snapshot) => {
              if (!isMounted) return;

              if (snapshot.exists()) {
                const data = snapshot.data();
                setMeetingInfo({
                  meetingLink: data.meetingLink || "",
                  meetingStatus: data.meetingStatus || "closed",
                  openedBy: data.openedBy || null,
                  openedAt: data.openedAt || null,
                });
              } else {
                // Si le document n'existe pas encore, initialiser avec des valeurs par défaut
                setMeetingInfo({
                  meetingLink: "",
                  meetingStatus: "closed",
                  openedBy: null,
                  openedAt: null,
                });
              }
            },
            (error) => {
              console.error("Error in meeting realtime listener:", error);
              // En cas d'erreur (permission denied par exemple), initialiser avec des valeurs par défaut
              if (isMounted) {
                setMeetingInfo({
                  meetingLink: "",
                  meetingStatus: "closed",
                  openedBy: null,
                  openedAt: null,
                });
              }
            }
          );

          // Stocker les deux unsubscribe pour le cleanup
          unsubscribe = () => {
            sessionUnsubscribe();
            meetingUnsubscribe();
          };
        } else {
          unsubscribe = sessionUnsubscribe;
        }
      } catch (error) {
        console.error("Error initializing session:", error);
        if (isMounted) {
          navigate("/");
        }
      }
    };

    initializeSession();

    return () => {
      isMounted = false;
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [id, isAuthenticated, currentUser, navigate]);

  const handleStartMeeting = async () => {
    if (!id || !currentUser?.id) return;

    try {
      setIsOpeningMeeting(true);
      // Ouvrir la réunion avec l'ID du professionnel (met à jour private/meeting)
      const meetingLink = await openGroupTherapyMeeting(id, currentUser.id);
      // Ouvrir le lien de réunion directement
      if (meetingLink) {
        window.open(meetingLink, "_blank");
      }
    } catch (error) {
      console.error("Error opening meeting:", error);
      alert("Erreur lors de l'ouverture de la réunion. Veuillez réessayer.");
    } finally {
      setIsOpeningMeeting(false);
    }
  };

  const handleJoinMeeting = () => {
    if (!meetingInfo?.meetingLink) return;

    // Patients ne peuvent pas rejoindre si la réunion n'est pas ouverte
    if (isPatient && meetingInfo.meetingStatus !== "open") {
      return;
    }

    // Les hôtes peuvent toujours rejoindre
    window.open(meetingInfo.meetingLink, "_blank");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!session || !isRegistered) {
    return null;
  }

  const formattedDate = session.date
    ? format(new Date(session.date + "T00:00:00"), "EEEE d MMMM yyyy", {
        locale: fr,
      })
    : "";

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 text-white py-12">
        <div className="container mx-auto px-4">
          <button
            onClick={() => navigate(`/group-therapy/${session.id}`)}
            className="mb-4 flex items-center text-white hover:text-gray-200 transition-colors"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Retour aux détails
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
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-xl shadow-lg p-8 mb-6">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 mb-4">
                <Video className="w-10 h-10 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Vous êtes inscrit à cette session ✅
              </h2>
              <p className="text-gray-600">
                Cliquez sur le bouton ci-dessous pour rejoindre la réunion
              </p>
            </div>

            {meetingInfo?.meetingLink ? (
              <div className="space-y-4">
                {/* Si c'est un hôte, afficher le bouton pour démarrer la réunion */}
                {isHost ? (
                  meetingInfo.meetingStatus === "open" ? (
                    <button
                      onClick={handleJoinMeeting}
                      className="w-full py-4 rounded-xl font-semibold transition-all duration-200 flex items-center justify-center text-lg bg-gradient-to-r from-purple-500 to-pink-600 text-white hover:from-purple-600 hover:to-pink-700 shadow-md hover:shadow-lg"
                    >
                      <Video className="h-5 w-5 mr-2" />
                      Rejoindre la réunion
                    </button>
                  ) : (
                    <button
                      onClick={handleStartMeeting}
                      disabled={isOpeningMeeting}
                      className="w-full py-4 rounded-xl font-semibold transition-all duration-200 flex items-center justify-center text-lg bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Video className="h-5 w-5 mr-2" />
                      {isOpeningMeeting
                        ? "Ouverture en cours..."
                        : "Démarrer la réunion"}
                    </button>
                  )
                ) : /* Si c'est un patient, vérifier le statut de la réunion */
                meetingInfo.meetingStatus === "open" ? (
                  <button
                    onClick={handleJoinMeeting}
                    className="w-full py-4 rounded-xl font-semibold transition-all duration-200 flex items-center justify-center text-lg bg-gradient-to-r from-purple-500 to-pink-600 text-white hover:from-purple-600 hover:to-pink-700 shadow-md hover:shadow-lg"
                  >
                    <Video className="h-5 w-5 mr-2" />
                    Rejoindre la réunion
                  </button>
                ) : (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                    <div className="flex items-start">
                      <div className="flex-shrink-0">
                        <svg
                          className="h-6 w-6 text-yellow-600 mt-0.5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                          />
                        </svg>
                      </div>
                      <div className="ml-3 flex-1">
                        <h3 className="text-lg font-semibold text-yellow-900 mb-2">
                          Réunion en attente
                        </h3>
                        <p className="text-sm text-yellow-800 mb-4">
                          La séance n'a pas encore commencé. Merci d'attendre
                          que le professionnel démarre la réunion.
                        </p>
                        <div className="bg-white rounded-lg p-3 border border-yellow-300">
                          <p className="text-xs text-yellow-700">
                            💡 Vous serez automatiquement autorisé à rejoindre
                            une fois que le professionnel aura démarré la
                            réunion.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      <Users className="h-5 w-5 text-blue-600 mt-0.5" />
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-blue-900">
                        Informations importantes
                      </h3>
                      <div className="mt-2 text-sm text-blue-700">
                        <ul className="list-disc list-inside space-y-1">
                          <li>
                            Assurez-vous d'avoir une connexion internet stable
                          </li>
                          <li>
                            La réunion peut commencer quelques minutes après
                            l'heure prévue
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Titre et message explicatif */}
                <div className="text-center">
                  <h3 className="text-xl font-bold text-gray-900 mb-3">
                    Réunion pas encore ouverte
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Vous êtes bien inscrit. Le professionnel doit démarrer la
                    réunion. Dès qu'il l'ouvre, le bouton "Rejoindre la réunion"
                    apparaîtra automatiquement sur cette page.
                  </p>
                </div>

                {/* Badge de statut */}
                <div className="flex justify-center">
                  {meetingInfo?.meetingStatus === "open" ? (
                    <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium bg-green-100 text-green-800">
                      <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                      Ouverte
                    </span>
                  ) : meetingInfo?.meetingStatus === "ended" ||
                    meetingInfo?.meetingStatus === "completed" ? (
                    <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
                      <span className="w-2 h-2 bg-gray-500 rounded-full mr-2"></span>
                      Terminée
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
                      <span className="w-2 h-2 bg-yellow-500 rounded-full mr-2"></span>
                      En attente d'ouverture
                    </span>
                  )}
                </div>

                {/* Bouton désactivé */}
                <button
                  disabled
                  className="w-full py-4 rounded-xl font-semibold transition-all duration-200 flex items-center justify-center text-lg bg-gradient-to-r from-purple-500 to-pink-600 text-white opacity-50 cursor-not-allowed"
                >
                  <Video className="h-5 w-5 mr-2" />
                  Rejoindre (en attente du professionnel)
                </button>

                {/* Message de mise à jour automatique */}
                <div className="text-center">
                  <p className="text-xs text-gray-500 italic">
                    Cette page se met à jour automatiquement dès que la réunion
                    est ouverte.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GroupTherapyMeeting;
