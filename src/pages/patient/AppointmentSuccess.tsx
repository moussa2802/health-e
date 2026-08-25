import React, { useState, useEffect } from "react";
import { useSearchParams, useParams, Link } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import {
  CheckCircle2,
  AlertCircle,
  Calendar,
  Clock,
  User,
  Video,
  Loader2,
  Settings,
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
        console.log("[PAYTECH] Payment callback received:", {
          paytechStatus,
          paytechRef,
        });

        // Ne pas définir le statut trop tôt, on le fera après lecture du doc
        if (paytechStatus === "cancelled") {
          setPaymentStatus("cancelled");
        }
      }

      try {
        console.log("Fetching booking data for ID:", bookingId);
        const db = getFirestoreInstance();
        if (!db) {
          setError("Base de données non disponible");
          setLoading(false);
          return;
        }

        const bookingRef = doc(db, "bookings", bookingId);
        console.log(
          "[APPOINTMENT SUCCESS] Looking for booking in Firestore:",
          bookingRef.path
        );
        const snapshot = await getDoc(bookingRef);

        if (snapshot.exists()) {
          console.log("Booking data found:", snapshot.data());
          const data = snapshot.data() as BookingData;
          setBookingData(data);

          // Vérifier le statut de paiement
          if (data.paymentStatus) {
            setPaymentStatus(data.paymentStatus);
            console.log(
              "[APPOINTMENT SUCCESS] Payment status:",
              data.paymentStatus
            );
          }

          // Si la réservation est en statut "pending", afficher un message d'attente
          if (data.status === "pending") {
            console.log(
              "[APPOINTMENT SUCCESS] Booking is pending payment confirmation"
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
              console.warn("Unable to auto-confirm booking:", e);
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
              console.warn("Unable to mark cancelled:", e);
            }
          }

          // Si le paiement est confirmé, mettre à jour le statut
          if (data.paymentStatus === "paid" || data.status === "confirmed") {
            setPaymentStatus("confirmed");
            console.log("[APPOINTMENT SUCCESS] Payment confirmed");
          }
        } else {
          // --- START new fallback ---
          console.log("No booking found with ID:", bookingId);

          // Cas des IDs temporaires : tenter un mapping vers un ID final
          if (bookingId && bookingId.startsWith("temp_")) {
            console.log(
              "[APPOINTMENT SUCCESS] Temporary ID detected, checking for redirect mapping..."
            );

            // 1) Chercher un mapping dans temp_redirects
            const tempRedirectRef = doc(db, "temp_redirects", bookingId);
            const tempRedirectSnap = await getDoc(tempRedirectRef);

            if (tempRedirectSnap.exists()) {
              const { finalBookingId } = tempRedirectSnap.data() as {
                finalBookingId: string;
              };
              console.log(
                "[APPOINTMENT SUCCESS] Found redirect to:",
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
        console.error("Error fetching booking:", err);

        // Si c'est une erreur de connexion, réessayer après un délai
        if (
          err instanceof Error &&
          (err.message.includes("offline") ||
            err.message.includes("unavailable"))
        ) {
          console.log("Connection error, retrying in 2 seconds...");
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
      <div className="min-h-screen bg-paper container mx-auto px-4 py-16">
        <div className="max-w-md mx-auto bg-card border border-line rounded-card shadow-soft p-8 text-center">
          <Loader2 className="h-12 w-12 mx-auto text-accent animate-spin" />
          <p className="mt-4 text-ink-soft">
            Chargement des détails de votre réservation...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-paper container mx-auto px-4 py-16">
        <div className="max-w-md mx-auto bg-card border border-line rounded-card shadow-soft p-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-danger/10 mb-4">
            <AlertCircle className="h-8 w-8 text-danger" />
          </div>
          <h2 className="font-display text-xl font-semibold text-ink mb-2">
            {error}
          </h2>
          <p className="text-ink-soft mb-6">
            Impossible d'afficher les détails de votre réservation.
          </p>
          <div className="flex justify-center">
            <Link
              to="/patient/dashboard"
              className="inline-flex items-center px-4 py-2 rounded-pill text-sm font-medium text-white bg-ink hover:bg-ink/90 transition-colors"
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
        "[MANUAL UPDATE] Attempting to manually update booking status"
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

      console.log("[MANUAL UPDATE] Booking status updated successfully");
      alert("Statut mis à jour avec succès !");
      window.location.reload();
    } catch (error) {
      console.error("[MANUAL UPDATE] Error:", error);
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
      <div className="min-h-screen bg-paper container mx-auto px-4 py-16">
        <div className="max-w-md mx-auto bg-card border border-line rounded-card shadow-soft p-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-warn/10 mb-4">
            <AlertCircle className="h-8 w-8 text-warn" />
          </div>
          <h2 className="font-display text-xl font-semibold text-ink mb-2">
            Paiement en attente
          </h2>
          <p className="text-ink-soft mb-6">
            Votre réservation est en attente de confirmation de paiement.
          </p>

          {/* Détails du rendez-vous */}
          {bookingData && (
            <div className="bg-card border border-line rounded-card shadow-soft p-4 mb-6 text-left">
              <h3 className="font-display font-semibold text-ink mb-3">
                Détails du rendez-vous
              </h3>
              <div className="space-y-2 text-sm text-ink-soft">
                <div className="flex items-center">
                  <Calendar className="h-4 w-4 mr-2 text-sage" />
                  <span>Date: {bookingData.date}</span>
                </div>
                <div className="flex items-center">
                  <Clock className="h-4 w-4 mr-2 text-sage" />
                  <span>Heure: {bookingData.startTime}</span>
                </div>
                <div className="flex items-center">
                  <Video className="h-4 w-4 mr-2 text-sage" />
                  <span>Type: Consultation {bookingData.type}</span>
                </div>
                <div className="flex items-center">
                  <User className="h-4 w-4 mr-2 text-sage" />
                  <span>Professionnel: {bookingData.professionalName}</span>
                </div>
              </div>
            </div>
          )}

          {/* Bouton de test pour mise à jour manuelle */}
          <div className="mb-4 p-3 bg-warn/10 border border-warn/20 rounded-card text-left">
            <p className="text-sm text-ink-soft mb-2">
              <strong className="text-ink">Test :</strong> Si le paiement est
              confirmé mais le statut ne se met pas à jour automatiquement
            </p>
            <button
              onClick={handleManualUpdate}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-pill text-sm font-medium text-white bg-ink hover:bg-ink/90 transition-colors"
            >
              <Settings className="h-4 w-4" />
              Mettre à jour le statut manuellement
            </button>
          </div>

          <div className="flex flex-col space-y-3">
            <Link
              to="/patient/dashboard"
              className="inline-flex items-center justify-center px-4 py-2 rounded-pill text-sm font-medium text-white bg-ink hover:bg-ink/90 transition-colors"
            >
              Voir mes rendez-vous
            </Link>
            <Link
              to="/"
              className="inline-flex items-center justify-center px-4 py-2 rounded-pill text-sm font-medium text-ink-soft border border-line bg-card hover:bg-paper transition-colors"
            >
              Retour à l'accueil
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const isConfirmed = paymentStatus === "confirmed" || paymentStatus === "paid";
  const isPending = paymentStatus === "pending";
  const statusColor = isConfirmed ? "ok" : isPending ? "warn" : "danger";

  return (
    <div className="min-h-screen bg-paper container mx-auto px-4 py-16">
      <div className="max-w-md mx-auto bg-card border border-line rounded-card shadow-soft overflow-hidden">
        <div className="text-center p-8 border-b border-line">
          <div
            className={`inline-flex items-center justify-center w-20 h-20 rounded-full mb-4 ${
              isConfirmed
                ? "bg-ok/10"
                : isPending
                ? "bg-warn/10"
                : "bg-danger/10"
            }`}
          >
            {isConfirmed ? (
              <CheckCircle2 className="h-10 w-10 text-ok" />
            ) : (
              <AlertCircle
                className={`h-10 w-10 ${
                  isPending ? "text-warn" : "text-danger"
                }`}
              />
            )}
          </div>
          <h1 className="font-display text-2xl font-bold text-ink mb-2">
            {isConfirmed
              ? "Paiement confirmé !"
              : isPending
              ? "Paiement en attente"
              : "Paiement échoué"}
          </h1>
          <p className="text-ink-soft">
            {isConfirmed
              ? "Votre consultation a été réservée et payée avec succès."
              : isPending
              ? "Votre réservation est en attente de confirmation de paiement."
              : "Le paiement n'a pas pu être traité. Veuillez réessayer."}
          </p>
        </div>

        <div className="p-6">
          <div className="bg-sage-soft border border-sage/20 rounded-card p-4 mb-6">
            <h2 className="font-display text-lg font-semibold mb-2 text-sage">
              Détails du rendez-vous
            </h2>
            <div className="space-y-2 text-ink-soft">
              <div className="flex items-center">
                <Calendar className="h-5 w-5 mr-2 text-sage" />
                <p>
                  <strong className="text-ink">Date :</strong>{" "}
                  {bookingData?.date || "Non spécifiée"}
                </p>
              </div>
              <div className="flex items-center">
                <Clock className="h-5 w-5 mr-2 text-sage" />
                <p>
                  <strong className="text-ink">Heure :</strong>{" "}
                  {bookingData?.startTime || "Non spécifiée"}
                </p>
              </div>
              <div className="flex items-center">
                <Video className="h-5 w-5 mr-2 text-sage" />
                <p>
                  <strong className="text-ink">Type :</strong>{" "}
                  {bookingData?.type === "video"
                    ? "Consultation vidéo"
                    : bookingData?.type === "audio"
                    ? "Consultation audio"
                    : bookingData?.type || "Non spécifié"}
                </p>
              </div>
              <div className="flex items-center">
                <User className="h-5 w-5 mr-2 text-sage" />
                <p>
                  <strong className="text-ink">Professionnel :</strong> Dr.{" "}
                  {bookingData?.professionalName || "Nom non spécifié"}
                </p>
              </div>
            </div>
          </div>

          <div className="mb-6">
            <h3 className="font-display text-lg font-semibold text-ink mb-2">
              Prochaines étapes
            </h3>
            <ul className="space-y-3">
              <li className="flex">
                <div className="flex-shrink-0 h-6 w-6 rounded-full bg-sage-soft text-sage flex items-center justify-center mr-3 mt-0.5 text-sm font-semibold">
                  1
                </div>
                <div>
                  <p className="text-ink-soft">
                    Un e-mail de confirmation a été envoyé à votre adresse.
                  </p>
                </div>
              </li>
              <li className="flex">
                <div className="flex-shrink-0 h-6 w-6 rounded-full bg-sage-soft text-sage flex items-center justify-center mr-3 mt-0.5 text-sm font-semibold">
                  2
                </div>
                <div>
                  <p className="text-ink-soft">
                    Le jour de votre rendez-vous, connectez-vous 5 minutes avant
                    l'heure prévue.
                  </p>
                </div>
              </li>
              <li className="flex">
                <div className="flex-shrink-0 h-6 w-6 rounded-full bg-sage-soft text-sage flex items-center justify-center mr-3 mt-0.5 text-sm font-semibold">
                  3
                </div>
                <div>
                  <p className="text-ink-soft">
                    Assurez-vous d'avoir une bonne connexion internet et un
                    environnement calme.
                  </p>
                </div>
              </li>
            </ul>
          </div>

          <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3">
            {!isConfirmed && (
              <Link
                to={`/book-appointment/${bookingData?.professionalId}`}
                className="flex-1 bg-accent text-white py-3 px-4 rounded-pill text-center font-medium hover:bg-accent/90 transition-colors"
              >
                Réessayer le paiement
              </Link>
            )}
            <Link
              to="/patient/dashboard"
              className="flex-1 bg-ink text-white py-3 px-4 rounded-pill text-center font-medium hover:bg-ink/90 transition-colors"
            >
              Voir mes rendez-vous
            </Link>
            <Link
              to="/"
              className="flex-1 border border-line bg-card text-ink-soft py-3 px-4 rounded-pill text-center font-medium hover:bg-paper transition-colors"
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
