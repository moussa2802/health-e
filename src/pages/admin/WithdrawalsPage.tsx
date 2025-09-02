import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  Clock,
  CheckCircle,
  XCircle,
  DollarSign,
  Eye,
  AlertCircle,
  Filter,
  RefreshCw,
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import {
  getAllWithdrawalRequestsWithProfessionalInfo,
  approveWithdrawalRequest,
  rejectWithdrawalRequest,
  markWithdrawalAsPaid,
  type WithdrawalWithProfessionalInfo,
} from "../../services/withdrawalService";

type WithdrawalStatus = "pending" | "approved" | "rejected" | "paid";

// Supprimer cette ligne car elle fait doublon

const WithdrawalsPage: React.FC = () => {
  const { currentUser } = useAuth();
  const [withdrawals, setWithdrawals] = useState<
    WithdrawalWithProfessionalInfo[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<WithdrawalStatus | "all">("all");
  const [selectedWithdrawal, setSelectedWithdrawal] =
    useState<WithdrawalWithProfessionalInfo | null>(null);
  const [showActionModal, setShowActionModal] = useState(false);
  const [actionType, setActionType] = useState<"approve" | "reject" | "pay">(
    "approve"
  );
  const [note, setNote] = useState("");
  const [txId, setTxId] = useState("");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadWithdrawals();
  }, [filter]);

  const loadWithdrawals = async () => {
    try {
      setLoading(true);
      const status = filter === "all" ? undefined : filter;
      const requests = await getAllWithdrawalRequestsWithProfessionalInfo(
        status,
        1000
      );

      setWithdrawals(requests);
    } catch (error) {
      console.error("❌ [ADMIN] Erreur chargement retraits:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWithdrawal || !currentUser?.id) return;

    setProcessing(true);
    try {
      switch (actionType) {
        case "approve":
          await approveWithdrawalRequest(
            selectedWithdrawal.id,
            currentUser.id,
            note
          );
          break;
        case "reject":
          if (!note.trim()) {
            alert("Une note est obligatoire pour rejeter une demande");
            return;
          }
          await rejectWithdrawalRequest(
            selectedWithdrawal.id,
            currentUser.id,
            note
          );
          break;
        case "pay":
          if (!txId.trim()) {
            alert(
              "Un ID de transaction est obligatoire pour marquer comme payé"
            );
            return;
          }
          await markWithdrawalAsPaid(
            selectedWithdrawal.id,
            currentUser.id,
            txId,
            note
          );
          break;
      }

      // Recharger les données
      await loadWithdrawals();
      setShowActionModal(false);
      setSelectedWithdrawal(null);
      setNote("");
      setTxId("");
    } catch (error) {
      console.error("❌ [ADMIN] Erreur action retrait:", error);
      alert("Erreur lors de l'action");
    } finally {
      setProcessing(false);
    }
  };

  const openActionModal = (
    withdrawal: WithdrawalWithProfessionalInfo,
    type: "approve" | "reject" | "pay"
  ) => {
    setSelectedWithdrawal(withdrawal);
    setActionType(type);
    setShowActionModal(true);
    setNote("");
    setTxId("");
  };

  const getStatusIcon = (status: WithdrawalStatus) => {
    switch (status) {
      case "pending":
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case "approved":
        return <CheckCircle className="h-4 w-4 text-blue-500" />;
      case "rejected":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "paid":
        return <DollarSign className="h-4 w-4 text-green-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: WithdrawalStatus) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "approved":
        return "bg-blue-100 text-blue-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      case "paid":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusLabel = (status: WithdrawalStatus) => {
    switch (status) {
      case "pending":
        return "En attente";
      case "approved":
        return "Approuvé";
      case "rejected":
        return "Rejeté";
      case "paid":
        return "Payé";
      default:
        return status;
    }
  };

  const getMethodLabel = (method: string) => {
    switch (method) {
      case "wave":
        return "Wave";
      case "orange-money":
        return "Orange Money";
      case "bank-transfer":
        return "Virement bancaire";
      default:
        return method;
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return "N/A";
    try {
      if (typeof timestamp.toDate === "function") {
        return timestamp.toDate().toLocaleDateString("fr-FR");
      }
      return new Date(timestamp).toLocaleDateString("fr-FR");
    } catch {
      return "N/A";
    }
  };

  const filteredWithdrawals = withdrawals.filter((w) => {
    if (filter === "all") return true;
    return w.status === filter;
  });

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
              to="/admin/dashboard"
              className="p-2 rounded-lg bg-white shadow-sm hover:shadow-md transition-shadow"
            >
              <ArrowLeft className="h-5 w-5 text-gray-600" />
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Gestion des retraits
              </h1>
              <p className="text-gray-600">
                Gérez les demandes de retrait des professionnels
              </p>
            </div>
          </div>
          <button
            onClick={loadWithdrawals}
            className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow"
          >
            <RefreshCw className="h-4 w-4 text-gray-600" />
            Actualiser
          </button>
        </div>

        {/* Filtres */}
        <div className="bg-white p-4 rounded-lg shadow-sm mb-6">
          <div className="flex items-center gap-4">
            <Filter className="h-5 w-5 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">
              Filtrer par statut:
            </span>
            <select
              value={filter}
              onChange={(e) =>
                setFilter(e.target.value as WithdrawalStatus | "all")
              }
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">Tous</option>
              <option value="pending">En attente</option>
              <option value="approved">Approuvés</option>
              <option value="rejected">Rejetés</option>
              <option value="paid">Payés</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Professionnel
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Montant
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Méthode
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Compte
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Statut
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredWithdrawals.map((withdrawal) => (
                  <tr key={withdrawal.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {withdrawal.professionalName}
                      </div>
                      <div className="text-sm text-gray-500">
                        {withdrawal.professionalEmail}
                      </div>
                      <div className="text-xs text-gray-400">
                        {withdrawal.professionalSpecialty}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {withdrawal.amount.toLocaleString()} FCFA
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {getMethodLabel(withdrawal.method)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {withdrawal.accountNumber}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {formatDate(withdrawal.createdAt)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                          withdrawal.status
                        )}`}
                      >
                        {getStatusIcon(withdrawal.status)}
                        <span className="ml-1">
                          {getStatusLabel(withdrawal.status)}
                        </span>
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex gap-2">
                        {withdrawal.status === "pending" && (
                          <>
                            <button
                              onClick={() =>
                                openActionModal(withdrawal, "approve")
                              }
                              className="text-blue-600 hover:text-blue-900"
                            >
                              Approuver
                            </button>
                            <button
                              onClick={() =>
                                openActionModal(withdrawal, "reject")
                              }
                              className="text-red-600 hover:text-red-900"
                            >
                              Rejeter
                            </button>
                          </>
                        )}
                        {withdrawal.status === "approved" && (
                          <button
                            onClick={() => openActionModal(withdrawal, "pay")}
                            className="text-green-600 hover:text-green-900"
                          >
                            Marquer payé
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setSelectedWithdrawal(withdrawal);
                            setShowActionModal(true);
                          }}
                          className="text-gray-600 hover:text-gray-900"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Action Modal */}
        {showActionModal && selectedWithdrawal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">
                  {actionType === "approve" && "Approuver le retrait"}
                  {actionType === "reject" && "Rejeter le retrait"}
                  {actionType === "pay" && "Marquer comme payé"}
                </h3>
                <button
                  onClick={() => setShowActionModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="h-5 w-5" />
                </button>
              </div>

              <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">
                  <strong>Professionnel:</strong>{" "}
                  {selectedWithdrawal.professionalName}
                </p>
                <p className="text-sm text-gray-600">
                  <strong>Spécialité:</strong>{" "}
                  {selectedWithdrawal.professionalSpecialty}
                </p>
                <p className="text-sm text-gray-600">
                  <strong>Email:</strong> {selectedWithdrawal.professionalEmail}
                </p>
                <p className="text-sm text-gray-600">
                  <strong>Montant:</strong>{" "}
                  {selectedWithdrawal.amount.toLocaleString()} FCFA
                </p>
                <p className="text-sm text-gray-600">
                  <strong>Méthode:</strong>{" "}
                  {getMethodLabel(selectedWithdrawal.method)}
                </p>
                <p className="text-sm text-gray-600">
                  <strong>Compte:</strong> {selectedWithdrawal.accountNumber}
                </p>
              </div>

              <form onSubmit={handleAction} className="space-y-4">
                {actionType === "pay" && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      ID de transaction *
                    </label>
                    <input
                      type="text"
                      value={txId}
                      onChange={(e) => setTxId(e.target.value)}
                      placeholder="ID de la transaction externe"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Note {actionType === "reject" ? "*" : ""}
                  </label>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder={
                      actionType === "approve"
                        ? "Note optionnelle d'approbation"
                        : actionType === "reject"
                        ? "Raison du rejet (obligatoire)"
                        : "Note optionnelle de paiement"
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    rows={3}
                    required={actionType === "reject"}
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowActionModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={processing}
                    className={`flex-1 px-4 py-2 rounded-lg text-white ${
                      actionType === "approve"
                        ? "bg-blue-500 hover:bg-blue-600"
                        : actionType === "reject"
                        ? "bg-red-500 hover:bg-red-600"
                        : "bg-green-500 hover:bg-green-600"
                    } disabled:opacity-50`}
                  >
                    {processing ? "Traitement..." : "Confirmer"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WithdrawalsPage;
