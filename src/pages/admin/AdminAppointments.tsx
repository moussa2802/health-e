import React, { useState, useEffect, useCallback } from 'react';
import { Search, Download, Calendar, Clock, User, MapPin, DollarSign } from 'lucide-react';
import AdminLayout from '../../components/admin/AdminLayout';
import { where } from 'firebase/firestore';

interface Appointment {
  id: string;
  patientId: string;
  professionalId: string;
  patientName?: string;
  professionalName?: string;
  date: any;
  time: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  amount?: number;
  createdAt?: any;
}

const AdminAppointments: React.FC = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Charger les données une seule fois au montage
  useEffect(() => {
    fetchAppointments();
  }, []);

  const fetchAppointments = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { collection, getDocs, query, orderBy } = await import('firebase/firestore');
      const { getFirestoreInstance } = await import('../../utils/firebase');
      const db = getFirestoreInstance();
      
      if (db) {
        const appointmentsQuery = query(
          collection(db, 'appointments'),
          orderBy('date', 'desc')
        );
        const snapshot = await getDocs(appointmentsQuery);
        
        const appointmentsData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data()
        })) as Appointment[];
        
        // Enrichir avec les noms des utilisateurs
        const enrichedAppointments = await Promise.all(
          appointmentsData.map(async (appointment) => {
            try {
              const [patientDoc, professionalDoc] = await Promise.all([
                getDocs(query(collection(db, 'users'), where('id', '==', appointment.patientId))),
                getDocs(query(collection(db, 'users'), where('id', '==', appointment.professionalId)))
              ]);
              
              return {
                ...appointment,
                patientName: patientDoc.docs[0]?.data()?.name || 'Patient inconnu',
                professionalName: professionalDoc.docs[0]?.data()?.name || 'Professionnel inconnu'
              };
            } catch {
              return appointment;
            }
          })
        );
        
        setAppointments(enrichedAppointments);
      } else {
        setAppointments([]);
      }
    } catch (err) {
      console.error('Error fetching appointments:', err);
      setError('Erreur lors du chargement des consultations');
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Filtrer les consultations de manière simple et directe
  const getFilteredAppointments = useCallback(() => {
    let filtered = [...appointments];

    // Filtre par recherche
    if (searchTerm.trim()) {
      filtered = filtered.filter(appointment =>
        appointment.patientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        appointment.professionalName?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filtre par statut
    if (selectedStatus !== 'all') {
      filtered = filtered.filter(appointment => appointment.status === selectedStatus);
    }

    return filtered;
  }, [appointments, searchTerm, selectedStatus]);

  const handleExport = useCallback(() => {
    try {
      const filtered = getFilteredAppointments();
      const csvContent = [
        ['Patient', 'Professionnel', 'Date', 'Heure', 'Statut', 'Montant', 'Date de création'],
        ...filtered.map(appointment => [
          appointment.patientName || 'Patient inconnu',
          appointment.professionalName || 'Professionnel inconnu',
          appointment.date && typeof appointment.date.toDate === 'function' 
            ? appointment.date.toDate().toLocaleDateString('fr-FR')
            : 'Non disponible',
          appointment.time || '',
          getStatusLabel(appointment.status),
          appointment.amount ? `${appointment.amount} FCFA` : 'Non spécifié',
          appointment.createdAt && typeof appointment.createdAt.toDate === 'function' 
            ? appointment.createdAt.toDate().toLocaleDateString('fr-FR')
            : 'Non disponible'
        ])
      ].map(row => row.join(',')).join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `consultations_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Erreur lors de l\'export:', error);
      alert('Erreur lors de l\'export');
    }
  }, [getFilteredAppointments]);

  const resetFilters = useCallback(() => {
    setSearchTerm('');
    setSelectedStatus('all');
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

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending':
        return 'En attente';
      case 'confirmed':
        return 'Confirmée';
      case 'completed':
        return 'Terminée';
      case 'cancelled':
        return 'Annulée';
      default:
        return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'confirmed':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="p-6">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            <span className="ml-4 text-lg text-gray-600">Chargement des consultations...</span>
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
              onClick={fetchAppointments}
              className="mt-2 bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
            >
              Réessayer
            </button>
          </div>
        </div>
      </AdminLayout>
    );
  }

  const filteredAppointments = getFilteredAppointments();

  return (
    <AdminLayout>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <p className="text-gray-600">
              {filteredAppointments.length} consultation{filteredAppointments.length > 1 ? 's' : ''} 
              {appointments.length !== filteredAppointments.length && ` sur ${appointments.length} au total`}
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
                placeholder="Rechercher une consultation..."
                className="pl-10 w-full border border-gray-300 rounded-md p-2"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex flex-wrap gap-4">
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="border border-gray-300 rounded-md p-2"
              >
                <option value="all">Tous les statuts</option>
                <option value="pending">En attente</option>
                <option value="confirmed">Confirmées</option>
                <option value="completed">Terminées</option>
                <option value="cancelled">Annulées</option>
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

        {/* Table des consultations */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {filteredAppointments.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Consultation
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date et heure
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Statut
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Montant
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date de création
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredAppointments.map((appointment) => (
                    <tr key={appointment.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center mr-3">
                            <Calendar className="h-6 w-6 text-green-500" />
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {appointment.patientName || 'Patient inconnu'}
                            </div>
                            <div className="text-sm text-gray-500">
                              avec {appointment.professionalName || 'Professionnel inconnu'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          <div className="flex items-center">
                            <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                            {formatDate(appointment.date)}
                          </div>
                          <div className="flex items-center mt-1">
                            <Clock className="w-4 h-4 mr-2 text-gray-400" />
                            {appointment.time}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(appointment.status)}`}>
                          {getStatusLabel(appointment.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center">
                          <DollarSign className="w-4 h-4 mr-2 text-gray-400" />
                          {appointment.amount ? `${appointment.amount} FCFA` : 'Non spécifié'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(appointment.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <Calendar className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                {searchTerm || selectedStatus !== 'all'
                  ? 'Aucune consultation ne correspond à vos critères'
                  : 'Aucune consultation trouvée'
                }
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm || selectedStatus !== 'all'
                  ? 'Essayez de modifier vos critères de recherche ou de filtrage.'
                  : 'Aucune consultation n\'a encore été programmée.'
                }
              </p>
              {(searchTerm || selectedStatus !== 'all') && (
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

export default AdminAppointments;
