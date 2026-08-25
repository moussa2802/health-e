import { useState, useEffect } from "react";
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
  subscribeToAdminStatistics,
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

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const [statsData, transactionsData] = await Promise.all([
          getStatistics(),
          getRecentTransactions(5),
        ]);

        setStatistics(statsData);
        setRecentTransactions(transactionsData as Transaction[]);
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

    // S'abonner aux mises à jour en temps réel
    const unsubscribe = subscribeToAdminStatistics((stats) => {
      setStatistics(stats);
    });

    return () => {
      unsubscribe();
    };
  }, [currentUser?.id]);

  if (loading) {
    return (
      <AdminLayout>
        <div className="p-8">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent"></div>
            <span className="ml-4 text-lg text-ink-soft">
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
          <div className="bg-danger/10 border border-danger text-danger px-4 py-3 rounded-card relative">
            <strong className="font-semibold">Erreur : </strong>
            <span className="block sm:inline">{error}</span>
            <button
              onClick={() => window.location.reload()}
              className="mt-2 bg-danger text-white px-4 py-2 rounded-card hover:bg-danger/90"
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
          <div className="text-center text-muted">
            Aucune donnée disponible
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div>
        <div className="mb-6">
          <div className="text-sm text-muted">
            Données en temps réel depuis Firebase
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Revenue */}
          <div className="bg-card rounded-block p-6 shadow-soft">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-ink-soft">
                Revenus totaux
              </h3>
              <DollarSign className="h-6 w-6 text-ok" />
            </div>
            <div className="space-y-4">
              <div>
                <p className="font-display text-3xl font-semibold text-ink">
                  {statistics.revenue.total.toLocaleString()} XOF
                </p>
                <p className="text-sm text-muted">
                  Toutes consultations confondues
                </p>
              </div>
              <div className="flex justify-between text-sm">
                <div>
                  <p className="font-medium text-ink">
                    {statistics.revenue.mentalHealth.toLocaleString()} XOF
                  </p>
                  <p className="text-muted">Profil psychologique</p>
                </div>
                <div>
                  <p className="font-medium text-ink">
                    {statistics.revenue.sexualHealth.toLocaleString()} XOF
                  </p>
                  <p className="text-muted">Vie intime</p>
                </div>
              </div>
            </div>
          </div>

          {/* Platform Fees */}
          <div className="bg-card rounded-block p-6 shadow-soft">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-ink-soft">
                Commissions plateforme
              </h3>
              <Percent className="h-6 w-6 text-sage" />
            </div>
            <div className="space-y-4">
              <div>
                <p className="font-display text-3xl font-semibold text-ink">
                  {statistics.revenue.platformFees.toLocaleString()} XOF
                </p>
                <p className="text-sm text-muted">Total des commissions</p>
              </div>
              <div className="flex justify-between text-sm">
                <div>
                  <p className="font-medium text-ink">15%</p>
                  <p className="text-muted">Taux de commission</p>
                </div>
                <div>
                  <p className="font-medium text-ink">
                    {statistics.appointments.completed > 0
                      ? Math.round(
                          statistics.revenue.platformFees /
                            statistics.appointments.completed
                        ).toLocaleString()
                      : "0"}{" "}
                    XOF
                  </p>
                  <p className="text-muted">Moyenne/consultation</p>
                </div>
              </div>
            </div>
          </div>

          {/* Consultations Stats */}
          <div className="bg-card rounded-block p-6 shadow-soft">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-ink-soft">
                Consultations
              </h3>
              <Calendar className="h-6 w-6 text-accent" />
            </div>
            <div className="space-y-4">
              <div>
                <p className="font-display text-3xl font-semibold text-ink">
                  {statistics.appointments.total}
                </p>
                <p className="text-sm text-muted">Total des consultations</p>
              </div>
              <div className="flex justify-between text-sm">
                <div>
                  <p className="font-medium text-ink">
                    {statistics.appointments.completionRate}%
                  </p>
                  <p className="text-muted">Taux de réussite</p>
                </div>
                <div>
                  <p className="font-medium text-ink">
                    {statistics.appointments.total > 0
                      ? Math.round(
                          (statistics.appointments.cancelled /
                            statistics.appointments.total) *
                            100
                        )
                      : 0}
                    %
                  </p>
                  <p className="text-muted">Annulations</p>
                </div>
              </div>
            </div>
          </div>

          {/* Users Stats */}
          <div className="bg-card rounded-block p-6 shadow-soft">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-ink-soft">
                Utilisateurs
              </h3>
              <Users className="h-6 w-6 text-gold" />
            </div>
            <div className="space-y-4">
              <div className="flex items-center">
                <p className="font-display text-3xl font-semibold text-ink">
                  {statistics.users.total}
                </p>
                {statistics.growth.monthly > 0 ? (
                  <ArrowUpRight className="h-5 w-5 text-ok ml-2" />
                ) : (
                  <ArrowDownRight className="h-5 w-5 text-danger ml-2" />
                )}
              </div>
              <p className="text-sm text-muted">Total des utilisateurs</p>
              <div className="flex justify-between text-sm">
                <div>
                  <p className="font-medium text-ink">
                    {statistics.users.patients}
                  </p>
                  <p className="text-muted">Patients</p>
                </div>
                <div>
                  <p className="font-medium text-ink">
                    {statistics.users.professionals}
                  </p>
                  <p className="text-muted">Professionnels</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="bg-card rounded-block shadow-soft p-6 mb-8">
          <h2 className="font-display text-xl font-semibold text-ink mb-6">
            Transactions récentes
          </h2>
          {recentTransactions.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left border-b border-line">
                    <th className="pb-3 font-semibold text-ink-soft">
                      Patient
                    </th>
                    <th className="pb-3 font-semibold text-ink-soft">
                      Professionnel
                    </th>
                    <th className="pb-3 font-semibold text-ink-soft">
                      Montant
                    </th>
                    <th className="pb-3 font-semibold text-ink-soft">
                      Commission
                    </th>
                    <th className="pb-3 font-semibold text-ink-soft">Type</th>
                    <th className="pb-3 font-semibold text-ink-soft">Date</th>
                    <th className="pb-3 font-semibold text-ink-soft">
                      Statut
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {recentTransactions.map((transaction) => (
                    <tr key={transaction.id} className="text-ink">
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
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-pill text-xs font-medium ${
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
                      <td className="py-3">{transaction.date}</td>
                      <td className="py-3">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-pill text-xs font-medium ${
                            transaction.status === "completed"
                              ? "bg-ok/15 text-ok"
                              : transaction.status === "pending"
                              ? "bg-gold-soft text-gold"
                              : "bg-paper text-ink-soft"
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
            <div className="text-center text-muted py-8">
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
          <div className="bg-card rounded-block shadow-soft p-6">
            <h2 className="font-display text-xl font-semibold text-ink mb-6">
              Distribution des revenus
            </h2>
            <div className="relative pt-1">
              <div className="flex mb-2 items-center justify-between">
                <div>
                  <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-pill text-sage bg-sage-soft">
                    Profil psychologique
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-semibold inline-block text-sage">
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
              <div className="overflow-hidden h-2 mb-4 text-xs flex rounded-pill bg-sage-soft">
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
                  className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-sage"
                ></div>
              </div>
              <div className="flex mb-2 items-center justify-between">
                <div>
                  <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-pill text-accent bg-accent-soft">
                    Vie intime
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-semibold inline-block text-accent">
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
              <div className="overflow-hidden h-2 mb-4 text-xs flex rounded-pill bg-accent-soft">
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
                  className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-accent"
                ></div>
              </div>
            </div>
          </div>

          <div className="bg-card rounded-block shadow-soft p-6">
            <h2 className="font-display text-xl font-semibold text-ink mb-6">
              Répartition des professionnels
            </h2>
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-12 h-12 rounded-card bg-sage-soft flex items-center justify-center mr-4">
                    <Users className="h-6 w-6 text-sage" />
                  </div>
                  <div>
                    <p className="font-medium text-ink">
                      Profil psychologique
                    </p>
                    <p className="text-sm text-muted">
                      Psychologues, Psychiatres
                    </p>
                  </div>
                </div>
                <p className="font-display text-xl font-semibold text-ink">
                  {statistics.services.mentalHealthProfessionals}
                </p>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-12 h-12 rounded-card bg-accent-soft flex items-center justify-center mr-4">
                    <Users className="h-6 w-6 text-accent" />
                  </div>
                  <div>
                    <p className="font-medium text-ink">Vie intime</p>
                    <p className="text-sm text-muted">
                      Sexologues, Gynécologues, Urologues
                    </p>
                  </div>
                </div>
                <p className="font-display text-xl font-semibold text-ink">
                  {statistics.services.sexualHealthProfessionals}
                </p>
              </div>

              <div className="pt-4 border-t border-line">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-12 h-12 rounded-card bg-ok/10 flex items-center justify-center mr-4">
                      <TrendingUp className="h-6 w-6 text-ok" />
                    </div>
                    <div>
                      <p className="font-medium text-ink">Note moyenne</p>
                      <p className="text-sm text-muted">
                        Satisfaction globale
                      </p>
                    </div>
                  </div>
                  <p className="font-display text-xl font-semibold text-ink">
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
