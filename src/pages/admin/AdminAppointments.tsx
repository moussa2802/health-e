import React, { useState, useEffect } from "react";
import {
  Search,
  Download,
  Calendar,
  User,
  Clock,
  FileText,
  Eye,
  Edit2,
  Trash2,
} from "lucide-react";
import AdminLayout from "../../components/admin/AdminLayout";

interface Appointment {
  id: string;
  patientName: string;
  professionalName: string;
  date: string;
  time: string;
  status: "pending" | "confirmed" | "completed" | "cancelled";
  type: "video" | "audio" | "chat";
  createdAt?: unknown;
}

interface AppointmentFilters {
  status: string;
  type: string;
  dateRange: string;
}

const AdminAppointments: React.FC = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [filteredAppointments, setFilteredAppointments] = useState<
    Appointment[]
  >([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState<AppointmentFilters>({
    status: "",
    type: "",
    dateRange: "",
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAppointments();
  }, []);

  useEffect(() => {
    if (appointments.length > 0) {
      applyFilters();
    }
  }, [appointments, searchTerm, filters]);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      setError(null);

      // Simuler un délai pour éviter les problèmes de rendu
      await new Promise((resolve) => setTimeout(resolve, 100));

      const { collection, getDocs } = await import("firebase/firestore");
      const { getFirestoreInstance } = await import("../../utils/firebase");
      const db = getFirestoreInstance();

      if (db) {
        const querySnapshot = await getDocs(collection(db, "bookings"));
        const results = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Appointment[];

        setAppointments(results);
        setFilteredAppointments(results);
      } else {
        setAppointments([]);
        setFilteredAppointments([]);
      }
    } catch (error) {
      console.error("Erreur lors du chargement des consultations:", error);
      setError("Erreur lors du chargement des consultations");
      setAppointments([]);
      setFilteredAppointments([]);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    try {
      let filtered = [...appointments];

      // Filter by search term
      if (searchTerm.trim()) {
        filtered = filtered.filter(
          (appointment) =>
            appointment.patientName
              ?.toLowerCase()
              .includes(searchTerm.toLowerCase()) ||
            appointment.professionalName
              ?.toLowerCase()
              .includes(searchTerm.toLowerCase())
        );
      }

      // Filter by status
      if (filters.status) {
        filtered = filtered.filter(
          (appointment) => appointment.status === filters.status
        );
      }

      // Filter by type
      if (filters.type) {
        filtered = filtered.filter(
          (appointment) => appointment.type === filters.type
        );
      }

      // Filter by date range
      if (filters.dateRange) {
        const now = new Date();
        const filterDate = new Date();

        switch (filters.dateRange) {
          case "today":
            filterDate.setHours(0, 0, 0, 0);
            break;
          case "week":
            filterDate.setDate(now.getDate() - 7);
            break;
          case "month":
            filterDate.setMonth(now.getMonth() - 1);
            break;
          default:
            filterDate.setFullYear(1970);
        }

        filtered = filtered.filter((appointment) => {
          if (!appointment.date) return false;

          try {
            const appointmentDate = new Date(appointment.date);
            return appointmentDate >= filterDate;
          } catch {
            return false;
          }
        });
      }

      setFilteredAppointments(filtered);
    } catch {
      console.error("Erreur lors du filtrage des consultations");
      setFilteredAppointments(appointments);
    }
  };

  const handleExport = () => {
    try {
      const csvContent = [
        ["Patient", "Professionnel", "Date", "Heure", "Type", "Statut"],
        ...filteredAppointments.map((appointment) => [
          appointment.patientName || "",
          appointment.professionalName || "",
          appointment.date || "",
          appointment.time || "",
          appointment.type || "",
          appointment.status || "",
        ]),
      ]
        .map((row) => row.join(","))
        .join("\n");

      const blob = new Blob([csvContent], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `consultations_${
        new Date().toISOString().split("T")[0]
      }.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Erreur lors de l'export:", error);
      alert("Erreur lors de l'export");
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "pending":
        return "En attente";
      case "confirmed":
        return "Confirmée";
      case "completed":
        return "Terminée";
      case "cancelled":
        return "Annulée";
      default:
        return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "confirmed":
        return "bg-blue-100 text-blue-800";
      case "completed":
        return "bg-green-100 text-green-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "video":
        return "Vidéo";
      case "audio":
        return "Audio";
      case "chat":
        return "Chat";
      default:
        return type;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "video":
        return <Calendar className="h-4 w-4 text-blue-500" />;
      case "audio":
        return <Clock className="h-4 w-4 text-green-500" />;
      case "chat":
        return <FileText className="h-4 w-4 text-purple-500" />;
      default:
        return <Calendar className="h-4 w-4 text-gray-500" />;
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("fr-FR", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch (error) {
      return dateString;
    }
  };

  const resetFilters = () => {
    setSearchTerm("");
    setFilters({
      status: "",
      type: "",
      dateRange: "",
    });
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="p-6">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            <span className="ml-4 text-lg text-gray-600">
              Chargement des consultations...
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

  return (
    <AdminLayout>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <p className="text-gray-600">
              {filteredAppointments.length} consultation
              {filteredAppointments.length > 1 ? "s" : ""}
              {appointments.length !== filteredAppointments.length &&
                ` sur ${appointments.length} au total`}
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
                placeholder="Rechercher une consultation..."
                className="pl-10 w-full border border-gray-300 rounded-md p-2"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex flex-wrap gap-4">
              <select
                value={filters.status}
                onChange={(e) =>
                  setFilters({ ...filters, status: e.target.value })
                }
                className="border border-gray-300 rounded-md p-2"
              >
                <option value="">Tous les statuts</option>
                <option value="pending">En attente</option>
                <option value="confirmed">Confirmée</option>
                <option value="completed">Terminée</option>
                <option value="cancelled">Annulée</option>
              </select>
              <select
                value={filters.type}
                onChange={(e) =>
                  setFilters({ ...filters, type: e.target.value })
                }
                className="border border-gray-300 rounded-md p-2"
              >
                <option value="">Tous les types</option>
                <option value="video">Vidéo</option>
                <option value="audio">Audio</option>
                <option value="chat">Chat</option>
              </select>
              <select
                value={filters.dateRange}
                onChange={(e) =>
                  setFilters({ ...filters, dateRange: e.target.value })
                }
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

        {/* Appointments Table */}
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
                      Type
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
                  {filteredAppointments.map((appointment) => (
                    <tr key={appointment.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center mr-3">
                            <User className="h-6 w-6 text-gray-500" />
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {appointment.patientName}
                            </div>
                            <div className="text-sm text-gray-500">
                              avec {appointment.professionalName}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          <div className="flex items-center mb-1">
                            <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                            {formatDate(appointment.date)}
                          </div>
                          <div className="flex items-center">
                            <Clock className="h-4 w-4 text-gray-400 mr-2" />
                            {appointment.time}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {getTypeIcon(appointment.type)}
                          <span className="ml-2 text-sm text-gray-900">
                            {getTypeLabel(appointment.type)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(
                            appointment.status
                          )}`}
                        >
                          {getStatusLabel(appointment.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button className="px-3 py-1 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded text-xs font-medium">
                            <Eye className="h-3 w-3" />
                          </button>
                          <button className="px-3 py-1 bg-green-100 text-green-700 hover:bg-green-200 rounded text-xs font-medium">
                            <Edit2 className="h-3 w-3" />
                          </button>
                          <button className="px-3 py-1 bg-red-100 text-red-700 hover:bg-red-200 rounded text-xs font-medium">
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
              <Calendar className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                {searchTerm ||
                filters.status ||
                filters.type ||
                filters.dateRange
                  ? "Aucune consultation ne correspond à vos critères"
                  : "Aucune consultation trouvée"}
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm ||
                filters.status ||
                filters.type ||
                filters.dateRange
                  ? "Essayez de modifier vos critères de recherche ou de filtrage."
                  : "Aucune consultation n'est encore programmée."}
              </p>
              {(searchTerm ||
                filters.status ||
                filters.type ||
                filters.dateRange) && (
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
