/**
 * CasDuSoirCard — « Le cas du soir » sur l'accueil : une vitrine, pas une carte générique.
 *   - le cas du moment en grand (sa couverture, son titre), avec UN bouton : « Reprendre · épisode 4 » (ou « Commencer l'histoire »),
 *     et l'heure de la suite quand il faut attendre ;
 *   - dessous, la rangée de tous les cas (affiches) : un coup d'œil, et on voit qu'il y en a d'autres.
 * N'apparaît que si le serveur répond « visible ». Aucun appel à l'IA.
 */
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { SectionTitle } from '../accueil/HomeParts';
import { DC } from '../accueil/DrLoShell';
import { Maj } from './CdsParts';
import { IMAGES } from '../../config/images';
import { getEpisodesDe, getEtatDuMoment, getListe, quandLabel, type CdsEtat } from '../../services/casDuSoirService';

// Réponse gardée sur le téléphone : 10 minutes si visible, 6 heures si masqué (pour ne pas interroger le serveur à chaque accueil)
const CACHE = 'he_cds_etat_v2';
const read = (): CdsEtat | null => {
  try {
    const c = JSON.parse(localStorage.getItem(CACHE) || 'null') as { at: number; e: CdsEtat } | null;
    if (!c) return null;
    return Date.now() - c.at < (c.e.visible ? 10 * 60000 : 6 * 3600000) ? c.e : null;
  } catch { return null; }
};

type Liste = NonNullable<Awaited<ReturnType<typeof getListe>>['histoires']>;
type Episodes = Awaited<ReturnType<typeof getEpisodesDe>>;
const RANG: Record<string, number> = { en_cours: 0, bientot: 1, termine: 2 };

const CasDuSoirCard: React.FC<{ accent: string }> = ({ accent }) => {
  const [etat, setEtat] = useState<CdsEtat | null>(read);
  const [liste, setListe] = useState<Liste | null>(null);
  const [eps, setEps] = useState<Episodes | null>(null);
  useEffect(() => {
    if (read()) return;
    getEtatDuMoment().then(st => { setEtat(st); try { localStorage.setItem(CACHE, JSON.stringify({ at: Date.now(), e: st })); } catch { /* ignore */ } }).catch(() => {});
  }, []);
  const h = etat?.visible ? etat.histoire : undefined;
  const hid = h?.id;
  useEffect(() => {
    if (!hid) return;
    getListe().then(l => setListe(l.histoires ?? null)).catch(() => {});
    getEpisodesDe(hid).then(setEps).catch(() => {});
  }, [hid]);
  if (!h) return null;

  const episodes = eps?.episodes ?? [];
  const lus = episodes.filter(e => e.etat === 'lu').length;
  const courant = episodes.find(e => e.etat === 'a_lire') ?? null;
  const prochain = episodes.find(e => e.etat === 'prochain') ?? null;
  const quand = prochain?.parution ? Maj(quandLabel(prochain.parution)) : 'Demain soir';
  const kicker = courant && lus > 0 ? `CE SOIR · ÉPISODE ${courant.n} SUR ${h.total}` : !courant && prochain ? 'LA SUITE ARRIVE' : 'LE CAS DU SOIR';
  const sous = courant && lus > 0
    ? `${courant.titre ?? ''}${prochain ? ` · épisode ${prochain.n} : ${quand.toLowerCase()}, gratuit` : ''}`
    : !courant && prochain ? `Épisode ${prochain.n} : ${quand.toLowerCase()}, gratuit` : h.accroche;
  const cible = courant ? `/cas-du-soir/${h.id}/${courant.n}` : eps?.finie ? `/cas-du-soir/${h.id}/lecon` : `/cas-du-soir/${h.id}`;
  const libelle = courant ? (lus > 0 ? `Reprendre · épisode ${courant.n}` : 'Commencer l\'histoire') : eps?.finie ? 'La leçon de Dr Lô' : 'Voir le cas';
  const cas = liste ? [...liste].sort((a, b) => RANG[a.statut] - RANG[b.statut] || (a.ouverture ?? 0) - (b.ouverture ?? 0)) : [];

  return (
    <>
      <SectionTitle>Le cas du soir</SectionTitle>
      <section aria-label={h.titre} style={{ position: 'relative', height: 280, borderRadius: 20, overflow: 'hidden', background: '#000', border: `1px solid ${DC.line}` }}>
        <img src={h.image || IMAGES.casDuSoir} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
        <span aria-hidden="true" style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(10,6,3,.5) 0, rgba(10,6,3,0) 28%, rgba(10,6,3,.2) 45%, rgba(10,6,3,.94) 100%)' }} />
        <div style={{ position: 'absolute', inset: 0, padding: 14, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <span style={{ alignSelf: 'flex-start', fontSize: 10.5, fontWeight: 700, letterSpacing: '.05em', borderRadius: 99, padding: '5px 10px', background: 'rgba(19,13,8,.68)', color: accent }}>{kicker}{etat?.apercu ? ' · APERÇU' : ''}</span>
          <div>
            <h2 style={{ margin: '0 0 4px', fontFamily: 'Fraunces, serif', fontSize: 24, lineHeight: 1.1, fontWeight: 600, color: DC.title, textWrap: 'balance' as React.CSSProperties['textWrap'] }}>{h.titre}</h2>
            <p style={{ margin: 0, fontSize: 13, lineHeight: 1.4, color: DC.soft, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{sous}</p>
            <Link to={cible} className="drl-btn" style={{ marginTop: 12, minHeight: 48, borderRadius: 999, background: accent, color: '#1C1612', fontSize: 15, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}>{libelle}</Link>
          </div>
        </div>
      </section>

      {cas.length > 1 && (
        <>
          <SectionTitle aside={<Link to="/cas-du-soir" style={{ fontSize: 14, fontWeight: 700, color: DC.gold, textDecoration: 'none', minHeight: 44, display: 'inline-flex', alignItems: 'center' }}>Tout voir</Link>}>Les cas du soir</SectionTitle>
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', margin: '0 -18px', padding: '0 18px 4px', scrollbarWidth: 'none' }}>
            {cas.map(c => {
              const etatCas = c.statut === 'termine' ? 'Terminé' : c.statut === 'bientot' ? (c.ouverture ? Maj(quandLabel(c.ouverture)) : 'Bientôt') : 'Ouvert';
              return (
                <Link key={c.id} to={`/cas-du-soir/${c.id}`} aria-label={`${c.titre}, ${etatCas}`} className="drl-btn"
                  style={{ position: 'relative', flex: '0 0 112px', aspectRatio: '3 / 4.2', borderRadius: 14, overflow: 'hidden', background: '#000', textDecoration: 'none', color: DC.title, border: `1px solid ${DC.line}` }}>
                  <img src={c.image || IMAGES.casDuSoir} alt="" loading="lazy" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                  <span aria-hidden="true" style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(10,6,3,.4), rgba(10,6,3,0) 35%, rgba(10,6,3,.92))' }} />
                  <span style={{ position: 'absolute', left: 6, top: 6, display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 9, fontWeight: 700, borderRadius: 99, padding: '3px 7px', background: c.statut === 'en_cours' ? accent : 'rgba(19,13,8,.7)', color: c.statut === 'en_cours' ? '#1C1612' : DC.soft }}>{etatCas}</span>
                    {c.adultes && <span style={{ fontSize: 9, fontWeight: 700, borderRadius: 99, padding: '3px 7px', background: 'rgba(19,13,8,.7)', color: DC.soft }}>18+</span>}
                  </span>
                  <span style={{ position: 'absolute', left: 8, right: 8, bottom: 8, fontFamily: 'Fraunces, serif', fontSize: 12.5, lineHeight: 1.1, fontWeight: 600, textWrap: 'balance' as React.CSSProperties['textWrap'] }}>{c.titre}</span>
                </Link>
              );
            })}
          </div>
        </>
      )}
    </>
  );
};

export default CasDuSoirCard;
