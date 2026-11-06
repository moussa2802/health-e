/**
 * GiftCards — ce qui fait revenir et inviter, sans jamais forcer :
 *  - DailyGiftCard (accueil) : « Ton cadeau du jour », un tap, quelques étincelles ; disparaît une fois pris ;
 *  - WalletCard (Moi) : le solde, « Recharger », et l'invitation d'un proche (WhatsApp ou copier le lien).
 */
import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Gift, Share2, Copy, Check, Lock } from 'lucide-react';
import { DC, card } from '../accueil/DrLoShell';
import type { MomentPalette } from '../../utils/drloMoment';
import { useKoris } from '../../contexts/KorisContext';
import { CREDIT, credits } from '../../config/creditName';
import { claimDailyGift, getGiftStatus, inviteMessage, type GiftStatus } from '../../services/korisGiftService';
import { trackAccueil } from '../../utils/accueilTracking';

/** Un petit carillon (synthétisé, aucun fichier) : deux notes douces qui montent. */
function chime(c: AudioContext | null) {
  if (!c) return;
  try {
    const t = c.currentTime + 0.05;
    [[880, 0], [1318.5, 0.12], [1760, 0.24]].forEach(([f, d]) => {
      const o = c.createOscillator(); const g = c.createGain();
      o.type = 'sine'; o.frequency.value = f;
      g.gain.setValueAtTime(0, t + d);
      g.gain.linearRampToValueAtTime(0.18, t + d + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + d + 0.9);
      o.connect(g).connect(c.destination); o.start(t + d); o.stop(t + d + 1);
    });
  } catch { /* pas de son, ce n'est pas grave */ }
}

/** Le solde qui monte, de « avant » à « après », avec quelques étincelles. */
const BalanceRise: React.FC<{ from: number; to: number }> = ({ from, to }) => {
  const [n, setN] = useState(from);
  const reduce = typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  useEffect(() => {
    if (reduce || to <= from) { setN(to); return; }
    const steps = to - from; const per = Math.max(120, Math.min(320, 1400 / steps));
    let i = 0;
    const iv = window.setInterval(() => { i += 1; setN(from + i); if (from + i >= to) window.clearInterval(iv); }, per);
    return () => window.clearInterval(iv);
  }, [from, to, reduce]);
  const done = n >= to;
  return (
    <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: 10 }}>
      <style>{'@keyframes heGiftPop{0%{transform:scale(1)}40%{transform:scale(1.28)}100%{transform:scale(1)}}@keyframes heGiftSpark{0%{opacity:0;transform:translate(0,0) scale(.4)}30%{opacity:1}100%{opacity:0;transform:translate(var(--dx),var(--dy)) scale(1)}}'}</style>
      <img src={CREDIT.img} alt="" width={34} height={34} style={{ borderRadius: '50%', objectFit: 'cover', animation: done && !reduce ? 'heGiftPop .5s ease-out' : undefined }} />
      <span aria-hidden="true" style={{ fontSize: 15, color: DC.muted, fontVariantNumeric: 'tabular-nums' }}>{from}</span>
      <span aria-hidden="true" style={{ color: DC.gold, fontSize: 15 }}>→</span>
      <b key={done ? 'd' : 'n'} style={{ fontSize: 28, lineHeight: 1, color: DC.gold, fontVariantNumeric: 'tabular-nums', animation: done && !reduce ? 'heGiftPop .5s ease-out' : undefined }}>{n}</b>
      {done && !reduce && [[-26, -30], [18, -38], [40, -14], [-40, -8], [6, -46]].map(([dx, dy], i) => (
        <span key={i} aria-hidden="true" style={{ position: 'absolute', left: 16, top: 6, width: 6, height: 6, borderRadius: '50%', background: DC.gold, boxShadow: `0 0 8px ${DC.gold}`, ['--dx' as string]: `${dx}px`, ['--dy' as string]: `${dy}px`, animation: `heGiftSpark .9s ${i * 0.05}s ease-out forwards`, opacity: 0 } as React.CSSProperties} />
      ))}
    </span>
  );
};

export const DailyGiftCard: React.FC<{ palette?: MomentPalette }> = () => {
  const { refreshBalance, balance } = useKoris();
  const [rise, setRise] = useState<{ from: number; to: number } | null>(null);
  const audio = useRef<AudioContext | null>(null);
  const [status, setStatus] = useState<GiftStatus | null>(null);
  const [state, setState] = useState<'idle' | 'busy' | 'done'>('idle');
  const [got, setGot] = useState(0);

  useEffect(() => {
    let off = false;
    getGiftStatus().then(s => { if (!off) setStatus(s); }).catch(() => {});
    return () => { off = true; };
  }, []);

  if (!status) return null;
  const d = status.daily;
  const needed = d.needed ?? 3;
  const streak = d.streak ?? 0;
  if (state !== 'done' && !d.available && (d.claimedToday || streak >= needed)) return null;

  // Pas encore (ou plus) de cadeau : la série à construire, jour par jour
  if (state !== 'done' && !d.available) {
    return (
      <section aria-label="Ton cadeau du jour" style={{ ...card, marginTop: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
        <span aria-hidden="true" style={{ width: 44, height: 44, flex: 'none', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,.06)' }}>
          <Lock size={20} color={DC.muted} />
        </span>
        <span style={{ flex: 1, lineHeight: 1.35 }}>
          <b style={{ display: 'block', fontSize: 15, color: DC.title }}>{d.lost ? 'Ta série s\'est arrêtée' : 'Ton cadeau du jour'}</b>
          <span style={{ fontSize: 14, color: DC.muted }}>
            {d.lost
              ? `Reviens ${needed} jours d'affilée pour retrouver tes ${credits(d.amount)} par jour.`
              : `Reviens ${needed} jours d'affilée pour le débloquer : +${credits(d.amount)} chaque jour ensuite.`}
          </span>
          <span role="img" aria-label={`Jour ${streak} sur ${needed}`} style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
            {Array.from({ length: needed }, (_, i) => (
              <span key={i} style={{ width: 22, height: 6, borderRadius: 3, background: i < streak ? DC.gold : 'rgba(255,255,255,.12)' }} />
            ))}
            <span style={{ marginLeft: 4, fontSize: 13, color: DC.faint }}>Jour {streak} sur {needed} · à demain !</span>
          </span>
        </span>
      </section>
    );
  }

  const claim = async () => {
    setState('busy');
    // Le son doit être préparé pendant le toucher (iPhone), il joue quand les étincelles arrivent
    try {
      const C = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (C && !audio.current) audio.current = new C();
      audio.current?.resume().catch(() => {});
    } catch { /* pas de son */ }
    try {
      const r = await claimDailyGift();
      const credited = r.ok ? (r.credited ?? 0) : 0;
      setGot(credited);
      if (credited > 0) {
        const to = typeof r.balance === 'number' ? r.balance : balance + credited;
        setRise({ from: Math.max(0, to - credited), to });
        chime(audio.current);
        navigator.vibrate?.([30, 60, 30]);
      }
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
        got > 0 && rise ? (
          <span role="status" aria-label={`+${credits(got)} : tu as maintenant ${rise.to} ${CREDIT.many}`} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <BalanceRise from={rise.from} to={rise.to} />
            <span style={{ fontSize: 14, color: DC.muted }}><b style={{ color: DC.title }}>+{credits(got)}</b> pour aujourd'hui. Reviens demain : si tu sautes un jour, il faudra {needed} jours d'affilée pour le retrouver.</span>
          </span>
        ) : (
          <p role="status" style={{ flex: 1, margin: 0, fontSize: 15, lineHeight: 1.4, color: DC.text }}>
            {got > 0 ? <><b style={{ color: DC.title }}>+{credits(got)}</b> pour aujourd'hui. À demain !</> : 'Ton cadeau du jour est déjà pris. À demain !'}
          </p>
        )
      ) : (
        <>
          <span style={{ flex: 1, lineHeight: 1.35 }}>
            <b style={{ display: 'block', fontSize: 15, color: DC.title }}>Ton cadeau du jour</b>
            <span style={{ fontSize: 14, color: DC.muted }}>+{credits(d.amount)} · {streak} jours d'affilée. Reviens demain pour le garder.</span>
          </span>
          <button onClick={claim} disabled={state === 'busy'} className="drl-btn"
            style={{ minHeight: 44, padding: '0 16px', borderRadius: 999, border: `1px solid ${DC.gold}99`, background: 'transparent', color: DC.text, fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
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
