import React, { useState, useEffect } from "react";
import { Bell, X, CheckCircle, AlertCircle, Info } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import {
  subscribeToNotifications,
  Notification,
} from "../../services/notificationService";

const ProfessionalNotificationCenter: React.FC = () => {
  const { currentUser } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    if (!currentUser?.id) return;

    const unsubscribe = subscribeToNotifications(
      currentUser.id,
      (newNotifications) => {
        // Filtrer seulement les notifications pertinentes pour les professionnels
        const professionalNotifications = newNotifications.filter(
          (notif) =>
            notif.type === "appointment_request" ||
            notif.type === "appointment_confirmed" ||
            notif.type === "appointment_cancelled" ||
            notif.type === "message" ||
            notif.type === "support_message"
        );

        setNotifications(professionalNotifications);
        setUnreadCount(professionalNotifications.filter((n) => !n.read).length);
      }
    );

    return () => unsubscribe();
  }, [currentUser?.id]);

  const markAsRead = async (notificationId: string) => {
    // TODO: Implémenter la logique pour marquer comme lu
    setNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "appointment_request":
      case "appointment_confirmed":
      case "appointment_cancelled":
        return <CheckCircle className="h-5 w-5 text-blue-500" />;
      case "message":
        return <Info className="h-5 w-5 text-green-500" />;
      case "support_message":
        return <AlertCircle className="h-5 w-5 text-orange-500" />;
      default:
        return <Info className="h-5 w-5 text-gray-500" />;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case "appointment_request":
      case "appointment_confirmed":
      case "appointment_cancelled":
        return "border-l-4 border-l-blue-500 bg-blue-50";
      case "message":
        return "border-l-4 border-l-green-500 bg-green-50";
      case "support_message":
        return "border-l-4 border-l-orange-500 bg-orange-50";
      default:
        return "border-l-4 border-l-gray-500 bg-gray-50";
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

  return (
    <div className="relative">
      {/* Bouton de notification avec badge */}
      <button
        onClick={() => setShowNotifications(!showNotifications)}
        className="relative p-2 text-gray-600 hover:text-gray-800 transition-colors"
      >
        <Bell className="h-6 w-6" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Panneau des notifications */}
      {showNotifications && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-96 overflow-y-auto">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
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
            {unreadCount > 0 && (
              <p className="text-sm text-gray-600 mt-1">
                {unreadCount} notification{unreadCount > 1 ? "s" : ""} non lue
                {unreadCount > 1 ? "s" : ""}
              </p>
            )}
          </div>

          <div className="p-2">
            {notifications.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Bell className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                <p>Aucune notification</p>
              </div>
            ) : (
              <div className="space-y-2">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-3 rounded-lg cursor-pointer transition-colors ${
                      notification.read
                        ? "bg-gray-50 hover:bg-gray-100"
                        : "bg-blue-50 hover:bg-blue-100"
                    } ${getNotificationColor(notification.type)}`}
                    onClick={() => markAsRead(notification.id)}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-1">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium text-gray-900 mb-1">
                          {notification.title}
                        </h4>
                        <p className="text-sm text-gray-600 mb-2">
                          {notification.content}
                        </p>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-500">
                            {formatDate(notification.createdAt)}
                          </span>
                          {!notification.read && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              Nouveau
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfessionalNotificationCenter;
