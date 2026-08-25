import React, { useState, useEffect } from "react";
import { User, Calendar, Phone, Mail } from "lucide-react";
import AdminLayout from "../../components/admin/AdminLayout";
import UserListPage from "../../components/admin/UserListPage";

interface Patient {
  id: string;
  name: string;
  email: string;
  phone?: string;
  dateOfBirth?: string | null;
  gender?: "M" | "F" | "O" | string;
  createdAt?: { toDate(): Date } | null;
}

const AdminPatients: React.FC = () => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Charger les données une seule fois au montage
  useEffect(() => {
    fetchPatients();
  }, []);

  const fetchPatients = async () => {
    try {
      setLoading(true);
      setError(null);

      const { collection, getDocs, query, where, doc, getDoc } = await import(
        "firebase/firestore"
      );
      const { getFirestoreInstance } = await import("../../utils/firebase");
      const db = getFirestoreInstance();

      if (db) {
        // 1. Récupérer tous les utilisateurs de type "patient"
        const usersQuery = query(
          collection(db, "users"),
          where("type", "==", "patient")
        );
        const usersSnapshot = await getDocs(usersQuery);

        // 2. Récupérer les profils détaillés de la collection "patients"
        const patientsData = await Promise.all(
          usersSnapshot.docs.map(async (userDoc) => {
            const userData = userDoc.data();

            // Essayer de récupérer le profil détaillé du patient
            let patientProfile = null;
            try {
              const patientDocRef = doc(db, "patients", userDoc.id);
              const patientDoc = await getDoc(patientDocRef);
              if (patientDoc.exists()) {
                patientProfile = patientDoc.data();
              }
            } catch (profileError) {
              console.warn(
                `⚠️ Erreur lors de la récupération du profil pour ${userDoc.id}:`,
                profileError
              );
            }

            // Fusionner les données : user + profile détaillé
            return {
              id: userDoc.id,
              name: userData.name || patientProfile?.name || "Nom inconnu",
              email: userData.email || patientProfile?.email || "",
              phone: userData.phoneNumber || patientProfile?.phone || "",
              dateOfBirth: patientProfile?.dateOfBirth || null,
              gender: patientProfile?.gender || userData.gender || null,
              createdAt:
                userData.createdAt || patientProfile?.createdAt || null,
            } as Patient;
          })
        );

        setPatients(patientsData);
      } else {
        setPatients([]);
      }
    } catch (err) {
      console.error("Error fetching patients:", err);
      setError("Erreur lors du chargement des patients");
      setPatients([]);
    } finally {
      setLoading(false);
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
            onClick={fetchPatients}
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
      key: "gender",
      label: "Genre",
      options: [
        { value: "all", label: "Tous les genres" },
        { value: "M", label: "Homme" },
        { value: "F", label: "Femme" },
        { value: "O", label: "Autre" },
      ],
    },
  ];

  // Champs de recherche
  const searchFields: (keyof Patient)[] = ["name", "email", "phone"];

  // Fonction de rendu des lignes
  const renderRow = (patient: Patient) => (
    <tr key={patient.id} className="hover:bg-paper">
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center">
          <div className="w-10 h-10 rounded-full bg-sage-soft flex items-center justify-center mr-3">
            <User className="h-6 w-6 text-sage" />
          </div>
          <div>
            <div className="text-sm font-medium text-ink">
              {patient.name}
            </div>
            {patient.dateOfBirth && (
              <div className="text-sm text-muted flex items-center">
                <Calendar className="h-4 w-4 mr-1" />
                {formatDateOfBirth(patient.dateOfBirth)}
              </div>
            )}
          </div>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="space-y-2">
          {/* Email */}
          {patient.email && (
            <div className="text-sm text-ink flex items-center">
              <Mail className="h-4 w-4 mr-2 text-muted" />
              {patient.email}
            </div>
          )}
          {/* Téléphone */}
          {patient.phone ? (
            <div className="text-sm text-ink flex items-center">
              <Phone className="h-4 w-4 mr-2 text-sage" />
              {patient.phone}
            </div>
          ) : null}
          {/* Genre */}
          <div className="text-sm text-muted flex items-center">
            <User className="h-4 w-4 mr-2 text-muted" />
            {patient.gender === "M"
              ? "Homme"
              : patient.gender === "F"
              ? "Femme"
              : patient.gender === "O"
              ? "Autre"
              : "Non défini"}
          </div>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-muted">
        {formatDate(patient.createdAt)}
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex space-x-2">
          <button
            onClick={() => window.open(`mailto:${patient.email}`, "_blank")}
            className="px-3 py-1 bg-accent-soft text-accent hover:bg-accent-soft/70 rounded-card text-xs font-medium"
          >
            <Mail className="h-3 w-3 mr-1 inline" />
            Contacter
          </button>
        </div>
      </td>
    </tr>
  );

  return (
    <AdminLayout>
      <UserListPage
        title="Gestion des Patients"
        data={patients}
        filters={filters}
        searchFields={searchFields}
        renderRow={renderRow}
        emptyMessage="Aucun patient trouvé"
      />
    </AdminLayout>
  );
};

// Fonction utilitaire pour formater les dates
const formatDate = (date: { toDate(): Date } | null | undefined) => {
  if (!date || typeof date.toDate !== "function") {
    return "Non disponible";
  }
  try {
    return date.toDate().toLocaleDateString("fr-FR");
  } catch {
    return "Non disponible";
  }
};

// Fonction pour formater la date de naissance (peut être string ou Timestamp)
const formatDateOfBirth = (
  date: string | { toDate(): Date } | null | undefined
) => {
  if (!date) {
    return "Non disponible";
  }

  // Si c'est une chaîne (format ISO)
  if (typeof date === "string") {
    try {
      const parsedDate = new Date(date);
      if (!isNaN(parsedDate.getTime())) {
        return parsedDate.toLocaleDateString("fr-FR");
      }
    } catch {
      // Ignore l'erreur et continue
    }
  }

  // Si c'est un Timestamp Firestore
  if (date && typeof date === "object" && typeof date.toDate === "function") {
    try {
      return date.toDate().toLocaleDateString("fr-FR");
    } catch {
      // Ignore l'erreur et continue
    }
  }

  return "Non disponible";
};

export default AdminPatients;
