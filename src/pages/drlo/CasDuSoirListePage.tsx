/**
 * CasDuSoirListePage — /cas-du-soir : la liste des cas (même s'il n'y en a qu'un). Une carte par cas : la couverture,
 * le titre, l'accroche et l'état (« Épisode 3 sur 5 », « Bientôt », « Terminé »).
 * Masquée tant que le serveur ne la dit pas visible (aujourd'hui : le propriétaire seulement). Aucun appel à l'IA.
 */
import React, { useEffect, useRef, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Moon } from 'lucide-react';
import DrLoShell, { DC, usePalette } from '../../components/accueil/DrLoShell';
import { ImageCard, Stack } from '../../components/accueil/HomeParts';
import { DebloquerCas, Maj, PiedCas } from '../../components/casdusoir/CdsParts';
import LecteurAudio from '../../components/casdusoir/LecteurAudio';
import { IMAGES } from '../../config/images';
import { getListe, quandLabel, setHistoire } from '../../services/casDuSoirService';

type Liste = Awaited<ReturnType<typeof getListe>>;

export const statutLabel = (statut: string, parus: number, total: number, ouverture?: number | null) =>
  statut === 'termine' ? 'Terminé' : statut === 'bientot' ? (ouverture ? `Bientôt · ${Maj(quandLabel(ouverture))}` : 'Bientôt') : `Épisode ${parus} sur ${total}`;

type Onglet = 'tous' | 'mentale' | 'sexuelle';
const ONGLETS: { id: Onglet; label: string }[] = [{ id: 'tous', label: 'Tout' }, { id: 'mentale', label: 'Santé mentale' }, { id: 'sexuelle', label: 'Santé sexuelle' }];
const ONGLET_KEY = 'cds_onglet';
const lireOnglet = (): Onglet => { try { const v = sessionStorage.getItem(ONGLET_KEY); return v === 'mentale' || v === 'sexuelle' ? v : 'tous'; } catch { return 'tous'; } };

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

  if (!liste) return <DrLoShell narrow back={{ to: '/', label: 'Retour à l\'accueil' }} palette={palette}><p style={{ marginTop: 60, textAlign: 'center', color: DC.muted }}>Un instant…</p></DrLoShell>;
  if (!liste.visible || !liste.histoires) return <Navigate to="/" replace />;
  const hs = liste.histoires;
  const nb = (o: Onglet) => (o === 'tous' ? hs.length : hs.filter(h => (h.categorie ?? 'mentale') === o).length);
  const affiches = hs.filter(h => onglet === 'tous' || (h.categorie ?? 'mentale') === onglet);
  const nomCategorie = (h: (typeof hs)[number]) => ((h.categorie ?? 'mentale') === 'sexuelle' ? 'Santé sexuelle' : 'Santé mentale');
  const chip = (actif: boolean): React.CSSProperties => ({ minHeight: 44, padding: '0 16px', borderRadius: 999, cursor: 'pointer', fontSize: 14, fontWeight: 700, whiteSpace: 'nowrap', fontFamily: 'inherit', border: `1px solid ${actif ? palette.accent : DC.line}`, background: actif ? palette.accent : 'transparent', color: actif ? '#1C1612' : DC.text });

  return (
    <DrLoShell narrow back={{ to: '/', label: 'Retour à l\'accueil' }} palette={palette}>
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
      <Stack>
        {affiches.map(h => (
          <ImageCard key={h.id} to={`/cas-du-soir/${h.id}`} image={h.image || IMAGES.casDuSoir} tint={palette.accent}
            fallback={<Moon size={40} color={palette.accent} strokeWidth={1.4} />}
            kicker={`${statutLabel(h.statut, h.parus, h.total, h.ouverture)}${h.adultes ? ' · 18 ans et plus' : ''}${onglet === 'tous' ? ` · ${nomCategorie(h)}` : ''} · ${h.stats?.lecteurs ? `${h.stats.lecteurs} lecteurs` : 'Nouveau'}`} title={h.titre} line={h.accroche}
            footer={(h.intrigue || h.debloquer) ? (
              <>
                {h.intrigue && <LecteurAudio compact src={h.intrigue} accent={palette.accent} label="Écouter l'intrigue" style={{ marginTop: 0 }} />}
                {h.debloquer ? <DebloquerCas compact id={h.id} titre={h.titre} ouverture={h.ouverture} prix={h.debloquer} accent={palette.accent} onDone={() => { void charger(); }} /> : null}
              </>
            ) : undefined} />
        ))}
      </Stack>
      )}
      </div>
      <PiedCas avertissement={hs[0]?.avertissement} />
    </DrLoShell>
  );
};

export default CasDuSoirListePage;
