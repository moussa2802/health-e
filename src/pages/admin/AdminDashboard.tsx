/**
 * Tableau de bord de l'administration — il montre le suivi des évaluations (tests, alertes, Koris).
 * L'ancien onglet « Téléconsultation » a été retiré avec les pages de téléconsultation (29 oct. 2026).
 */
import React from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import EvaluationsDashboardContent from './EvaluationsDashboardContent';

const AdminDashboard: React.FC = () => (
  <AdminLayout>
    <EvaluationsDashboardContent />
  </AdminLayout>
);

export default AdminDashboard;
