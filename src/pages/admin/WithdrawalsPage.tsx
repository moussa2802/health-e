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
      console.error("[ADMIN] Erreur chargement retraits:", error);
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
      console.error("[ADMIN] Erreur action retrait:", error);
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
        return <Clock className="h-4 w-4 text-gold" />;
      case "approved":
        return <CheckCircle className="h-4 w-4 text-sage" />;
      case "rejected":
        return <XCircle className="h-4 w-4 text-danger" />;
      case "paid":
        return <DollarSign className="h-4 w-4 text-ok" />;
      default:
        return <AlertCircle className="h-4 w-4 text-muted" />;
    }
  };

  const getStatusColor = (status: WithdrawalStatus) => {
    switch (status) {
      case "pending":
        return "bg-gold-soft text-gold";
      case "approved":
        return "bg-sage-soft text-sage";
      case "rejected":
        return "bg-danger/10 text-danger";
      case "paid":
        return "bg-ok/15 text-ok";
      default:
        return "bg-paper text-ink-soft";
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
      <div className="min-h-screen bg-paper flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-paper">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link
              to="/admin/dashboard"
              className="p-2 rounded-card bg-card shadow-soft hover:shadow-lift transition-shadow"
            >
              <ArrowLeft className="h-5 w-5 text-ink-soft" />
            </Link>
            <div>
              <h1 className="font-display text-3xl font-bold text-ink">
                Gestion des retraits
              </h1>
              <p className="text-ink-soft">
                Gérez les demandes de retrait des professionnels
              </p>
            </div>
          </div>
          <button
            onClick={loadWithdrawals}
            className="flex items-center gap-2 px-4 py-2 bg-card rounded-card shadow-soft hover:shadow-lift transition-shadow"
          >
            <RefreshCw className="h-4 w-4 text-ink-soft" />
            Actualiser
          </button>
        </div>

        {/* Filtres */}
        <div className="bg-card p-4 rounded-card shadow-soft mb-6">
          <div className="flex items-center gap-4">
            <Filter className="h-5 w-5 text-ink-soft" />
            <span className="text-sm font-medium text-ink-soft">
              Filtrer par statut:
            </span>
            <select
              value={filter}
              onChange={(e) =>
                setFilter(e.target.value as WithdrawalStatus | "all")
              }
              className="px-3 py-2 border border-line rounded-card focus:ring-2 focus:ring-accent focus:border-accent bg-card text-ink-soft"
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
        <div className="bg-card rounded-card shadow-soft overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-line">
              <thead className="bg-paper">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">
                    Professionnel
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">
                    Montant
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">
                    Méthode
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">
                    Compte
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">
                    Statut
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-card divide-y divide-line">
                {filteredWithdrawals.map((withdrawal) => (
                  <tr key={withdrawal.id} className="hover:bg-paper">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-ink">
                        {withdrawal.professionalName}
                      </div>
                      <div className="text-sm text-muted">
                        {withdrawal.professionalEmail}
                      </div>
                      <div className="text-xs text-muted">
                        {withdrawal.professionalSpecialty}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-ink">
                        {withdrawal.amount.toLocaleString()} FCFA
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-ink">
                        {getMethodLabel(withdrawal.method)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-ink">
                        {withdrawal.accountNumber}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-ink">
                        {formatDate(withdrawal.createdAt)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-pill text-xs font-medium ${getStatusColor(
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
                              className="text-sage hover:text-sage/80"
                            >
                              Approuver
                            </button>
                            <button
                              onClick={() =>
                                openActionModal(withdrawal, "reject")
                              }
                              className="text-danger hover:text-danger/80"
                            >
                              Rejeter
                            </button>
                          </>
                        )}
                        {withdrawal.status === "approved" && (
                          <button
                            onClick={() => openActionModal(withdrawal, "pay")}
                            className="text-ok hover:text-ok/80"
                          >
                            Marquer payé
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setSelectedWithdrawal(withdrawal);
                            setShowActionModal(true);
                          }}
                          className="text-ink-soft hover:text-ink"
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
          <div className="fixed inset-0 bg-ink/50 flex items-center justify-center z-50">
            <div className="bg-card rounded-block shadow-lift p-6 w-full max-w-md mx-4">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-ink">
                  {actionType === "approve" && "Approuver le retrait"}
                  {actionType === "reject" && "Rejeter le retrait"}
                  {actionType === "pay" && "Marquer comme payé"}
                </h3>
                <button
                  onClick={() => setShowActionModal(false)}
                  className="text-muted hover:text-ink-soft"
                >
                  <XCircle className="h-5 w-5" />
                </button>
              </div>

              <div className="mb-4 p-4 bg-paper rounded-card">
                <p className="text-sm text-ink-soft">
                  <strong>Professionnel:</strong>{" "}
                  {selectedWithdrawal.professionalName}
                </p>
                <p className="text-sm text-ink-soft">
                  <strong>Spécialité:</strong>{" "}
                  {selectedWithdrawal.professionalSpecialty}
                </p>
                <p className="text-sm text-ink-soft">
                  <strong>Email:</strong> {selectedWithdrawal.professionalEmail}
                </p>
                <p className="text-sm text-ink-soft">
                  <strong>Montant:</strong>{" "}
                  {selectedWithdrawal.amount.toLocaleString()} FCFA
                </p>
                <p className="text-sm text-ink-soft">
                  <strong>Méthode:</strong>{" "}
                  {getMethodLabel(selectedWithdrawal.method)}
                </p>
                <p className="text-sm text-ink-soft">
                  <strong>Compte:</strong> {selectedWithdrawal.accountNumber}
                </p>
              </div>

              <form onSubmit={handleAction} className="space-y-4">
                {actionType === "pay" && (
                  <div>
                    <label className="block text-sm font-medium text-ink-soft mb-2">
                      ID de transaction *
                    </label>
                    <input
                      type="text"
                      value={txId}
                      onChange={(e) => setTxId(e.target.value)}
                      placeholder="ID de la transaction externe"
                      className="w-full px-3 py-2 border border-line rounded-card focus:ring-2 focus:ring-accent focus:border-accent"
                      required
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-ink-soft mb-2">
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
                    className="w-full px-3 py-2 border border-line rounded-card focus:ring-2 focus:ring-accent focus:border-accent"
                    rows={3}
                    required={actionType === "reject"}
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowActionModal(false)}
                    className="flex-1 px-4 py-2 border border-line text-ink-soft rounded-card hover:bg-paper"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={processing}
                    className={`flex-1 px-4 py-2 rounded-card text-white ${
                      actionType === "approve"
                        ? "bg-sage hover:bg-sage/90"
                        : actionType === "reject"
                        ? "bg-danger hover:bg-danger/90"
                        : "bg-ok hover:bg-ok/90"
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
