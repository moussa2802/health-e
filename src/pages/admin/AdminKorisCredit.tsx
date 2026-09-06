import React, { useState, useEffect, useMemo } from 'react';
import { Search, Coins, CheckCircle2, AlertCircle, Loader2, User } from 'lucide-react';
import AdminLayout from '../../components/admin/AdminLayout';
import { getAllUsersForAdmin, type TopUser } from '../../services/adminUsersService';
import { getKorisWallet } from '../../services/korisService';
import { authedFetch } from '../../utils/authedFetch';

const AdminKorisCredit: React.FC = () => {
  const [users, setUsers] = useState<TopUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<TopUser | null>(null);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    getAllUsersForAdmin().then(setUsers).finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return [];
    const q = search.toLowerCase();
    return users.filter(u => u.name.toLowerCase().includes(q) || u.id.toLowerCase().includes(q)).slice(0, 10);
  }, [users, search]);

  const handleSelectUser = async (user: TopUser) => {
    setSelectedUser(user);
    setSearch('');
    setResult(null);
    setAmount('');
    setReason('');
    const wallet = await getKorisWallet(user.id);
    setWalletBalance(wallet?.balance ?? 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    const numAmount = parseInt(amount, 10);
    if (!numAmount || numAmount < 1 || numAmount > 500) {
      setResult({ success: false, message: 'Montant invalide (1-500)' });
      return;
    }
    if (!reason.trim() || reason.trim().length < 3) {
      setResult({ success: false, message: 'Motif requis (min 3 caractères)' });
      return;
    }

    setSubmitting(true);
    setResult(null);
    try {
      const resp = await authedFetch('/.netlify/functions/admin-koris-credit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetUserId: selectedUser.id,
          amount: numAmount,
          reason: reason.trim(),
        }),
      });
      const data = await resp.json();
      if (resp.ok && data.success) {
        setResult({ success: true, message: `${numAmount} Koris crédités. Nouveau solde : ${data.newBalance}` });
        setWalletBalance(data.newBalance);
        setAmount('');
        setReason('');
      } else {
        setResult({ success: false, message: data.error || 'Erreur inconnue' });
      }
    } catch {
      setResult({ success: false, message: 'Erreur réseau' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AdminLayout>
      <div style={{ maxWidth: 600, margin: '0 auto', padding: '24px 16px' }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Coins size={22} /> Créditer des Koris
        </h2>

        {/* Search */}
        <div style={{ position: 'relative', marginBottom: 16 }}>
          <div style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }}>
            <Search size={16} style={{ color: '#999' }} />
          </div>
          <input
            type="text"
            value={search}
            onChange={e => { setSearch(e.target.value); setSelectedUser(null); setResult(null); }}
            placeholder="Rechercher un utilisateur par nom ou ID..."
            style={{
              width: '100%',
              padding: '10px 12px 10px 36px',
              border: '1px solid #E5E7EB',
              borderRadius: 12,
              fontSize: 14,
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
          {search.trim() && !selectedUser && (
            <div style={{
              position: 'absolute', top: '100%', left: 0, right: 0,
              background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12,
              maxHeight: 280, overflowY: 'auto', zIndex: 10, marginTop: 4,
              boxShadow: '0 4px 12px rgba(0,0,0,.1)',
            }}>
              {loading ? (
                <div style={{ padding: 16, textAlign: 'center', color: '#999' }}>Chargement...</div>
              ) : filtered.length === 0 ? (
                <div style={{ padding: 16, textAlign: 'center', color: '#999' }}>Aucun résultat</div>
              ) : (
                filtered.map(u => (
                  <button
                    key={u.id}
                    onClick={() => handleSelectUser(u)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                      padding: '10px 14px', border: 'none', background: 'transparent',
                      cursor: 'pointer', textAlign: 'left', fontSize: 14,
                      borderBottom: '1px solid #f3f3f3',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#F9FAFB')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <User size={16} style={{ color: '#6B7280', flexShrink: 0 }} />
                    <div>
                      <div style={{ fontWeight: 600 }}>{u.name}</div>
                      <div style={{ fontSize: 12, color: '#9CA3AF' }}>{u.id.substring(0, 12)}... · {u.completedTests} tests</div>
                    </div>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* Selected user card */}
        {selectedUser && (
          <div style={{
            padding: 16, borderRadius: 12, border: '1px solid #E5E7EB',
            background: '#FAFAF8', marginBottom: 20,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15 }}>{selectedUser.name}</div>
                <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>
                  ID: {selectedUser.id.substring(0, 16)}... · {selectedUser.completedTests} tests · Inscrit {selectedUser.registeredAt}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 12, color: '#6B7280' }}>Solde actuel</div>
                <div style={{ fontWeight: 700, fontSize: 18, color: '#D97706' }}>
                  {walletBalance !== null ? `${walletBalance} ◉` : '...'}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Credit form */}
        {selectedUser && (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: '#374151' }}>
                Montant (Koris)
              </label>
              <input
                type="number"
                min={1}
                max={500}
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="Ex : 10"
                style={{
                  width: '100%', padding: '10px 12px', border: '1px solid #E5E7EB',
                  borderRadius: 10, fontSize: 14, outline: 'none', boxSizing: 'border-box',
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: '#374151' }}>
                Motif
              </label>
              <input
                type="text"
                value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder="Ex : Compensation bug, cadeau fidélité..."
                style={{
                  width: '100%', padding: '10px 12px', border: '1px solid #E5E7EB',
                  borderRadius: 10, fontSize: 14, outline: 'none', boxSizing: 'border-box',
                }}
              />
            </div>

            {result && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px',
                borderRadius: 10, fontSize: 13, fontWeight: 500,
                background: result.success ? '#ECFDF5' : '#FEF2F2',
                color: result.success ? '#059669' : '#DC2626',
                border: `1px solid ${result.success ? '#A7F3D0' : '#FECACA'}`,
              }}>
                {result.success ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                {result.message}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || !amount || !reason.trim()}
              style={{
                padding: '12px 20px', border: 'none', borderRadius: 12,
                background: submitting || !amount || !reason.trim() ? '#D1D5DB' : '#D97706',
                color: '#fff', fontWeight: 700, fontSize: 14, cursor: submitting ? 'wait' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
            >
              {submitting ? (
                <><Loader2 size={16} className="animate-spin" /> Envoi...</>
              ) : (
                <><Coins size={16} /> Créditer les Koris</>
              )}
            </button>
          </form>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminKorisCredit;
