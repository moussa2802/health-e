/**
 * SeanceVideoVue — une séance en vidéo du « cabinet de Dr Lô » : le dialogue dessiné (2 minutes), puis l'exercice
 * d'une minute. Le bouton de l'exercice est en haut (ceux qui arrivent de TikTok ont déjà vu la vidéo) et revient,
 * mis en avant, à la fin de la vidéo. Visible du propriétaire seulement tant que la séance n'est pas publique.
 */
import React, { useEffect, useRef, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import DrLoShell, { DC, usePalette } from '../../components/accueil/DrLoShell';
import { getListe } from '../../services/casDuSoirService';
import type { SeanceVideo } from '../../data/seances';

export function useSeanceVisible(publique: boolean): boolean | null {
  // En local (npm run dev), toujours visible : pour voir le rendu avant la mise en ligne. Jamais dans le site en ligne.
  const ouvert = publique || import.meta.env.DEV;
  const [visible, setVisible] = useState<boolean | null>(ouvert ? true : null);
  useEffect(() => {
    if (ouvert) return;
    getListe().then(l => setVisible(!!l.proprio)).catch(() => setVisible(false));
  }, [ouvert]);
  return visible;
}

const SeanceVideoVue: React.FC<{ s: SeanceVideo }> = ({ s }) => {
  const palette = usePalette();
  const visible = useSeanceVisible(s.publique);
  const [fini, setFini] = useState(false);
  const suite = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!fini) return;
    const reduit = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    suite.current?.scrollIntoView({ behavior: reduit ? 'auto' : 'smooth', block: 'center' });
  }, [fini]);

  const retour = { to: '/cas-du-soir', label: 'Le cas du soir' };
  if (visible === null) return <DrLoShell narrow backDirect back={retour} palette={palette}><p style={{ marginTop: 60, textAlign: 'center', color: DC.muted }}>Un instant…</p></DrLoShell>;
  if (!visible) return <Navigate to="/" replace />;

  const bouton: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 52, padding: '0 18px', borderRadius: 999, background: palette.accent, color: '#1C1612', fontSize: 16, fontWeight: 700, textDecoration: 'none' };

  return (
    <DrLoShell narrow backDirect back={retour} palette={palette}>
      <p style={{ margin: '18px 0 0', fontSize: 13, fontWeight: 700, letterSpacing: '.08em', color: palette.accent }}>LE CABINET DE DR LÔ · SÉANCE {s.n}{!s.publique && ' · visible par toi seulement'}</p>
      <h1 style={{ margin: '6px 0 6px', fontFamily: 'Fraunces, serif', fontSize: 30, lineHeight: 1.12, color: DC.title }}>{s.titre}</h1>
      <p style={{ margin: '0 0 14px', fontSize: 15, lineHeight: 1.5, color: DC.soft }}>{s.accroche}</p>
      <Link to={s.exercice.lien} className="drl-btn" style={bouton}>{s.exercice.bouton} <ChevronRight size={18} aria-hidden="true" /></Link>

      <video src={s.video} poster={s.affiche} controls playsInline preload="metadata" onEnded={() => setFini(true)}
        aria-label={`Vidéo : ${s.titre}, ${s.minutes} minutes`}
        style={{ display: 'block', width: '100%', maxHeight: '78vh', aspectRatio: '9 / 16', objectFit: 'contain', margin: '16px 0 0', borderRadius: 18, background: '#000' }} />

      <div ref={suite} style={{ marginTop: 16, padding: 16, borderRadius: 18, border: `1px solid ${fini ? palette.accent : DC.line}`, background: DC.glass, transition: 'border-color .6s' }}>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 700, letterSpacing: '.08em', color: palette.accent }}>{fini ? 'ET TOI ?' : 'APRÈS LA VIDÉO'}</p>
        <h2 style={{ margin: '4px 0 6px', fontFamily: 'Fraunces, serif', fontSize: 22, lineHeight: 1.2, color: DC.title }}>{s.exercice.titre}</h2>
        <p style={{ margin: '0 0 14px', fontSize: 15, lineHeight: 1.5, color: DC.soft }}>5 petites situations, une minute. À la fin, ta carte et un conseil de Dr Lô.</p>
        <Link to={s.exercice.lien} className="drl-btn" style={bouton}>{s.exercice.bouton} <ChevronRight size={18} aria-hidden="true" /></Link>
      </div>
      <p style={{ margin: '14px 0 24px', fontSize: 13, lineHeight: 1.5, color: DC.muted }}>Personnages inventés. Une séance ne remplace pas une consultation. En cas d'urgence, appelle le SAMU (1515).</p>
    </DrLoShell>
  );
};

export default SeanceVideoVue;
