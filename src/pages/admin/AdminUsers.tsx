import React, { useState, useEffect } from 'react';
import { Search, Filter, Download, User, Shield, ShieldCheck, Trash2, Eye } from 'lucide-react';
import AdminLayout from '../../components/admin/AdminLayout';
import { useProfessionals } from '../../hooks/useProfessionals';
import { getUsers, updateUserStatus, deleteUser, updateProfessionalApproval, type FirebaseUser } from '../../services/firebaseService';

interface UserFilters {
  type: 'all' | 'patient' | 'professional' | 'admin';
  status: 'all' | 'active' | 'inactive';
  dateRange: string;
}

const AdminUsers: React.FC = () => {
  const [users, setUsers] = useState<FirebaseUser[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<FirebaseUser[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<UserFilters>({
    type: 'all',
    status: 'all',
    dateRange: '',
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Utiliser le hook pour les professionnels
  const { professionals, loading: professionalsLoading } = useProfessionals();
console.log('✅ Liste des professionnels chargés :', professionals);
  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    // Utiliser un timeout pour éviter les filtrages trop fréquents
    const timeoutId = setTimeout(() => {
      filterUsers();
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [users, searchTerm, filters]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const usersData = await getUsers();
      console.log('✅ Utilisateurs chargés :', usersData);
      setUsers(usersData);
    } catch (err) {
      console.error('Error fetching users:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement des utilisateurs');
    } finally {
      setLoading(false);
    }
  };

  const filterUsers = () => {
    try {
      let filtered = [...users]; // Créer une copie pour éviter les mutations

      // Filter by search term
      if (searchTerm.trim()) {
        filtered = filtered.filter(user =>
          (user.name && user.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (user.email && user.email.toLowerCase().includes(searchTerm.toLowerCase()))
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
            console.warn('Erreur lors du filtrage par date pour l\'utilisateur:', user.id);
            return false;
          }
        });
      }

      setFilteredUsers(filtered);
    } catch (error) {
      console.error('Erreur lors du filtrage:', error);
      setFilteredUsers(users); // Fallback vers la liste complète
    }
  };

  const handleUpdateStatus = async (userId: string, isActive: boolean) => {
    try {
      setActionLoading(userId);
      await updateUserStatus(userId, isActive);
      
      // Update local state
      setUsers(users.map(user => 
        user.id === userId ? { ...user, isActive } : user
      ));
    } catch (err) {
      console.error('Error updating user status:', err);
      alert('Erreur lors de la mise à jour du statut');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet utilisateur ? Cette action est irréversible.')) {
      return;
    }

    try {
      setActionLoading(userId);
      await deleteUser(userId);
      
      // Update local state
      setUsers(users.filter(user => user.id !== userId));
    } catch (err) {
      console.error('Error deleting user:', err);
      alert('Erreur lors de la suppression de l\'utilisateur');
    } finally {
      setActionLoading(null);
    }
  };

  const handleExport = () => {
    const csvContent = [
      ['Nom', 'Email', 'Type', 'Statut', 'Date de création'],
      ...filteredUsers.map(user => [
        user.name,
        user.email,
        user.type,
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

  const getProfessionalInfo = (userId: string) => {
    if (!professionals || !Array.isArray(professionals)) {
      return null;
    }
    return professionals.find(prof => prof.userId === userId || prof.id === userId);
  };

  const formatCreatedAt = (createdAt: any) => {
    if (!createdAt || typeof createdAt.toDate !== 'function') {
      return 'Non disponible';
    }
    try {
      return createdAt.toDate().toLocaleDateString('fr-FR');
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Non disponible';
    }
  };

  if (loading || professionalsLoading) {
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
              {professionals.length > 0 && ` • ${professionals.length} professionnel${professionals.length > 1 ? 's' : ''} actif${professionals.length > 1 ? 's' : ''}`}
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
          {filteredUsers && filteredUsers.length > 0 ? (
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
                      Informations professionnelles
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
                  {filteredUsers.map((user) => {
                    const professionalInfo = user.type === 'professional' ? getProfessionalInfo(user.id) : null;
                    
                    return (
                      <tr key={user.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            {user.profileImage ? (
                              <img
                                src={user.profileImage}
                                alt={user.name}
                                className="w-10 h-10 rounded-full object-cover mr-3"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center mr-3">
                                <User className="h-6 w-6 text-gray-500" />
                              </div>
                            )}
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
                        <td className="px-6 py-4 whitespace-nowrap">
                          {professionalInfo ? (
                            <div className="text-sm">
                              <div className="font-medium text-gray-900">{professionalInfo.specialty}</div>
                              <div className="text-gray-500">{professionalInfo.type === 'mental' ? 'Santé mentale' : 'Santé sexuelle'}</div>
                              <div className="text-gray-500">Note: {professionalInfo.rating}/5 ({professionalInfo.reviews} avis)</div>
                            </div>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
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

  {user.type === 'professional' && professionalInfo && (
    <button
      onClick={async () => {
        console.log('🟡 Changement statut approbation pour :', user.id, 'Nouveau statut :', !professionalInfo.isApproved);
        try {
          setActionLoading(user.id);
          await updateProfessionalApproval(user.id, !professionalInfo.isApproved);
          await fetchUsers(); // recharge les données à jour
        } catch (err) {
          alert("Erreur lors de l'approbation");
        } finally {
          setActionLoading(null);
        }
      }}
      disabled={actionLoading === user.id}
      className={`px-3 py-1 rounded text-xs font-medium ${
        professionalInfo.isApproved 
          ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200' 
          : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
      } disabled:opacity-50`}
    >
      {actionLoading === user.id ? '...' : (professionalInfo.isApproved ? 'Révoquer' : 'Approuver')}
    </button>
  )}

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
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <User className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">Aucun utilisateur trouvé</h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm || filters.type !== 'all' || filters.status !== 'all' 
                  ? 'Essayez de modifier vos critères de recherche.'
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