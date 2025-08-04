import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CheckCircle, Calendar, Clock, Video, User } from 'lucide-react';
import { getFirestoreInstance } from '../../utils/firebase';
import { formatLocalDate, formatLocalTime, createDateWithTime, formatInDakarTime } from '../../utils/dateUtils';
import { doc, getDoc } from 'firebase/firestore';

interface AppointmentSuccessParams {
  bookingId: string;
}

const AppointmentSuccess: React.FC = () => {
  const { bookingId } = useParams<AppointmentSuccessParams>();
  const [bookingData, setBookingData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        const snapshot = await getDoc(bookingRef);
        
        if (snapshot.exists()) {
          console.log('✅ Booking data found:', snapshot.data());
          setBookingData(snapshot.data());
        } else {
          console.log('⚠️ No booking found with ID:', bookingId);
          setError("Réservation non trouvée");
        }
      } catch (err) {
        console.error('❌ Error fetching booking:', err);
        setError("Erreur lors du chargement des détails de la réservation");
      } finally {
        setLoading(false);
      }
    };
    
    fetchBooking();
  }, [bookingId]);
  
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
  
  return (
    <div className="container mx-auto px-4 py-16">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-md overflow-hidden">
        <div className="bg-gradient-to-r from-blue-500 to-teal-400 p-6 text-white text-center">
          <CheckCircle className="h-16 w-16 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Rendez-vous confirmé !</h1>
          <p>Votre consultation a été réservée avec succès.</p>
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