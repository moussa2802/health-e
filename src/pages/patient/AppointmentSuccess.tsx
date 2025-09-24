import React, { useState, useEffect } from "react";
import { useSearchParams, useParams, Link } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import {
  CheckCircle,
  AlertCircle,
  Calendar,
  Clock,
  User,
  Video,
} from "lucide-react";
// REPLACE the firebase/firestore import block with:
import {
  doc,
  getDoc,
  updateDoc,
  Timestamp,
  serverTimestamp,
} from "firebase/firestore";
import { getFirestoreInstance } from "../../utils/firebase";

interface BookingData {
  id?: string;
  patientId: string;
  professionalId: string;
  patientName: string;
  professionalName: string;
  date: string;
  startTime: string;
  endTime: string;
  type: string;
  status: string;
  paymentStatus?: string;
  price?: number;
  createdAt?: Timestamp;
}

const AppointmentSuccess: React.FC = () => {
  const { bookingId } = useParams<{ bookingId: string }>();
  const [searchParams] = useSearchParams();
  const { currentUser } = useAuth();
  const [bookingData, setBookingData] = useState<BookingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<string>("pending");

  useEffect(() => {
    const fetchBooking = async () => {
      if (!bookingId) {
        setError("ID de réservation manquant");
        setLoading(false);
        return;
      }

      // Vérifier les paramètres PayTech dans l'URL
      const paytechStatus = searchParams.get("status");
      const paytechRef = searchParams.get("ref_command");

      if (paytechStatus && paytechRef) {
        console.log("🔔 [PAYTECH] Payment callback received:", {
          paytechStatus,
          paytechRef,
        });

        // Ne pas définir le statut trop tôt, on le fera après lecture du doc
        if (paytechStatus === "cancelled") {
          setPaymentStatus("cancelled");
        }
      }

      try {
        console.log("🔍 Fetching booking data for ID:", bookingId);
        const db = getFirestoreInstance();
        if (!db) {
          setError("Base de données non disponible");
          setLoading(false);
          return;
        }

        const bookingRef = doc(db, "bookings", bookingId);
        console.log(
          "🔍 [APPOINTMENT SUCCESS] Looking for booking in Firestore:",
          bookingRef.path
        );
        const snapshot = await getDoc(bookingRef);

        if (snapshot.exists()) {
          console.log("✅ Booking data found:", snapshot.data());
          const data = snapshot.data() as BookingData;
          setBookingData(data);

          // Vérifier le statut de paiement
          if (data.paymentStatus) {
            setPaymentStatus(data.paymentStatus);
            console.log(
              "🔍 [APPOINTMENT SUCCESS] Payment status:",
              data.paymentStatus
            );
          }

          // Si la réservation est en statut "pending", afficher un message d'attente
          if (data.status === "pending") {
            console.log(
              "⏳ [APPOINTMENT SUCCESS] Booking is pending payment confirmation"
            );
          }

          // Si PayTech renvoie succès et que la réservation est encore en attente, on confirme localement
          if (
            paytechStatus === "success" &&
            (data.status === "pending_payment" ||
              data.paymentStatus === "pending")
          ) {
            try {
              await updateDoc(bookingRef, {
                status: "confirmed",
                paymentStatus: "paid",
                "payment.status": "paid",
                "payment.confirmedAt": serverTimestamp(),
                updatedAt: serverTimestamp(),
              });
              setPaymentStatus("confirmed");
              // Recharger en mémoire
              const refreshed = await getDoc(bookingRef);
              if (refreshed.exists())
                setBookingData(refreshed.data() as BookingData);
            } catch (e) {
              console.warn("⚠️ Unable to auto-confirm booking:", e);
            }
          }

          // Si PayTech renvoie annulation, mettre à jour le doc
          if (paytechStatus === "cancelled") {
            try {
              await updateDoc(bookingRef, {
                status: "cancelled",
                paymentStatus: "cancelled",
                "payment.status": "cancelled",
                updatedAt: serverTimestamp(),
              });
              setPaymentStatus("cancelled");
            } catch (e) {
              console.warn("⚠️ Unable to mark cancelled:", e);
            }
          }

          // Si le paiement est confirmé, mettre à jour le statut
          if (data.paymentStatus === "paid" || data.status === "confirmed") {
            setPaymentStatus("confirmed");
            console.log("✅ [APPOINTMENT SUCCESS] Payment confirmed");
          }
        } else {
          // --- START new fallback ---
          console.log("⚠️ No booking found with ID:", bookingId);

          // Cas des IDs temporaires : tenter un mapping vers un ID final
          if (bookingId && bookingId.startsWith("temp_")) {
            console.log(
              "🔄 [APPOINTMENT SUCCESS] Temporary ID detected, checking for redirect mapping..."
            );

            // 1) Chercher un mapping dans temp_redirects
            const tempRedirectRef = doc(db, "temp_redirects", bookingId);
            const tempRedirectSnap = await getDoc(tempRedirectRef);

            if (tempRedirectSnap.exists()) {
              const { finalBookingId } = tempRedirectSnap.data() as {
                finalBookingId: string;
              };
              console.log(
                "🔄 [APPOINTMENT SUCCESS] Found redirect to:",
                finalBookingId
              );

              const finalBookingRef = doc(db, "bookings", finalBookingId);
              const finalBookingSnap = await getDoc(finalBookingRef);
              if (finalBookingSnap.exists()) {
                setBookingData(finalBookingSnap.data() as BookingData);
                setLoading(false);
                return;
              }
            }

            // 2) Polling du doc temp (si l'IPN ou la Function écrit avec un léger délai)
            const start = Date.now();
            const timeoutMs = 20000;
            while (Date.now() - start < timeoutMs) {
              const retrySnap = await getDoc(doc(db, "bookings", bookingId));
              if (retrySnap.exists()) {
                setBookingData(retrySnap.data() as BookingData);
                setLoading(false);
                return;
              }
              await new Promise((r) => setTimeout(r, 1500));
            }
          }

          // 3) Rien trouvé
          setError("Réservation non trouvée");
          // --- END new fallback ---
        }
      } catch (err) {
        console.error("❌ Error fetching booking:", err);

        // Si c'est une erreur de connexion, réessayer après un délai
        if (
          err instanceof Error &&
          (err.message.includes("offline") ||
            err.message.includes("unavailable"))
        ) {
          console.log("🔄 Connection error, retrying in 2 seconds...");
          setTimeout(() => {
            fetchBooking();
          }, 2000);
          return;
        }

        setError("Erreur lors du chargement des détails de la réservation");
      } finally {
        setLoading(false);
      }
    };

    fetchBooking();
  }, [bookingId, searchParams]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">
            Chargement des détails de votre réservation...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-8 text-center">
          <div className="text-red-500 mb-4">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-12 w-12 mx-auto"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h2 className="text-xl font-semibold mb-2">{error}</h2>
          <p className="text-gray-600 mb-6">
            Impossible d'afficher les détails de votre réservation.
          </p>
          <div className="flex justify-center">
            <Link
              to="/patient/dashboard"
              className="bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 transition-colors"
            >
              Voir mes rendez-vous
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Ajouter un bouton de test pour mettre à jour manuellement le statut
  const handleManualUpdate = async () => {
    try {
      console.log(
        "🔧 [MANUAL UPDATE] Attempting to manually update booking status"
      );

      // Récupérer l'instance Firestore
      const db = getFirestoreInstance();
      if (!db) {
        alert("Base de données non disponible");
        return;
      }

      if (!bookingId) {
        alert("ID de réservation manquant");
        return;
      }

      // Mettre à jour le statut de la réservation
      const bookingRef = doc(db, "bookings", bookingId);
      await updateDoc(bookingRef, {
        status: "confirmed",
        paymentStatus: "paid",
        "payment.status": "paid",
        updatedAt: serverTimestamp(),
      });

      console.log("✅ [MANUAL UPDATE] Booking status updated successfully");
      alert("Statut mis à jour avec succès !");
      window.location.reload();
    } catch (error) {
      console.error("❌ [MANUAL UPDATE] Error:", error);
      alert("Erreur lors de la mise à jour du statut");
    }
  };

  // Si la réservation est en attente, afficher un bouton de test
  if (
    bookingData?.status === "en_attente" ||
    bookingData?.status === "pending" ||
    bookingData?.status === "pending_payment"
  ) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-8 text-center">
          <div className="text-yellow-500 mb-4">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-12 w-12 mx-auto"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h2 className="text-xl font-semibold mb-2">Paiement en attente</h2>
          <p className="text-gray-600 mb-6">
            Votre réservation est en attente de confirmation de paiement.
          </p>

          {/* Détails du rendez-vous */}
          {bookingData && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <h3 className="font-semibold text-blue-800 mb-3">
                Détails du rendez-vous
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center">
                  <Calendar className="h-4 w-4 mr-2 text-blue-600" />
                  <span>Date: {bookingData.date}</span>
                </div>
                <div className="flex items-center">
                  <Clock className="h-4 w-4 mr-2 text-blue-600" />
                  <span>Heure: {bookingData.startTime}</span>
                </div>
                <div className="flex items-center">
                  <Video className="h-4 w-4 mr-2 text-blue-600" />
                  <span>Type: Consultation {bookingData.type}</span>
                </div>
                <div className="flex items-center">
                  <User className="h-4 w-4 mr-2 text-blue-600" />
                  <span>Professionnel: {bookingData.professionalName}</span>
                </div>
              </div>
            </div>
          )}

          {/* Bouton de test pour mise à jour manuelle */}
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800 mb-2">
              <strong>Test :</strong> Si le paiement est confirmé mais le statut
              ne se met pas à jour automatiquement
            </p>
            <button
              onClick={handleManualUpdate}
              className="bg-yellow-500 text-white py-2 px-4 rounded-md hover:bg-yellow-600 transition-colors text-sm"
            >
              🔧 Mettre à jour le statut manuellement
            </button>
          </div>

          <div className="flex flex-col space-y-3">
            <Link
              to="/patient/dashboard"
              className="bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 transition-colors"
            >
              Voir mes rendez-vous
            </Link>
            <Link
              to="/"
              className="bg-gray-500 text-white py-2 px-4 rounded-md hover:bg-gray-600 transition-colors"
            >
              Retour à l'accueil
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-md overflow-hidden">
        <div
          className={`text-center p-8 rounded-2xl shadow-lg mb-6 ${
            paymentStatus === "confirmed" || paymentStatus === "paid"
              ? "bg-gradient-to-r from-green-500 to-green-600"
              : paymentStatus === "pending"
              ? "bg-gradient-to-r from-yellow-500 to-yellow-600"
              : "bg-gradient-to-r from-red-500 to-red-600"
          }`}
        >
          {paymentStatus === "confirmed" || paymentStatus === "paid" ? (
            <CheckCircle className="h-16 w-16 mx-auto mb-4" />
          ) : paymentStatus === "pending" ? (
            <AlertCircle className="h-16 w-16 mx-auto mb-4" />
          ) : (
            <AlertCircle className="h-16 w-16 mx-auto mb-4" />
          )}
          <h1 className="text-2xl font-bold mb-2">
            {paymentStatus === "confirmed" || paymentStatus === "paid"
              ? "Paiement confirmé !"
              : paymentStatus === "pending"
              ? "Paiement en attente"
              : "Paiement échoué"}
          </h1>
          <p>
            {paymentStatus === "confirmed" || paymentStatus === "paid"
              ? "Votre consultation a été réservée et payée avec succès."
              : paymentStatus === "pending"
              ? "Votre réservation est en attente de confirmation de paiement."
              : "Le paiement n'a pas pu être traité. Veuillez réessayer."}
          </p>
        </div>

        <div className="p-6">
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mb-6">
            <h2 className="text-lg font-semibold mb-2 text-blue-700">
              Détails du rendez-vous
            </h2>
            <div className="space-y-2 text-blue-800">
              <div className="flex items-center">
                <Calendar className="h-5 w-5 mr-2 text-blue-500" />
                <p>
                  <strong>Date :</strong> {bookingData?.date || "Non spécifiée"}
                </p>
              </div>
              <div className="flex items-center">
                <Clock className="h-5 w-5 mr-2 text-blue-500" />
                <p>
                  <strong>Heure :</strong>{" "}
                  {bookingData?.startTime || "Non spécifiée"}
                </p>
              </div>
              <div className="flex items-center">
                <Video className="h-5 w-5 mr-2 text-blue-500" />
                <p>
                  <strong>Type :</strong>{" "}
                  {bookingData?.type === "video"
                    ? "Consultation vidéo"
                    : bookingData?.type === "audio"
                    ? "Consultation audio"
                    : bookingData?.type || "Non spécifié"}
                </p>
              </div>
              <div className="flex items-center">
                <User className="h-5 w-5 mr-2 text-blue-500" />
                <p>
                  <strong>Professionnel :</strong> Dr.{" "}
                  {bookingData?.professionalName || "Nom non spécifié"}
                </p>
              </div>
            </div>
          </div>

          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-2">Prochaines étapes</h3>
            <ul className="space-y-3">
              <li className="flex">
                <div className="flex-shrink-0 h-6 w-6 rounded-full bg-blue-100 text-blue-500 flex items-center justify-center mr-3 mt-0.5">
                  1
                </div>
                <div>
                  <p className="text-gray-700">
                    Un e-mail de confirmation a été envoyé à votre adresse.
                  </p>
                </div>
              </li>
              <li className="flex">
                <div className="flex-shrink-0 h-6 w-6 rounded-full bg-blue-100 text-blue-500 flex items-center justify-center mr-3 mt-0.5">
                  2
                </div>
                <div>
                  <p className="text-gray-700">
                    Le jour de votre rendez-vous, connectez-vous 5 minutes avant
                    l'heure prévue.
                  </p>
                </div>
              </li>
              <li className="flex">
                <div className="flex-shrink-0 h-6 w-6 rounded-full bg-blue-100 text-blue-500 flex items-center justify-center mr-3 mt-0.5">
                  3
                </div>
                <div>
                  <p className="text-gray-700">
                    Assurez-vous d'avoir une bonne connexion internet et un
                    environnement calme.
                  </p>
                </div>
              </li>
            </ul>
          </div>

          <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3">
            {paymentStatus !== "confirmed" && paymentStatus !== "paid" && (
              <Link
                to={`/book-appointment/${bookingData?.professionalId}`}
                className="flex-1 bg-green-500 text-white py-3 px-4 rounded-md text-center font-medium hover:bg-green-600 transition-colors"
              >
                Réessayer le paiement
              </Link>
            )}
            <Link
              to="/patient/dashboard"
              className="flex-1 bg-blue-500 text-white py-3 px-4 rounded-md text-center font-medium hover:bg-blue-600 transition-colors"
            >
              Voir mes rendez-vous
            </Link>
            <Link
              to="/"
              className="flex-1 border border-gray-300 text-gray-700 py-3 px-4 rounded-md text-center font-medium hover:bg-gray-50 transition-colors"
            >
              Retour à l'accueil
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AppointmentSuccess;
