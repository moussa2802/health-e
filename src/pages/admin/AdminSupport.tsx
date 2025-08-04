import React from 'react';
import AdminLayout from '../../components/admin/AdminLayout';

const AdminSupport: React.FC = () => {
  return (
    <AdminLayout>
      <div className="p-6">
        <h1 className="text-2xl font-bold">Support et modération</h1>
        <p>Cette section permet de suivre les demandes d'assistance des utilisateurs et d'intervenir en cas de problème signalé.</p>
      </div>
    </AdminLayout>
  );
};

export default AdminSupport;