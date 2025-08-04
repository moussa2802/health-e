import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useConsultationStore } from '../../store/consultationStore';
import { Bell } from 'lucide-react';
import { getDatabase, ref, update } from 'firebase/database';

const ConsultationRequests: React.FC = () => {
  const { pendingRequests, removeRequest } = useConsultationStore();
  const navigate = useNavigate();
  const database = getDatabase();

  const handleAccept = (requestId: string) => {
    // Update the room status in Firebase
    const roomRef = ref(database, `rooms/${requestId}`);
    update(roomRef, {
      status: 'accepted',
      acceptedAt: new Date().toISOString()
    }).then(() => {
      console.log('✅ Consultation request accepted in Firebase');
      
      // Also update the professional request status
      const requestRef = ref(database, `professional_requests/${requestId}`);
      update(requestRef, { status: 'accepted' }).catch(error => {
        console.warn('⚠️ Could not update professional request status:', error);
      });
      
      // Remove from local state and navigate
      removeRequest(requestId);
      navigate(`/consultation/${requestId}`);
    }).catch(error => {
      console.error('❌ Error accepting consultation request:', error);
      // Continue anyway to the consultation room
      removeRequest(requestId);
      navigate(`/consultation/${requestId}`);
    });
  };

  const handleDecline = (requestId: string) => {
    // Update the room status in Firebase
    const roomRef = ref(database, `rooms/${requestId}`);
    update(roomRef, {
      status: 'declined',
      declinedAt: new Date().toISOString()
    }).then(() => {
      console.log('✅ Consultation request declined in Firebase');
      
      // Also update the professional request status
      const requestRef = ref(database, `professional_requests/${requestId}`);
      update(requestRef, { status: 'declined' }).catch(error => {
        console.warn('⚠️ Could not update professional request status:', error);
      });
      
      // Remove from local state
      removeRequest(requestId);
    }).catch(error => {
      console.error('❌ Error declining consultation request:', error);
      removeRequest(requestId);
    });
  };

  if (pendingRequests.length === 0) {
    return null;
  }

  return (
    <div className="fixed top-20 right-4 z-50 w-96">
      {pendingRequests.map((request) => (
        <div
          key={request.id}
          className="bg-white rounded-lg shadow-lg p-4 mb-4 border-l-4 border-blue-500 animate-slide-in"
        >
          <div className="flex items-center mb-3">
            <Bell className="h-5 w-5 text-blue-500 mr-2" />
            <h3 className="font-semibold">Demande de consultation immédiate</h3>
          </div>
          
          <p className="text-gray-600 mb-4">
            {request.patientName} souhaite démarrer une consultation maintenant
          </p>
          
          <div className="flex justify-end space-x-2">
            <button
              onClick={() => handleDecline(request.id)}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              Décliner
            </button>
            <button
              onClick={() => handleAccept(request.id)}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
            >
              Accepter
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ConsultationRequests;