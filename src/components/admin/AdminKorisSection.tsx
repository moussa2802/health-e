/**
 * AdminKorisSection — Section du dashboard admin affichant les KPIs Koris.
 * Inclut maintenant les stats Phase Bienvenue vs Phase Quotidienne.
 */

import React, { useState, useEffect } from 'react';
import { getGlobalKorisStats, getKorisPhaseStats, getFeatureLabel, KORIS_COSTS } from '../../services/korisService';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, PieChart, Pie,
} from 'recharts';

const COLORS = ['#F59E0B', '#3B82F6', '#059669', '#8B5CF6', '#EC4899', '#EF4444', '#14B8A6'];

const AdminKorisSection: React.FC = () => {
  const [stats, setStats] = useState<{
    totalSpent: number;
    totalRefilled: number;
    totalRefunded: number;
    totalTransactions: number;
    spendingByType: Record<string, number>;
  } | null>(null);
  const [phaseStats, setPhaseStats] = useState<{
    welcomePhaseCount: number;
    dailyPhaseCount: number;
    totalWithWallet: number;
    bonusExhaustedRate: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getGlobalKorisStats(),
      getKorisPhaseStats(),
    ])
      .then(([s, p]) => {
        setStats(s);
        setPhaseStats(p);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{ padding: 24, textAlign: 'center', color: '#94A3B8' }}>
        Chargement des stats Koris...
      </div>
    );
  }

  if (!stats) return null;

  // Prepare spending chart data
  const spendingData = Object.entries(stats.spendingByType)
    .filter(([, val]) => val > 0)
    .map(([key, val]) => ({
      name: getFeatureLabel(key),
      value: val,
    }))
    .sort((a, b) => b.value - a.value);

  // Estimate API cost (rough: 1 Kori ≈ $0.001 for Haiku, $0.005 for Sonnet)
  const estimatedCost = (
    (stats.spendingByType.chat ?? 0) * 0.001 +
    (stats.spendingByType.journal ?? 0) * 0.001 +
    (stats.spendingByType.analysis ?? 0) * 0.002 +
    (stats.spendingByType.synthesis ?? 0) * 0.005 +
    (stats.spendingByType.conseils ?? 0) * 0.001
  ).toFixed(3);

  // Phase pie chart data
  const phaseData = phaseStats ? [
    { name: 'Phase Bienvenue', value: phaseStats.welcomePhaseCount, color: '#D97706' },
    { name: 'Phase Quotidienne', value: phaseStats.dailyPhaseCount, color: '#0D9488' },
  ].filter(d => d.value > 0) : [];

  return (
    <div style={{ fontFamily: "'Inter', -apple-system, sans-serif" }}>
      {/* Section Title */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        marginBottom: 20,
        paddingBottom: 12,
        borderBottom: '2px solid #F59E0B',
      }}>
        <span style={{ fontSize: 22 }}>◉</span>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0A2342', margin: 0 }}>
          Économie Koris
        </h2>
      </div>

      {/* KPI Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
        gap: 12,
        marginBottom: 24,
      }}>
        {/* Total dépensés */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(245,158,11,0.08), rgba(245,158,11,0.15))',
          borderRadius: 12,
          padding: '16px 14px',
          border: '1px solid rgba(245,158,11,0.2)',
        }}>
          <div style={{ fontSize: 11, color: '#92400E', fontWeight: 600, textTransform: 'uppercase' }}>
            Koris dépensés
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#D97706', marginTop: 4 }}>
            {stats.totalSpent.toLocaleString()}
          </div>
        </div>

        {/* Total rechargés */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(5,150,105,0.08), rgba(5,150,105,0.15))',
          borderRadius: 12,
          padding: '16px 14px',
          border: '1px solid rgba(5,150,105,0.2)',
        }}>
          <div style={{ fontSize: 11, color: '#065F46', fontWeight: 600, textTransform: 'uppercase' }}>
            Koris distribués
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#059669', marginTop: 4 }}>
            {stats.totalRefilled.toLocaleString()}
          </div>
        </div>

        {/* Total transactions */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(59,130,246,0.08), rgba(59,130,246,0.15))',
          borderRadius: 12,
          padding: '16px 14px',
          border: '1px solid rgba(59,130,246,0.2)',
        }}>
          <div style={{ fontSize: 11, color: '#1E40AF', fontWeight: 600, textTransform: 'uppercase' }}>
            Transactions
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#3B82F6', marginTop: 4 }}>
            {stats.totalTransactions.toLocaleString()}
          </div>
        </div>

        {/* Estimated API cost */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(239,68,68,0.08), rgba(239,68,68,0.15))',
          borderRadius: 12,
          padding: '16px 14px',
          border: '1px solid rgba(239,68,68,0.2)',
        }}>
          <div style={{ fontSize: 11, color: '#991B1B', fontWeight: 600, textTransform: 'uppercase' }}>
            Coût API estimé
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#DC2626', marginTop: 4 }}>
            ${estimatedCost}
          </div>
        </div>
      </div>

      {/* Phase stats cards */}
      {phaseStats && phaseStats.totalWithWallet > 0 && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 12,
          marginBottom: 24,
        }}>
          {/* Phase Bienvenue */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(217,119,6,0.06), rgba(245,158,11,0.12))',
            borderRadius: 12,
            padding: '14px 16px',
            border: '1px solid rgba(217,119,6,0.15)',
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <div style={{
              width: 40, height: 40, borderRadius: '50%',
              background: 'rgba(217,119,6,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18, flexShrink: 0,
            }}>🎁</div>
            <div>
              <div style={{ fontSize: 11, color: '#92400E', fontWeight: 600, textTransform: 'uppercase' }}>
                Phase Bienvenue
              </div>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#D97706' }}>
                {phaseStats.welcomePhaseCount}
              </div>
              <div style={{ fontSize: 11, color: '#94A3B8' }}>
                utilisateurs avec bonus actif
              </div>
            </div>
          </div>

          {/* Phase Quotidienne */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(13,148,136,0.06), rgba(5,150,105,0.12))',
            borderRadius: 12,
            padding: '14px 16px',
            border: '1px solid rgba(13,148,136,0.15)',
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <div style={{
              width: 40, height: 40, borderRadius: '50%',
              background: 'rgba(13,148,136,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18, flexShrink: 0,
            }}>🔄</div>
            <div>
              <div style={{ fontSize: 11, color: '#065F46', fontWeight: 600, textTransform: 'uppercase' }}>
                Phase Quotidienne
              </div>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#0D9488' }}>
                {phaseStats.dailyPhaseCount}
              </div>
              <div style={{ fontSize: 11, color: '#94A3B8' }}>
                utilisateurs en mode 10/jour
              </div>
            </div>
          </div>

          {/* Taux d'épuisement */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(139,92,246,0.06), rgba(139,92,246,0.12))',
            borderRadius: 12,
            padding: '14px 16px',
            border: '1px solid rgba(139,92,246,0.15)',
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <div style={{
              width: 40, height: 40, borderRadius: '50%',
              background: 'rgba(139,92,246,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18, flexShrink: 0,
            }}>📊</div>
            <div>
              <div style={{ fontSize: 11, color: '#5B21B6', fontWeight: 600, textTransform: 'uppercase' }}>
                Taux d'épuisement bonus
              </div>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#7C3AED' }}>
                {phaseStats.bonusExhaustedRate}%
              </div>
              <div style={{ fontSize: 11, color: '#94A3B8' }}>
                ont fini leurs 25 Koris
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Spending by type chart */}
      {spendingData.length > 0 && (
        <div style={{
          background: 'white',
          borderRadius: 12,
          padding: 20,
          border: '1px solid #E2E8F0',
          marginBottom: 24,
        }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: '#334155', margin: '0 0 16px' }}>
            Répartition des dépenses Koris
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={spendingData} layout="vertical" margin={{ left: 120 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis type="number" tick={{ fontSize: 11, fill: '#94A3B8' }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#475569' }} width={110} />
              <Tooltip
                formatter={(value: number) => [`${value} Koris`, 'Dépensés']}
                contentStyle={{ borderRadius: 8, fontSize: 12 }}
              />
              <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                {spendingData.map((_, index) => (
                  <Cell key={index} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Tarification reference */}
      <div style={{
        background: '#F8FAFC',
        borderRadius: 12,
        padding: 16,
        border: '1px solid #E2E8F0',
      }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, color: '#334155', margin: '0 0 12px' }}>
          Grille tarifaire actuelle
        </h3>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr auto',
          gap: '6px 16px',
          fontSize: 13,
        }}>
          {Object.entries(KORIS_COSTS).map(([feature, cost]) => (
            <React.Fragment key={feature}>
              <span style={{ color: '#475569' }}>{getFeatureLabel(feature)}</span>
              <span style={{
                fontWeight: 600,
                color: cost > 0 ? '#D97706' : '#059669',
                textAlign: 'right',
              }}>
                {cost > 0 ? `◉ ${cost}` : 'Gratuit'}
              </span>
            </React.Fragment>
          ))}
        </div>
        <div style={{ marginTop: 12, fontSize: 11, color: '#94A3B8' }}>
          Phase Bienvenue: 25 Koris offerts • Phase Quotidienne: 10 Koris/jour (remis à 10 à minuit)
        </div>
      </div>
    </div>
  );
};

export default AdminKorisSection;
