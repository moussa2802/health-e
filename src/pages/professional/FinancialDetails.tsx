import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  Wallet,
  Clock,
  TrendingUp,
  Download,
  Eye,
  EyeOff,
  Plus,
  Filter,
  Calendar,
  DollarSign,
  AlertCircle,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import { 
  getProfessionalRevenue, 
  getProfessionalTransactions,
  createWithdrawalRequest,
  type ProfessionalRevenue,
  type RevenueTransaction 
} from "../../services/revenueService";

interface Transaction {
  id: string;
  type: "consultation" | "withdrawal";
  amount: number;
  description: string;
  date: string;
  status: "completed" | "pending" | "failed";
  patientName?: string;
  consultationType?: string;
}

const FinancialDetails: React.FC = () => {
  const { currentUser } = useAuth();
  const [showBalance, setShowBalance] = useState(true);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<ProfessionalRevenue>({
    totalEarnings: 0,
    availableBalance: 0,
    pendingAmount: 0,
    totalWithdrawn: 0,
    platformFees: 0,
    netEarnings: 0,
    thisMonth: 0,
    lastMonth: 0,
  });
  const [transactions, setTransactions] = useState<RevenueTransaction[]>([]);
  const [filter, setFilter] = useState<"all" | "consultations" | "withdrawals">("all");
  const [showWithdrawalModal, setShowWithdrawalModal] = useState(false);
  const [withdrawalAmount, setWithdrawalAmount] = useState("");
  const [withdrawalMethod, setWithdrawalMethod] = useState<"wave" | "orange-money" | "bank-transfer">("wave");

  useEffect(() => {
    loadFinancialData();
  }, []);

  const loadFinancialData = async () => {
    try {
      setLoading(true);
      
      if (!currentUser?.id) {
        throw new Error("Utilisateur non connecté");
      }

      // Charger les vraies données depuis Firebase
      const [revenueData, transactionsData] = await Promise.all([
        getProfessionalRevenue(currentUser.id),
        getProfessionalTransactions(currentUser.id, 50)
      ]);

      setStats(revenueData);
      setTransactions(transactionsData);
    } catch (error) {
      console.error("Erreur lors du chargement des données financières:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleWithdrawal = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(withdrawalAmount);
    
    if (amount <= 0 || amount > stats.availableBalance) {
      alert("Montant invalide");
      return;
    }

    if (!currentUser?.id) {
      alert("Utilisateur non connecté");
      return;
    }

    try {
      // Créer la vraie demande de retrait
      const transactionId = await createWithdrawalRequest(
        currentUser.id,
        amount,
        withdrawalMethod
      );

      console.log("Demande de retrait créée:", transactionId);

      // Recharger les données pour avoir les vraies données mises à jour
      await loadFinancialData();

      setShowWithdrawalModal(false);
      setWithdrawalAmount("");
    } catch (error) {
      console.error("Erreur lors de la demande de retrait:", error);
      alert("Erreur lors de la demande de retrait");
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "pending":
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "failed":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const filteredTransactions = transactions.filter(transaction => {
    if (filter === "all") return true;
    return transaction.type === filter;
  }).map(transaction => ({
    id: transaction.id,
    type: transaction.type,
    amount: transaction.type === "consultation" ? transaction.professionalAmount : transaction.amount,
    description: transaction.description,
    date: transaction.createdAt.toDate().toISOString().split('T')[0],
    status: transaction.status,
    patientName: transaction.patientName,
    consultationType: transaction.consultationType,
  }));

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link
              to="/professional/dashboard"
              className="p-2 rounded-lg bg-white shadow-sm hover:shadow-md transition-shadow"
            >
              <ArrowLeft className="h-5 w-5 text-gray-600" />
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Détails financiers
              </h1>
              <p className="text-gray-600">
                Gérez vos revenus et vos retraits
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowBalance(!showBalance)}
            className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow"
          >
            {showBalance ? (
              <EyeOff className="h-4 w-4 text-gray-600" />
            ) : (
              <Eye className="h-4 w-4 text-gray-600" />
            )}
            {showBalance ? "Masquer" : "Afficher"}
          </button>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-600">
                Solde disponible
              </h3>
              <Wallet className="h-5 w-5 text-green-500" />
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {showBalance ? `${stats.availableBalance.toLocaleString()} FCFA` : "••••••"}
            </p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-600">
                En attente
              </h3>
              <Clock className="h-5 w-5 text-yellow-500" />
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {showBalance ? `${stats.pendingAmount.toLocaleString()} FCFA` : "••••••"}
            </p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-600">
                Total retiré
              </h3>
              <TrendingUp className="h-5 w-5 text-blue-500" />
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {showBalance ? `${stats.totalWithdrawn.toLocaleString()} FCFA` : "••••••"}
            </p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-600">
                Revenus nets
              </h3>
              <DollarSign className="h-5 w-5 text-purple-500" />
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {showBalance ? `${stats.netEarnings.toLocaleString()} FCFA` : "••••••"}
            </p>
          </div>
        </div>

        {/* Commission Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-8">
          <div className="flex items-center gap-3 mb-4">
            <AlertCircle className="h-5 w-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-blue-900">
              Commission de la plateforme
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-blue-700">Revenus totaux</p>
              <p className="text-lg font-semibold text-blue-900">
                {stats.totalEarnings.toLocaleString()} FCFA
              </p>
            </div>
            <div>
              <p className="text-sm text-blue-700">Commission (15%)</p>
              <p className="text-lg font-semibold text-blue-900">
                {stats.platformFees.toLocaleString()} FCFA
              </p>
            </div>
            <div>
              <p className="text-sm text-blue-700">Votre part (85%)</p>
              <p className="text-lg font-semibold text-blue-900">
                {stats.netEarnings.toLocaleString()} FCFA
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-bold text-gray-900">
              Historique des transactions
            </h2>
            <div className="flex gap-2">
              <button
                onClick={() => setFilter("all")}
                className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                  filter === "all"
                    ? "bg-blue-500 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                Tout
              </button>
              <button
                onClick={() => setFilter("consultations")}
                className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                  filter === "consultations"
                    ? "bg-blue-500 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                Consultations
              </button>
              <button
                onClick={() => setFilter("withdrawals")}
                className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                  filter === "withdrawals"
                    ? "bg-blue-500 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                Retraits
              </button>
            </div>
          </div>
          <button
            onClick={() => setShowWithdrawalModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Demander un retrait
          </button>
        </div>

        {/* Transactions List */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Transaction
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Montant
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Statut
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredTransactions.map((transaction) => (
                  <tr key={transaction.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {transaction.description}
                        </p>
                        {transaction.patientName && (
                          <p className="text-sm text-gray-500">
                            Patient: {transaction.patientName}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-gray-900">
                        {transaction.amount.toLocaleString()} FCFA
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-500">
                        {new Date(transaction.date).toLocaleDateString("fr-FR")}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(transaction.status)}
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(transaction.status)}`}>
                          {transaction.status === "completed" && "Terminé"}
                          {transaction.status === "pending" && "En attente"}
                          {transaction.status === "failed" && "Échoué"}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Withdrawal Modal */}
      {showWithdrawalModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">
                Demander un retrait
              </h3>
              <button
                onClick={() => setShowWithdrawalModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleWithdrawal} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Montant (FCFA)
                </label>
                <input
                  type="number"
                  value={withdrawalAmount}
                  onChange={(e) => setWithdrawalAmount(e.target.value)}
                  placeholder="Montant à retirer"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  min="1000"
                  max={stats.availableBalance}
                />
                <p className="text-sm text-gray-500 mt-1">
                  Solde disponible: {stats.availableBalance.toLocaleString()} FCFA
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Méthode de retrait
                </label>
                <select
                  value={withdrawalMethod}
                  onChange={(e) => setWithdrawalMethod(e.target.value as any)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="wave">Wave</option>
                  <option value="orange-money">Orange Money</option>
                  <option value="bank-transfer">Virement bancaire</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowWithdrawalModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                >
                  Confirmer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default FinancialDetails;
