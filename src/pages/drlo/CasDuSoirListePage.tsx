/**
 * CasDuSoirListePage — /cas-du-soir : la liste des cas (même s'il n'y en a qu'un). Une carte par cas : la couverture,
 * le titre, l'accroche et l'état (« Épisode 3 sur 5 », « Bientôt », « Terminé »).
 * Masquée tant que le serveur ne la dit pas visible (aujourd'hui : le propriétaire seulement). Aucun appel à l'IA.
 */
import React, { useEffect, useState } from 'react';
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

const CasDuSoirListePage: React.FC = () => {
  const palette = usePalette();
  const [liste, setListe] = useState<Liste | null>(null);
  const charger = () => getListe().then(setListe).catch(() => setListe({ visible: false }));
  useEffect(() => { setHistoire(null); void charger(); }, []);

  if (!liste) return <DrLoShell narrow back={{ to: '/', label: 'Retour à l\'accueil' }} palette={palette}><p style={{ marginTop: 60, textAlign: 'center', color: DC.muted }}>Un instant…</p></DrLoShell>;
  if (!liste.visible || !liste.histoires) return <Navigate to="/" replace />;
  const hs = liste.histoires;
  // Deux rayons : la santé mentale, puis la santé sexuelle (un rayon vide ne s'affiche pas)
  const rayons = ([['mentale', 'Santé mentale'], ['sexuelle', 'Santé sexuelle']] as const)
    .map(([cle, titre]) => ({ cle, titre, cas: hs.filter(h => (h.categorie ?? 'mentale') === cle) })).filter(r => r.cas.length);

  return (
    <DrLoShell narrow back={{ to: '/', label: 'Retour à l\'accueil' }} palette={palette}>
      <h1 style={{ margin: '18px 0 0', fontFamily: 'Fraunces, serif', fontSize: 30, lineHeight: 1.15, color: DC.title }}>Le cas du soir</h1>
      <p style={{ margin: '8px 0 18px', fontSize: 15, lineHeight: 1.5, color: DC.soft }}>Une histoire en plusieurs épisodes, un par soir. À la fin de chacun, tu votes : qu'aurais-tu fait ?</p>
      {rayons.map(r => (
      <section key={r.cle} aria-labelledby={`rayon-${r.cle}`}>
      <h2 id={`rayon-${r.cle}`} style={{ margin: '22px 0 10px', fontSize: 13, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: palette.accent }}>{r.titre}</h2>
      <Stack>
        {r.cas.map(h => (
          <ImageCard key={h.id} to={`/cas-du-soir/${h.id}`} image={h.image || IMAGES.casDuSoir} tint={palette.accent}
            fallback={<Moon size={40} color={palette.accent} strokeWidth={1.4} />}
            kicker={`${statutLabel(h.statut, h.parus, h.total, h.ouverture)}${h.adultes ? ' · 18 ans et plus' : ''}`} title={h.titre} line={h.accroche}
            footer={(h.intrigue || h.debloquer) ? (
              <>
                {h.intrigue && <LecteurAudio compact src={h.intrigue} accent={palette.accent} label="Écouter l'intrigue" style={{ marginTop: 0 }} />}
                {h.debloquer ? <DebloquerCas compact id={h.id} titre={h.titre} ouverture={h.ouverture} prix={h.debloquer} accent={palette.accent} onDone={() => { void charger(); }} /> : null}
              </>
            ) : undefined} />
        ))}
      </Stack>
      </section>
      ))}
      <PiedCas avertissement={hs[0]?.avertissement} />
    </DrLoShell>
  );
};

export default CasDuSoirListePage;
