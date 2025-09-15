import React, { useState, useEffect, useMemo } from "react";
import {
  Bell,
  X,
  CheckCircle,
  Info,
  DollarSign,
  User,
  Calendar,
  MessageSquare,
  Trash2,
} from "lucide-react";

import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import LoadingSpinner from "../ui/LoadingSpinner";
import {
  subscribeToAdminNotificationsRealtime,
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

const AdminNotificationCenter: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const adminId = currentUser?.id;

  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNotifications, setShowNotifications] = useState(false);
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

  // Calculer le compteur de notifications non lues
  const unreadCount = useMemo(
    () =>
      notifications.reduce((n, x) => n + (x.status === "unread" ? 1 : 0), 0),
    [notifications]
  );

  // Subscription en temps réel pour les notifications
  useEffect(() => {
    if (!adminId) return;

    const unsubscribe = subscribeToAdminNotificationsRealtime(
      adminId,
      (notifications) => {
        setNotifications(notifications);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [adminId]);

  const markAllAsRead = async () => {
    if (!adminId) return;

    try {
      // Mise à jour optimiste
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, status: "read" as const }))
      );

      // Mise à jour Firestore
      await markAllAdminNotificationsAsRead(adminId);
    } catch (error) {
      console.error("❌ [ADMIN] Erreur marquage toutes lues:", error);
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      // Mise à jour optimiste
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));

      // Mise à jour Firestore
      await deleteAdminNotification(notificationId);
    } catch (error) {
      console.error("❌ [ADMIN] Erreur suppression:", error);
    }
  };

  const getRedirectPath = (type: string): string => {
    switch (type) {
      case "user":
      case "new_professional_registration":
        return "/admin/professionals";
      case "withdrawal":
        return "/admin/withdrawals";
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

  const handleNotificationClick = (notification: AdminNotification) => {
    console.log(
      "🔔 [ADMIN] Clic sur notification:",
      notification.type,
      notification.title
    );

    // Marquer comme lu si non lue
    if (notification.status === "unread" && adminId) {
      setNotifications((prev) =>
        prev.map((x) =>
          x.id === notification.id ? { ...x, status: "read" } : x
        )
      );
      markAdminNotificationAsRead(notification.id, adminId).catch(
        console.error
      );
    }

    const redirectPath = getRedirectPath(notification.type);
    console.log("🔔 [ADMIN] Redirection vers:", redirectPath);
    if (redirectPath) {
      navigate(redirectPath);
      setShowNotifications(false); // Fermer le panneau après navigation
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "withdrawal":
        return <DollarSign className="h-5 w-5 text-green-500" />; // Vert pour les retraits
      case "user":
      case "new_professional_registration":
        return <User className="h-5 w-5 text-blue-500" />; // Bleu pour les utilisateurs
      case "appointment":
        return <Calendar className="h-5 w-5 text-purple-500" />; // Violet pour les consultations
      case "message":
        return <MessageSquare className="h-5 w-5 text-orange-500" />; // Orange pour les messages
      case "support":
      case "support_message":
        return <Info className="h-5 w-5 text-red-500" />; // Rouge pour le support
      case "system":
        return <Info className="h-5 w-5 text-gray-500" />; // Gris pour le système
      default:
        return <Bell className="h-5 w-5 text-gray-600" />;
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

  if (loading) {
    return (
      <div className="relative">
        {/* Bouton de notification avec badge */}
        <button
          onClick={() => setShowNotifications(!showNotifications)}
          className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <Bell className="h-6 w-6" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>

        {/* Panneau de notifications */}
        {showNotifications && (
          <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-96 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                Notifications
              </h3>
              <button
                onClick={() => setShowNotifications(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Loading */}
            <div className="p-8 text-center">
              <LoadingSpinner size="md" />
              <p className="mt-2 text-gray-600">
                Chargement des notifications...
              </p>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Ne pas afficher si pas d'adminId
  if (!adminId) {
    return null;
  }

  return (
    <div className="relative">
      {/* Bouton de notification avec badge */}
      <button
        onClick={async () => {
          const opening = !showNotifications;
          setShowNotifications(opening);
          if (opening && adminId && unreadCount > 0) {
            await markAllAdminNotificationsAsRead(adminId);
          }
        }}
        className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
      >
        <Bell className="h-6 w-6" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Panneau de notifications */}
      {showNotifications && (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-96 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              Notifications
            </h3>
            <button
              onClick={() => setShowNotifications(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Filtres */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-sm font-medium text-gray-700">
                Filtrer:
              </span>
              <select
                value={filter}
                onChange={(e) =>
                  setFilter(
                    e.target.value as
                      | "all"
                      | "unread"
                      | "withdrawal"
                      | "user"
                      | "new_professional_registration"
                      | "appointment"
                      | "support"
                      | "support_message"
                      | "message"
                  )
                }
                className="text-sm border border-gray-300 rounded px-2 py-1"
              >
                <option value="all">Toutes</option>
                <option value="unread">Non lues</option>
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

            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
              >
                <CheckCircle className="h-4 w-4" />
                Tout marquer comme lu
              </button>
            )}
          </div>

          {/* Liste des notifications */}
          <div className="max-h-64 overflow-y-auto">
            {filteredNotifications.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                <Bell className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                <p>Aucune notification</p>
              </div>
            ) : (
              filteredNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${
                    notification.status === "unread" ? "bg-blue-50" : ""
                  } ${getTypeColor(notification.type)}`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-1">
                      {getTypeIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="text-sm font-medium text-gray-900 truncate">
                          {notification.title}
                        </h4>
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-xs px-2 py-1 rounded-full ${
                              notification.status === "unread"
                                ? "bg-blue-100 text-blue-800"
                                : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {notification.status === "unread" ? "Non lu" : "Lu"}
                          </span>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">
                        {notification.message}
                      </p>
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>{getTypeLabel(notification.type)}</span>
                        <span>{formatDate(notification.createdAt)}</span>
                      </div>
                    </div>
                    <div className="flex-shrink-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteNotification(notification.id);
                        }}
                        className="text-gray-400 hover:text-red-600 p-1"
                        title="Supprimer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminNotificationCenter;
