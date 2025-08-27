import React, { useState } from "react";
import { Menu, User, LogOut } from "lucide-react";
import { useLocation } from "react-router-dom";
import AdminSidebar from "./AdminSidebar";
import { useAuth } from "../../contexts/AuthContext";
import { useLanguage } from "../../contexts/LanguageContext";
import NotificationCenter from "../notifications/NotificationCenter";

interface AdminLayoutProps {
  children: React.ReactNode;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const { currentUser, logout } = useAuth();
  const { language } = useLanguage();
  const location = useLocation();

  const handleLogout = () => {
    logout();
  };

  // Fonction pour obtenir le titre de la page basé sur l'URL
  const getPageTitle = () => {
    const path = location.pathname;

    if (path.includes("/admin/dashboard")) {
      return language === "fr" ? "Tableau de bord" : "Dashboard";
    } else if (path.includes("/admin/users")) {
      return language === "fr" ? "Utilisateurs" : "Users";
    } else if (path.includes("/admin/professionals")) {
      return language === "fr" ? "Professionnels" : "Professionals";
    } else if (path.includes("/admin/patients")) {
      return language === "fr" ? "Patients" : "Patients";
    } else if (path.includes("/admin/appointments")) {
      return language === "fr" ? "Consultations" : "Appointments";
    } else if (path.includes("/admin/statistics")) {
      return language === "fr" ? "Statistiques" : "Statistics";
    } else if (path.includes("/admin/content")) {
      return language === "fr" ? "Contenu" : "Content";
    } else if (path.includes("/admin/messages")) {
      return language === "fr" ? "Messagerie" : "Messages";
    } else if (path.includes("/admin/support")) {
      return language === "fr" ? "Support" : "Support";
    } else {
      return language === "fr" ? "Administration" : "Administration";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Admin harmonisé avec le sidebar */}
      <header className="fixed top-0 left-0 right-0 h-16 bg-white shadow-sm z-40 flex items-center justify-between px-4">
        {/* Gauche : Menu + Titre */}
        <div className="flex items-center">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 mr-4 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Ouvrir/fermer le menu"
          >
            <Menu className="h-6 w-6 text-gray-600" />
          </button>

          <div className="flex items-center">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center mr-3">
              <span className="text-white font-bold text-sm">H</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                {language === "fr" ? "Health-e Admin" : "Health-e Admin"}
              </h1>
              <p className="text-xs text-gray-500">
                {language === "fr" ? "Administration" : "Administration"}
              </p>
            </div>
          </div>
        </div>

        {/* Droite : Notifications + Profil */}
        <div className="flex items-center space-x-4">
          {/* Notifications */}
          <NotificationCenter />

          {/* Profil */}
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
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                  <User className="h-5 w-5 text-white" />
                </div>
              )}
              <span className="text-gray-700 font-medium">
                {currentUser?.name || "Admin"}
              </span>
            </button>

            {profileMenuOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg py-1 z-50 border border-gray-200">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center px-4 py-2 text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  {language === "fr" ? "Se déconnecter" : "Logout"}
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Sidebar */}
      <div
        className={`fixed top-12 left-0 h-[calc(100vh-3rem)] z-30 w-64 bg-white transform transition-transform duration-200 ease-in-out shadow-lg border-r border-gray-200 ${
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
          {/* Page Content */}
          <div className="p-6">
            {/* Page Header */}
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                {getPageTitle()}
              </h2>
            </div>
            {children}
          </div>
        </main>
      </div>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-20 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
};

export default AdminLayout;
