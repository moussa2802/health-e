import React, { useState, useEffect } from 'react';
import { User, Calendar, Phone, Mail } from 'lucide-react';
import AdminLayout from '../../components/admin/AdminLayout';
import UserListPage from '../../components/admin/UserListPage';

interface Patient {
  id: string;
  name: string;
  email: string;
  phone?: string;
  dateOfBirth?: any;
  gender?: string;
  createdAt?: any;
}

const AdminPatients: React.FC = () => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Charger les données une seule fois au montage
  useEffect(() => {
    fetchPatients();
  }, []);

  const fetchPatients = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { collection, getDocs, query, where } = await import('firebase/firestore');
      const { getFirestoreInstance } = await import('../../utils/firebase');
      const db = getFirestoreInstance();
      
      if (db) {
        const patientsQuery = query(collection(db, 'users'), where('type', '==', 'patient'));
        const snapshot = await getDocs(patientsQuery);
        
        const patientsData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data()
        })) as Patient[];
        
        setPatients(patientsData);
      } else {
        setPatients([]);
      }
    } catch (err) {
      console.error('Error fetching patients:', err);
      setError('Erreur lors du chargement des patients');
      setPatients([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        </div>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout>
        <div className="text-center py-12">
          <div className="text-red-600 text-xl mb-4">{error}</div>
          <button
            onClick={fetchPatients}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Réessayer
          </button>
        </div>
      </AdminLayout>
    );
  }

  // Configuration des filtres pour UserListPage
  const filters = [
    {
      key: "gender",
      label: "Genre",
      options: [
        { value: "all", label: "Tous les genres" },
        { value: "male", label: "Homme" },
        { value: "female", label: "Femme" },
        { value: "other", label: "Autre" },
      ],
    },
  ];

  // Champs de recherche
  const searchFields: (keyof Patient)[] = ["name", "email", "phone"];

  // Fonction de rendu des lignes
  const renderRow = (patient: Patient) => (
    <tr key={patient.id} className="hover:bg-gray-50">
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center">
          <div className="w-10 h-10 rounded-full bg-green-200 flex items-center justify-center mr-3">
            <User className="h-6 w-6 text-green-600" />
          </div>
          <div>
            <div className="text-sm font-medium text-gray-900">
              {patient.name}
            </div>
            <div className="text-sm text-gray-500">
              {patient.email}
            </div>
            {patient.phone && (
              <div className="text-sm text-gray-400 flex items-center">
                <Phone className="h-4 w-4 mr-1" />
                {patient.phone}
              </div>
            )}
          </div>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm text-gray-900">
          {patient.gender === 'male' ? 'Homme' : 
           patient.gender === 'female' ? 'Femme' : 
           patient.gender === 'other' ? 'Autre' : 'Non défini'}
        </div>
        {patient.dateOfBirth && (
          <div className="text-sm text-gray-500 flex items-center">
            <Calendar className="h-4 w-4 mr-1" />
            {formatDate(patient.dateOfBirth)}
          </div>
        )}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        {formatDate(patient.createdAt)}
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex space-x-2">
          <button
            onClick={() => window.open(`mailto:${patient.email}`, '_blank')}
            className="px-3 py-1 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded text-xs font-medium"
          >
            <Mail className="h-3 w-3 mr-1 inline" />
            Contacter
          </button>
        </div>
      </td>
    </tr>
  );

  return (
    <AdminLayout>
      <UserListPage
        title="Gestion des Patients"
        data={patients}
        filters={filters}
        searchFields={searchFields}
        renderRow={renderRow}
        emptyMessage="Aucun patient trouvé"
      />
    </AdminLayout>
  );
};

// Fonction utilitaire pour formater les dates
const formatDate = (date: any) => {
  if (!date || typeof date.toDate !== "function") {
    return "Non disponible";
  }
  try {
    return date.toDate().toLocaleDateString("fr-FR");
  } catch {
    return "Non disponible";
  }
};

export default AdminPatients;