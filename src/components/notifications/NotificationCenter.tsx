import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  BellOff,
  MessageSquare,
  Calendar,
  CheckCircle,
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import LoadingSpinner from "../ui/LoadingSpinner";
import {
  markNotificationAsRead,
  markAllNotificationsAsRead,
  Notification,
} from "../../services/notificationService";
import { subscribeToNotifications } from "../../services/notificationService";

// Sound file for notifications
const NOTIFICATION_SOUND_URL =
  "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3";

const NotificationCenter: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lastNotificationCountRef = useRef<number>(0);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  // Get bookings for appointment notifications
  // const { bookings: _bookings } = useBookings(
  //   currentUser?.id || "",
  //   currentUser?.type === "professional"
  //     ? "professional"
  //     : currentUser?.type === "admin"
  //     ? "admin"
  //     : "patient"
  // );

  // Initialize audio element
  useEffect(() => {
    audioRef.current = new Audio(NOTIFICATION_SOUND_URL);
    audioRef.current.volume = 0.5;

    // Check if sound preference is stored
    const soundPref = localStorage.getItem("notification-sound-enabled");
    if (soundPref !== null) {
      setSoundEnabled(soundPref === "true");
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (!currentUser?.id) {
      return;
    }

    const cleanup = () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };

    const setupNotifications = async () => {
      try {
        cleanup();

        const unsubscribe = subscribeToNotifications(
          currentUser.id,
          (newNotifications) => {
            // Déduplication des notifications basée sur l'ID
            const uniqueNotifications = newNotifications.filter(
              (notification, index, self) =>
                index === self.findIndex((n) => n.id === notification.id)
            );

            setNotifications(uniqueNotifications);
            setUnreadCount(uniqueNotifications.filter((n) => !n.read).length);
            setLoading(false);
          }
        );

        unsubscribeRef.current = unsubscribe;
      } catch (error) {
        console.error("❌ Error setting up notifications:", error);
      }
    };

    setupNotifications();

    return cleanup;
  }, [currentUser?.id]);

  // Update notifications and play sound if new ones arrive
  const updateNotifications = (newNotifications: Notification[]) => {
    setNotifications((prevNotifications) => {
      // Merge new notifications with existing ones, avoiding duplicates
      const existingIds = new Set(prevNotifications.map((n) => n.id));
      const uniqueNewNotifications = newNotifications.filter(
        (n) => !existingIds.has(n.id)
      );

      // If there are new notifications, play sound
      if (
        uniqueNewNotifications.length > 0 &&
        soundEnabled &&
        lastNotificationCountRef.current > 0
      ) {
        playNotificationSound();
      }

      // Sort all notifications by timestamp (newest first)
      const mergedNotifications = [
        ...prevNotifications,
        ...uniqueNewNotifications,
      ].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

      // Update unread count
      const unreadCount = mergedNotifications.filter((n) => !n.read).length;
      setUnreadCount(unreadCount);

      // Update last count reference
      lastNotificationCountRef.current = mergedNotifications.length;

      return mergedNotifications;
    });
  };

  // Play notification sound
  const playNotificationSound = () => {
    if (audioRef.current && soundEnabled) {
      // Reset the audio to the beginning
      audioRef.current.currentTime = 0;

      // Play the sound
      audioRef.current.play().catch((error) => {
        console.warn("Could not play notification sound:", error);
      });
    }
  };

  // Toggle sound
  const toggleSound = () => {
    const newState = !soundEnabled;
    setSoundEnabled(newState);
    localStorage.setItem("notification-sound-enabled", newState.toString());
  };

  // Mark all notifications as read
  const markAllAsRead = async () => {
    try {
      if (currentUser?.id) {
        await markAllNotificationsAsRead(currentUser.id); // 🔁 Firestore en premier
        setNotifications((prev) =>
          prev.map((notification) => ({ ...notification, read: true }))
        );
        setUnreadCount(0);
      }
    } catch (err) {
      console.error(
        "Erreur lors de la mise à jour des notifications comme lues :",
        err
      );
    }
  };

  // Mark a single notification as read
  const markAsRead = async (id: string) => {
    try {
      await markNotificationAsRead(id); // 🔁 d'abord on met à jour Firestore
      setNotifications((prev) =>
        prev.map((notification) =>
          notification.id === id
            ? { ...notification, read: true }
            : notification
        )
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error(
        "Erreur lors de la mise à jour de la notification comme lue :",
        err
      );
    }
  };

  // Handle notification click
  const handleNotificationClick = async (notification: Notification) => {
    try {
      await markAsRead(notification.id);

      if (notification.type === "message") {
        if (currentUser?.type === "patient") {
          navigate("/patient/messages");
        } else if (currentUser?.type === "professional") {
          navigate("/professional/messages");
        } else if (currentUser?.type === "admin") {
          navigate("/admin/messages");
        }
      } else if (notification.type === "appointment_request") {
        navigate("/professional/dashboard");
      } else if (notification.type === "appointment_confirmed") {
        navigate("/patient/dashboard");
      }

      setIsOpen(false);
    } catch (err) {
      console.error("❌ Erreur lors du clic sur la notification :", err);
    }
  };

  // Format timestamp
  const formatTimestamp = (rawDate: any) => {
    let date: Date;

    try {
      if (!rawDate) return "Date inconnue";

      // Si c'est un Timestamp Firestore
      if (rawDate.toDate) {
        date = rawDate.toDate();
      } else if (rawDate instanceof Date) {
        date = rawDate;
      } else {
        date = new Date(rawDate);
      }

      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 1) return "À l'instant";
      if (diffMins < 60) return `Il y a ${diffMins} min`;
      if (diffHours < 24) return `Il y a ${diffHours}h`;
      if (diffDays === 1) return "Hier";

      return date.toLocaleDateString();
    } catch (error) {
      console.error("⛔ Erreur dans formatTimestamp:", error);
      return "Date invalide";
    }
  };

  // Get icon for notification type with color coding
  const getNotificationIcon = (type: string, priority: string = "medium") => {
    switch (type) {
      case "message":
        return <MessageSquare className="h-5 w-5 text-green-500" />; // Vert pour les messages
      case "appointment_request":
        return <Calendar className="h-5 w-5 text-orange-500" />;
      case "appointment_confirmed":
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "professional_registration":
        return <Bell className="h-5 w-5 text-blue-500" />; // Bleu pour les inscriptions
      case "support_message":
        return <MessageSquare className="h-5 w-5 text-red-500" />; // Rouge pour le support
      default:
        return <Bell className="h-5 w-5 text-gray-500" />;
    }
  };

  // Get notification background color based on type
  const getNotificationBackgroundColor = (type: string, read: boolean) => {
    if (read) return "bg-white";

    switch (type) {
      case "message":
        return "bg-green-50"; // Vert pour les messages
      case "professional_registration":
        return "bg-blue-50"; // Bleu pour les inscriptions
      case "support_message":
        return "bg-red-50"; // Rouge pour le support
      case "appointment_request":
        return "bg-orange-50";
      case "appointment_confirmed":
        return "bg-green-50";
      default:
        return "bg-gray-50";
    }
  };

  // Get notification border color based on type
  const getNotificationBorderColor = (type: string) => {
    switch (type) {
      case "message":
        return "border-l-4 border-l-green-500"; // Vert pour les messages
      case "professional_registration":
        return "border-l-4 border-l-blue-500"; // Bleu pour les inscriptions
      case "support_message":
        return "border-l-4 border-l-red-500"; // Rouge pour le support
      case "appointment_request":
        return "border-l-4 border-l-orange-500";
      case "appointment_confirmed":
        return "border-l-4 border-l-green-500";
      default:
        return "border-l-4 border-l-gray-500";
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Notification Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-white hover:text-blue-100 transition focus:outline-none"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5 text-blue-700" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center min-w-[20px]">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-md shadow-lg py-1 z-50 max-h-[80vh] flex flex-col">
          {/* Header */}
          <div className="px-4 py-2 border-b border-gray-200 flex justify-between items-center">
            <h3 className="font-medium text-gray-700">Notifications</h3>
            <div className="flex items-center space-x-2">
              <button
                onClick={toggleSound}
                className="p-1 rounded-full hover:bg-gray-100"
                title={soundEnabled ? "Désactiver le son" : "Activer le son"}
              >
                {soundEnabled ? (
                  <Bell className="h-4 w-4 text-gray-600" />
                ) : (
                  <BellOff className="h-4 w-4 text-gray-600" />
                )}
              </button>
            </div>
          </div>

          {/* Mark All as Read Button - More Visible */}
          {notifications.length > 0 && (
            <div className="px-4 py-2 border-b border-gray-200">
              <button
                onClick={markAllAsRead}
                className="w-full py-1.5 px-3 bg-gray-100 text-gray-600 text-xs font-medium rounded border border-gray-200 hover:bg-gray-200 transition-colors duration-200 flex items-center justify-center space-x-2"
              >
                <span className="text-gray-500">✓</span>
                <span>
                  Marquer tout comme lu ({notifications.length} notifications)
                </span>
              </button>
            </div>
          )}

          {/* Notification List */}
          <div className="overflow-y-auto flex-1">
            {loading ? (
              <div className="flex justify-center items-center py-8">
                <LoadingSpinner size="md" />
              </div>
            ) : notifications.length > 0 ? (
              <div>
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`px-4 py-3 border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${getNotificationBackgroundColor(
                      notification.type,
                      notification.read
                    )} ${getNotificationBorderColor(notification.type)}`}
                  >
                    <div className="flex items-start">
                      <div className="flex-shrink-0 mt-1">
                        {getNotificationIcon(
                          notification.type,
                          notification.priority
                        )}
                      </div>
                      <div className="ml-3 flex-1">
                        <p className="text-sm font-medium text-gray-900">
                          {notification.title}
                        </p>
                        <p className="text-sm text-gray-600">
                          {notification.content}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {formatTimestamp(
                            notification.timestamp ||
                              notification.createdAt?.toDate?.() ||
                              new Date()
                          )}
                        </p>
                      </div>
                      {!notification.read && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-gray-500">
                <Bell className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                <p>Aucune notification</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationCenter;
