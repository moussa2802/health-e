import { create } from 'zustand';
import { getDatabase, ref, onValue, off } from 'firebase/database';

interface ConsultationRequest {
  id: string;
  patientId: string;
  patientName: string;
  timestamp: number;
}

interface ConsultationStore {
  pendingRequests: ConsultationRequest[];
  addRequest: (request: ConsultationRequest) => void;
  removeRequest: (id: string) => void;
  listenForRequests: (professionalId: string) => void;
  stopListening: () => void;
}

export const useConsultationStore = create<ConsultationStore>((set, get) => {
  // Référence à la base de données Firebase
  const database = getDatabase();
  let requestsRef: any = null;
  
  return {
    pendingRequests: [],
    
    addRequest: (request) => 
      set((state) => ({
        pendingRequests: [...state.pendingRequests, request]
      })),
      
    removeRequest: (id) =>
      set((state) => ({
        pendingRequests: state.pendingRequests.filter(req => req.id !== id)
      })),
      
    listenForRequests: (professionalId) => {
      // Arrêter l'écoute précédente si elle existe
      if (requestsRef) {
        off(requestsRef);
      }
      
      // Écouter les demandes de consultation pour ce professionnel
      requestsRef = ref(database, `professional_requests/${professionalId}`);
      
      onValue(requestsRef, (snapshot) => {
        const data = snapshot.val();
        if (!data) return;
        
        const requests: ConsultationRequest[] = Object.entries(data)
          .filter(([_, value]: [string, any]) => value.status === 'pending' || !value.status)
          .map(([key, value]: [string, any]) => ({
            id: key,
            patientId: value.patientId,
            patientName: value.patientName,
            timestamp: value.timestamp || Date.now()
          }));
        
        set({ pendingRequests: requests });
      });
    },
    
    stopListening: () => {
      if (requestsRef) {
        off(requestsRef);
        requestsRef = null;
      }
    }
  };
});