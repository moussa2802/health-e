import React, { useState, useMemo } from "react";
import { Search, ShieldCheck } from "lucide-react";

interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  specialty?: string;
  isApproved?: boolean;
  isActive?: boolean;
  [key: string]: any;
}

interface Filter {
  key: string;
  label: string;
  options: { value: string; label: string }[];
}

interface UserListPageProps {
  title: string;
  data: User[];
  filters: Filter[];
  searchFields: (keyof User)[];
  renderRow: (user: User) => React.ReactNode;
  emptyMessage: string;
}

const UserListPage: React.FC<UserListPageProps> = ({
  title,
  data,
  filters,
  searchFields,
  renderRow,
  emptyMessage,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({});

  // Initialiser les filtres avec "all"
  React.useEffect(() => {
    const initialFilters: Record<string, string> = {};
    filters.forEach(filter => {
      initialFilters[filter.key] = "all";
    });
    setActiveFilters(initialFilters);
  }, [filters]);

  // Fonction de filtrage robuste qui ne génère jamais d'erreur
  const filterUsers = (users: User[], searchTerm: string, filters: Record<string, string>): User[] => {
    try {
      if (!users || users.length === 0) {
        return [];
      }

      let filtered = [...users];

      // Filtre par recherche
      if (searchTerm && searchTerm.trim()) {
        const cleanSearchTerm = searchTerm.replace(/['"]+/g, "").trim().toLowerCase();
        filtered = filtered.filter(user => {
          return searchFields.some(field => {
            const value = user[field];
            if (value && typeof value === 'string') {
              return value.toLowerCase().includes(cleanSearchTerm);
            }
            return false;
          });
        });
      }

      // Filtres par propriété
      Object.entries(filters).forEach(([key, value]) => {
        if (value && value !== "all") {
          filtered = filtered.filter(user => {
            const userValue = user[key];
            if (key === "isApproved") {
              return userValue === (value === "approved");
            }
            if (key === "isActive") {
              return userValue === (value === "active");
            }
            return userValue === value;
          });
        }
      });

      return filtered;
    } catch (error) {
      console.error("Erreur lors du filtrage:", error);
      return [];
    }
  };

  // Utiliser useMemo pour éviter les recalculs inutiles
  const filteredData = useMemo(() => {
    return filterUsers(data, searchTerm, activeFilters);
  }, [data, searchTerm, activeFilters]);

  const handleSearchChange = (value: string) => {
    const cleanValue = value.replace(/['"]+/g, "").trim();
    setSearchTerm(cleanValue);
  };

  const handleFilterChange = (filterKey: string, value: string) => {
    setActiveFilters(prev => ({
      ...prev,
      [filterKey]: value
    }));
  };

  const hasActiveFilters = searchTerm || Object.values(activeFilters).some(value => value !== "all");

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">{title}</h1>
        
        {/* Barre de recherche */}
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              placeholder="Rechercher par nom, email, téléphone..."
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Filtres */}
        {filters.length > 0 && (
          <div className="flex flex-wrap gap-4">
            {filters.map((filter) => (
              <select
                key={filter.key}
                value={activeFilters[filter.key] || "all"}
                onChange={(e) => handleFilterChange(filter.key, e.target.value)}
                className="border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {filter.options.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            ))}
          </div>
        )}
      </div>

      {/* Liste des utilisateurs */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {filteredData.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Utilisateur
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact
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
                {filteredData.map((user) => (
                  <React.Fragment key={user.id}>
                    {renderRow(user)}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState 
            hasActiveFilters={hasActiveFilters}
            emptyMessage={emptyMessage}
            searchTerm={searchTerm}
            filters={activeFilters}
          />
        )}
      </div>
    </div>
  );
};

// Composant EmptyState propre et stable
const EmptyState: React.FC<{
  hasActiveFilters: boolean;
  emptyMessage: string;
  searchTerm: string;
  filters: Record<string, string>;
}> = ({ hasActiveFilters, emptyMessage, searchTerm, filters }) => {
  const getMessage = () => {
    if (searchTerm) {
      return `Aucun résultat trouvé pour "${searchTerm}"`;
    }
    
    const activeFilter = Object.entries(filters).find(([_, value]) => value !== "all");
    if (activeFilter) {
      const [key, value] = activeFilter;
      if (key === "specialty") {
        return `Aucun utilisateur trouvé pour la spécialité "${value}"`;
      }
      if (key === "isApproved") {
        return value === "approved" 
          ? "Aucun utilisateur approuvé trouvé"
          : "Aucun utilisateur en attente trouvé";
      }
      if (key === "isActive") {
        return value === "active"
          ? "Aucun utilisateur actif trouvé"
          : "Aucun utilisateur inactif trouvé";
      }
    }
    
    return emptyMessage;
  };

  return (
    <div className="text-center py-12">
      <ShieldCheck className="mx-auto h-12 w-12 text-gray-400" />
      <h3 className="mt-2 text-sm font-medium text-gray-900">
        {hasActiveFilters ? "Aucun résultat trouvé" : "Aucun utilisateur trouvé"}
      </h3>
      <p className="mt-1 text-sm text-gray-500">
        {getMessage()}
      </p>
      {hasActiveFilters && (
        <p className="mt-2 text-sm text-gray-400">
          Essayez de modifier vos critères de recherche ou de filtrage.
        </p>
      )}
    </div>
  );
};

export default UserListPage;
