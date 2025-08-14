import React from 'react';
import AdminLayout from '../../components/admin/AdminLayout';

const AdminSupport: React.FC = () => {
  return (
    <AdminLayout>
      <div>
        <p className="text-gray-600 mb-6">Cette section permet de suivre les demandes d'assistance des utilisateurs et d'intervenir en cas de problème signalé.</p>
      </div>
    </AdminLayout>
  );
};

export default AdminSupport;