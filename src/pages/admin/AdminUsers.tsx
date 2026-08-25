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
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-accent"></div>
        </div>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout>
        <div className="text-center py-12">
          <div className="text-danger text-xl mb-4">{error}</div>
          <button
            onClick={fetchData}
            className="bg-accent text-white px-4 py-2 rounded-card hover:bg-accent/90"
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
    <tr key={user.id} className="hover:bg-paper">
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center">
          <div className="w-10 h-10 rounded-full bg-paper flex items-center justify-center mr-3">
            <User className="h-6 w-6 text-muted" />
          </div>
          <div>
            <div className="text-sm font-medium text-ink">{user.name}</div>
            <div className="text-sm text-muted">{user.email}</div>
            {user.phone && (
              <div className="text-sm text-muted">{user.phone}</div>
            )}
          </div>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center">
          {getUserTypeIcon(user.type)}
          <span
            className={`ml-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-pill ${
              user.type === "admin"
                ? "bg-danger/10 text-danger"
                : user.type === "professional"
                ? "bg-accent-soft text-accent"
                : "bg-ok/15 text-ok"
            }`}
          >
            {getUserTypeLabel(user.type)}
          </span>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-muted">
        {formatCreatedAt(user.createdAt)}
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span
          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-pill ${
            user.isActive
              ? "bg-ok/15 text-ok"
              : "bg-danger/10 text-danger"
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
            className={`px-3 py-1 rounded-card text-xs font-medium ${
              user.isActive
                ? "bg-danger/10 text-danger hover:bg-danger/20"
                : "bg-ok/15 text-ok hover:bg-ok/25"
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
            className="px-3 py-1 bg-danger/10 text-danger hover:bg-danger/20 rounded-card text-xs font-medium disabled:opacity-50"
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
      return <Shield className="h-5 w-5 text-danger" />;
    case "professional":
      return <ShieldCheck className="h-5 w-5 text-accent" />;
    case "patient":
      return <User className="h-5 w-5 text-ok" />;
    default:
      return <User className="h-5 w-5 text-muted" />;
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
