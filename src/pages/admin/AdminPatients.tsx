import React, { useState, useEffect, useCallback } from 'react';
import { Search, Download, User, Calendar, Phone, Mail } from 'lucide-react';
import AdminLayout from '../../components/admin/AdminLayout';

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
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGender, setSelectedGender] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Charger les données une seule fois au montage
  useEffect(() => {
    fetchPatients();
  }, []);

  const fetchPatients = useCallback(async () => {
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
  }, []);

  // Filtrer les patients de manière simple et directe
  const getFilteredPatients = useCallback(() => {
    let filtered = [...patients];

    // Filtre par recherche
    if (searchTerm.trim()) {
      filtered = filtered.filter(patient =>
        patient.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        patient.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        patient.phone?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filtre par genre
    if (selectedGender !== 'all') {
      filtered = filtered.filter(patient => patient.gender === selectedGender);
    }

    return filtered;
  }, [patients, searchTerm, selectedGender]);

  const handleExport = useCallback(() => {
    try {
      const filtered = getFilteredPatients();
      const csvContent = [
        ['Nom', 'Email', 'Téléphone', 'Genre', 'Date de naissance', 'Date d\'inscription'],
        ...filtered.map(patient => [
          patient.name || '',
          patient.email || '',
          patient.phone || '',
          patient.gender || '',
          patient.dateOfBirth && typeof patient.dateOfBirth.toDate === 'function' 
            ? patient.dateOfBirth.toDate().toLocaleDateString('fr-FR')
            : 'Non disponible',
          patient.createdAt && typeof patient.createdAt.toDate === 'function' 
            ? patient.createdAt.toDate().toLocaleDateString('fr-FR')
            : 'Non disponible'
        ])
      ].map(row => row.join(',')).join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `patients_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Erreur lors de l\'export:', error);
      alert('Erreur lors de l\'export');
    }
  }, [getFilteredPatients]);

  const resetFilters = useCallback(() => {
    setSearchTerm('');
    setSelectedGender('all');
  }, []);

  const formatDate = (date: any) => {
    if (!date || typeof date.toDate !== 'function') {
      return 'Non disponible';
    }
    try {
      return date.toDate().toLocaleDateString('fr-FR');
    } catch {
      return 'Non disponible';
    }
  };

  const getGenderLabel = (gender?: string) => {
    switch (gender) {
      case 'male':
        return 'Homme';
      case 'female':
        return 'Femme';
      case 'other':
        return 'Autre';
      default:
        return 'Non spécifié';
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="p-6">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            <span className="ml-4 text-lg text-gray-600">Chargement des patients...</span>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout>
        <div className="p-6">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
            <strong className="font-bold">Erreur : </strong>
            <span className="block sm:inline">{error}</span>
            <button
              onClick={fetchPatients}
              className="mt-2 bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
            >
              Réessayer
            </button>
          </div>
        </div>
      </AdminLayout>
    );
  }

  const filteredPatients = getFilteredPatients();

  return (
    <AdminLayout>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <p className="text-gray-600">
              {filteredPatients.length} patient{filteredPatients.length > 1 ? 's' : ''} 
              {patients.length !== filteredPatients.length && ` sur ${patients.length} au total`}
            </p>
          </div>
          <button
            onClick={handleExport}
            className="flex items-center px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
          >
            <Download className="w-4 h-4 mr-2" />
            Exporter
          </button>
        </div>

        {/* Filtres simplifiés */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Rechercher un patient..."
                className="pl-10 w-full border border-gray-300 rounded-md p-2"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex flex-wrap gap-4">
              <select
                value={selectedGender}
                onChange={(e) => setSelectedGender(e.target.value)}
                className="border border-gray-300 rounded-md p-2"
              >
                <option value="all">Tous les genres</option>
                <option value="male">Hommes</option>
                <option value="female">Femmes</option>
                <option value="other">Autres</option>
              </select>
              <button
                onClick={resetFilters}
                className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
              >
                Réinitialiser
              </button>
            </div>
          </div>
        </div>

        {/* Table des patients */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {filteredPatients.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Patient
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contact
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Informations
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date d'inscription
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredPatients.map((patient) => (
                    <tr key={patient.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center mr-3">
                            <User className="h-6 w-6 text-blue-500" />
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">{patient.name}</div>
                            <div className="text-sm text-gray-500">{patient.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          {patient.phone && (
                            <div className="flex items-center text-sm text-gray-500">
                              <Phone className="w-4 h-4 mr-1" />
                              {patient.phone}
                            </div>
                          )}
                          <div className="flex items-center text-sm text-gray-500">
                            <Mail className="w-4 h-4 mr-1" />
                            {patient.email}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          <div className="flex items-center">
                            <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                            {patient.dateOfBirth ? formatDate(patient.dateOfBirth) : 'Non spécifiée'}
                          </div>
                          <div className="mt-1">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              patient.gender === 'male' ? 'bg-blue-100 text-blue-800' :
                              patient.gender === 'female' ? 'bg-pink-100 text-pink-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {getGenderLabel(patient.gender)}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(patient.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <User className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                {searchTerm || selectedGender !== 'all'
                  ? 'Aucun patient ne correspond à vos critères'
                  : 'Aucun patient trouvé'
                }
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm || selectedGender !== 'all'
                  ? 'Essayez de modifier vos critères de recherche ou de filtrage.'
                  : 'Aucun patient n\'est encore inscrit.'
                }
              </p>
              {(searchTerm || selectedGender !== 'all') && (
                <button
                  onClick={resetFilters}
                  className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
                >
                  Réinitialiser les filtres
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminPatients;