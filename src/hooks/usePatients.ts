import { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { getFirestoreInstance } from '../utils/firebase'; // Use getter function instead of direct import

interface Patient {
  id: string;
  name: string;
  email: string;
  phone?: string;
  gender?: string;
  age?: number;
  medicalHistory?: string;
  createdAt?: string;
}

export const usePatients = () => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPatients = async () => {
      try {
        const db = getFirestoreInstance();
        if (!db) {
          console.warn('❌ Firestore not available');
          setPatients([]);
          return;
        }
        
        const querySnapshot = await getDocs(collection(db, 'patients'));
        const results: Patient[] = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data()
        })) as Patient[];
        setPatients(results);
      } catch (error) {
        console.error('Erreur lors du chargement des patients:', error);
        setPatients([]); // Set empty array on error
      } finally {
        setLoading(false);
      }
    };

    fetchPatients();
  }, []);

  return { patients, loading };
};