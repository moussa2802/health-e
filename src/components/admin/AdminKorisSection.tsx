/**
 * AdminKorisSection — Section du dashboard admin affichant les KPIs Koris.
 * Inclut maintenant les stats Phase Bienvenue vs Phase Quotidienne.
 */

import React, { useState, useEffect } from 'react';
import { Coins, Gift, RefreshCw, BarChart3 } from 'lucide-react';
import { getGlobalKorisStats, getKorisPhaseStats, getFeatureLabel, KORIS_COSTS } from '../../services/korisService';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, PieChart, Pie,
} from 'recharts';

const COLORS = ['#8F6A1F', '#4A5D57', '#3C7A5A', '#B5522F', '#B23A3A', '#B5732A', '#6E7078'];

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
      <div className="p-6 text-center text-muted">
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
    { name: 'Phase Bienvenue', value: phaseStats.welcomePhaseCount, color: '#8F6A1F' },
    { name: 'Phase Quotidienne', value: phaseStats.dailyPhaseCount, color: '#4A5D57' },
  ].filter(d => d.value > 0) : [];

  return (
    <div>
      {/* Section Title */}
      <div className="flex items-center gap-2 mb-5 pb-3 border-b-2 border-gold">
        <Coins className="h-5 w-5 text-gold" />
        <h2 className="font-display text-lg font-bold text-ink m-0">
          Économie Koris
        </h2>
      </div>

      {/* KPI Cards */}
      <div
        className="grid gap-3 mb-6"
        style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}
      >
        {/* Total dépensés */}
        <div className="bg-gold-soft rounded-card px-3.5 py-4 border border-gold/20">
          <div className="text-xs text-gold font-semibold uppercase">
            Koris dépensés
          </div>
          <div className="font-display text-2xl font-extrabold text-gold mt-1">
            {stats.totalSpent.toLocaleString()}
          </div>
        </div>

        {/* Total rechargés */}
        <div className="bg-ok/10 rounded-card px-3.5 py-4 border border-ok/20">
          <div className="text-xs text-ok font-semibold uppercase">
            Koris distribués
          </div>
          <div className="font-display text-2xl font-extrabold text-ok mt-1">
            {stats.totalRefilled.toLocaleString()}
          </div>
        </div>

        {/* Total transactions */}
        <div className="bg-sage-soft rounded-card px-3.5 py-4 border border-sage/20">
          <div className="text-xs text-sage font-semibold uppercase">
            Transactions
          </div>
          <div className="font-display text-2xl font-extrabold text-sage mt-1">
            {stats.totalTransactions.toLocaleString()}
          </div>
        </div>

        {/* Estimated API cost */}
        <div className="bg-danger/10 rounded-card px-3.5 py-4 border border-danger/20">
          <div className="text-xs text-danger font-semibold uppercase">
            Coût API estimé
          </div>
          <div className="font-display text-2xl font-extrabold text-danger mt-1">
            ${estimatedCost}
          </div>
        </div>
      </div>

      {/* Phase stats cards */}
      {phaseStats && phaseStats.totalWithWallet > 0 && (
        <div
          className="grid gap-3 mb-6"
          style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}
        >
          {/* Phase Bienvenue */}
          <div className="bg-gold-soft rounded-card px-4 py-3.5 border border-gold/15 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gold/15 flex items-center justify-center flex-shrink-0">
              <Gift className="h-5 w-5 text-gold" />
            </div>
            <div>
              <div className="text-xs text-gold font-semibold uppercase">
                Phase Bienvenue
              </div>
              <div className="text-xl font-extrabold text-gold">
                {phaseStats.welcomePhaseCount}
              </div>
              <div className="text-xs text-muted">
                utilisateurs avec bonus actif
              </div>
            </div>
          </div>

          {/* Phase Quotidienne */}
          <div className="bg-sage-soft rounded-card px-4 py-3.5 border border-sage/15 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-sage/15 flex items-center justify-center flex-shrink-0">
              <RefreshCw className="h-5 w-5 text-sage" />
            </div>
            <div>
              <div className="text-xs text-sage font-semibold uppercase">
                Phase Quotidienne
              </div>
              <div className="text-xl font-extrabold text-sage">
                {phaseStats.dailyPhaseCount}
              </div>
              <div className="text-xs text-muted">
                utilisateurs en mode 10/jour
              </div>
            </div>
          </div>

          {/* Taux d'épuisement */}
          <div className="bg-accent-soft rounded-card px-4 py-3.5 border border-accent/15 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-accent/15 flex items-center justify-center flex-shrink-0">
              <BarChart3 className="h-5 w-5 text-accent" />
            </div>
            <div>
              <div className="text-xs text-accent font-semibold uppercase">
                Taux d'épuisement bonus
              </div>
              <div className="text-xl font-extrabold text-accent">
                {phaseStats.bonusExhaustedRate}%
              </div>
              <div className="text-xs text-muted">
                ont fini leurs 25 Koris
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Spending by type chart */}
      {spendingData.length > 0 && (
        <div className="bg-card rounded-card p-5 border border-line mb-6">
          <h3 className="text-sm font-semibold text-ink-soft mb-4">
            Répartition des dépenses Koris
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={spendingData} layout="vertical" margin={{ left: 120 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E7E4DA" />
              <XAxis type="number" tick={{ fontSize: 11, fill: '#6E7078' }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#4B4D55' }} width={110} />
              <Tooltip
                formatter={(value: number) => [`${value} Koris`, 'Dépensés']}
                contentStyle={{ borderRadius: 12, fontSize: 12 }}
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
      <div className="bg-paper rounded-card p-4 border border-line">
        <h3 className="text-sm font-semibold text-ink-soft mb-3">
          Grille tarifaire actuelle
        </h3>
        <div
          className="grid gap-x-4 gap-y-1.5 text-sm"
          style={{ gridTemplateColumns: '1fr auto' }}
        >
          {Object.entries(KORIS_COSTS).map(([feature, cost]) => (
            <React.Fragment key={feature}>
              <span className="text-ink-soft">{getFeatureLabel(feature)}</span>
              <span
                className={`font-semibold text-right ${
                  cost > 0 ? 'text-gold' : 'text-ok'
                }`}
              >
                {cost > 0 ? (
                  <span className="inline-flex items-center gap-1 justify-end">
                    <Coins className="h-3 w-3" />
                    {cost}
                  </span>
                ) : (
                  'Gratuit'
                )}
              </span>
            </React.Fragment>
          ))}
        </div>
        <div className="mt-3 text-xs text-muted">
          Phase Bienvenue: 25 Koris offerts • Phase Quotidienne: 10 Koris/jour (remis à 10 à minuit)
        </div>
      </div>
    </div>
  );
};

export default AdminKorisSection;
