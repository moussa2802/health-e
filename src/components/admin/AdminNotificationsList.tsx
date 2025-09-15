import React, { useState, useEffect, useCallback } from "react";
import {
  CheckCircle,
  Info,
  DollarSign,
  User,
  Calendar,
  MessageSquare,
  Trash2,
  Eye,
  Filter,
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import LoadingSpinner from "../ui/LoadingSpinner";
import {
  getAdminNotifications,
  markAdminNotificationAsRead,
  markAllAdminNotificationsAsRead,
  deleteAdminNotification,
} from "../../services/adminNotificationService";

interface AdminNotification {
  id: string;
  type:
    | "withdrawal"
    | "user"
    | "new_professional_registration"
    | "appointment"
    | "system"
    | "message"
    | "support"
    | "support_message";
  title: string;
  message: string;
  status: "unread" | "read";
  createdAt: unknown; // Timestamp
  data?: Record<string, unknown>; // Données supplémentaires selon le type
  actionUrl?: string; // URL pour agir sur la notification
}

const AdminNotificationsList: React.FC = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<
    | "all"
    | "unread"
    | "withdrawal"
    | "user"
    | "new_professional_registration"
    | "appointment"
    | "support"
    | "support_message"
    | "message"
  >("all");

  const loadNotifications = useCallback(async () => {
    try {
      setLoading(true);
      console.log("🔍 [ADMIN LIST] Début chargement notifications...");
      if (!currentUser?.id) {
        console.warn(
          "⚠️ [ADMIN LIST] Admin ID non disponible. Impossible de charger les notifications."
        );
        setNotifications([]);
        setLoading(false);
        return;
      }

      const realNotifications = await getAdminNotifications(
        currentUser.id,
        filter === "unread" ? "unread" : undefined,
        filter === "all" || filter === "unread"
          ? undefined
          : (filter as AdminNotification["type"]),
        100
      );
      console.log("📊 [ADMIN LIST] Notifications reçues:", realNotifications);
      console.log(
        "📊 [ADMIN LIST] Nombre de notifications:",
        realNotifications?.length || 0
      );

      if (realNotifications && realNotifications.length > 0) {
        setNotifications(realNotifications);
      } else {
        console.log(
          "⚠️ [ADMIN LIST] Aucune notification trouvée dans Firestore"
        );
        setNotifications([]);
      }
    } catch (error) {
      console.error("❌ [ADMIN LIST] Erreur chargement notifications:", error);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, [filter, currentUser]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const handleMarkAsRead = async (notificationId: string) => {
    if (!currentUser?.id) return;
    try {
      await markAdminNotificationAsRead(notificationId, currentUser.id);
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notificationId ? { ...n, status: "read" as const } : n
        )
      );
    } catch (error) {
      console.error("❌ [ADMIN LIST] Erreur marquage lu:", error);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!currentUser?.id) return;
    try {
      await markAllAdminNotificationsAsRead(currentUser.id);
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, status: "read" as const }))
      );
    } catch (error) {
      console.error("❌ [ADMIN LIST] Erreur marquage toutes lues:", error);
    }
  };

  const handleDeleteNotification = async (notificationId: string) => {
    if (!currentUser?.id) return;
    try {
      await deleteAdminNotification(notificationId);
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
    } catch (error) {
      console.error("❌ [ADMIN LIST] Erreur suppression:", error);
    }
  };

  const handleNotificationClick = (notification: AdminNotification) => {
    handleMarkAsRead(notification.id);

    // Navigation vers la page correspondante selon le type
    const redirectPath = getRedirectPath(notification.type);
    if (redirectPath) {
      navigate(redirectPath);
    }
  };

  const getRedirectPath = (type: string): string => {
    switch (type) {
      case "new_professional_registration":
      case "user":
        return "/admin/professionals";
      case "withdrawal_request":
      case "withdrawal":
        return "/admin/withdrawals";
      case "appointment_cancelled":
      case "appointment":
        return "/admin/appointments";
      case "support":
      case "support_message":
        return "/admin/support";
      case "message":
        return "/admin/messages";
      default:
        return "/admin/dashboard";
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "withdrawal":
        return <DollarSign className="h-5 w-5 text-green-500" />;
      case "user":
      case "new_professional_registration":
        return <User className="h-5 w-5 text-blue-500" />;
      case "appointment":
        return <Calendar className="h-5 w-5 text-purple-500" />;
      case "message":
        return <MessageSquare className="h-5 w-5 text-orange-500" />;
      case "support":
      case "support_message":
        return <Info className="h-5 w-5 text-red-500" />;
      case "system":
        return <Info className="h-5 w-5 text-gray-500" />;
      default:
        return <Info className="h-5 w-5 text-gray-600" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "new_professional_registration":
      case "user":
        return "border-l-4 border-l-blue-500 bg-blue-50";
      case "withdrawal_request":
      case "withdrawal":
        return "border-l-4 border-l-green-500 bg-green-50";
      case "appointment_cancelled":
      case "appointment":
        return "border-l-4 border-l-purple-500 bg-purple-50";
      case "support":
      case "support_message":
        return "border-l-4 border-l-red-500 bg-red-50";
      case "message":
        return "border-l-4 border-l-indigo-500 bg-indigo-50";
      default:
        return "border-l-4 border-l-gray-500 bg-gray-50";
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "withdrawal":
        return "Retrait";
      case "user":
      case "new_professional_registration":
        return "Utilisateur";
      case "appointment":
        return "Consultation";
      case "message":
        return "Message";
      case "support":
      case "support_message":
        return "Support";
      case "system":
        return "Système";
      default:
        return type;
    }
  };

  const formatDate = (timestamp: unknown) => {
    if (!timestamp) return "N/A";
    try {
      if (
        typeof timestamp === "object" &&
        timestamp !== null &&
        "toDate" in timestamp &&
        typeof (timestamp as Record<string, unknown>).toDate === "function"
      ) {
        return (
          (timestamp as Record<string, unknown>).toDate as () => Date
        )().toLocaleString("fr-FR");
      }
      return new Date(timestamp as string | number).toLocaleString("fr-FR");
    } catch {
      return "N/A";
    }
  };

  const filteredNotifications = notifications.filter((notification) => {
    if (filter === "all") return true;
    if (filter === "unread") return notification.status === "unread";
    return notification.type === filter;
  });

  const unreadCount = notifications.filter((n) => n.status === "unread").length;

  if (loading) {
    return (
      <div className="p-8 text-center">
        <LoadingSpinner size="lg" />
        <p className="mt-4 text-gray-600">Chargement des notifications...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* En-tête avec statistiques et actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="text-sm text-gray-600">
            <span className="font-medium">{notifications.length}</span>{" "}
            notifications
            {unreadCount > 0 && (
              <span className="ml-2 text-blue-600 font-medium">
                ({unreadCount} non lues)
              </span>
            )}
          </div>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllAsRead}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <CheckCircle className="h-4 w-4" />
            Tout marquer comme lu
          </button>
        )}
      </div>

      {/* Filtres */}
      <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
        <span className="text-sm font-medium text-gray-700 flex items-center gap-2">
          <Filter className="h-4 w-4" />
          Filtrer:
        </span>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as typeof filter)}
          className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="all">Toutes ({notifications.length})</option>
          <option value="unread">Non lues ({unreadCount})</option>
          <option value="withdrawal">Retraits</option>
          <option value="user">Utilisateurs</option>
          <option value="new_professional_registration">
            Nouveaux professionnels
          </option>
          <option value="appointment">Consultations</option>
          <option value="support">Support</option>
          <option value="support_message">Messages support</option>
          <option value="message">Messages</option>
        </select>
      </div>

      {/* Liste des notifications */}
      <div className="space-y-4">
        {filteredNotifications.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Info className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium">Aucune notification</p>
            <p className="text-sm">
              {filter === "all"
                ? "Aucune notification trouvée"
                : `Aucune notification ${
                    filter === "unread" ? "non lue" : filter
                  } trouvée`}
            </p>
          </div>
        ) : (
          filteredNotifications.map((notification) => (
            <div
              key={notification.id}
              className={`p-6 border border-gray-200 rounded-lg hover:shadow-md transition-all cursor-pointer ${
                notification.status === "unread"
                  ? "bg-blue-50 border-blue-200"
                  : "bg-white"
              } ${getTypeColor(notification.type)}`}
              onClick={() => handleNotificationClick(notification)}
            >
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 mt-1">
                  {getTypeIcon(notification.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {notification.title}
                    </h3>
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-3 py-1 text-xs font-medium rounded-full ${
                          notification.status === "unread"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {notification.status === "unread" ? "Non lu" : "Lu"}
                      </span>
                    </div>
                  </div>
                  <p className="text-gray-700 mb-4 leading-relaxed">
                    {notification.message}
                  </p>
                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <div className="flex items-center gap-4">
                      <span className="flex items-center gap-1">
                        {getTypeIcon(notification.type)}
                        {getTypeLabel(notification.type)}
                      </span>
                      <span>{formatDate(notification.createdAt)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMarkAsRead(notification.id);
                        }}
                        className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                        title="Marquer comme lu"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteNotification(notification.id);
                        }}
                        className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                        title="Supprimer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default AdminNotificationsList;
