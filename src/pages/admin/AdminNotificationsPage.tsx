import React from "react";
import AdminLayout from "../../components/admin/AdminLayout";
import AdminNotificationsList from "../../components/admin/AdminNotificationsList";

const AdminNotificationsPage: React.FC = () => (
  <AdminLayout>
    <p className="text-[15px] text-ink-soft mb-5">
      Toutes les notifications de la plateforme.
    </p>
    <div className="bg-card rounded-block border border-line p-6">
      <AdminNotificationsList />
    </div>
  </AdminLayout>
);

export default AdminNotificationsPage;
