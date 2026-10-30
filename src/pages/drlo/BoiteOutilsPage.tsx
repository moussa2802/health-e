/**
 * BoiteOutilsPage — /boite-a-outils : « Ma boîte à outils ». Les outils appris (ou gardés tout de suite), pour les moments où on en a besoin.
 * Aucun rappel : la personne vient ici, ou Dr Lô IA le lui rappelle. Les carnets sont à part.
 */
import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import DrLoShell, { DC, card, usePalette } from '../../components/accueil/DrLoShell';
import { useAuth } from '../../contexts/AuthContext';
import { myPractices, setPracticeMode, type Mine, type MineItem } from '../../services/practiceService';
import { kicker, pageTitle, themeLabel, TypeIcon } from './outilsShared';

const BoiteOutilsPage: React.FC = () => {
  const palette = usePalette();
  const navigate = useNavigate();
  const { isAuthenticated, authReady } = useAuth();
  const [mine, setMine] = useState<Mine | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const load = () => myPractices().then(m => { setMine(m); setError(''); }).catch(e => setError(e instanceof Error ? e.message : 'Erreur'));
  useEffect(() => { if (authReady && !isAuthenticated) navigate(`/patient/access?returnTo=${encodeURIComponent('/boite-a-outils')}`, { replace: true }); }, [authReady, isAuthenticated, navigate]);
  useEffect(() => { if (isAuthenticated) load(); }, [isAuthenticated]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!authReady || !isAuthenticated) return null;
  const tools = (mine?.toolbox ?? []).filter(i => i.type !== 'carnet');
  const carnets = (mine?.toolbox ?? []).filter(i => i.type === 'carnet');
  const restore = async (it: MineItem) => { setBusy(it.id); try { await setPracticeMode(it.id, 'toolbox'); await load(); } catch (e) { setError(e instanceof Error ? e.message : 'Erreur'); } finally { setBusy(''); } };
  return (
    <DrLoShell back={{ to: '/espace', label: 'Mon espace' }} palette={palette}>
      <h1 style={pageTitle}>Ma boîte à outils</h1>
      <p style={{ margin: '10px 0 0', fontSize: 15, color: DC.soft, lineHeight: 1.5 }}>Pour les moments où tu en as besoin. Un tap, et c'est lancé.</p>
      {error && <p role="alert" style={{ marginTop: 16, color: '#F09A7A', fontSize: 15 }}>{error}</p>}
      {!mine && !error && <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 50 }}><Loader2 className="animate-spin" aria-label="Chargement" /></div>}
      {mine && (
        <>
          <h2 style={kicker}>Tout de suite</h2>
          {tools.length === 0 ? (
            <p style={{ margin: '10px 0 0', fontSize: 15, color: DC.muted, lineHeight: 1.5 }}>Ta boîte est vide pour l'instant. Quand tu as appris un outil, il vient ici.</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10, marginTop: 10 }}>
              {tools.map(it => (
                <Link key={it.id} to={`/pratique/${it.id}?from=/boite-a-outils`} className="drl-btn" style={{ ...card, padding: 14, minHeight: 118, display: 'flex', flexDirection: 'column', gap: 6, textDecoration: 'none', color: DC.text }}>
                  <TypeIcon type={it.type} size={26} />
                  <b style={{ fontSize: 15, lineHeight: 1.25 }}>{it.title}</b>
                  <span style={{ fontSize: 13, color: DC.muted }}>{it.minutes} min · {themeLabel(it.theme).toLowerCase()}</span>
                </Link>
              ))}
            </div>
          )}
          {carnets.length > 0 && (
            <>
              <h2 style={kicker}>Mes carnets</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 10 }}>
                {carnets.map(it => (
                  <Link key={it.id} to={`/pratique/${it.id}?from=/boite-a-outils`} className="drl-btn" style={{ ...card, padding: 14, display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none', color: DC.text }}>
                    <TypeIcon type="carnet" color="#9DBFAF" size={26} />
                    <span style={{ flex: 1 }}><b style={{ display: 'block', fontSize: 15 }}>{it.title}</b><span style={{ fontSize: 13, color: DC.muted }}>Terminé</span></span>
                    <span style={{ fontSize: 14, fontWeight: 700, color: palette.accent }}>Revoir</span>
                  </Link>
                ))}
              </div>
            </>
          )}
          {mine.dropped.length > 0 && (
            <details style={{ marginTop: 22 }}>
              <summary style={{ fontSize: 14, color: DC.muted, cursor: 'pointer', minHeight: 44, display: 'flex', alignItems: 'center' }}>Mis de côté ({mine.dropped.length})</summary>
              {mine.dropped.map(it => (
                <div key={it.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0' }}>
                  <span style={{ flex: 1, fontSize: 14, color: DC.soft }}>{it.title}</span>
                  <button type="button" disabled={busy === it.id} onClick={() => restore(it)} style={{ minHeight: 44, background: 'none', border: 0, color: palette.accent, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>Remettre</button>
                </div>
              ))}
            </details>
          )}
          <Link to="/outils" className="drl-btn" style={{ marginTop: 22, minHeight: 50, borderRadius: 999, border: '1px solid rgba(242,182,109,.6)', color: '#F2B66D', fontWeight: 700, fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}>Trouver d'autres outils</Link>
          <Link to="/routine" style={{ display: 'block', marginTop: 14, textAlign: 'center', fontSize: 14, color: DC.muted }}>Voir ma routine</Link>
        </>
      )}
    </DrLoShell>
  );
};

export default BoiteOutilsPage;
