import React, { useState, useEffect } from "react";
import {
  Search,
  Download,
  ShieldCheck,
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
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSpecialty, setSelectedSpecialty] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
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
      } else {
        setProfessionals([]);
      }
    } catch (err) {
      console.error("Error fetching professionals:", err);
      setError("Erreur lors du chargement des professionnels");
      setProfessionals([]);
    } finally {
      setLoading(false);
    }
  };

  // Filtrer les professionnels de manière simple et stable
  const getFilteredProfessionals = () => {
    console.log("🔍 [GETFILTERED] Début de getFilteredProfessionals");
    console.log("🔍 [GETFILTERED] Paramètres:", {
      searchTerm: `"${searchTerm}"`,
      selectedSpecialty,
      selectedStatus,
      totalProfessionals: professionals?.length || 0,
    });

    try {
      // Vérifier que les données sont disponibles
      if (!professionals || professionals.length === 0) {
        console.log("⚠️ [GETFILTERED] Aucun professionnel disponible");
        return [];
      }

      let filtered = [...professionals];
      console.log("🔍 [GETFILTERED] Copie initiale:", filtered.length);

      // Filtre par recherche (nom, email, spécialité)
      if (searchTerm.trim()) {
        console.log(
          "🔍 [GETFILTERED] Application du filtre de recherche:",
          `"${searchTerm}"`
        );
        const beforeSearch = filtered.length;
        filtered = filtered.filter(
          (professional) =>
            professional.name
              ?.toLowerCase()
              .includes(searchTerm.toLowerCase()) ||
            professional.email
              ?.toLowerCase()
              .includes(searchTerm.toLowerCase()) ||
            professional.specialty
              ?.toLowerCase()
              .includes(searchTerm.toLowerCase())
        );
        console.log("🔍 [GETFILTERED] Après recherche:", {
          avant: beforeSearch,
          apres: filtered.length,
          difference: beforeSearch - filtered.length,
        });
      }

      // Filtre par spécialité
      if (selectedSpecialty !== "all") {
        console.log(
          "🔍 [GETFILTERED] Application du filtre spécialité:",
          selectedSpecialty
        );
        const beforeSpecialty = filtered.length;
        filtered = filtered.filter(
          (professional) => professional.specialty === selectedSpecialty
        );
        console.log("🔍 [GETFILTERED] Après spécialité:", {
          avant: beforeSpecialty,
          apres: filtered.length,
          difference: beforeSpecialty - filtered.length,
        });
      }

      // Filtre par statut
      if (selectedStatus !== "all") {
        console.log(
          "🔍 [GETFILTERED] Application du filtre statut:",
          selectedStatus
        );
        const beforeStatus = filtered.length;
        if (selectedStatus === "approved") {
          filtered = filtered.filter((professional) => professional.isApproved);
        } else if (selectedStatus === "pending") {
          filtered = filtered.filter(
            (professional) => !professional.isApproved
          );
        }
        console.log("🔍 [GETFILTERED] Après statut:", {
          avant: beforeStatus,
          apres: filtered.length,
          difference: beforeStatus - filtered.length,
        });
      }

      console.log("✅ [GETFILTERED] Filtrage terminé:", {
        totalInitial: professionals.length,
        totalFinal: filtered.length,
        totalFiltre: professionals.length - filtered.length,
      });

      // Protection contre les tableaux vides instables
      if (filtered.length === 0) {
        console.log("⚠️ [GETFILTERED] Aucun résultat trouvé, retour tableau vide stable");
        return [];
      }

      return filtered;
    } catch (error) {
      console.error("❌ [GETFILTERED] Erreur lors du filtrage:", error);
      console.error("❌ [GETFILTERED] Stack trace:", error.stack);
      return [];
    }
  };

  // Gestionnaires simples pour les changements de filtres
  const handleSearchChange = (value: string) => {
    console.log("🔍 [SEARCH] Changement de recherche:", {
      ancienneValeur: `"${searchTerm}"`,
      nouvelleValeur: `"${value}"`,
      longueurAncienne: searchTerm.length,
      longueurNouvelle: value.length,
      estVide: value.length === 0,
      timestamp: new Date().toISOString(),
    });

    try {
      setSearchTerm(value);
      console.log("✅ [SEARCH] SearchTerm mis à jour avec succès");
    } catch (error) {
      console.error(
        "❌ [SEARCH] Erreur lors du changement de recherche:",
        error
      );
      console.error("❌ [SEARCH] Stack trace:", error.stack);
    }
  };

  const handleSpecialtyChange = (value: string) => {
    console.log("🔍 [SPECIALTY] Changement de spécialité:", {
      ancienneValeur: selectedSpecialty,
      nouvelleValeur: value,
      timestamp: new Date().toISOString(),
    });

    try {
      setSelectedSpecialty(value);
      console.log("✅ [SPECIALTY] Spécialité mise à jour avec succès");
    } catch (error) {
      console.error(
        "❌ [SPECIALTY] Erreur lors du changement de spécialité:",
        error
      );
      console.error("❌ [SPECIALTY] Stack trace:", error.stack);
    }
  };

  const handleStatusChange = (value: string) => {
    console.log("🔍 [STATUS] Changement de statut:", {
      ancienneValeur: selectedStatus,
      nouvelleValeur: value,
      timestamp: new Date().toISOString(),
    });

    try {
      setSelectedStatus(value);
      console.log("✅ [STATUS] Statut mis à jour avec succès");
    } catch (error) {
      console.error("❌ [STATUS] Erreur lors du changement de statut:", error);
      console.error("❌ [STATUS] Stack trace:", error.stack);
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
      const { deleteUser } = await import("../../services/firebaseService");
      await deleteUser(userId);
    } catch (err) {
      console.error("Error deleting professional:", err);
      alert("Erreur lors de la suppression");
      fetchProfessionals();
    } finally {
      setActionLoading(null);
    }
  };

  const handleExport = () => {
    try {
      const filtered = getFilteredProfessionals();
      const csvContent = [
        [
          "Nom",
          "Email",
          "Téléphone",
          "Spécialité",
          "Type",
          "Note",
          "Avis",
          "Statut",
          "Approuvé",
          "Frais de consultation",
          "Date d'inscription",
        ],
        ...filtered.map((professional) => [
          professional.name || "",
          professional.email || "",
          professional.phone || "",
          professional.specialty || "",
          professional.type === "mental"
            ? "Santé mentale"
            : professional.type === "sexual"
            ? "Santé sexuelle"
            : "Non défini",
          (professional.rating || 0).toString(),
          (professional.reviews || 0).toString(),
          professional.isActive ? "Actif" : "Inactif",
          professional.isApproved ? "Oui" : "Non",
          professional.consultationFee
            ? `${professional.consultationFee} FCFA`
            : "Non défini",
          professional.createdAt &&
          typeof professional.createdAt.toDate === "function"
            ? professional.createdAt.toDate().toLocaleDateString("fr-FR")
            : "Non disponible",
        ]),
      ]
        .map((row) => row.join(","))
        .join("\n");

      const blob = new Blob([csvContent], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `professionnels_${
        new Date().toISOString().split("T")[0]
      }.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Erreur lors de l'export:", error);
      alert("Erreur lors de l'export");
    }
  };

  const getSpecialtyLabel = (specialty?: string) => {
    if (!specialty) return "Non définie";
    return specialty;
  };

  const getTypeLabel = (type?: string) => {
    switch (type) {
      case "mental":
        return "Santé mentale";
      case "sexual":
        return "Santé sexuelle";
      default:
        return "Non défini";
    }
  };

  const getTypeColor = (type?: string) => {
    switch (type) {
      case "mental":
        return "bg-blue-100 text-blue-800";
      case "sexual":
        return "bg-purple-100 text-purple-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const formatDate = (date: any) => {
    if (!date || typeof date.toDate !== "function") {
      return "Non disponible";
    }
    try {
      return date.toDate().toLocaleDateString("fr-FR");
    } catch {
      return "Non disponible";
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="p-6">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            <span className="ml-4 text-lg text-gray-600">
              Chargement des professionnels...
            </span>
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
              onClick={fetchProfessionals}
              className="mt-2 bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
            >
              Réessayer
            </button>
          </div>
        </div>
      </AdminLayout>
    );
  }

  // Calculer les professionnels filtrés de manière simple et stable
  const filteredProfessionals = (() => {
    console.log("🔍 [FILTRAGE] Début du calcul des professionnels filtrés");
    console.log("🔍 [FILTRAGE] État actuel:", {
      totalProfessionals: professionals?.length || 0,
      searchTerm,
      selectedSpecialty,
      selectedStatus,
      hasProfessionals: !!professionals,
      professionalsType: typeof professionals,
    });

    // Protection contre les données instables
    if (!professionals || professionals.length === 0) {
      console.log(
        "⚠️ [FILTRAGE] Aucun professionnel disponible, retour tableau vide"
      );
      return [];
    }

    // Protection contre les recalculs constants
    if (searchTerm === "" && selectedSpecialty === "all" && selectedStatus === "all") {
      console.log("✅ [FILTRAGE] Aucun filtre actif, retour de tous les professionnels");
      return professionals;
    }

    const result = getFilteredProfessionals();
    console.log("✅ [FILTRAGE] Résultat du filtrage:", {
      totalAvant: professionals.length,
      totalApres: result.length,
      difference: professionals.length - result.length,
    });

    return result;
  })();

  return (
    <AdminLayout>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Gestion des Professionnels
            </h1>
            <p className="text-gray-600">
              {filteredProfessionals.length} professionnel
              {filteredProfessionals.length > 1 ? "s" : ""}
              {professionals.length !== filteredProfessionals.length &&
                ` sur ${professionals.length} au total`}
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

        {/* Filtres */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Rechercher par nom, email ou spécialité..."
                className="pl-10 w-full border border-gray-300 rounded-md p-2"
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
              />
            </div>
            <div className="flex flex-wrap gap-4">
              <select
                value={selectedSpecialty}
                onChange={(e) => handleSpecialtyChange(e.target.value)}
                className="border border-gray-300 rounded-md p-2"
              >
                <option value="all">Toutes les spécialités</option>
                <option value="Psychologue">Psychologue</option>
                <option value="Psychiatre">Psychiatre</option>
                <option value="Sexologue">Sexologue</option>
                <option value="Gynécologue">Gynécologue</option>
                <option value="Urologue">Urologue</option>
              </select>
              <select
                value={selectedStatus}
                onChange={(e) => handleStatusChange(e.target.value)}
                className="border border-gray-300 rounded-md p-2"
              >
                <option value="all">Tous les statuts</option>
                <option value="approved">Approuvés</option>
                <option value="pending">Révoqués</option>
              </select>
            </div>
          </div>
        </div>

                {/* Table des professionnels */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {(() => {
            console.log("🔍 [RENDU] Rendu du tableau des professionnels:", {
              totalFiltered: filteredProfessionals.length,
              totalOriginal: professionals.length,
              searchTerm: `"${searchTerm}"`,
              selectedSpecialty,
              selectedStatus,
              timestamp: new Date().toISOString(),
            });
            
            // Protection contre les transitions instables
            const hasData = filteredProfessionals && filteredProfessionals.length > 0;
            const isStable = professionals && professionals.length > 0;
            
            if (hasData) {
              console.log("✅ [RENDU] Affichage du tableau avec données");
              return true;
            } else if (isStable) {
              console.log("⚠️ [RENDU] Affichage du message 'aucun résultat' (stable)");
              return false;
            } else {
              console.log("⚠️ [RENDU] Affichage du message 'aucun résultat' (instable)");
              return false;
            }
          })() ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Professionnel
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Spécialité & Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Évaluation
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Informations
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
                  {filteredProfessionals.map((professional, index) => (
                    <tr
                      key={`${
                        professional.userId || professional.id || index
                      }-${professional.email}`}
                      className="hover:bg-gray-50"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center mr-3">
                            <ShieldCheck className="h-6 w-6 text-blue-500" />
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {professional.name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {professional.email}
                            </div>
                            {professional.phone && (
                              <div className="text-sm text-gray-400 flex items-center">
                                <Phone className="h-3 w-3 mr-1" />
                                {professional.phone}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm">
                          <div className="font-medium text-gray-900">
                            {getSpecialtyLabel(professional.specialty)}
                          </div>
                          <span
                            className={`px-2 py-1 text-xs font-semibold rounded-full ${getTypeColor(
                              professional.type
                            )}`}
                          >
                            {getTypeLabel(professional.type)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Star className="h-4 w-4 text-yellow-400 mr-1" />
                          <span className="text-sm font-medium text-gray-900">
                            {professional.rating || 0}/5
                          </span>
                          <span className="text-sm text-gray-500 ml-1">
                            ({professional.reviews || 0} avis)
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {professional.consultationFee ? (
                            <div className="font-medium">
                              {professional.consultationFee} FCFA
                            </div>
                          ) : (
                            <div className="text-gray-400">
                              Frais non définis
                            </div>
                          )}
                          {professional.experience && (
                            <div className="text-gray-500">
                              {professional.experience}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(professional.createdAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="space-y-1">
                          <span
                            className={`px-2 py-1 text-xs font-semibold rounded-full ${
                              professional.isActive
                                ? "bg-green-100 text-green-800"
                                : "bg-red-100 text-red-800"
                            }`}
                          >
                            {professional.isActive ? "Actif" : "Inactif"}
                          </span>
                          <span
                            className={`px-2 py-1 text-xs font-semibold rounded-full ${
                              professional.isApproved
                                ? "bg-blue-100 text-blue-800"
                                : "bg-yellow-100 text-yellow-800"
                            }`}
                          >
                            {professional.isApproved
                              ? "Approuvé"
                              : "En attente"}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() =>
                              handleUpdateStatus(
                                professional.userId,
                                !professional.isActive
                              )
                            }
                            disabled={
                              actionLoading === `status-${professional.userId}`
                            }
                            className={`px-3 py-1 rounded text-xs font-medium ${
                              professional.isActive
                                ? "bg-red-100 text-red-700 hover:bg-red-200"
                                : "bg-green-100 text-green-700 hover:bg-green-200"
                            } disabled:opacity-50`}
                          >
                            {actionLoading ===
                            `status-${professional.userId}` ? (
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
                            disabled={
                              actionLoading ===
                              `approval-${professional.userId}`
                            }
                            className={`px-3 py-1 rounded text-xs font-medium ${
                              professional.isApproved
                                ? "bg-yellow-100 text-yellow-700 hover:bg-yellow-200"
                                : "bg-blue-100 text-blue-700 hover:bg-blue-200"
                            } disabled:opacity-50`}
                          >
                            {actionLoading ===
                            `approval-${professional.userId}` ? (
                              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current"></div>
                            ) : professional.isApproved ? (
                              "Révoquer"
                            ) : (
                              "Approuver"
                            )}
                          </button>

                          <button
                            onClick={() =>
                              handleDeleteProfessional(professional.userId)
                            }
                            disabled={
                              actionLoading === `delete-${professional.userId}`
                            }
                            className="px-3 py-1 bg-red-100 text-red-700 hover:bg-red-200 rounded text-xs font-medium disabled:opacity-50"
                          >
                            {actionLoading ===
                            `delete-${professional.userId}` ? (
                              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current"></div>
                            ) : (
                              <XCircle className="h-3 w-3" />
                            )}
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
              <ShieldCheck className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                {searchTerm ||
                selectedSpecialty !== "all" ||
                selectedStatus !== "all"
                  ? "Aucun professionnel ne correspond à vos critères"
                  : "Aucun professionnel trouvé"}
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm
                  ? "Essayez de modifier vos critères de recherche."
                  : selectedSpecialty !== "all"
                  ? `Aucun professionnel trouvé pour la spécialité "${selectedSpecialty}".`
                  : selectedStatus !== "all"
                  ? selectedStatus === "approved"
                    ? "Aucun professionnel n'est actuellement approuvé."
                    : "Aucun professionnel n'est actuellement révoqué."
                  : "Aucun professionnel n'est encore inscrit."}
              </p>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminProfessionals;
