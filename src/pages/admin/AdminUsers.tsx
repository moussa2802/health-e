import React, { useState, useEffect } from 'react';
import { Search, Download, User, Shield, ShieldCheck, Trash2 } from 'lucide-react';
import AdminLayout from '../../components/admin/AdminLayout';

interface User {
  id: string;
  name: string;
  email: string;
  type: 'patient' | 'professional' | 'admin';
  isActive: boolean;
  createdAt?: any;
}

interface UserFilters {
  type: 'all' | 'patient' | 'professional' | 'admin';
  status: 'all' | 'active' | 'inactive';
  dateRange: string;
}

const AdminUsers: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<UserFilters>({
    type: 'all',
    status: 'all',
    dateRange: '',
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    if (users.length > 0) {
      applyFilters();
    }
  }, [users, searchTerm, filters]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Simuler un délai pour éviter les problèmes de rendu
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const { collection, getDocs } = await import('firebase/firestore');
      const { getFirestoreInstance } = await import('../../utils/firebase');
      const db = getFirestoreInstance();
      
      if (db) {
        const querySnapshot = await getDocs(collection(db, 'users'));
        const results = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data()
        })) as User[];
        
        setUsers(results);
        setFilteredUsers(results);
      } else {
        setUsers([]);
        setFilteredUsers([]);
      }
    } catch (err) {
      console.error('Error fetching users:', err);
      setError('Erreur lors du chargement des utilisateurs');
      setUsers([]);
      setFilteredUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    try {
      let filtered = [...users];

      // Filter by search term
      if (searchTerm.trim()) {
        filtered = filtered.filter(user =>
          user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.email?.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }

      // Filter by type
      if (filters.type !== 'all') {
        filtered = filtered.filter(user => user.type === filters.type);
      }

      // Filter by status
      if (filters.status !== 'all') {
        filtered = filtered.filter(user => 
          filters.status === 'active' ? user.isActive : !user.isActive
        );
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

        filtered = filtered.filter(user => {
          if (!user.createdAt || typeof user.createdAt.toDate !== 'function') {
            return false;
          }
          try {
            return user.createdAt.toDate() >= filterDate;
          } catch (error) {
            return false;
          }
        });
      }

      setFilteredUsers(filtered);
    } catch (error) {
      console.error('Erreur lors du filtrage:', error);
      setFilteredUsers(users);
    }
  };

  const handleUpdateStatus = async (userId: string, isActive: boolean) => {
    try {
      // Mise à jour locale immédiate pour éviter les problèmes de rendu
      const updatedUsers = users.map(user => 
        user.id === userId ? { ...user, isActive } : user
      );
      setUsers(updatedUsers);
      
      // Mise à jour dans Firebase
      const { updateUserStatus } = await import('../../services/firebaseService');
      await updateUserStatus(userId, isActive);
    } catch (err) {
      console.error('Error updating user status:', err);
      alert('Erreur lors de la mise à jour du statut');
      // Restaurer l'état précédent en cas d'erreur
      fetchUsers();
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet utilisateur ? Cette action est irréversible.')) {
      return;
    }

    try {
      // Suppression locale immédiate
      const updatedUsers = users.filter(user => user.id !== userId);
      setUsers(updatedUsers);
      
      // Suppression dans Firebase
      const { deleteUser } = await import('../../services/firebaseService');
      await deleteUser(userId);
    } catch (err) {
      console.error('Error deleting user:', err);
      alert('Erreur lors de la suppression de l\'utilisateur');
      // Restaurer l'état précédent en cas d'erreur
      fetchUsers();
    }
  };

  const handleExport = () => {
    try {
      const csvContent = [
        ['Nom', 'Email', 'Type', 'Statut', 'Date de création'],
        ...filteredUsers.map(user => [
          user.name || '',
          user.email || '',
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
    } catch (error) {
      return 'Non disponible';
    }
  };

  const resetFilters = () => {
    setSearchTerm('');
    setFilters({
      type: 'all',
      status: 'all',
      dateRange: '',
    });
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
              onClick={fetchUsers}
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

        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Rechercher un utilisateur..."
                className="pl-10 w-full border border-gray-300 rounded-md p-2"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex flex-wrap gap-4">
              <select
                value={filters.type}
                onChange={(e) => setFilters({ ...filters, type: e.target.value as UserFilters['type'] })}
                className="border border-gray-300 rounded-md p-2"
              >
                <option value="all">Tous les types</option>
                <option value="patient">Patients</option>
                <option value="professional">Professionnels</option>
                <option value="admin">Administrateurs</option>
              </select>
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value as UserFilters['status'] })}
                className="border border-gray-300 rounded-md p-2"
              >
                <option value="all">Tous les statuts</option>
                <option value="active">Actifs</option>
                <option value="inactive">Inactifs</option>
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

        {/* Users Table */}
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
                            className={`px-3 py-1 rounded text-xs font-medium ${
                              user.isActive 
                                ? 'bg-red-100 text-red-700 hover:bg-red-200' 
                                : 'bg-green-100 text-green-700 hover:bg-green-200'
                            }`}
                          >
                            {user.isActive ? 'Désactiver' : 'Activer'}
                          </button>
                          <button
                            onClick={() => handleDeleteUser(user.id)}
                            className="px-3 py-1 bg-red-100 text-red-700 hover:bg-red-200 rounded text-xs font-medium"
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
                {searchTerm || filters.type !== 'all' || filters.status !== 'all' || filters.dateRange
                  ? 'Aucun utilisateur ne correspond à vos critères'
                  : 'Aucun utilisateur trouvé'
                }
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm || filters.type !== 'all' || filters.status !== 'all' || filters.dateRange
                  ? 'Essayez de modifier vos critères de recherche ou de filtrage.'
                  : 'Aucun utilisateur n\'est encore inscrit.'
                }
              </p>
              {(searchTerm || filters.type !== 'all' || filters.status !== 'all' || filters.dateRange) && (
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

export default AdminUsers;