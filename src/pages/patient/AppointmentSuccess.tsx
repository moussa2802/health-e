import React, { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { CheckCircle, Calendar, Clock, Video, User, AlertCircle } from 'lucide-react';
import { getFirestoreInstance } from '../../utils/firebase';
import { formatLocalDate, formatLocalTime, createDateWithTime, formatInDakarTime } from '../../utils/dateUtils';
import { doc, getDoc, collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import paydunyaService from '../../services/paydunyaService';
import { useAuth } from '../../contexts/AuthContext';

interface AppointmentSuccessParams {
  bookingId: string;
}

const AppointmentSuccess: React.FC = () => {
  const { bookingId } = useParams<AppointmentSuccessParams>();
  const [searchParams] = useSearchParams();
  const { currentUser } = useAuth();
  const [bookingData, setBookingData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<string>('pending');

  useEffect(() => {
    const fetchBooking = async () => {
      if (!bookingId) {
        setError("ID de réservation manquant");
        setLoading(false);
        return;
      }
      
      try {
        console.log('🔍 Fetching booking data for ID:', bookingId);
        const db = getFirestoreInstance();
        if (!db) {
          setError("Base de données non disponible");
          setLoading(false);
          return;
        }
        
        const bookingRef = doc(db, 'bookings', bookingId);
        console.log('🔍 [APPOINTMENT SUCCESS] Looking for booking in Firestore:', bookingRef.path);
        const snapshot = await getDoc(bookingRef);
        
        if (snapshot.exists()) {
          console.log('✅ Booking data found:', snapshot.data());
          const data = snapshot.data();
          setBookingData(data);
          
          // Vérifier le statut de paiement PayDunya
          if (data.paymentStatus) {
            setPaymentStatus(data.paymentStatus);
          }
          
          // Si c'est un retour de PayDunya, vérifier le statut
          const token = searchParams.get('token');
          if (token) {
            console.log('🔔 [PAYDUNYA] Checking payment status for token:', token);
            const paymentResult = await paydunyaService.checkPaymentStatus(token);
            if (paymentResult.success) {
              setPaymentStatus(paymentResult.status || 'completed');
              
              // Si le paiement est confirmé, mettre à jour le statut de la réservation
              if (paymentResult.status === 'completed' || paymentResult.status === 'success') {
                console.log('✅ [PAYDUNYA] Payment confirmed, updating booking status');
                await paydunyaService.updateBookingStatus(bookingId, 'confirmed');
              }
            }
          }
          
          // Si la réservation est en statut "pending", afficher un message d'attente
          if (data.status === 'pending') {
            console.log('⏳ [APPOINTMENT SUCCESS] Booking is pending payment confirmation');
          }
        } else {
          console.log('⚠️ No booking found with ID:', bookingId);
          console.log('🔍 [APPOINTMENT SUCCESS] Checking if booking exists in other collections...');
          
          // Essayer de chercher dans les réservations récentes
          try {
            const recentBookingsQuery = query(
              collection(db, 'bookings'),
              where('patientId', '==', currentUser?.uid),
              orderBy('createdAt', 'desc'),
              limit(1)
            );
            const recentSnapshot = await getDocs(recentBookingsQuery);
            if (!recentSnapshot.empty) {
              const recentBooking = recentSnapshot.docs[0];
              console.log('🔍 [APPOINTMENT SUCCESS] Found recent booking:', recentBooking.id, recentBooking.data());
            }
          } catch (err) {
            console.log('🔍 [APPOINTMENT SUCCESS] Error checking recent bookings:', err);
          }
          
          setError("Réservation non trouvée");
        }
      } catch (err) {
        console.error('❌ Error fetching booking:', err);
        
        // Si c'est une erreur de connexion, réessayer après un délai
        if (err.code === 'unavailable' || err.message.includes('offline')) {
          console.log('🔄 Connection error, retrying in 2 seconds...');
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
          <p className="mt-4 text-gray-600">Chargement des détails de votre réservation...</p>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-8 text-center">
          <div className="text-red-500 mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold mb-2">{error}</h2>
          <p className="text-gray-600 mb-6">Impossible d'afficher les détails de votre réservation.</p>
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
    if (!bookingId) return;
    
    try {
      console.log("🔧 [MANUAL UPDATE] Updating booking status manually");
      const result = await paydunyaService.updateBookingStatus(bookingId, "confirmed");
      
      if (result.success) {
        console.log("✅ [MANUAL UPDATE] Booking status updated successfully");
        // Recharger la page pour voir les changements
        window.location.reload();
      } else {
        console.error("❌ [MANUAL UPDATE] Failed to update booking status:", result.error);
        alert("Erreur lors de la mise à jour du statut");
      }
    } catch (error) {
      console.error("❌ [MANUAL UPDATE] Error:", error);
      alert("Erreur lors de la mise à jour du statut");
    }
  };

  // Si la réservation est en attente, afficher un bouton de test
  if (bookingData?.status === "en_attente" || bookingData?.status === "pending") {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-8 text-center">
          <div className="text-yellow-500 mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold mb-2">Paiement en attente</h2>
          <p className="text-gray-600 mb-6">Votre réservation est en attente de confirmation de paiement.</p>
          
          {/* Détails du rendez-vous */}
          {bookingData && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <h3 className="font-semibold text-blue-800 mb-3">Détails du rendez-vous</h3>
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
              <strong>Test :</strong> Si le paiement est confirmé mais le statut ne se met pas à jour automatiquement
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
        <div className={`p-6 text-white text-center ${
          paymentStatus === 'completed' 
            ? 'bg-gradient-to-r from-green-500 to-green-600' 
            : paymentStatus === 'pending'
            ? 'bg-gradient-to-r from-yellow-500 to-yellow-600'
            : 'bg-gradient-to-r from-red-500 to-red-600'
        }`}>
          {paymentStatus === 'completed' ? (
            <CheckCircle className="h-16 w-16 mx-auto mb-4" />
          ) : paymentStatus === 'pending' ? (
            <AlertCircle className="h-16 w-16 mx-auto mb-4" />
          ) : (
            <AlertCircle className="h-16 w-16 mx-auto mb-4" />
          )}
          <h1 className="text-2xl font-bold mb-2">
            {paymentStatus === 'completed' 
              ? 'Paiement confirmé !' 
              : paymentStatus === 'pending'
              ? 'Paiement en attente'
              : 'Paiement échoué'
            }
          </h1>
          <p>
            {paymentStatus === 'completed' 
              ? 'Votre consultation a été réservée et payée avec succès.' 
              : paymentStatus === 'pending'
              ? 'Votre réservation est en attente de confirmation de paiement.'
              : 'Le paiement n\'a pas pu être traité. Veuillez réessayer.'
            }
          </p>
        </div>
        
        <div className="p-6">
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mb-6">
            <h2 className="text-lg font-semibold mb-2 text-blue-700">Détails du rendez-vous</h2>
            <div className="space-y-2 text-blue-800">
              <div className="flex items-center">
                <Calendar className="h-5 w-5 mr-2 text-blue-500" />
                <p><strong>Date :</strong> {bookingData?.date || "Non spécifiée"}</p>
              </div>
              <div className="flex items-center">
                <Clock className="h-5 w-5 mr-2 text-blue-500" />
                <p><strong>Heure :</strong> {bookingData?.startTime || "Non spécifiée"}</p>
              </div>
              <div className="flex items-center">
                <Video className="h-5 w-5 mr-2 text-blue-500" />
                <p><strong>Type :</strong> {bookingData?.type === 'video' ? 'Consultation vidéo' : 
                                           bookingData?.type === 'audio' ? 'Consultation audio' : 
                                           bookingData?.type || "Non spécifié"}</p>
              </div>
              <div className="flex items-center">
                <User className="h-5 w-5 mr-2 text-blue-500" />
                <p><strong>Professionnel :</strong> Dr. {bookingData?.professionalName || "Nom non spécifié"}</p>
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
                  <p className="text-gray-700">Un e-mail de confirmation a été envoyé à votre adresse.</p>
                </div>
              </li>
              <li className="flex">
                <div className="flex-shrink-0 h-6 w-6 rounded-full bg-blue-100 text-blue-500 flex items-center justify-center mr-3 mt-0.5">
                  2
                </div>
                <div>
                  <p className="text-gray-700">Le jour de votre rendez-vous, connectez-vous 5 minutes avant l'heure prévue.</p>
                </div>
              </li>
              <li className="flex">
                <div className="flex-shrink-0 h-6 w-6 rounded-full bg-blue-100 text-blue-500 flex items-center justify-center mr-3 mt-0.5">
                  3
                </div>
                <div>
                  <p className="text-gray-700">Assurez-vous d'avoir une bonne connexion internet et un environnement calme.</p>
                </div>
              </li>
            </ul>
          </div>
          
          <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3">
            {paymentStatus !== 'completed' && (
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