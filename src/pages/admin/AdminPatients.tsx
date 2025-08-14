import React, { useState, useEffect } from 'react';
import { Search, Filter, Download, User, Phone, Mail, Calendar, MapPin, FileText, Eye, Edit2, Trash2 } from 'lucide-react';
import AdminLayout from '../../components/admin/AdminLayout';
import { usePatients } from '../../hooks/usePatients';

interface PatientFilters {
  gender: string;
  dateRange: string;
  status: string;
}

const AdminPatients: React.FC = () => {
  const { patients, loading } = usePatients();
  const [filteredPatients, setFilteredPatients] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<PatientFilters>({
    gender: '',
    status: '',
    dateRange: '',
  });
  const [selectedPatient, setSelectedPatient] = useState<any | null>(null);
  const [showPatientModal, setShowPatientModal] = useState(false);

  // Helper function to format Firestore Timestamp to readable string
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
      console.warn('Error formatting createdAt:', error);
      return 'Non disponible';
    }
  };

  useEffect(() => {
    filterPatients();
  }, [patients, searchTerm, filters]);

  const filterPatients = () => {
    let filtered = patients;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(patient =>
        patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        patient.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
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
          console.warn('Error filtering by date:', error);
          return false;
        }
      });
    }

    setFilteredPatients(filtered);
  };

  const handleExport = () => {
    const csvContent = [
      ['Nom', 'Email', 'Téléphone', 'Genre', 'Date d\'inscription'],
      ...filteredPatients.map(patient => [
        patient.name,
        patient.email,
        patient.phone || '',
        patient.gender || '',
        formatCreatedAt(patient.createdAt)
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `patients_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getGenderLabel = (gender: string) => {
    switch (gender) {
      case 'M':
        return 'Masculin';
      case 'F':
        return 'Féminin';
      case 'O':
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
                <option value="M">Masculin</option>
                <option value="F">Féminin</option>
                <option value="O">Autre</option>
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
                            <div className="text-sm text-gray-500">ID: {patient.id.slice(0, 8)}...</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          <div className="flex items-center mb-1">
                            <Mail className="h-4 w-4 text-gray-400 mr-1" />
                            {patient.email}
                          </div>
                          {patient.phone && (
                            <div className="flex items-center">
                              <Phone className="h-4 w-4 text-gray-400 mr-1" />
                              {patient.phone}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          <div>{getGenderLabel(patient.gender)}</div>
                          {patient.dateOfBirth && (
                            <div className="text-gray-500">
                              {new Date(patient.dateOfBirth).toLocaleDateString('fr-FR')}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatCreatedAt(patient.createdAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => {
                              setSelectedPatient(patient);
                              setShowPatientModal(true);
                            }}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button className="text-green-600 hover:text-green-900">
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button className="text-red-600 hover:text-red-900">
                            <Trash2 className="h-4 w-4" />
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
              <h3 className="mt-2 text-sm font-medium text-gray-900">Aucun patient trouvé</h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm || filters.gender || filters.dateRange
                  ? 'Essayez de modifier vos critères de recherche.'
                  : 'Aucun patient n\'est encore inscrit dans la collection "patients".'
                }
              </p>
            </div>
          )}
        </div>

        {/* Patient Details Modal */}
        {showPatientModal && selectedPatient && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200 flex justify-between items-center">
                <h2 className="text-xl font-semibold">Détails du patient</h2>
                <button
                  onClick={() => setShowPatientModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <User className="h-6 w-6" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* Basic Information */}
                <div>
                  <h3 className="text-lg font-medium mb-3">Informations personnelles</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Nom</label>
                      <p className="text-gray-900">{selectedPatient.name}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Email</label>
                      <p className="text-gray-900">{selectedPatient.email}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Téléphone</label>
                      <p className="text-gray-900">{selectedPatient.phone || 'Non renseigné'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Genre</label>
                      <p className="text-gray-900">{getGenderLabel(selectedPatient.gender)}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Date de naissance</label>
                      <p className="text-gray-900">
                        {selectedPatient.dateOfBirth 
                          ? new Date(selectedPatient.dateOfBirth).toLocaleDateString('fr-FR') 
                          : 'Non spécifiée'}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Date d'inscription</label>
                      <p className="text-gray-900">{formatCreatedAt(selectedPatient.createdAt)}</p>
                    </div>
                  </div>
                </div>

                {/* Medical Information */}
                {selectedPatient.medicalHistory && (
                  <div>
                    <h3 className="text-lg font-medium mb-3">Informations médicales</h3>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Antécédents médicaux</label>
                      <p className="text-gray-900">{selectedPatient.medicalHistory}</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-6 border-t border-gray-200 flex justify-end">
                <button
                  onClick={() => setShowPatientModal(false)}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminPatients;