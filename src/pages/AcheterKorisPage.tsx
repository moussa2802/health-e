import '../components/accueil/accueil.css';
import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Zap, Check, Loader2, AlertCircle } from 'lucide-react';
import { useKoris } from '../contexts/KorisContext';
import { authedFetch } from '../utils/authedFetch';
import { CREDIT, credits } from '../config/creditName';

const KORI_IMG = CREDIT.img;

const PACKS = [
  { id: 'pack_decouverte', koris: 25, price: 500, popular: false, label: 'Découverte' },
  { id: 'pack_populaire', koris: 55, price: 1_000, popular: true, label: 'Populaire' },
  { id: 'pack_confort', koris: 150, price: 2_500, popular: false, label: 'Confort' },
  { id: 'pack_grand', koris: 350, price: 5_000, popular: false, label: 'Grand' },
] as const;

function formatNumber(n: number) {
  return n.toLocaleString('fr-FR');
}

const AcheterKorisPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { balance, refreshBalance } = useKoris();
  const [loading, setLoading] = useState<string | null>(null);
  // On choisit d'abord une formule (elle s'allume), puis on paie avec le bouton : jamais de départ vers PayTech au premier tap.
  const [selected, setSelected] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isSuccess = searchParams.get('success') === 'true';
  const isCancelled = searchParams.get('cancelled') === 'true';
  const returnTo = searchParams.get('returnTo');

  React.useEffect(() => {
    if (isSuccess) {
      refreshBalance();
      if (returnTo) {
        const timer = setTimeout(() => navigate(returnTo), 2000);
        return () => clearTimeout(timer);
      }
    }
  }, [isSuccess, refreshBalance, returnTo, navigate]);

  const handlePurchase = async (packId: string) => {
    setLoading(packId);
    setError(null);

    try {
      const res = await authedFetch('/.netlify/functions/paytech-koris', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packId }),
      });

      const data = await res.json();

      if (data.success && data.redirect_url) {
        window.location.href = data.redirect_url;
      } else {
        setError(data.error || 'Erreur lors de l\'initiation du paiement.');
        setLoading(null);
      }
    } catch {
      setError('Erreur réseau. Réessaie.');
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-paper drl-screen drl-page pb-10">
      <div className="bg-paper/95 border-b border-line px-4 py-5 flex items-center gap-3 text-white">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 bg-white/15 text-white rounded-pill px-3 py-1.5 text-[13px] font-semibold hover:bg-white/25 transition-colors"
        >
          <ArrowLeft size={14} /> Retour
        </button>
        <h1 className="font-display m-0 text-lg font-semibold flex items-center gap-2">
          <Zap size={18} /> Recharger mes {CREDIT.many}
        </h1>
      </div>

      <div className="max-w-md mx-auto px-4 py-6">
        {isSuccess && (
          <div className="bg-ok/10 border border-ok/20 rounded-xl px-4 py-3 mb-5 flex items-center gap-2.5">
            <Check size={18} className="text-ok flex-shrink-0" />
            <div>
              <div className="text-sm font-semibold text-ok">Achat confirmé !</div>
              <div className="text-xs text-ink-soft">Tes {CREDIT.many} ont été ajoutées à ton solde.</div>
            </div>
          </div>
        )}

        {isCancelled && (
          <div className="bg-warn/10 border border-warn/20 rounded-xl px-4 py-3 mb-5">
            <div className="text-sm text-ink-soft">Paiement annulé. Tu peux réessayer quand tu veux.</div>
          </div>
        )}

        <div className="flex items-center gap-3 mb-6">
          <img src={KORI_IMG} alt="" className="w-12 h-12 rounded-full object-cover border-2 border-gold/20" />
          <div>
            <div className="text-[13px] text-muted">Mon solde actuel</div>
            <div className="text-2xl font-extrabold text-gold">{balance} <span className="text-sm font-medium">{CREDIT.many}</span></div>
          </div>
        </div>

        {error && (
          <div className="bg-danger/10 border border-danger/20 rounded-xl px-4 py-3 mb-5 flex items-center gap-2">
            <AlertCircle size={16} className="text-danger flex-shrink-0" />
            <div className="text-sm text-danger">{error}</div>
          </div>
        )}

        <div className="space-y-3">
          {PACKS.map(pack => (
            <button
              key={pack.id}
              onClick={() => { setSelected(pack.id); setError(null); }}
              disabled={loading !== null}
              aria-pressed={selected === pack.id}
              className={`w-full rounded-block border p-5 text-left flex items-center justify-between transition-all ${
                selected === pack.id
                  ? 'bg-gold/10 border-gold ring-2 ring-gold/60'
                  : 'bg-card border-line'
              } ${loading !== null ? 'opacity-60 cursor-default' : 'cursor-pointer hover-lift'}`}
            >
              <div className="flex items-center gap-3">
                <span aria-hidden="true" className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${selected === pack.id ? 'bg-gold border-gold' : 'border-line'}`}>
                  {selected === pack.id && <Check size={14} strokeWidth={3} className="text-ink" />}
                </span>
              <div>
                {pack.popular ? (
                  <span className="text-[13px] font-bold text-gold bg-gold/10 px-2 py-0.5 rounded-pill mb-1.5 inline-block">
                    POPULAIRE
                  </span>
                ) : (
                  <span className="text-[13px] font-semibold text-muted mb-1.5 inline-block">
                    {pack.label}
                  </span>
                )}
                <div className="text-lg font-bold text-ink">{credits(pack.koris)}</div>
                <div className="text-xs text-muted mt-0.5">
                  {(pack.price / pack.koris).toFixed(0)} F / {CREDIT.one}
                </div>
              </div>
              </div>
              <div className="text-right">
                <div className="text-xl font-extrabold text-gold">{formatNumber(pack.price)} F</div>
              </div>
            </button>
          ))}
        </div>

        {(() => {
          const pack = PACKS.find(p => p.id === selected);
          if (!pack) return <p className="m-0 mt-4 text-center text-[13px] text-muted">Touche une formule pour la choisir.</p>;
          return (
            <div className="sticky bottom-3 mt-5">
              <button
                onClick={() => handlePurchase(pack.id)}
                disabled={loading !== null}
                className="w-full min-h-[54px] rounded-[16px] border-0 bg-gold text-ink text-[16px] font-extrabold flex items-center justify-center gap-2 cursor-pointer shadow-soft disabled:opacity-60"
              >
                {loading ? <><Loader2 size={18} className="animate-spin" /> Ouverture du paiement…</> : <>Payer {formatNumber(pack.price)} F · {credits(pack.koris)}</>}
              </button>
              <p className="m-0 mt-2 text-center text-[13px] text-muted">Tu seras redirigé vers PayTech (Orange Money, Wave ou carte).</p>
            </div>
          );
        })()}

        <div className="mt-6 bg-paper rounded-xl border border-line px-4 py-3">
          <div className="text-xs font-semibold text-ink-soft mb-2">Comment ça marche ?</div>
          <ul className="m-0 pl-4 text-xs text-muted leading-relaxed space-y-1">
            <li>Paiement sécurisé via Orange Money, Wave ou carte bancaire</li>
            <li>Les {CREDIT.many} sont ajoutées instantanément à ton solde</li>
            <li>Ils ne périment pas — utilise-les à ton rythme</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default AcheterKorisPage;
