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
        <div className="text-center text-danger p-8">
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
        <div className="text-center text-muted p-8">
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
              className="border border-line rounded-card p-2"
            >
              <option value="week">Cette semaine</option>
              <option value="month">Ce mois</option>
              <option value="quarter">Ce trimestre</option>
              <option value="year">Cette année</option>
            </select>
            <button
              onClick={handleExport}
              className="flex items-center px-4 py-2 bg-accent text-white rounded-card hover:bg-accent/90"
            >
              <Download className="w-4 h-4 mr-2" />
              Exporter
            </button>
          </div>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-card rounded-block shadow-soft p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-ink-soft">
                Utilisateurs
              </h3>
              <Users className="h-6 w-6 text-gold" />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-ink-soft">Total</span>
                <span className="font-display text-2xl font-semibold text-ink">
                  {statistics.users.total}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-ink-soft">Patients</span>
                <span className="font-display text-2xl font-semibold text-ink">
                  {statistics.users.patients}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-ink-soft">Professionnels</span>
                <span className="font-display text-2xl font-semibold text-ink">
                  {statistics.users.professionals}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-card rounded-block shadow-soft p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-ink-soft">
                Consultations
              </h3>
              <Calendar className="h-6 w-6 text-accent" />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-ink-soft">Total</span>
                <span className="font-display text-2xl font-semibold text-ink">
                  {statistics.appointments.total}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-ink-soft">Complétées</span>
                <span className="font-display text-2xl font-semibold text-ink">
                  {statistics.appointments.completed}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-ink-soft">Taux de réussite</span>
                <span className="font-display text-2xl font-semibold text-ink">
                  {statistics.appointments.completionRate}%
                </span>
              </div>
            </div>
          </div>

          <div className="bg-card rounded-block shadow-soft p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-ink-soft">Revenus</h3>
              <TrendingUp className="h-6 w-6 text-ok" />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-ink-soft">Total</span>
                <span className="font-display text-2xl font-semibold text-ink">
                  {statistics.revenue.total.toLocaleString()} XOF
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-ink-soft">Commissions</span>
                <span className="font-display text-2xl font-semibold text-ink">
                  {statistics.revenue.platformFees.toLocaleString()} XOF
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-ink-soft">Croissance</span>
                <span
                  className={`font-display text-2xl font-semibold flex items-center ${
                    statistics.growth.monthly >= 0
                      ? "text-ok"
                      : "text-danger"
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

          <div className="bg-card rounded-block shadow-soft p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-ink-soft">
                Satisfaction
              </h3>
              <Activity className="h-6 w-6 text-sage" />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-ink-soft">Note moyenne</span>
                <span className="font-display text-2xl font-semibold text-ink">
                  {statistics.growth.averageRating}/5
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-ink-soft">Taux de satisfaction</span>
                <span className="font-display text-2xl font-semibold text-ink">
                  {statistics.growth.satisfactionRate}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Répartition par type de service */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-card rounded-block shadow-soft p-6">
            <h3 className="text-lg font-semibold text-ink-soft mb-4">
              Répartition des revenus
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-ink-soft">Profil psychologique</span>
                <span className="font-semibold text-ink">
                  {statistics.revenue.mentalHealth.toLocaleString()} XOF
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-ink-soft">Vie intime</span>
                <span className="font-semibold text-ink">
                  {statistics.revenue.sexualHealth.toLocaleString()} XOF
                </span>
              </div>
              <div className="pt-2 border-t border-line">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-ink">Total</span>
                  <span className="font-display font-bold text-lg text-ink">
                    {statistics.revenue.total.toLocaleString()} XOF
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-card rounded-block shadow-soft p-6">
            <h3 className="text-lg font-semibold text-ink-soft mb-4">
              Statut des consultations
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-ink-soft">À venir</span>
                <span className="font-semibold text-ink">
                  {statistics.appointments.upcoming}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-ink-soft">Annulées</span>
                <span className="font-semibold text-ink">
                  {statistics.appointments.cancelled}
                </span>
              </div>
              <div className="pt-2 border-t border-line">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-ink">
                    Taux de réussite
                  </span>
                  <span className="font-display font-bold text-lg text-ok">
                    {statistics.appointments.completionRate}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Transactions récentes */}
        <div className="bg-card rounded-block shadow-soft p-6">
          <h3 className="text-lg font-semibold text-ink-soft mb-4">
            Transactions récentes
          </h3>
          {recentTransactions.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-line">
                <thead className="bg-paper">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">
                      Patient
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">
                      Professionnel
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">
                      Montant
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">
                      Commission
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-card divide-y divide-line">
                  {recentTransactions.map((transaction) => (
                    <tr key={transaction.id} className="hover:bg-paper">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-ink">
                        {transaction.patient}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-muted">
                        {transaction.professional}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-ink">
                        {transaction.amount.toLocaleString()} XOF
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-muted">
                        {transaction.platformFee.toLocaleString()} XOF
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded-pill ${
                            transaction.type === "mental"
                              ? "bg-sage-soft text-sage"
                              : "bg-accent-soft text-accent"
                          }`}
                        >
                          {transaction.type === "mental"
                            ? "Profil psychologique"
                            : "Vie intime"}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-muted">
                        {transaction.date}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center text-muted py-8">
              Aucune transaction récente
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminStatistics;
