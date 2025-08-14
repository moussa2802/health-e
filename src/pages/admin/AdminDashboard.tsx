import React, { useState, useEffect } from "react";
import {
  Users,
  Calendar,
  TrendingUp,
  DollarSign,
  Percent,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import AdminLayout from "../../components/admin/AdminLayout";
import {
  getStatistics,
  getRecentTransactions,
  getAdminNotifications,
} from "../../services/firebaseService";
import { useAuth } from "../../contexts/AuthContext";

interface Statistics {
  users: {
    total: number;
    patients: number;
    professionals: number;
  };
  appointments: {
    total: number;
    completed: number;
    upcoming: number;
    cancelled: number;
    completionRate: number;
  };
  revenue: {
    total: number;
    platformFees: number;
    available: number;
    pending: number;
    mentalHealth: number;
    sexualHealth: number;
  };
  growth: {
    monthly: number;
    averageRating: number;
    satisfactionRate: number;
  };
  services: {
    mentalHealthProfessionals: number;
    sexualHealthProfessionals: number;
  };
}

interface Transaction {
  id: string;
  patient: string;
  professional: string;
  amount: number;
  platformFee: number;
  type: "mental" | "sexual";
  date: string;
  status: string;
}

const AdminDashboard = () => {
  const { currentUser } = useAuth();
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<
    Array<{ id: string; message: string; timestamp: any }>
  >([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const [statsData, transactionsData, adminNotifications] =
          await Promise.all([
            getStatistics(),
            getRecentTransactions(5),
            getAdminNotifications(
              currentUser?.id || "FYostm61DLbrax729IYT6OBHSuA"
            ), // Utilise l'ID de l'admin connecté
          ]);

        setStatistics(statsData);
        setRecentTransactions(transactionsData);
        setNotifications(adminNotifications as any);
      } catch (err) {
        console.error("Error fetching dashboard data:", err);
        setError(
          err instanceof Error
            ? err.message
            : "Erreur lors du chargement des données"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [currentUser?.id]);

  if (loading) {
    return (
      <AdminLayout>
        <div className="p-8">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            <span className="ml-4 text-lg text-gray-600">
              Chargement des données...
            </span>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout>
        <div className="p-8">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
            <strong className="font-bold">Erreur : </strong>
            <span className="block sm:inline">{error}</span>
            <button
              onClick={() => window.location.reload()}
              className="mt-2 bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
            >
              Réessayer
            </button>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (!statistics) {
    return (
      <AdminLayout>
        <div className="p-8">
          <div className="text-center text-gray-500">
            Aucune donnée disponible
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div>
        <div className="flex justify-end mb-6">
          <div className="text-sm text-gray-500">
            Données en temps réel depuis Firebase
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Revenue */}
          <div className="bg-white rounded-lg p-6 shadow-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-700">
                Revenus totaux
              </h3>
              <DollarSign className="h-6 w-6 text-green-500" />
            </div>
            <div className="space-y-4">
              <div>
                <p className="text-3xl font-bold text-gray-900">
                  {statistics.revenue.total.toLocaleString()} XOF
                </p>
                <p className="text-sm text-gray-500">
                  Toutes consultations confondues
                </p>
              </div>
              <div className="flex justify-between text-sm">
                <div>
                  <p className="font-medium">
                    {statistics.revenue.mentalHealth.toLocaleString()} XOF
                  </p>
                  <p className="text-gray-500">Santé mentale</p>
                </div>
                <div>
                  <p className="font-medium">
                    {statistics.revenue.sexualHealth.toLocaleString()} XOF
                  </p>
                  <p className="text-gray-500">Santé sexuelle</p>
                </div>
              </div>
            </div>
          </div>

          {/* Platform Fees */}
          <div className="bg-white rounded-lg p-6 shadow-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-700">
                Commissions plateforme
              </h3>
              <Percent className="h-6 w-6 text-blue-500" />
            </div>
            <div className="space-y-4">
              <div>
                <p className="text-3xl font-bold text-gray-900">
                  {statistics.revenue.platformFees.toLocaleString()} XOF
                </p>
                <p className="text-sm text-gray-500">Total des commissions</p>
              </div>
              <div className="flex justify-between text-sm">
                <div>
                  <p className="font-medium">15%</p>
                  <p className="text-gray-500">Taux de commission</p>
                </div>
                <div>
                  <p className="font-medium">
                    {statistics.appointments.completed > 0
                      ? Math.round(
                          statistics.revenue.platformFees /
                            statistics.appointments.completed
                        ).toLocaleString()
                      : "0"}{" "}
                    XOF
                  </p>
                  <p className="text-gray-500">Moyenne/consultation</p>
                </div>
              </div>
            </div>
          </div>

          {/* Consultations Stats */}
          <div className="bg-white rounded-lg p-6 shadow-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-700">
                Consultations
              </h3>
              <Calendar className="h-6 w-6 text-purple-500" />
            </div>
            <div className="space-y-4">
              <div>
                <p className="text-3xl font-bold text-gray-900">
                  {statistics.appointments.total}
                </p>
                <p className="text-sm text-gray-500">Total des consultations</p>
              </div>
              <div className="flex justify-between text-sm">
                <div>
                  <p className="font-medium">
                    {statistics.appointments.completionRate}%
                  </p>
                  <p className="text-gray-500">Taux de réussite</p>
                </div>
                <div>
                  <p className="font-medium">
                    {statistics.appointments.total > 0
                      ? Math.round(
                          (statistics.appointments.cancelled /
                            statistics.appointments.total) *
                            100
                        )
                      : 0}
                    %
                  </p>
                  <p className="text-gray-500">Annulations</p>
                </div>
              </div>
            </div>
          </div>

          {/* Users Stats */}
          <div className="bg-white rounded-lg p-6 shadow-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-700">
                Utilisateurs
              </h3>
              <Users className="h-6 w-6 text-emerald-500" />
            </div>
            <div className="space-y-4">
              <div className="flex items-center">
                <p className="text-3xl font-bold text-gray-900">
                  {statistics.users.total}
                </p>
                {statistics.growth.monthly > 0 ? (
                  <ArrowUpRight className="h-5 w-5 text-green-500 ml-2" />
                ) : (
                  <ArrowDownRight className="h-5 w-5 text-red-500 ml-2" />
                )}
              </div>
              <p className="text-sm text-gray-500">Total des utilisateurs</p>
              <div className="flex justify-between text-sm">
                <div>
                  <p className="font-medium">{statistics.users.patients}</p>
                  <p className="text-gray-500">Patients</p>
                </div>
                <div>
                  <p className="font-medium">
                    {statistics.users.professionals}
                  </p>
                  <p className="text-gray-500">Professionnels</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold mb-6">Transactions récentes</h2>
          {recentTransactions.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left border-b border-gray-200">
                    <th className="pb-3 font-semibold text-gray-600">
                      Patient
                    </th>
                    <th className="pb-3 font-semibold text-gray-600">
                      Professionnel
                    </th>
                    <th className="pb-3 font-semibold text-gray-600">
                      Montant
                    </th>
                    <th className="pb-3 font-semibold text-gray-600">
                      Commission
                    </th>
                    <th className="pb-3 font-semibold text-gray-600">Type</th>
                    <th className="pb-3 font-semibold text-gray-600">Date</th>
                    <th className="pb-3 font-semibold text-gray-600">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {recentTransactions.map((transaction) => (
                    <tr key={transaction.id} className="text-gray-800">
                      <td className="py-3">{transaction.patient}</td>
                      <td className="py-3">{transaction.professional}</td>
                      <td className="py-3">
                        {transaction.amount.toLocaleString()} XOF
                      </td>
                      <td className="py-3">
                        {transaction.platformFee.toLocaleString()} XOF
                      </td>
                      <td className="py-3">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            transaction.type === "mental"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-pink-100 text-pink-800"
                          }`}
                        >
                          {transaction.type === "mental"
                            ? "Santé mentale"
                            : "Santé sexuelle"}
                        </span>
                      </td>
                      <td className="py-3">{transaction.date}</td>
                      <td className="py-3">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            transaction.status === "completed"
                              ? "bg-green-100 text-green-800"
                              : transaction.status === "pending"
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {transaction.status === "completed"
                            ? "Terminé"
                            : transaction.status === "pending"
                            ? "En attente"
                            : "Disponible"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center text-gray-500 py-8">
              Aucune transaction récente
            </div>
          )}
        </div>
        {/* 🔒 Notifications administrateur masquées temporairement
<div className="bg-white rounded-lg shadow-md p-6 mb-8">
  <h2 className="text-xl font-semibold mb-6">🔔 Notifications</h2>
  {adminNotif.length > 0 ? (
    <ul className="space-y-3">
      {adminNotif.map((notif) => (
        <li key={notif.id} className="flex justify-between items-start border-b pb-2">
          <div>
            <p className="font-medium">{notif.title || '🔔 Nouvelle notification'}</p>
            <p className="text-gray-500 text-sm">{notif.message || notif.content || '—'}</p>
          </div>
          <span className="text-xs text-gray-400">
            {notif.createdAt?.toDate
              ? notif.createdAt.toDate().toLocaleString()
              : '—'}
          </span>
        </li>
      ))}
    </ul>
  ) : (
    <p className="text-gray-500">Aucune notification récente</p>
  )}
</div>
*/}

        {/* Revenue Distribution Chart */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-6">
              Distribution des revenus
            </h2>
            <div className="relative pt-1">
              <div className="flex mb-2 items-center justify-between">
                <div>
                  <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-blue-600 bg-blue-200">
                    Santé mentale
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-semibold inline-block text-blue-600">
                    {statistics.revenue.total > 0
                      ? Math.round(
                          (statistics.revenue.mentalHealth /
                            statistics.revenue.total) *
                            100
                        )
                      : 0}
                    %
                  </span>
                </div>
              </div>
              <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-blue-200">
                <div
                  style={{
                    width: `${
                      statistics.revenue.total > 0
                        ? (statistics.revenue.mentalHealth /
                            statistics.revenue.total) *
                          100
                        : 0
                    }%`,
                  }}
                  className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-500"
                ></div>
              </div>
              <div className="flex mb-2 items-center justify-between">
                <div>
                  <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-pink-600 bg-pink-200">
                    Santé sexuelle
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-semibold inline-block text-pink-600">
                    {statistics.revenue.total > 0
                      ? Math.round(
                          (statistics.revenue.sexualHealth /
                            statistics.revenue.total) *
                            100
                        )
                      : 0}
                    %
                  </span>
                </div>
              </div>
              <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-pink-200">
                <div
                  style={{
                    width: `${
                      statistics.revenue.total > 0
                        ? (statistics.revenue.sexualHealth /
                            statistics.revenue.total) *
                          100
                        : 0
                    }%`,
                  }}
                  className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-pink-500"
                ></div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-6">
              Répartition des professionnels
            </h2>
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center mr-4">
                    <Users className="h-6 w-6 text-blue-500" />
                  </div>
                  <div>
                    <p className="font-medium">Santé mentale</p>
                    <p className="text-sm text-gray-500">
                      Psychologues, Psychiatres
                    </p>
                  </div>
                </div>
                <p className="text-xl font-bold">
                  {statistics.services.mentalHealthProfessionals}
                </p>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-12 h-12 rounded-lg bg-pink-100 flex items-center justify-center mr-4">
                    <Users className="h-6 w-6 text-pink-500" />
                  </div>
                  <div>
                    <p className="font-medium">Santé sexuelle</p>
                    <p className="text-sm text-gray-500">
                      Sexologues, Gynécologues, Urologues
                    </p>
                  </div>
                </div>
                <p className="text-xl font-bold">
                  {statistics.services.sexualHealthProfessionals}
                </p>
              </div>

              <div className="pt-4 border-t">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center mr-4">
                      <TrendingUp className="h-6 w-6 text-green-500" />
                    </div>
                    <div>
                      <p className="font-medium">Note moyenne</p>
                      <p className="text-sm text-gray-500">
                        Satisfaction globale
                      </p>
                    </div>
                  </div>
                  <p className="text-xl font-bold">
                    {statistics.growth.averageRating}/5
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;
