/**
 * CasDuSoirListePage — /cas-du-soir : la vitrine des cas, en affiches (deux colonnes) pour les voir tous d'un coup d'œil.
 * Chaque affiche : la couverture, le rayon (santé mentale / sexuelle, 18+), l'état en un mot (Ouvert, la date, Terminé), le titre,
 * l'accroche et le nombre d'épisodes. Les cas ouverts d'abord, puis ceux à venir (le plus proche en premier), puis les terminés.
 * « Débloquer tout de suite » est dans la fiche du cas.
 * Masquée tant que le serveur ne la dit pas visible (aujourd'hui : le propriétaire seulement). Aucun appel à l'IA.
 */
import React, { useEffect, useRef, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import DrLoShell, { DC, usePalette } from '../../components/accueil/DrLoShell';
import { Maj, PiedCas } from '../../components/casdusoir/CdsParts';
import { IMAGES } from '../../config/images';
import { getListe, quandLabel, setHistoire } from '../../services/casDuSoirService';

type Liste = Awaited<ReturnType<typeof getListe>>;

export const statutLabel = (statut: string, parus: number, total: number, ouverture?: number | null) =>
  statut === 'termine' ? 'Terminé' : statut === 'bientot' ? (ouverture ? `Bientôt · ${Maj(quandLabel(ouverture))}` : 'Bientôt') : `Épisode ${parus} sur ${total}`;

type Onglet = 'tous' | 'mentale' | 'sexuelle';
const ONGLETS: { id: Onglet; label: string }[] = [{ id: 'tous', label: 'Tout' }, { id: 'mentale', label: 'Santé mentale' }, { id: 'sexuelle', label: 'Santé sexuelle' }];
const ONGLET_KEY = 'cds_onglet';
const lireOnglet = (): Onglet => { try { const v = sessionStorage.getItem(ONGLET_KEY); return v === 'mentale' || v === 'sexuelle' ? v : 'tous'; } catch { return 'tous'; } };

const RANG: Record<string, number> = { en_cours: 0, bientot: 1, termine: 2 };
type Histoire = NonNullable<Liste['histoires']>[number];
const rang = (h: Histoire) => RANG[h.statut] * 1e15 + (h.statut === 'bientot' ? (h.ouverture ?? 9e14) : 0);

/** Les rayons d'un cas : un seul, ou les deux quand il touche santé mentale ET santé sexuelle. */
const rayonsDe = (h: Histoire): ('mentale' | 'sexuelle')[] => {
  const un = h.categorie ?? 'mentale';
  return h.categorieAussi && h.categorieAussi !== un ? [un, h.categorieAussi] : [un];
};

/** Une affiche : toute la carte est un lien vers le cas. */
const Affiche: React.FC<{ h: Histoire; accent: string }> = ({ h, accent }) => {
  const rayons = rayonsDe(h);
  const etat = h.statut === 'termine' ? 'Terminé' : h.statut === 'bientot' ? (h.ouverture ? Maj(quandLabel(h.ouverture)) : 'Bientôt') : 'Ouvert';
  const ouvert = h.statut === 'en_cours';
  return (
    <Link to={`/cas-du-soir/${h.id}`} className="drl-btn" aria-label={`${h.titre}, ${etat}`}
      style={{ position: 'relative', display: 'block', aspectRatio: '3 / 4.2', borderRadius: 16, overflow: 'hidden', background: '#000', textDecoration: 'none', color: DC.title, minWidth: 0, border: `1px solid ${DC.line}` }}>
      <img src={h.image || IMAGES.casDuSoir} alt="" loading="lazy" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
      <span aria-hidden="true" style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(10,6,3,.55) 0, rgba(10,6,3,0) 30%, rgba(10,6,3,.2) 45%, rgba(10,6,3,.94) 100%)' }} />
      <span style={{ position: 'absolute', inset: 0, padding: 9, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <span style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {rayons.map(r => (
            <span key={r} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 700, letterSpacing: '.03em', borderRadius: 99, padding: '4px 8px', background: 'rgba(19,13,8,.68)', color: r === 'sexuelle' ? DC.intime : DC.sage }}>
              <i aria-hidden="true" style={{ width: 5, height: 5, borderRadius: '50%', background: r === 'sexuelle' ? DC.intime : DC.sage, display: 'inline-block' }} />{r === 'sexuelle' ? 'SANTÉ SEXUELLE' : 'SANTÉ MENTALE'}
            </span>
          ))}
          {h.adultes && <span style={{ fontSize: 10, fontWeight: 700, borderRadius: 99, padding: '4px 8px', background: 'rgba(19,13,8,.68)', color: DC.soft }}>18+</span>}
        </span>
        <span style={{ display: 'block' }}>
          <span style={{ display: 'inline-block', fontSize: 10, fontWeight: 700, borderRadius: 99, padding: '4px 8px', marginBottom: 6, background: ouvert ? accent : 'rgba(19,13,8,.68)', color: ouvert ? '#1C1612' : DC.soft }}>{etat}</span>
          <span style={{ display: 'block', fontFamily: 'Fraunces, serif', fontSize: 16, lineHeight: 1.12, fontWeight: 600, textWrap: 'balance' as React.CSSProperties['textWrap'] }}>{h.titre}</span>
          <span style={{ display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden', marginTop: 4, fontSize: 11, lineHeight: 1.35, color: DC.soft }}>{h.accroche}</span>
          <span style={{ display: 'block', marginTop: 6, fontSize: 10.5, color: DC.soft }}>
            {h.total} épisodes · {h.minutes} min
          </span>
        </span>
      </span>
    </Link>
  );
};

const CasDuSoirListePage: React.FC = () => {
  const palette = usePalette();
  const [liste, setListe] = useState<Liste | null>(null);
  const [onglet, setOnglet] = useState<Onglet>(lireOnglet);
  const barre = useRef<HTMLDivElement | null>(null);
  const choisir = (o: Onglet) => { setOnglet(o); try { sessionStorage.setItem(ONGLET_KEY, o); } catch { /* pas grave */ } };
  // Flèches gauche / droite : on passe d'un onglet à l'autre (clavier et lecteurs d'écran)
  const touche = (e: React.KeyboardEvent) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    const i = ONGLETS.findIndex(o => o.id === onglet); const n = ONGLETS[(i + (e.key === 'ArrowRight' ? 1 : ONGLETS.length - 1)) % ONGLETS.length];
    choisir(n.id); window.setTimeout(() => barre.current?.querySelector<HTMLElement>(`[data-onglet="${n.id}"]`)?.focus(), 0); e.preventDefault();
  };
  const charger = () => getListe().then(setListe).catch(() => setListe({ visible: false }));
  useEffect(() => { setHistoire(null); void charger(); }, []);

  if (!liste) return <DrLoShell narrow backDirect back={{ to: '/', label: 'Retour à l\'accueil' }} palette={palette}><p style={{ marginTop: 60, textAlign: 'center', color: DC.muted }}>Un instant…</p></DrLoShell>;
  if (!liste.visible || !liste.histoires) return <Navigate to="/" replace />;
  const hs = liste.histoires;
  const nb = (o: Onglet) => (o === 'tous' ? hs.length : hs.filter(h => rayonsDe(h).includes(o)).length);
  const affiches = hs.filter(h => onglet === 'tous' || rayonsDe(h).includes(onglet));
  const chip = (actif: boolean): React.CSSProperties => ({ minHeight: 44, padding: '0 16px', borderRadius: 999, cursor: 'pointer', fontSize: 14, fontWeight: 700, whiteSpace: 'nowrap', fontFamily: 'inherit', border: `1px solid ${actif ? palette.accent : DC.line}`, background: actif ? palette.accent : 'transparent', color: actif ? '#1C1612' : DC.text });

  return (
    <DrLoShell narrow backDirect back={{ to: '/', label: 'Retour à l\'accueil' }} palette={palette}>
      <h1 style={{ margin: '18px 0 0', fontFamily: 'Fraunces, serif', fontSize: 30, lineHeight: 1.15, color: DC.title }}>Le cas du soir</h1>
      <p style={{ margin: '8px 0 14px', fontSize: 15, lineHeight: 1.5, color: DC.soft }}>Une histoire en plusieurs épisodes, un par soir. À la fin de chacun, tu votes : qu'aurais-tu fait ?</p>
      <div ref={barre} role="tablist" aria-label="Choisir une catégorie" onKeyDown={touche} style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '2px 0 12px', scrollbarWidth: 'none' }}>
        {ONGLETS.map(o => (
          <button key={o.id} type="button" role="tab" id={`onglet-${o.id}`} data-onglet={o.id} aria-selected={onglet === o.id} aria-controls="cas-panneau" tabIndex={onglet === o.id ? 0 : -1}
            onClick={() => choisir(o.id)} className="drl-btn" style={chip(onglet === o.id)}>{o.label} ({nb(o.id)})</button>
        ))}
      </div>
      <div role="tabpanel" id="cas-panneau" aria-labelledby={`onglet-${onglet}`}>
      {affiches.length === 0 ? (
        <p style={{ margin: '16px 0 0', fontSize: 15, lineHeight: 1.5, color: DC.soft }}>Pas encore de cas dans cette catégorie.</p>
      ) : (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
        {[...affiches].sort((a, b) => rang(a) - rang(b)).map(h => <Affiche key={h.id} h={h} accent={palette.accent} />)}
      </div>
      )}
      </div>
      <PiedCas avertissement={hs[0]?.avertissement} />
    </DrLoShell>
  );
};

export default CasDuSoirListePage;
