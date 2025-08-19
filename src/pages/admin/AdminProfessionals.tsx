import React, { useState, useEffect } from "react";
import {
  Download,
  Star,
  Calendar,
  MapPin,
  Phone,
  Mail,
  User,
  CheckCircle,
  XCircle,
} from "lucide-react";
import AdminLayout from "../../components/admin/AdminLayout";
import UserListPage from "../../components/admin/UserListPage";

interface Professional {
  id: string;
  userId: string;
  name: string;
  email: string;
  phone?: string;
  specialty?: string;
  type?: "mental" | "sexual";
  rating?: number;
  reviews?: number;
  isApproved: boolean;
  isActive: boolean;
  experience?: string;
  education?: string;
  bio?: string;
  availability?: any[];
  consultationFee?: number;
  createdAt?: any;
  lastActive?: any;
}

const AdminProfessionals: React.FC = () => {
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Charger les données une seule fois au montage
  useEffect(() => {
    fetchProfessionals();
  }, []);

  const fetchProfessionals = async () => {
    try {
      setLoading(true);
      setError(null);

      const { collection, getDocs, query, where, orderBy } = await import(
        "firebase/firestore"
      );
      const { getFirestoreInstance } = await import("../../utils/firebase");
      const db = getFirestoreInstance();

      if (db) {
        // Charger tous les professionnels depuis la collection users
        const professionalsQuery = query(
          collection(db, "users"),
          where("type", "==", "professional"),
          orderBy("createdAt", "desc")
        );
        const usersSnapshot = await getDocs(professionalsQuery);

        // Charger les informations détaillées depuis la collection professionals
        const professionalsDetailsSnapshot = await getDocs(
          collection(db, "professionals")
        );
        const professionalsDetails = professionalsDetailsSnapshot.docs.map(
          (doc) => ({
            id: doc.id,
            ...doc.data(),
          })
        );

        // Combiner les données des deux collections
        const combinedProfessionals = usersSnapshot.docs.map((userDoc) => {
          const userData = userDoc.data();
          const professionalDetails = professionalsDetails.find(
            (details) => details.userId === userDoc.id
          );

          return {
            id: userDoc.id,
            userId: userDoc.id,
            name: userData.name || "",
            email: userData.email || "",
            phone: userData.phone || "",
            isActive: userData.isActive || false,
            createdAt: userData.createdAt,
            lastActive: userData.lastActive,
            specialty: professionalDetails?.specialty || "",
            type: professionalDetails?.type || "",
            rating: professionalDetails?.rating || 0,
            reviews: professionalDetails?.reviews || 0,
            isApproved: professionalDetails?.isApproved || false,
            experience: professionalDetails?.experience || "",
            education: professionalDetails?.education || "",
            bio: professionalDetails?.bio || "",
            availability: professionalDetails?.availability || [],
            consultationFee: professionalDetails?.consultationFee || 0,
          };
        });

        setProfessionals(combinedProfessionals);
      }
    } catch (err) {
      console.error("Error fetching professionals:", err);
      setError("Erreur lors du chargement des professionnels");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (userId: string, isActive: boolean) => {
    try {
      setActionLoading(`status-${userId}`);

      // Mise à jour locale immédiate
      setProfessionals((prev) =>
        prev.map((prof) =>
          prof.userId === userId ? { ...prof, isActive } : prof
        )
      );

      // Mise à jour dans Firebase
      const { updateUserStatus } = await import(
        "../../services/firebaseService"
      );
      await updateUserStatus(userId, isActive);
    } catch (err) {
      console.error("Error updating professional status:", err);
      alert("Erreur lors de la mise à jour du statut");
      fetchProfessionals();
    } finally {
      setActionLoading(null);
    }
  };

  const handleProfessionalApproval = async (
    userId: string,
    isApproved: boolean
  ) => {
    try {
      setActionLoading(`approval-${userId}`);

      // Mise à jour locale immédiate
      setProfessionals((prev) =>
        prev.map((prof) =>
          prof.userId === userId ? { ...prof, isApproved } : prof
        )
      );

      // Mise à jour dans Firebase
      const { updateProfessionalApproval } = await import(
        "../../services/firebaseService"
      );
      await updateProfessionalApproval(userId, isApproved);
    } catch (err) {
      console.error("Error updating professional approval:", err);
      alert("Erreur lors de la mise à jour de l'approbation");
      fetchProfessionals();
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteProfessional = async (userId: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce professionnel ?")) {
      return;
    }

    try {
      setActionLoading(`delete-${userId}`);

      // Suppression locale immédiate
      setProfessionals((prev) => prev.filter((prof) => prof.userId !== userId));

      // Suppression dans Firebase
      const { deleteProfessional } = await import(
        "../../services/firebaseService"
      );
      await deleteProfessional(userId);
    } catch (err) {
      console.error("Error deleting professional:", err);
      alert("Erreur lors de la suppression");
      fetchProfessionals();
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
            onClick={fetchProfessionals}
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
      key: "specialty",
      label: "Spécialité",
      options: [
        { value: "all", label: "Toutes les spécialités" },
        { value: "Psychologue", label: "Psychologue" },
        { value: "Psychiatre", label: "Psychiatre" },
        { value: "Sexologue", label: "Sexologue" },
        { value: "Gynécologue", label: "Gynécologue" },
        { value: "Urologue", label: "Urologue" },
      ],
    },
    {
      key: "isApproved",
      label: "Statut",
      options: [
        { value: "all", label: "Tous les statuts" },
        { value: "approved", label: "Approuvés" },
        { value: "pending", label: "En attente" },
      ],
    },
  ];

  // Champs de recherche
  const searchFields: (keyof Professional)[] = ["name", "email", "specialty"];

  // Fonction de rendu des lignes
  const renderRow = (professional: Professional) => (
    <tr key={professional.id} className="hover:bg-gray-50">
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center">
          <div className="flex-shrink-0 h-10 w-10">
            <User className="h-10 w-10 text-gray-400" />
          </div>
          <div className="ml-4">
            <div className="text-sm font-medium text-gray-900">
              {professional.name}
            </div>
            <div className="text-sm text-gray-500">
              {professional.specialty || "Spécialité non définie"}
            </div>
          </div>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm text-gray-900">{professional.email}</div>
        {professional.phone && (
          <div className="text-sm text-gray-500 flex items-center">
            <Phone className="h-4 w-4 mr-1" />
            {professional.phone}
          </div>
        )}
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex flex-col space-y-2">
          <span
            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
              professional.isApproved
                ? "bg-green-100 text-green-800"
                : "bg-yellow-100 text-yellow-800"
            }`}
          >
            {professional.isApproved ? "Approuvé" : "En attente"}
          </span>
          <span
            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
              professional.isActive
                ? "bg-green-100 text-green-800"
                : "bg-red-100 text-red-800"
            }`}
          >
            {professional.isActive ? "Actif" : "Inactif"}
          </span>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
        <div className="flex space-x-2">
          <button
            onClick={() =>
              handleUpdateStatus(professional.userId, !professional.isActive)
            }
            disabled={actionLoading === `status-${professional.userId}`}
            className={`px-3 py-1 rounded text-xs font-medium ${
              professional.isActive
                ? "bg-red-100 text-red-700 hover:bg-red-200"
                : "bg-green-100 text-green-700 hover:bg-green-200"
            } disabled:opacity-50`}
          >
            {actionLoading === `status-${professional.userId}` ? (
              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current"></div>
            ) : professional.isActive ? (
              "Désactiver"
            ) : (
              "Activer"
            )}
          </button>

          <button
            onClick={() =>
              handleProfessionalApproval(
                professional.userId,
                !professional.isApproved
              )
            }
            disabled={actionLoading === `approval-${professional.userId}`}
            className={`px-3 py-1 rounded text-xs font-medium ${
              professional.isApproved
                ? "bg-yellow-100 text-yellow-700 hover:bg-yellow-200"
                : "bg-blue-100 text-blue-700 hover:bg-blue-200"
            } disabled:opacity-50`}
          >
            {actionLoading === `approval-${professional.userId}` ? (
              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current"></div>
            ) : professional.isApproved ? (
              "Révoquer"
            ) : (
              "Approuver"
            )}
          </button>

          <button
            onClick={() => handleDeleteProfessional(professional.userId)}
            disabled={actionLoading === `delete-${professional.userId}`}
            className="px-3 py-1 bg-red-100 text-red-700 hover:bg-red-200 rounded text-xs font-medium disabled:opacity-50"
          >
            {actionLoading === `delete-${professional.userId}` ? (
              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current"></div>
            ) : (
              <XCircle className="h-3 w-3" />
            )}
          </button>
        </div>
      </td>
    </tr>
  );

  return (
    <AdminLayout>
      <UserListPage
        title="Gestion des Professionnels"
        data={professionals}
        filters={filters}
        searchFields={searchFields}
        renderRow={renderRow}
        emptyMessage="Aucun professionnel trouvé"
      />
    </AdminLayout>
  );
};

export default AdminProfessionals;
