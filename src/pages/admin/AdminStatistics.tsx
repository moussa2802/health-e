import React, { useState, useEffect } from "react";
import {
  Calendar,
  Users,
  Clock,
  Activity,
  Download,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import AdminLayout from "../../components/admin/AdminLayout";
import {
  getStatistics,
  getRecentTransactions,
  subscribeToAdminStatistics,
} from "../../services/firebaseService";
import LoadingSpinner from "../../components/ui/LoadingSpinner";

interface StatisticsFilters {
  dateRange: string;
  type: string;
}

interface RealStatistics {
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
}

const AdminStatistics: React.FC = () => {
  const [filters, setFilters] = useState<StatisticsFilters>({
    dateRange: "month",
    type: "all",
  });
  const [statistics, setStatistics] = useState<RealStatistics | null>(null);
  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Charger les vraies données au montage du composant
  useEffect(() => {
    const loadStatistics = async () => {
      try {
        setLoading(true);
        setError(null);

        const [statsData, transactionsData] = await Promise.all([
          getStatistics(),
          getRecentTransactions(10),
        ]);

        setStatistics(statsData);
        setRecentTransactions(transactionsData);
      } catch (err) {
        console.error("Erreur lors du chargement des statistiques:", err);
        setError(
          err instanceof Error
            ? err.message
            : "Erreur lors du chargement des données"
        );
      } finally {
        setLoading(false);
      }
    };

    loadStatistics();

    // S'abonner aux mises à jour en temps réel
    const unsubscribe = subscribeToAdminStatistics((stats) => {
      setStatistics(stats);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const handleExport = () => {
    // Implementation for exporting statistics
    console.log("Exporting statistics...");
  };

  // Afficher le loader pendant le chargement
  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner size="lg" />
        </div>
      </AdminLayout>
    );
  }

  // Afficher l'erreur si problème
  if (error) {
    return (
      <AdminLayout>
        <div className="text-center text-red-600 p-8">
          <p className="text-lg font-semibold">Erreur de chargement</p>
          <p className="text-sm">{error}</p>
        </div>
      </AdminLayout>
    );
  }

  // Afficher un message si pas de données
  if (!statistics) {
    return (
      <AdminLayout>
        <div className="text-center text-gray-500 p-8">
          <p>Aucune donnée statistique disponible</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <div className="flex gap-4">
            <select
              value={filters.dateRange}
              onChange={(e) =>
                setFilters({ ...filters, dateRange: e.target.value })
              }
              className="border border-gray-300 rounded-md p-2"
            >
              <option value="week">Cette semaine</option>
              <option value="month">Ce mois</option>
              <option value="quarter">Ce trimestre</option>
              <option value="year">Cette année</option>
            </select>
            <button
              onClick={handleExport}
              className="flex items-center px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
            >
              <Download className="w-4 h-4 mr-2" />
              Exporter
            </button>
          </div>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-700">
                Utilisateurs
              </h3>
              <Users className="h-6 w-6 text-blue-500" />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Total</span>
                <span className="text-2xl font-bold">
                  {statistics.users.total}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Patients</span>
                <span className="text-2xl font-bold">
                  {statistics.users.patients}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Professionnels</span>
                <span className="text-2xl font-bold">
                  {statistics.users.professionals}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-700">
                Consultations
              </h3>
              <Calendar className="h-6 w-6 text-blue-500" />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Total</span>
                <span className="text-2xl font-bold">
                  {statistics.appointments.total}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Complétées</span>
                <span className="text-2xl font-bold">
                  {statistics.appointments.completed}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Taux de réussite</span>
                <span className="text-2xl font-bold">
                  {statistics.appointments.completionRate}%
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-700">Revenus</h3>
              <TrendingUp className="h-6 w-6 text-green-500" />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Total</span>
                <span className="text-2xl font-bold">
                  {statistics.revenue.total.toLocaleString()} XOF
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Commissions</span>
                <span className="text-2xl font-bold">
                  {statistics.revenue.platformFees.toLocaleString()} XOF
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Croissance</span>
                <span
                  className={`text-2xl font-bold flex items-center ${
                    statistics.growth.monthly >= 0
                      ? "text-green-600"
                      : "text-red-600"
                  }`}
                >
                  {statistics.growth.monthly >= 0 ? (
                    <TrendingUp className="h-4 w-4 mr-1" />
                  ) : (
                    <TrendingDown className="h-4 w-4 mr-1" />
                  )}
                  {Math.abs(statistics.growth.monthly)}%
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-700">
                Satisfaction
              </h3>
              <Activity className="h-6 w-6 text-purple-500" />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Note moyenne</span>
                <span className="text-2xl font-bold">
                  {statistics.growth.averageRating}/5
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Taux de satisfaction</span>
                <span className="text-2xl font-bold">
                  {statistics.growth.satisfactionRate}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Répartition par type de service */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-700 mb-4">
              Répartition des revenus
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Santé mentale</span>
                <span className="font-semibold">
                  {statistics.revenue.mentalHealth.toLocaleString()} XOF
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Santé sexuelle</span>
                <span className="font-semibold">
                  {statistics.revenue.sexualHealth.toLocaleString()} XOF
                </span>
              </div>
              <div className="pt-2 border-t">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-gray-800">Total</span>
                  <span className="font-bold text-lg">
                    {statistics.revenue.total.toLocaleString()} XOF
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-700 mb-4">
              Statut des consultations
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">À venir</span>
                <span className="font-semibold">
                  {statistics.appointments.upcoming}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Annulées</span>
                <span className="font-semibold">
                  {statistics.appointments.cancelled}
                </span>
              </div>
              <div className="pt-2 border-t">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-gray-800">
                    Taux de réussite
                  </span>
                  <span className="font-bold text-lg text-green-600">
                    {statistics.appointments.completionRate}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Transactions récentes */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-700 mb-4">
            Transactions récentes
          </h3>
          {recentTransactions.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Patient
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Professionnel
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Montant
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Commission
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {recentTransactions.map((transaction) => (
                    <tr key={transaction.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {transaction.patient}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {transaction.professional}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {transaction.amount.toLocaleString()} XOF
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {transaction.platformFee.toLocaleString()} XOF
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded-full ${
                            transaction.type === "mental"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-purple-100 text-purple-800"
                          }`}
                        >
                          {transaction.type === "mental"
                            ? "Santé mentale"
                            : "Santé sexuelle"}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {transaction.date}
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
      </div>
    </AdminLayout>
  );
};

export default AdminStatistics;
