import React, { useState, useEffect } from "react";
import { User, Shield, ShieldCheck, Trash2 } from "lucide-react";
import AdminLayout from "../../components/admin/AdminLayout";
import UserListPage from "../../components/admin/UserListPage";

interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  type: "patient" | "professional" | "admin";
  isActive: boolean;
  createdAt?: any;
}

const AdminUsers: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
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

      const { collection, getDocs } = await import("firebase/firestore");
      const { getFirestoreInstance } = await import("../../utils/firebase");
      const db = getFirestoreInstance();

      if (db) {
        // Charger tous les utilisateurs
        const usersSnapshot = await getDocs(collection(db, "users"));
        const usersData = usersSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as User[];

        setUsers(usersData);
      } else {
        setUsers([]);
      }
    } catch (err) {
      console.error("Error fetching data:", err);
      setError("Erreur lors du chargement des données");
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (userId: string, isActive: boolean) => {
    try {
      setActionLoading(userId);

      // Mise à jour locale immédiate
      setUsers((prev) =>
        prev.map((user) => (user.id === userId ? { ...user, isActive } : user))
      );

      // Mise à jour dans Firebase
      const { updateUserStatus } = await import(
        "../../services/firebaseService"
      );
      await updateUserStatus(userId, isActive);
    } catch (err) {
      console.error("Error updating user status:", err);
      alert("Erreur lors de la mise à jour du statut");
      fetchData();
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cet utilisateur ?")) {
      return;
    }

    try {
      setActionLoading(userId);

      // Suppression locale immédiate
      setUsers((prev) => prev.filter((user) => user.id !== userId));

      // Suppression dans Firebase
      const { deleteUser } = await import("../../services/firebaseService");
      await deleteUser(userId);
    } catch (err) {
      console.error("Error deleting user:", err);
      alert("Erreur lors de la suppression");
      fetchData();
    } finally {
      setActionLoading(null);
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
            onClick={fetchData}
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
      key: "type",
      label: "Type d'utilisateur",
      options: [
        { value: "all", label: "Tous les types" },
        { value: "patient", label: "Patients" },
        { value: "professional", label: "Professionnels" },
        { value: "admin", label: "Administrateurs" },
      ],
    },
    {
      key: "isActive",
      label: "Statut",
      options: [
        { value: "all", label: "Tous les statuts" },
        { value: "active", label: "Actifs" },
        { value: "inactive", label: "Inactifs" },
      ],
    },
  ];

  // Champs de recherche
  const searchFields: (keyof User)[] = ["name", "email", "phone"];

  // Fonction de rendu des lignes
  const renderRow = (user: User) => (
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
          <span
            className={`ml-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
              user.type === "admin"
                ? "bg-red-100 text-red-800"
                : user.type === "professional"
                ? "bg-blue-100 text-blue-800"
                : "bg-green-100 text-green-800"
            }`}
          >
            {getUserTypeLabel(user.type)}
          </span>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        {formatCreatedAt(user.createdAt)}
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span
          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
            user.isActive
              ? "bg-green-100 text-green-800"
              : "bg-red-100 text-red-800"
          }`}
        >
          {user.isActive ? "Actif" : "Inactif"}
        </span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
        <div className="flex space-x-2">
          <button
            onClick={() => handleUpdateStatus(user.id, !user.isActive)}
            disabled={actionLoading === user.id}
            className={`px-3 py-1 rounded text-xs font-medium ${
              user.isActive
                ? "bg-red-100 text-red-700 hover:bg-red-200"
                : "bg-green-100 text-green-700 hover:bg-green-200"
            } disabled:opacity-50`}
          >
            {actionLoading === user.id ? (
              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current"></div>
            ) : user.isActive ? (
              "Désactiver"
            ) : (
              "Activer"
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
  );

  return (
    <AdminLayout>
      <UserListPage
        title="Gestion des Utilisateurs"
        data={users}
        filters={filters}
        searchFields={searchFields}
        renderRow={renderRow}
        emptyMessage="Aucun utilisateur trouvé"
      />
    </AdminLayout>
  );
};

// Fonctions utilitaires
const getUserTypeIcon = (type: string) => {
  switch (type) {
    case "admin":
      return <Shield className="h-5 w-5 text-red-500" />;
    case "professional":
      return <ShieldCheck className="h-5 w-5 text-blue-500" />;
    case "patient":
      return <User className="h-5 w-5 text-green-500" />;
    default:
      return <User className="h-5 w-5 text-gray-500" />;
  }
};

const getUserTypeLabel = (type: string) => {
  switch (type) {
    case "admin":
      return "Administrateur";
    case "professional":
      return "Professionnel";
    case "patient":
      return "Patient";
    default:
      return "Inconnu";
  }
};

const formatCreatedAt = (createdAt: any) => {
  if (!createdAt || typeof createdAt.toDate !== "function") {
    return "Non disponible";
  }
  try {
    return createdAt.toDate().toLocaleDateString("fr-FR");
  } catch {
    return "Non disponible";
  }
};

export default AdminUsers;
