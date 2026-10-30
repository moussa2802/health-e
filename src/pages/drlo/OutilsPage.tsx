/**
 * OutilsPage — /outils : « Les outils ». Toutes les pratiques publiées de Dr Lô, avec recherche et thèmes.
 * Porte d'entrée : depuis la boîte à outils, la routine, les vidéos et les chaînes.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Loader2, Search } from 'lucide-react';
import DrLoShell, { DC, card, usePalette } from '../../components/accueil/DrLoShell';
import { useAuth } from '../../contexts/AuthContext';
import { practiceCatalog, typeLabel, type CatalogItem } from '../../services/practiceService';
import { practiceMatches, themesInUse } from '../../utils/practiceFilter';
import { pageTitle, pill, THEME_ORDER, themeLabel } from './outilsShared';

const OutilsPage: React.FC = () => {
  const palette = usePalette();
  const navigate = useNavigate();
  const { isAuthenticated, authReady } = useAuth();
  const [items, setItems] = useState<CatalogItem[] | null>(null);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  const [theme, setTheme] = useState('');
  useEffect(() => { if (authReady && !isAuthenticated) navigate(`/patient/access?returnTo=${encodeURIComponent('/outils')}`, { replace: true }); }, [authReady, isAuthenticated, navigate]);
  useEffect(() => { if (isAuthenticated) practiceCatalog().then(r => setItems(r.items)).catch(e => setError(e instanceof Error ? e.message : 'Erreur')); }, [isAuthenticated]);
  const themes = useMemo(() => themesInUse(items ?? [], THEME_ORDER), [items]);
  const shown = useMemo(() => (items ?? []).filter(i => practiceMatches(i, q, theme, themeLabel)), [items, q, theme]);
  if (!authReady || !isAuthenticated) return null;
  const chip = (on: boolean): React.CSSProperties => ({ minHeight: 44, padding: '0 14px', borderRadius: 999, fontSize: 14, fontWeight: 700, cursor: 'pointer', border: on ? 0 : '1px solid rgba(243,233,220,.25)', background: on ? '#F2B66D' : 'transparent', color: on ? '#1B130C' : DC.soft });
  return (
    <DrLoShell back={{ to: '/espace', label: 'Mon espace' }} palette={palette}>
      <h1 style={pageTitle}>Les outils</h1>
      <label style={{ display: 'flex', alignItems: 'center', gap: 10, minHeight: 48, padding: '0 14px', marginTop: 14, borderRadius: 999, border: `1px solid ${DC.line}`, background: 'rgba(255,255,255,.05)' }}>
        <Search size={18} color={DC.muted} aria-hidden="true" />
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Chercher un outil" aria-label="Chercher un outil" style={{ flex: 1, minWidth: 0, background: 'transparent', border: 0, outline: 'none', color: DC.text, fontSize: 16 }} />
      </label>
      {themes.length > 1 && (
        <div role="group" aria-label="Thèmes" style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
          <button type="button" aria-pressed={!theme} onClick={() => setTheme('')} style={chip(!theme)}>Tout</button>
          {themes.map(t => <button key={t} type="button" aria-pressed={theme === t} onClick={() => setTheme(theme === t ? '' : t)} style={chip(theme === t)}>{themeLabel(t)}</button>)}
        </div>
      )}
      {error && <p role="alert" style={{ marginTop: 16, color: '#F09A7A', fontSize: 15 }}>{error}</p>}
      {!items && !error && <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 50 }}><Loader2 className="animate-spin" aria-label="Chargement" /></div>}
      {items && items.length === 0 && <p style={{ marginTop: 18, fontSize: 15, color: DC.muted }}>Les premiers outils arrivent bientôt.</p>}
      {items && items.length > 0 && shown.length === 0 && <p style={{ marginTop: 18, fontSize: 15, color: DC.muted }}>Aucun outil ne correspond. Essaie un autre mot.</p>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 14 }}>
        {shown.map(it => (
          <Link key={it.id} to={`/pratique/${it.id}?from=/outils`} className="drl-btn" style={{ ...card, padding: 14, display: 'flex', flexDirection: 'column', gap: 6, textDecoration: 'none', color: DC.text }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <b style={{ fontFamily: 'Fraunces, serif', fontSize: 16, fontWeight: 600, color: DC.title }}>{it.title}</b>
              {it.unlocked ? <span style={{ ...pill('rgba(157,191,175,.9)'), marginLeft: 'auto' }}>{it.mode === 'learning' ? 'En cours' : 'Dans ma boîte'}</span>
                : it.learnDays > 0 ? <span style={{ ...pill('#9DBFAF'), marginLeft: 'auto' }}>{it.type === 'carnet' ? `${it.learnDays} jours` : 'Apprendre'}</span> : null}
            </span>
            {it.summary && <span style={{ fontSize: 14, color: DC.muted, lineHeight: 1.4 }}>{it.summary}</span>}
            <span style={{ fontSize: 13, color: '#F2B66D' }}>{typeLabel(it.type)} · {it.minutes} min · {it.free || it.price === 0 ? 'Gratuit' : `${it.price} étincelle${it.price > 1 ? 's' : ''}`}</span>
          </Link>
        ))}
      </div>
    </DrLoShell>
  );
};

export default OutilsPage;
