import '../components/accueil/accueil.css';
import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Check, Loader2, AlertCircle } from 'lucide-react';
import DrLoShell, { DC, card, usePalette } from '../components/accueil/DrLoShell';
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
  const palette = usePalette();
  const [loading, setLoading] = useState<string | null>(null);
  // La formule la plus choisie est allumée d'office ; on paie avec le bouton : jamais de départ vers PayTech au premier tap.
  const [selected, setSelected] = useState<string | null>('pack_populaire');
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

  const pack = PACKS.find(p => p.id === selected);
  const baseRate = PACKS[0].koris / PACKS[0].price;
  const bonusPct = (p: typeof PACKS[number]) => Math.round((p.koris / p.price / baseRate - 1) * 100);
  const notice = (tone: string, children: React.ReactNode) => (
    <div role="status" style={{ ...card, marginTop: 14, display: 'flex', alignItems: 'center', gap: 10, borderColor: `${tone}66`, background: `${tone}14` }}>{children}</div>
  );

  return (
    <DrLoShell back={{ to: '/espace', label: 'Retour' }} palette={palette}>
      <h1 style={{ margin: '18px 0 0', fontFamily: 'Fraunces, serif', fontSize: 28, lineHeight: 1.2, fontWeight: 600, color: DC.title }}>Recharger mes {CREDIT.many}</h1>
      <p style={{ margin: '6px 0 0', fontSize: 15, lineHeight: 1.5, color: DC.soft }}>Pour discuter plus longtemps avec ton compagnon et recevoir tes analyses détaillées.</p>

      {isSuccess && notice(DC.sage, <><Check size={18} color={DC.sage} aria-hidden="true" /><span style={{ fontSize: 15, color: DC.text }}><b>C'est fait !</b> Tes {CREDIT.many} sont sur ton solde.</span></>)}
      {isCancelled && notice(DC.gold, <span style={{ fontSize: 15, color: DC.soft }}>Paiement annulé. Tu peux réessayer quand tu veux.</span>)}
      {error && notice(DC.attention, <><AlertCircle size={18} color={DC.attention} aria-hidden="true" /><span style={{ fontSize: 15, color: DC.text }}>{error}</span></>)}

      <div style={{ ...card, marginTop: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
        <img src={KORI_IMG} alt="" width={44} height={44} style={{ borderRadius: '50%', objectFit: 'cover' }} />
        <span style={{ lineHeight: 1.3 }}>
          <span style={{ display: 'block', fontSize: 13, color: DC.muted }}>Ton solde</span>
          <b style={{ fontSize: 22, color: DC.title }}>{credits(balance)}</b>
        </span>
      </div>

      <div role="radiogroup" aria-label="Formules" style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 14 }}>
        {PACKS.map(p => {
          const on = selected === p.id;
          const bonus = bonusPct(p);
          return (
            <button key={p.id} role="radio" aria-checked={on} disabled={loading !== null}
              onClick={() => { setSelected(p.id); setError(null); }} className="drl-btn"
              style={{ ...card, width: '100%', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', fontFamily: 'inherit', color: DC.text,
                borderColor: on ? DC.gold : DC.line, background: on ? `${DC.gold}18` : DC.glass, boxShadow: on ? `0 0 0 1px ${DC.gold}` : 'none' }}>
              <span aria-hidden="true" style={{ width: 22, height: 22, flex: 'none', borderRadius: '50%', border: `2px solid ${on ? DC.gold : DC.line}`, background: on ? DC.gold : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {on && <Check size={13} strokeWidth={3} color={DC.ink} />}
              </span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <b style={{ fontSize: 17, color: DC.title }}>{credits(p.koris)}</b>
                  {p.popular && <span style={{ fontSize: 13, fontWeight: 700, color: DC.ink, background: DC.gold, borderRadius: 999, padding: '1px 8px' }}>Le plus choisi</span>}
                  {bonus > 0 && <span style={{ fontSize: 13, fontWeight: 700, color: DC.sage }}>+{bonus} % offertes</span>}
                </span>
                <span style={{ display: 'block', marginTop: 3, fontSize: 13, lineHeight: 1.4, color: DC.muted }}>
                  ≈ {p.koris} messages à ton compagnon ou {Math.floor(p.koris / 3)} analyses détaillées
                </span>
              </span>
              <b style={{ fontSize: 17, color: DC.gold, whiteSpace: 'nowrap' }}>{formatNumber(p.price)} F</b>
            </button>
          );
        })}
      </div>

      {pack && (
        <div style={{ position: 'sticky', bottom: 'calc(84px + env(safe-area-inset-bottom, 0px))', marginTop: 16, zIndex: 5 }}>
          <button onClick={() => handlePurchase(pack.id)} disabled={loading !== null} className="drl-btn"
            style={{ width: '100%', minHeight: 54, borderRadius: 999, border: 0, background: palette.primary, color: DC.ink, fontSize: 16, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 10px 30px rgba(0,0,0,.35)' }}>
            {loading ? <><Loader2 size={18} className="animate-spin" aria-hidden="true" /> Ouverture du paiement…</> : <>Payer {formatNumber(pack.price)} F · {credits(pack.koris)}</>}
          </button>
        </div>
      )}
      <p style={{ margin: '10px 0 0', textAlign: 'center', fontSize: 13, lineHeight: 1.5, color: DC.muted }}>Wave, Orange Money ou carte, via PayTech. Health-e ne voit jamais tes codes.</p>

      <section aria-label="Comment ça marche" style={{ ...card, marginTop: 16 }}>
        <ul style={{ margin: 0, paddingLeft: 18, listStyle: 'disc', display: 'flex', flexDirection: 'column', gap: 6, fontSize: 14, lineHeight: 1.5, color: DC.soft }}>
          <li>Tes {CREDIT.many} arrivent tout de suite sur ton solde.</li>
          <li>Elles n'expirent jamais : utilise-les à ton rythme.</li>
          <li>Chaque jour, un petit cadeau t'attend sur l'accueil. Et en invitant un proche, vous en gagnez chacun.</li>
          <li>Noter ton humeur, respirer, lire tes résultats : toujours gratuit.</li>
        </ul>
      </section>
    </DrLoShell>
  );
};

export default AcheterKorisPage;
