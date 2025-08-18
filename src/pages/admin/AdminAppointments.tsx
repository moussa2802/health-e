import React, { useState, useEffect } from "react";
import {
  Search,
  Download,
  Calendar,
  Clock,
  Video,
  MessageCircle,
  PhoneCall,
  User,
} from "lucide-react";
import AdminLayout from "../../components/admin/AdminLayout";
import {
  updateBookingStatus,
  deleteBooking,
} from "../../services/bookingService";
import { useAuth } from "../../contexts/AuthContext";

interface AppointmentFilters {
  status: string;
  type: string;
  dateRange: string;
}

const AdminAppointments: React.FC = () => {
  const { currentUser } = useAuth();

  // Debug: Afficher l'état de currentUser

  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filteredBookings, setFilteredBookings] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState<AppointmentFilters>({
    status: "",
    type: "",
    dateRange: "",
  });

  useEffect(() => {
    fetchBookings();
  }, []);

  useEffect(() => {
    filterBookings();
  }, [bookings, searchTerm, filters]);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      setError(null);
      const { collection, getDocs } = await import("firebase/firestore");
      const { getFirestoreInstance } = await import("../../utils/firebase");
      const db = getFirestoreInstance();
      if (db) {
        const querySnapshot = await getDocs(collection(db, "bookings"));
        const results = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setBookings(results);
      }
    } catch (error) {
      console.error("Erreur lors du chargement des consultations:", error);
      setError("Erreur lors du chargement des consultations");
      setBookings([]);
    } finally {
      setLoading(false);
    }
  };

  const filterBookings = () => {
    let filtered = bookings;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(
        (booking) =>
          booking.patientName
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          booking.professionalName
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          booking.patientId.toLowerCase().includes(searchTerm.toLowerCase()) ||
          booking.professionalId
            .toLowerCase()
            .includes(searchTerm.toLowerCase())
      );
    }

    // Filter by status
    if (filters.status) {
      filtered = filtered.filter(
        (booking) => booking.status === filters.status
      );
    }

    // Filter by type
    if (filters.type) {
      filtered = filtered.filter((booking) => booking.type === filters.type);
    }

    // Filter by date range
    if (filters.dateRange) {
      const now = new Date();
      const filterDate = new Date();

      switch (filters.dateRange) {
        case "today":
          filterDate.setHours(0, 0, 0, 0);
          filtered = filtered.filter((booking) => {
            const bookingDate = new Date(booking.date);
            return (
              bookingDate >= filterDate &&
              bookingDate < new Date(filterDate.getTime() + 24 * 60 * 60 * 1000)
            );
          });
          break;
        case "week":
          filterDate.setDate(now.getDate() - 7);
          filtered = filtered.filter(
            (booking) => new Date(booking.date) >= filterDate
          );
          break;
        case "month":
          filterDate.setMonth(now.getMonth() - 1);
          filtered = filtered.filter(
            (booking) => new Date(booking.date) >= filterDate
          );
          break;
      }
    }

    setFilteredBookings(filtered);
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "en_attente":
        return "En attente";
      case "confirmé":
      case "confirmed":
        return "Confirmé";
      case "terminé":
      case "completed":
        return "Terminé";
      case "annulé":
        return "Annulé";
      default:
        return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "en_attente":
        return "bg-yellow-100 text-yellow-800";
      case "confirmé":
      case "confirmed":
        return "bg-green-100 text-green-800";
      case "terminé":
      case "completed":
        return "bg-blue-100 text-blue-800";
      case "annulé":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getConsultationIcon = (type: string) => {
    switch (type) {
      case "video":
        return <Video className="h-5 w-5 text-blue-500" />;
      case "audio":
        return <PhoneCall className="h-5 w-5 text-blue-500" />;
      case "chat":
        return <MessageCircle className="h-5 w-5 text-blue-500" />;
      default:
        return <Video className="h-5 w-5 text-blue-500" />;
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

  const handleUpdateStatus = async (bookingId: string, status: string) => {
    try {
      await updateBookingStatus(bookingId, status as any);
    } catch (error) {
      console.error("Error updating booking status:", error);
      alert("Erreur lors de la mise à jour du statut");
    }
  };

  const handleDeleteBooking = async (bookingId: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cette réservation ?")) {
      return;
    }

    try {
      await deleteBooking(bookingId);
    } catch (error) {
      console.error("Error deleting booking:", error);
      alert("Erreur lors de la suppression");
    }
  };

  const handleExport = () => {
    const csvContent = [
      [
        "Patient",
        "Professionnel",
        "Date",
        "Heure",
        "Type",
        "Statut",
        "Durée",
        "Prix",
      ],
      ...filteredBookings.map((booking) => [
        booking.patientName,
        booking.professionalName,
        booking.date,
        `${booking.startTime} - ${booking.endTime}`,
        getTypeLabel(booking.type),
        getStatusLabel(booking.status),
        `${booking.duration} min`,
        `${booking.price} XOF`,
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `reservations_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="p-6">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            <span className="ml-4 text-lg text-gray-600">
              Chargement des réservations...
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
              onClick={() => window.location.reload()}
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
            <h1 className="text-2xl font-bold">Gestion des réservations</h1>
            <p className="text-gray-600">
              {filteredBookings.length} réservation
              {filteredBookings.length > 1 ? "s" : ""}
              {bookings.length !== filteredBookings.length &&
                ` sur ${bookings.length} au total`}
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
                placeholder="Rechercher une réservation..."
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
                <option value="en_attente">En attente</option>
                <option value="confirmé">Confirmé</option>
                <option value="terminé">Terminé</option>
                <option value="annulé">Annulé</option>
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

        {/* Bookings Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {filteredBookings.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Patient
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Professionnel
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date & Heure
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Durée
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Prix
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
                  {filteredBookings.map((booking) => (
                    <tr key={booking.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <User className="h-8 w-8 text-gray-400 mr-3" />
                          <div className="text-sm font-medium text-gray-900">
                            {booking.patientName}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {booking.professionalName}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 text-gray-500 mr-1" />
                          <span className="text-sm text-gray-900 mr-3">
                            {booking.date}
                          </span>
                          <Clock className="h-4 w-4 text-gray-500 mr-1" />
                          <span className="text-sm text-gray-900">
                            {booking.startTime}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {getConsultationIcon(booking.type)}
                          <span className="ml-2 text-sm text-gray-900">
                            {getTypeLabel(booking.type)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {booking.duration} min
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {booking.price.toLocaleString()} XOF
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(
                            booking.status
                          )}`}
                        >
                          {getStatusLabel(booking.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          {booking.status === "en_attente" && (
                            <button
                              onClick={() =>
                                handleUpdateStatus(booking.id, "confirmé")
                              }
                              className="text-green-600 hover:text-green-900"
                            >
                              Confirmer
                            </button>
                          )}
                          {(booking.status === "en_attente" ||
                            booking.status === "confirmé") && (
                            <button
                              onClick={() =>
                                handleUpdateStatus(booking.id, "annulé")
                              }
                              className="text-red-600 hover:text-red-900"
                            >
                              Annuler
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteBooking(booking.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Supprimer
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
                Aucune réservation trouvée
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm ||
                filters.status ||
                filters.type ||
                filters.dateRange
                  ? "Essayez de modifier vos critères de recherche."
                  : 'Aucune réservation n\'a encore été créée dans la collection "bookings".'}
              </p>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminAppointments;
