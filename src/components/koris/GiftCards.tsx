/**
 * GiftCards — ce qui fait revenir et inviter, sans jamais forcer :
 *  - DailyGiftCard (accueil) : « Ton cadeau du jour », un tap, quelques étincelles ; disparaît une fois pris ;
 *  - WalletCard (Moi) : le solde, « Recharger », et l'invitation d'un proche (WhatsApp ou copier le lien).
 */
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Gift, Share2, Copy, Check } from 'lucide-react';
import { DC, card } from '../accueil/DrLoShell';
import type { MomentPalette } from '../../utils/drloMoment';
import { useKoris } from '../../contexts/KorisContext';
import { CREDIT, credits } from '../../config/creditName';
import { claimDailyGift, getGiftStatus, inviteMessage, type GiftStatus } from '../../services/korisGiftService';
import { trackAccueil } from '../../utils/accueilTracking';

export const DailyGiftCard: React.FC<{ palette: MomentPalette }> = ({ palette }) => {
  const { refreshBalance } = useKoris();
  const [status, setStatus] = useState<GiftStatus | null>(null);
  const [state, setState] = useState<'idle' | 'busy' | 'done'>('idle');
  const [got, setGot] = useState(0);

  useEffect(() => {
    let off = false;
    getGiftStatus().then(s => { if (!off) setStatus(s); }).catch(() => {});
    return () => { off = true; };
  }, []);

  if (!status) return null;
  if (state !== 'done' && !status.daily.available) return null;

  const claim = async () => {
    setState('busy');
    try {
      const r = await claimDailyGift();
      setGot(r.ok ? (r.credited ?? 0) : 0);
      trackAccueil('go', { to: 'daily_gift', from: 'accueil' });
      refreshBalance().catch(() => {});
    } catch { /* déjà pris ailleurs */ }
    setState('done');
  };

  return (
    <section aria-label="Ton cadeau du jour" style={{ ...card, marginTop: 14, display: 'flex', alignItems: 'center', gap: 12, borderColor: `${DC.gold}66`, background: `linear-gradient(120deg, ${DC.gold}1f, rgba(255,255,255,.03))` }}>
      <span aria-hidden="true" style={{ width: 44, height: 44, flex: 'none', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${DC.gold}26` }}>
        <Gift size={22} color={DC.gold} />
      </span>
      {state === 'done' ? (
        <p role="status" style={{ flex: 1, margin: 0, fontSize: 15, lineHeight: 1.4, color: DC.text }}>
          {got > 0 ? <><b style={{ color: DC.title }}>+{credits(got)}</b> pour aujourd'hui. À demain !</> : 'Ton cadeau du jour est déjà pris. À demain !'}
        </p>
      ) : (
        <>
          <span style={{ flex: 1, lineHeight: 1.35 }}>
            <b style={{ display: 'block', fontSize: 15, color: DC.title }}>Ton cadeau du jour</b>
            <span style={{ fontSize: 14, color: DC.muted }}>+{credits(status.daily.amount)}, chaque jour où tu passes.</span>
          </span>
          <button onClick={claim} disabled={state === 'busy'} className="drl-btn"
            style={{ minHeight: 44, padding: '0 16px', borderRadius: 999, border: 0, background: palette.primary, color: DC.ink, fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
            {state === 'busy' ? '…' : 'Ouvrir'}
          </button>
        </>
      )}
    </section>
  );
};

export const WalletCard: React.FC<{ palette: MomentPalette }> = ({ palette }) => {
  const { balance } = useKoris();
  const [status, setStatus] = useState<GiftStatus | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let off = false;
    getGiftStatus().then(s => { if (!off) setStatus(s); }).catch(() => {});
    return () => { off = true; };
  }, []);

  const ref = status?.referral;
  const share = () => {
    if (!ref) return;
    trackAccueil('go', { to: 'invite_whatsapp', from: 'moi' });
    window.open(`https://wa.me/?text=${encodeURIComponent(inviteMessage(ref.link))}`, '_blank', 'noopener');
  };
  const copy = async () => {
    if (!ref) return;
    try { await navigator.clipboard.writeText(ref.link); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* ignore */ }
  };

  return (
    <section aria-label={CREDIT.mine} style={{ ...card, marginTop: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <img src={CREDIT.img} alt="" width={40} height={40} style={{ borderRadius: '50%', objectFit: 'cover', flex: 'none' }} />
        <span style={{ flex: 1, lineHeight: 1.3 }}>
          <span style={{ display: 'block', fontSize: 13, color: DC.muted }}>{CREDIT.mine}</span>
          <b style={{ fontSize: 22, color: DC.title }}>{balance}</b>
        </span>
        <Link to="/acheter-koris" className="drl-btn"
          style={{ minHeight: 44, padding: '0 16px', display: 'inline-flex', alignItems: 'center', borderRadius: 999, border: `1px solid ${DC.gold}88`, color: DC.text, fontSize: 14, fontWeight: 700, textDecoration: 'none' }}>
          Recharger
        </Link>
      </div>

      {ref && (
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${DC.line}` }}>
          <p style={{ margin: 0, fontFamily: 'Fraunces, serif', fontSize: 18, fontWeight: 600, lineHeight: 1.3, color: DC.title }}>Invite un proche, gagnez chacun {credits(ref.reward)}</p>
          <p style={{ margin: '4px 0 0', fontSize: 14, lineHeight: 1.45, color: DC.muted }}>
            Dès son premier test. {ref.joined > 0 ? `${ref.joined} ${ref.joined > 1 ? 'personnes ont' : 'personne a'} déjà rejoint avec ton lien.` : 'Ses réponses restent privées : tu ne vois rien de ses résultats.'}
          </p>
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button onClick={share} className="drl-btn"
              style={{ flex: 1, minHeight: 48, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 999, border: 0, background: palette.primary, color: DC.ink, fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
              <Share2 size={18} aria-hidden="true" /> Inviter sur WhatsApp
            </button>
            <button onClick={copy} aria-label={copied ? 'Lien copié' : 'Copier mon lien'} className="drl-btn"
              style={{ width: 48, minHeight: 48, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 999, border: `1px solid ${DC.line}`, background: 'transparent', color: DC.text, cursor: 'pointer' }}>
              {copied ? <Check size={18} color={DC.sage} aria-hidden="true" /> : <Copy size={18} aria-hidden="true" />}
            </button>
          </div>
        </div>
      )}
    </section>
  );
};
