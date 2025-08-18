import React, { useState, useEffect } from 'react';
import { Search, Download, User, Phone, Mail, Calendar, MapPin, FileText, Eye, Edit2, Trash2 } from 'lucide-react';
import AdminLayout from '../../components/admin/AdminLayout';

interface Patient {
  id: string;
  name: string;
  email: string;
  phone?: string;
  gender?: string;
  age?: number;
  medicalHistory?: string;
  createdAt?: any;
}

interface PatientFilters {
  gender: string;
  dateRange: string;
  status: string;
}

const AdminPatients: React.FC = () => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [filteredPatients, setFilteredPatients] = useState<Patient[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<PatientFilters>({
    gender: '',
    status: '',
    dateRange: '',
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPatients();
  }, []);

  useEffect(() => {
    if (patients.length > 0) {
      applyFilters();
    }
  }, [patients, searchTerm, filters]);

  const fetchPatients = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Simuler un délai pour éviter les problèmes de rendu
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const { collection, getDocs } = await import('firebase/firestore');
      const { getFirestoreInstance } = await import('../../utils/firebase');
      const db = getFirestoreInstance();
      
      if (db) {
        const querySnapshot = await getDocs(collection(db, 'patients'));
        const results = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data()
        })) as Patient[];
        
        setPatients(results);
        setFilteredPatients(results);
      } else {
        setPatients([]);
        setFilteredPatients([]);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des patients:', error);
      setError('Erreur lors du chargement des patients');
      setPatients([]);
      setFilteredPatients([]);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    try {
      let filtered = [...patients];

      // Filter by search term
      if (searchTerm.trim()) {
        filtered = filtered.filter(patient =>
          patient.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          patient.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (patient.phone && patient.phone.includes(searchTerm))
        );
      }

      // Filter by gender
      if (filters.gender) {
        filtered = filtered.filter(patient => patient.gender === filters.gender);
      }

      // Filter by date range
      if (filters.dateRange) {
        const now = new Date();
        const filterDate = new Date();
        
        switch (filters.dateRange) {
          case 'today':
            filterDate.setHours(0, 0, 0, 0);
            break;
          case 'week':
            filterDate.setDate(now.getDate() - 7);
            break;
          case 'month':
            filterDate.setMonth(now.getMonth() - 1);
            break;
          default:
            filterDate.setFullYear(1970);
        }

        filtered = filtered.filter(patient => {
          if (!patient.createdAt) return false;
          
          try {
            let patientDate;
            
            // Handle Firestore Timestamp
            if (patient.createdAt && typeof patient.createdAt === 'object' && patient.createdAt.toDate) {
              patientDate = patient.createdAt.toDate();
            } else if (patient.createdAt instanceof Date) {
              patientDate = patient.createdAt;
            } else if (typeof patient.createdAt === 'string') {
              patientDate = new Date(patient.createdAt);
            } else {
              return false;
            }
            
            return patientDate >= filterDate;
          } catch (error) {
            return false;
          }
        });
      }

      setFilteredPatients(filtered);
    } catch (error) {
      console.error('Erreur lors du filtrage des patients:', error);
      setFilteredPatients(patients);
    }
  };

  const handleExport = () => {
    try {
      const csvContent = [
        ['Nom', 'Email', 'Téléphone', 'Genre', 'Date d\'inscription'],
        ...filteredPatients.map(patient => [
          patient.name || '',
          patient.email || '',
          patient.phone || '',
          patient.gender || '',
          patient.createdAt && typeof patient.createdAt === 'object' && patient.createdAt.toDate
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
  };

  const formatCreatedAt = (createdAt: any): string => {
    if (!createdAt) return 'Non disponible';
    
    try {
      // Handle Firestore Timestamp object
      if (createdAt && typeof createdAt === 'object' && createdAt.toDate) {
        return createdAt.toDate().toLocaleDateString('fr-FR', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      }
      
      // Handle regular Date object
      if (createdAt instanceof Date) {
        return createdAt.toLocaleDateString('fr-FR', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      }
      
      // Handle string dates
      if (typeof createdAt === 'string') {
        const date = new Date(createdAt);
        if (!isNaN(date.getTime())) {
          return date.toLocaleDateString('fr-FR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          });
        }
      }
      
      return 'Non disponible';
    } catch (error) {
      return 'Non disponible';
    }
  };

  const resetFilters = () => {
    setSearchTerm('');
    setFilters({
      gender: '',
      status: '',
      dateRange: '',
    });
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

        {/* Search and Filters */}
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
                value={filters.gender}
                onChange={(e) => setFilters({ ...filters, gender: e.target.value })}
                className="border border-gray-300 rounded-md p-2"
              >
                <option value="">Tous les genres</option>
                <option value="male">Masculin</option>
                <option value="female">Féminin</option>
                <option value="other">Autre</option>
              </select>
              <select
                value={filters.dateRange}
                onChange={(e) => setFilters({ ...filters, dateRange: e.target.value })}
                className="border border-gray-300 rounded-md p-2"
              >
                <option value="">Toutes les dates</option>
                <option value="today">Aujourd'hui</option>
                <option value="week">Cette semaine</option>
                <option value="month">Ce mois</option>
              </select>
            </div>
          </div>
        </div>

        {/* Patients Table */}
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
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredPatients.map((patient) => (
                    <tr key={patient.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center mr-3">
                            <User className="h-6 w-6 text-gray-500" />
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">{patient.name}</div>
                            <div className="text-sm text-gray-500">{patient.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {patient.phone && (
                            <div className="flex items-center mb-1">
                              <Phone className="h-4 w-4 text-gray-400 mr-2" />
                              {patient.phone}
                            </div>
                          )}
                          <div className="flex items-center">
                            <Mail className="h-4 w-4 text-gray-400 mr-2" />
                            {patient.email}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {patient.gender && (
                            <div className="flex items-center mb-1">
                              <User className="h-4 w-4 text-gray-400 mr-2" />
                              {patient.gender === 'male' ? 'Masculin' : 
                               patient.gender === 'female' ? 'Féminin' : 'Autre'}
                            </div>
                          )}
                          {patient.age && (
                            <div className="flex items-center">
                              <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                              {patient.age} ans
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatCreatedAt(patient.createdAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button className="px-3 py-1 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded text-xs font-medium">
                            <Eye className="h-3 w-3" />
                          </button>
                          <button className="px-3 py-1 bg-green-100 text-green-700 hover:bg-green-200 rounded text-xs font-medium">
                            <Edit2 className="h-3 w-3" />
                          </button>
                          <button className="px-3 py-1 bg-red-100 text-red-700 hover:bg-red-200 rounded text-xs font-medium">
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
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
                {searchTerm || filters.gender || filters.dateRange
                  ? 'Aucun patient ne correspond à vos critères'
                  : 'Aucun patient trouvé'
                }
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm || filters.gender || filters.dateRange
                  ? 'Essayez de modifier vos critères de recherche ou de filtrage.'
                  : 'Aucun patient n\'est encore inscrit.'
                }
              </p>
              {(searchTerm || filters.gender || filters.dateRange) && (
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