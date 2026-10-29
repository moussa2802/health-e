/**
 * ChannelInvitePage — /c/:id : la page qu'on ouvre en touchant un lien d'invitation (WhatsApp, SMS…).
 * Publique : pas besoin d'être connecté pour la voir. Elle donne envie : photo, nom, promesse, prix, nombre de membres,
 * puis un seul bouton. Elle ne montre jamais les membres ni les publications. Les conditions d'entrée sont vérifiées
 * par le serveur une fois connecté (page /chaines/:id).
 */
import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowRight, Headphones, Loader2, Lock, MessageCircle, Users } from 'lucide-react';
import '../../components/accueil/accueil.css';
import { usePalette } from '../../components/accueil/DrLoShell';
import { RealDrLoPhoto } from '../../components/accueil/RealDrLoBadge';
import ShareChannelButton from '../../components/accueil/ShareChannelButton';
import { useAuth } from '../../contexts/AuthContext';
import { COLOR, FONT } from '../../design/charte';
import { getPublicChannel, type PublicChannel } from '../../services/drloChannelService';

const ChannelInvitePage: React.FC = () => {
  const { id = '' } = useParams<{ id: string }>();
  const palette = usePalette();
  const navigate = useNavigate();
  const { isAuthenticated, authReady } = useAuth();
  const [c, setC] = useState<PublicChannel | null | undefined>(undefined);
  const [error, setError] = useState('');

  useEffect(() => {
    let live = true;
    getPublicChannel(id).then(r => { if (live) setC(r); }).catch(e => { if (live) setError(e instanceof Error ? e.message : 'Erreur'); });
    return () => { live = false; };
  }, [id]);

  const enter = () => navigate(isAuthenticated ? `/chaines/${id}` : `/patient/access?returnTo=${encodeURIComponent(`/chaines/${id}`)}`);
  const initial = (c?.name.trim()[0] || '·').toUpperCase();

  const wrap = (children: React.ReactNode) => (
    <div className="drl-screen drl-page font-sans" style={{ minHeight: '100svh', color: COLOR.text, ['--he-action' as string]: palette.primary } as React.CSSProperties}>
      <div style={{ maxWidth: 520, margin: '0 auto', padding: '0 0 40px' }}>{children}</div>
    </div>
  );

  if (c === undefined && !error) return wrap(<div style={{ display: 'flex', justifyContent: 'center', paddingTop: 120 }}><Loader2 className="animate-spin" aria-label="Chargement" /></div>);
  if (error || c === null || !c) {
    return wrap(
      <div style={{ padding: '120px 24px 0', textAlign: 'center' }}>
        <h1 style={{ margin: 0, fontFamily: FONT.display, fontSize: 26, color: COLOR.title }}>Cette chaîne n'est plus disponible</h1>
        <p style={{ margin: '10px 0 24px', fontSize: 15, color: COLOR.muted, lineHeight: 1.55 }}>{error || 'Le lien est peut-être ancien : la chaîne a été fermée ou n\'existe plus.'}</p>
        <Link to="/" className="drl-btn" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minHeight: 52, padding: '0 26px', borderRadius: 14, background: palette.primary, color: COLOR.onAction, fontWeight: 700, fontSize: 17, textDecoration: 'none' }}>Découvrir Health-e</Link>
      </div>,
    );
  }

  const price = c.price > 0 ? `${c.price} étincelle${c.price > 1 ? 's' : ''} pour entrer, une seule fois` : 'Entrée gratuite';
  const cond: string[] = [];
  if (c.testCount > 0) cond.push(`${c.testCount} test${c.testCount > 1 ? 's' : ''} à faire`);
  if (c.minAge) cond.push(`${c.minAge} ans et plus`);
  if (c.hasTotems) cond.push('certains totems');

  return wrap(
    <>
      <div style={{ position: 'relative', height: 300, overflow: 'hidden', WebkitMaskImage: 'linear-gradient(180deg, #000 55%, transparent 100%)', maskImage: 'linear-gradient(180deg, #000 55%, transparent 100%)', background: c.imageUrl ? `center / cover url(${c.imageUrl})` : `radial-gradient(120% 90% at 20% 10%, ${COLOR.univers.mental}66, transparent 60%), linear-gradient(135deg, ${COLOR.univers.mental}33, rgba(28,20,13,.7))` }}>
        {!c.imageUrl && <span aria-hidden="true" style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT.display, fontSize: 170, fontWeight: 600, color: COLOR.univers.mental, opacity: 0.4 }}>{initial}</span>}
        <div aria-hidden="true" style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(20,15,12,.1) 0%, rgba(20,15,12,.35) 100%)' }} />
        <p style={{ position: 'absolute', top: 18, left: 20, margin: 0, fontSize: 13, fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: COLOR.title, textShadow: '0 1px 8px rgba(0,0,0,.5)' }}>Health-e</p>
      </div>

      <div style={{ padding: '0 22px', marginTop: -64, position: 'relative' }}>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: palette.accent }}>On t'invite à rejoindre une chaîne</p>
        <h1 style={{ margin: '8px 0 0', fontFamily: FONT.display, fontSize: 34, fontWeight: 600, lineHeight: 1.1, color: COLOR.title }}>{c.name}</h1>
        <p style={{ margin: '12px 0 0', fontSize: 17, lineHeight: 1.55, color: COLOR.text }}>{c.description}</p>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 16 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 13px', borderRadius: 999, background: COLOR.glass, border: `1px solid ${COLOR.line}`, fontSize: 14, color: COLOR.text }}>
            <Users size={15} aria-hidden="true" /> {c.memberCount > 0 ? `${c.memberCount} membre${c.memberCount > 1 ? 's' : ''}` : 'Nouvelle chaîne'}
          </span>
          <span style={{ padding: '7px 13px', borderRadius: 999, background: 'rgba(233,200,143,.13)', border: '1px solid rgba(233,200,143,.35)', fontSize: 14, fontWeight: 700, color: COLOR.action }}>{price}</span>
        </div>

        <div style={{ marginTop: 22, display: 'flex', alignItems: 'center', gap: 12, padding: 14, borderRadius: 20, background: COLOR.glass, border: `1px solid ${COLOR.line}` }}>
          <RealDrLoPhoto size={48} palette={palette} />
          <p style={{ margin: 0, fontSize: 15, lineHeight: 1.5, color: COLOR.soft }}><b style={{ color: COLOR.title }}>Dr Lô</b>, médecin, publie lui-même dans cette chaîne et répond à tes commentaires.</p>
        </div>

        <ul style={{ margin: '22px 0 0', padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {[
            { icon: <Headphones size={20} aria-hidden="true" />, title: 'Des vocaux et des textes', text: 'Dr Lô publie dans la durée. Tu écoutes quand tu veux, à ton rythme.' },
            { icon: <MessageCircle size={20} aria-hidden="true" />, title: 'Tu réagis, tu commentes', text: 'Sous ton prénom, un pseudo ou en anonyme : c\'est toi qui choisis.' },
            { icon: <Lock size={20} aria-hidden="true" />, title: 'Ta vie privée reste à toi', text: 'Les membres ne se voient pas entre eux. Dr Lô ne voit jamais tes résultats de tests.' },
          ].map(r => (
            <li key={r.title} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
              <span style={{ width: 42, height: 42, flex: 'none', borderRadius: 12, background: 'rgba(233,200,143,.13)', color: COLOR.action, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{r.icon}</span>
              <span><b style={{ display: 'block', fontSize: 17, color: COLOR.title }}>{r.title}</b><span style={{ fontSize: 15, lineHeight: 1.5, color: COLOR.muted }}>{r.text}</span></span>
            </li>
          ))}
        </ul>

        {cond.length > 0 && <p style={{ margin: '20px 0 0', fontSize: 14, lineHeight: 1.5, color: COLOR.muted }}>Pour entrer : {cond.join(' · ')}. Une fois connecté, on te dit exactement ce qu'il te manque, s'il manque quelque chose.</p>}

        <button type="button" onClick={enter} disabled={!authReady} className="drl-btn"
          style={{ marginTop: 24, width: '100%', minHeight: 56, borderRadius: 16, border: 0, background: palette.primary, color: COLOR.onAction, fontWeight: 700, fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
          {isAuthenticated ? 'Voir la chaîne' : 'Rejoindre la chaîne'} <ArrowRight size={20} aria-hidden="true" />
        </button>
        <p style={{ margin: '10px 0 0', textAlign: 'center', fontSize: 14, color: COLOR.faint }}>{isAuthenticated ? 'Tu verras si tu peux entrer.' : 'Tu crées ton espace Health-e en quelques secondes, ou tu te connectes.'}</p>

        <div style={{ marginTop: 22, display: 'flex', justifyContent: 'center' }}>
          <ShareChannelButton channel={c} />
        </div>
      </div>
    </>,
  );
};

export default ChannelInvitePage;
