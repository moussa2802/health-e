/**
 * AdminKorisSection — Section du dashboard admin affichant les KPIs Koris.
 */

import React, { useState, useEffect } from 'react';
import { Coins } from 'lucide-react';
import { getGlobalKorisStats, getFeatureLabel, KORIS_COSTS } from '../../services/korisService';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getGlobalKorisStats()
      .then(setStats)
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

  const spendingData = Object.entries(stats.spendingByType)
    .filter(([, val]) => val > 0)
    .map(([key, val]) => ({
      name: getFeatureLabel(key),
      value: val,
    }))
    .sort((a, b) => b.value - a.value);

  const estimatedCost = (
    (stats.spendingByType.chat ?? 0) * 0.001 +
    (stats.spendingByType.journal ?? 0) * 0.001 +
    (stats.spendingByType.analysis ?? 0) * 0.002 +
    (stats.spendingByType.synthesis ?? 0) * 0.005 +
    (stats.spendingByType.conseils ?? 0) * 0.001
  ).toFixed(3);

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
        <div className="bg-gold-soft rounded-card px-3.5 py-4 border border-gold/20">
          <div className="text-xs text-gold font-semibold uppercase">
            Koris dépensés
          </div>
          <div className="font-display text-2xl font-extrabold text-gold mt-1">
            {stats.totalSpent.toLocaleString()}
          </div>
        </div>

        <div className="bg-ok/10 rounded-card px-3.5 py-4 border border-ok/20">
          <div className="text-xs text-ok font-semibold uppercase">
            Koris distribués
          </div>
          <div className="font-display text-2xl font-extrabold text-ok mt-1">
            {stats.totalRefilled.toLocaleString()}
          </div>
        </div>

        <div className="bg-sage-soft rounded-card px-3.5 py-4 border border-sage/20">
          <div className="text-xs text-sage font-semibold uppercase">
            Transactions
          </div>
          <div className="font-display text-2xl font-extrabold text-sage mt-1">
            {stats.totalTransactions.toLocaleString()}
          </div>
        </div>

        <div className="bg-danger/10 rounded-card px-3.5 py-4 border border-danger/20">
          <div className="text-xs text-danger font-semibold uppercase">
            Coût API estimé
          </div>
          <div className="font-display text-2xl font-extrabold text-danger mt-1">
            ${estimatedCost}
          </div>
        </div>
      </div>

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
          25 Koris offerts à l'inscription, puis achat de packs
        </div>
      </div>
    </div>
  );
};

export default AdminKorisSection;
