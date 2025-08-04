import React, { useState, useEffect, useRef } from "react";
import { Menu, User, LogOut, Bell } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useLanguage } from "../../contexts/LanguageContext";
import AdminSidebar from "./AdminSidebar";
import { subscribeToNotifications } from "../../services/notificationService";
import { markNotificationAsRead } from "../../services/notificationService";
import { Timestamp } from "firebase/firestore";

interface User {
  uid: string;
  name?: string;
  profileImage?: string;
  // add other properties as needed
}

interface Notification {
  id: string;
  title?: string;
  content?: string;
  read?: boolean;
  type?: string;
  sourceId?: string;
  createdAt?:
    | Timestamp
    | Date
    | { seconds: number; nanoseconds: number }
    | undefined;
  userId?: string;
}

interface AdminLayoutProps {
  children: React.ReactNode;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const { currentUser, logout } = useAuth();
  const { language } = useLanguage();
  const navigate = useNavigate();
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState<
    Notification[]
  >([]);
  const [allNotifications, setAllNotifications] = useState<Notification[]>([]);

  const handleLogout = () => {
    console.log("🔄 [ADMIN DEBUG] Starting admin logout");

    // Nettoyer les listeners de notifications avant la déconnexion
    if (unsubscribeRef.current) {
      console.log("🧹 [ADMIN DEBUG] Cleaning up notification subscription");
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }

    // Réinitialiser l'état des notifications
    setAllNotifications([]);
    setUnreadNotifications([]);

    logout();
    navigate("/");
  };
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const dropdown = document.getElementById("notif-dropdown");
      if (dropdown && !dropdown.contains(event.target as Node)) {
        setNotifDropdownOpen(false);
      }
    };

    if (notifDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [notifDropdownOpen]);

  useEffect(() => {
    if (!currentUser?.id) return;

    console.log(
      "🔔 [ADMIN DEBUG] Starting notification fetch for user:",
      currentUser.id
    );
    console.log("🔔 [ADMIN DEBUG] User type:", currentUser.type);
    console.log("🔔 [ADMIN DEBUG] User object:", currentUser);

    const fetchNotif = async () => {
      console.log("👤 Admin UID pour notifications :", currentUser.id);
      console.log("🔍 Type d'utilisateur :", currentUser.type);

      try {
        console.log("🔔 [ADMIN DEBUG] About to call getAdminNotifications");
        // Utiliser le service de notifications standard au lieu de getAdminNotifications
        const allNotif: Notification[] = [];

        // Créer une subscription temporaire pour récupérer les notifications
        const unsubscribe = subscribeToNotifications(
          currentUser.id,
          (notifications) => {
            console.log(
              "🔔 [ADMIN DEBUG] Received notifications via subscription:",
              notifications
            );
            setAllNotifications(notifications);

            const unread = notifications.filter(
              (n) => n.read === false || n.read === undefined
            );
            setUnreadNotifications(unread);
            console.log(
              "🔔 [ADMIN DEBUG] Admin unread notifications:",
              unread.length
            );
          }
        );

        // Nettoyer la subscription après 5 secondes (juste pour récupérer les données)
        setTimeout(() => {
          unsubscribe();
        }, 5000);

        console.log(
          "🔔 [ADMIN DEBUG] getAdminNotifications returned:",
          allNotif
        );
        console.log("🔍 Notifications reçues pour la cloche :", allNotif);
        console.log("🔍 Nombre de notifications :", allNotif.length);
      } catch (error) {
        console.log("🔔 [ADMIN DEBUG] Error in fetchNotif:", error);
        console.error(
          "❌ Erreur lors de la récupération des notifications :",
          error
        );
        setAllNotifications([]);
        setUnreadNotifications([]);
      }
    };

    fetchNotif();
  }, [currentUser]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 h-16 bg-white shadow-sm z-40 flex items-center justify-between px-4">
        <div className="flex items-center">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Menu className="h-6 w-6 text-gray-600" />
          </button>
          <span className="ml-4 text-xl font-semibold text-gray-800">
            {language === "fr" ? "Health-e Admin" : "Health-e Admin"}
          </span>
        </div>

        <div className="flex items-center space-x-4">
          {/* Notification Bell */}
          <div className="relative">
            <button
              onClick={() => setNotifDropdownOpen((prev) => !prev)}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors relative"
            >
              <Bell className="h-6 w-6 text-gray-600" />
              {unreadNotifications.length > 0 && (
                <span className="absolute top-0 right-0 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white"></span>
              )}
            </button>

            {notifDropdownOpen && (
              <>
                {console.log("🔔 Ouverture dropdown :", unreadNotifications)}
                <div
                  className="absolute right-0 mt-2 w-80 bg-white shadow-xl rounded-lg z-50 max-h-96 overflow-y-auto border"
                  onClick={(e) => e.stopPropagation()} // 👈 éviter que ça se ferme quand tu cliques dedans
                >
                  {allNotifications.length > 0 ? (
                    allNotifications.map((notif, index) => (
                      <button
                        key={index}
                        onClick={async () => {
                          await markNotificationAsRead(notif.id);
                          setUnreadNotifications((prev) =>
                            prev.filter((n) => n.id !== notif.id)
                          );

                          if (notif.type === "message") {
                            navigate("/admin/messages");
                          } else if (notif.type === "nouveau_professionnel") {
                            navigate("/admin/utilisateurs");
                          }

                          setNotifDropdownOpen(false);
                        }}
                        className={`w-full text-left px-4 py-2 border-b hover:bg-gray-100 ${
                          notif.read
                            ? "bg-gray-100 text-gray-500"
                            : "bg-white font-medium"
                        }`}
                      >
                        <div className="text-sm">{notif.title}</div>
                        <div className="text-xs">{notif.content}</div>
                        <div className="text-xs text-gray-400">
                          {(() => {
                            const createdAt = notif.createdAt;
                            if (!createdAt) return "Date inconnue";
                            if (
                              typeof createdAt === "object" &&
                              "seconds" in createdAt &&
                              typeof createdAt.seconds === "number"
                            ) {
                              // Firestore Timestamp ou objet similaire
                              return new Date(
                                createdAt.seconds * 1000
                              ).toLocaleString();
                            } else if (createdAt instanceof Date) {
                              return createdAt.toLocaleString();
                            }
                            return "Date inconnue";
                          })()}
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="p-4 text-sm text-gray-500">
                      Aucune notification
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Profile Menu */}
          <div className="relative">
            <button
              onClick={() => setProfileMenuOpen(!profileMenuOpen)}
              className="flex items-center space-x-2 p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              {currentUser?.profileImage ? (
                <img
                  src={currentUser.profileImage}
                  alt={currentUser.name}
                  className="w-8 h-8 rounded-full object-cover"
                />
              ) : (
                <User className="h-6 w-6 text-gray-600" />
              )}
              <span className="text-gray-700">{currentUser?.name}</span>
            </button>

            {profileMenuOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg py-1 z-50">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center px-4 py-2 text-gray-700 hover:bg-gray-100"
                >
                  <LogOut className="h-5 w-5 mr-2" />
                  {language === "fr" ? "Se déconnecter" : "Logout"}
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-30 w-64 bg-white transform transition-transform duration-200 ease-in-out shadow-lg ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <AdminSidebar />
      </div>

      {/* Main Content */}
      <div className="pt-16">
        <main
          className={`transition-all duration-200 ease-in-out ${
            sidebarOpen ? "ml-64" : "ml-0"
          }`}
        >
          {children}
        </main>
      </div>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-20 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Debug component */}
    </div>
  );
};

export default AdminLayout;
