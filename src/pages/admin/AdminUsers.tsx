import React, { useState, useEffect } from 'react';
import { Search, Download, User, Shield, ShieldCheck, Trash2 } from 'lucide-react';
import AdminLayout from '../../components/admin/AdminLayout';

interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  type: 'patient' | 'professional' | 'admin';
  isActive: boolean;
  createdAt?: any;
}



const AdminUsers: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Charger les données une seule fois au montage
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
              const { collection, getDocs } = await import('firebase/firestore');
      const { getFirestoreInstance } = await import('../../utils/firebase');
      const db = getFirestoreInstance();
      
      if (db) {
        // Charger tous les utilisateurs
        const usersSnapshot = await getDocs(collection(db, 'users'));
        const usersData = usersSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data()
        })) as User[];
        
        setUsers(usersData);
              } else {
          setUsers([]);
        }
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Erreur lors du chargement des données');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  // Filtrer les utilisateurs de manière simple
  const getFilteredUsers = () => {
    let filtered = [...users];

    // Filtre par recherche (nom, email, téléphone)
    if (searchTerm.trim()) {
      filtered = filtered.filter(user =>
        user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.phone?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filtre par type (professionnel/patient)
    if (selectedType !== 'all') {
      filtered = filtered.filter(user => user.type === selectedType);
    }

    return filtered;
  };



  const handleUpdateStatus = async (userId: string, isActive: boolean) => {
    try {
      setActionLoading(userId);
      
      // Mise à jour locale immédiate
      setUsers(prev => prev.map(user => 
        user.id === userId ? { ...user, isActive } : user
      ));
      
      // Mise à jour dans Firebase
      const { updateUserStatus } = await import('../../services/firebaseService');
      await updateUserStatus(userId, isActive);
    } catch (err) {
      console.error('Error updating user status:', err);
      alert('Erreur lors de la mise à jour du statut');
      // Restaurer l'état précédent
      fetchData();
    } finally {
      setActionLoading(null);
    }
  };



  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet utilisateur ?')) {
      return;
    }

    try {
      setActionLoading(userId);
      
      // Suppression locale immédiate
      setUsers(prev => prev.filter(user => user.id !== userId));
      
      // Suppression dans Firebase
      const { deleteUser } = await import('../../services/firebaseService');
      await deleteUser(userId);
    } catch (err) {
      console.error('Error deleting user:', err);
      alert('Erreur lors de la suppression');
      fetchData();
    } finally {
      setActionLoading(null);
    }
  };

  const handleExport = () => {
    try {
      const filtered = getFilteredUsers();
      const csvContent = [
        ['Nom', 'Email', 'Téléphone', 'Type', 'Statut', 'Date de création'],
        ...filtered.map(user => [
          user.name || '',
          user.email || '',
          user.phone || '',
          user.type || '',
          user.isActive ? 'Actif' : 'Inactif',
          user.createdAt && typeof user.createdAt.toDate === 'function' 
            ? user.createdAt.toDate().toLocaleDateString('fr-FR')
            : 'Non disponible'
        ])
      ].map(row => row.join(',')).join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `utilisateurs_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Erreur lors de l\'export:', error);
      alert('Erreur lors de l\'export');
    }
  };

  const getUserTypeIcon = (type: string) => {
    switch (type) {
      case 'admin':
        return <Shield className="h-5 w-5 text-red-500" />;
      case 'professional':
        return <ShieldCheck className="h-5 w-5 text-blue-500" />;
      default:
        return <User className="h-5 w-5 text-gray-500" />;
    }
  };

  const getUserTypeLabel = (type: string) => {
    switch (type) {
      case 'admin':
        return 'Administrateur';
      case 'professional':
        return 'Professionnel';
      case 'patient':
        return 'Patient';
      default:
        return type;
    }
  };

  const formatCreatedAt = (createdAt: any) => {
    if (!createdAt || typeof createdAt.toDate !== 'function') {
      return 'Non disponible';
    }
    try {
      return createdAt.toDate().toLocaleDateString('fr-FR');
    } catch {
      return 'Non disponible';
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="p-6">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            <span className="ml-4 text-lg text-gray-600">Chargement des utilisateurs...</span>
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
              onClick={fetchData}
              className="mt-2 bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
            >
              Réessayer
            </button>
          </div>
        </div>
      </AdminLayout>
    );
  }

  // Calculer les utilisateurs filtrés une seule fois
  const filteredUsers = getFilteredUsers();

  return (
    <AdminLayout>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <p className="text-gray-600">
              {filteredUsers.length} utilisateur{filteredUsers.length > 1 ? 's' : ''} 
              {users.length !== filteredUsers.length && ` sur ${users.length} au total`}
  
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
                placeholder="Rechercher par nom, email ou téléphone..."
                className="pl-10 w-full border border-gray-300 rounded-md p-2"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex flex-wrap gap-4">
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="border border-gray-300 rounded-md p-2"
              >
                <option value="all">Tous les types</option>
                <option value="patient">Patients</option>
                <option value="professional">Professionnels</option>
                <option value="admin">Administrateurs</option>
              </select>
            </div>
          </div>
        </div>

        {/* Table des utilisateurs */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {filteredUsers.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Utilisateur
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>

                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date d'inscription
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Statut
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredUsers.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center mr-3">
                              <User className="h-6 w-6 text-gray-500" />
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-900">{user.name}</div>
                              <div className="text-sm text-gray-500">{user.email}</div>
                              {user.phone && (
                                <div className="text-sm text-gray-400">{user.phone}</div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            {getUserTypeIcon(user.type)}
                            <span className={`ml-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              user.type === 'admin' ? 'bg-red-100 text-red-800' :
                              user.type === 'professional' ? 'bg-blue-100 text-blue-800' : 
                              'bg-green-100 text-green-800'
                            }`}>
                              {getUserTypeLabel(user.type)}
                            </span>
                          </div>
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatCreatedAt(user.createdAt)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {user.isActive ? 'Actif' : 'Inactif'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleUpdateStatus(user.id, !user.isActive)}
                              disabled={actionLoading === user.id}
                              className={`px-3 py-1 rounded text-xs font-medium ${
                                user.isActive 
                                  ? 'bg-red-100 text-red-700 hover:bg-red-200' 
                                  : 'bg-green-100 text-green-700 hover:bg-green-200'
                              } disabled:opacity-50`}
                            >
                              {actionLoading === user.id ? (
                                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current"></div>
                              ) : (
                                user.isActive ? 'Désactiver' : 'Activer'
                              )}
                            </button>



                            <button
                              onClick={() => handleDeleteUser(user.id)}
                              disabled={actionLoading === user.id}
                              className="px-3 py-1 bg-red-100 text-red-700 hover:bg-red-200 rounded text-xs font-medium disabled:opacity-50"
                            >
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
                {searchTerm || selectedType !== 'all'
                  ? 'Aucun utilisateur ne correspond à vos critères'
                  : 'Aucun utilisateur trouvé'
                }
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm || selectedType !== 'all'
                  ? 'Essayez de modifier vos critères de recherche ou de filtrage.'
                  : 'Aucun utilisateur n\'est encore inscrit.'
                }
              </p>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminUsers;
