/**
 * NoKorisModal — Modal quand l'utilisateur n'a plus assez de Koris.
 * Affiche l'action bloquée, le coût, le solde, et les 4 packs d'achat.
 */

import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useKoris } from '../../contexts/KorisContext';
import { authedFetch } from '../../utils/authedFetch';
import { CREDIT, credits } from '../../config/creditName';

const KORI_IMG = CREDIT.img;

const PACKS = [
  { id: 'pack_decouverte', koris: 25, price: 500, label: 'Découverte' },
  { id: 'pack_populaire', koris: 55, price: 1_000, label: 'Populaire' },
  { id: 'pack_confort', koris: 150, price: 2_500, label: 'Confort' },
  { id: 'pack_grand', koris: 350, price: 5_000, label: 'Grand' },
] as const;

function formatPrice(n: number) {
  return n.toLocaleString('fr-FR');
}

const NoKorisModal: React.FC = () => {
  const { showNoKorisModal, closeNoKorisModal, noKorisAction, noKorisCost, balance } = useKoris();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!showNoKorisModal) return null;

  const handlePurchase = async (packId: string) => {
    setLoading(packId);
    setError(null);
    try {
      const res = await authedFetch('/.netlify/functions/paytech-koris', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packId, returnTo: window.location.pathname }),
      });
      const data = await res.json();
      if (data.success && data.redirect_url) {
        window.location.href = data.redirect_url;
      } else {
        setError(data.error || 'Erreur lors de la création du paiement');
        setLoading(null);
      }
    } catch {
      setError('Erreur réseau');
      setLoading(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4"
      style={{ backdropFilter: 'blur(4px)' }}
      onClick={closeNoKorisModal}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="bg-card rounded-block px-5 py-6 max-w-[380px] w-full shadow-lift"
      >
        {/* Header */}
        <div className="flex items-center gap-3 mb-3">
          <img
            src={KORI_IMG}
            alt=""
            className="w-12 h-12 rounded-full object-cover border-2 border-gold/20"
            style={{ opacity: 0.6, filter: 'grayscale(30%)' }}
          />
          <h3 className="font-display text-base font-bold text-ink m-0">
            Il te manque des {CREDIT.many} ✨
          </h3>
        </div>

        {/* Contextual description */}
        <p className="text-sm text-ink-soft m-0 mb-4 leading-relaxed">
          {noKorisAction && noKorisCost > 0
            ? `${noKorisAction} coûte ${credits(noKorisCost)}, tu en as ${balance}.`
            : `Tu n'as pas assez ${CREDIT.ofMany} (solde : ${balance}).`}
        </p>

        {/* Packs grid */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          {PACKS.map(pack => (
            <button
              key={pack.id}
              onClick={() => handlePurchase(pack.id)}
              disabled={!!loading}
              className="relative bg-paper rounded-xl border border-line px-3 py-3 text-left cursor-pointer hover:border-gold/40 hover:bg-gold-soft transition-colors disabled:opacity-50 disabled:cursor-wait"
            >
              <div className="flex items-center gap-1.5 mb-1">
                <img src={KORI_IMG} alt="" className="w-4 h-4 rounded-full object-cover" />
                <span className="text-sm font-bold text-gold">{pack.koris}</span>
              </div>
              <div className="text-[13px] text-ink-soft font-medium">
                {formatPrice(pack.price)} FCFA
              </div>
              {loading === pack.id && (
                <div className="absolute inset-0 flex items-center justify-center bg-card/80 rounded-xl">
                  <Loader2 size={18} className="animate-spin text-gold" />
                </div>
              )}
            </button>
          ))}
        </div>

        {error && (
          <div className="text-xs text-danger text-center mb-3">{error}</div>
        )}

        {/* Plus tard */}
        <button
          onClick={closeNoKorisModal}
          className="w-full py-2.5 rounded-xl border border-line bg-transparent text-sm text-ink-soft font-medium cursor-pointer hover:bg-paper transition-colors"
        >
          Plus tard
        </button>
      </div>
    </div>
  );
};

export default NoKorisModal;
