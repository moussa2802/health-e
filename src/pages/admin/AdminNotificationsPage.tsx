import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Bell } from "lucide-react";
import AdminNotificationsList from "../../components/admin/AdminNotificationsList";

const AdminNotificationsPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link
            to="/admin/dashboard"
            className="p-2 rounded-lg bg-white shadow-sm hover:shadow-md transition-shadow"
          >
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Bell className="h-8 w-8 text-blue-600" />
              Centre de notifications
            </h1>
            <p className="text-gray-600">
              Gérez toutes les notifications de la plateforme
            </p>
          </div>
        </div>

        {/* Liste des notifications */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <AdminNotificationsList />
        </div>
      </div>
    </div>
  );
};

export default AdminNotificationsPage;
