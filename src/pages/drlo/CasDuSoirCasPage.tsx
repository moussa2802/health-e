/**
 * CasDuSoirCasPage — /cas-du-soir/:id : la fiche d'un cas, comme celle d'une série : une vitrine (couverture, rayons, titre, accroche),
 * un seul gros bouton « Reprendre », la progression en barre, puis les épisodes en lignes compactes (lu, à lire, gratuit demain soir ou
 * tout de suite pour des étincelles, verrouillé) et la leçon de Dr Lô à la fin. Après l'embranchement,
 * chacun voit la version de SON choix à l'épisode 3 ; avant d'avoir voté, « ta suite dépend de ton choix ». En bas : la leçon, le quiz, les tests, l'autre fin.
 * Le bandeau d'aperçu du propriétaire (jours 1 à 5) est ici.
 */
import React, { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { Check, Hourglass, Lock, Moon, Play } from 'lucide-react';
import DrLoShell, { DC, card, usePalette } from '../../components/accueil/DrLoShell';
import { BandeauApercu, ChiffresProprio, DebloquerCas, FenetreConfirmer, GateAdultes, PartagerCas, PiedCas, etoiles, gratuitEpisode, Maj } from '../../components/casdusoir/CdsParts';
import AudioSynchro from '../../components/casdusoir/AudioSynchro';
import { useKoris } from '../../contexts/KorisContext';
import { CAS_DU_SOIR_PRIX } from '../../config/contenusPayants';
import {
  acheterAutreFin, avancer, CdsError, getEpisodes, getEtat, noterGeste, quandLabel, setHistoire,
  type CdsEpisodeCarte, type CdsEtat,
} from '../../services/casDuSoirService';

type Episodes = Awaited<ReturnType<typeof getEpisodes>>;

const ligneStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 10, padding: 8, borderRadius: 14, border: '1px solid transparent', color: DC.text, textAlign: 'left' };
const vignette: React.CSSProperties = { width: 66, height: 49, borderRadius: 10, overflow: 'hidden', flex: 'none', background: '#000', display: 'block' };
const petit: React.CSSProperties = { display: 'block', fontSize: 10, letterSpacing: '.05em', color: DC.faint };
const titreLigne: React.CSSProperties = { display: 'block', margin: '1px 0 2px', fontFamily: 'Fraunces, serif', fontSize: 15, lineHeight: 1.15, fontWeight: 600, color: DC.title };
const sousLigne: React.CSSProperties = { display: 'block', fontSize: 12, lineHeight: 1.35, color: DC.soft };
const rondIcone: React.CSSProperties = { width: 22, height: 22, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 };

const CasDuSoirCasPage: React.FC = () => {
  const { id = '' } = useParams();
  const palette = usePalette();
  const navigate = useNavigate();
  const { openNoKorisModal, refreshBalance } = useKoris();
  const [etat, setEtat] = useState<CdsEtat | null>(null);
  const [eps, setEps] = useState<Episodes | null>(null);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [intrigue, setIntrigue] = useState(false);
  // Toute dépense passe par la fenêtre de confirmation (prix + « si tu attends, c'est gratuit »)
  const [confirme, setConfirme] = useState<{ what: 'suite' | 'autreFin'; n?: number; parution?: number | null } | null>(null);

  const load = () => {
    setHistoire(id);
    getEtat().then(setEtat).catch(() => setEtat({ visible: false }));
    getEpisodes().then(setEps).catch(e => setError(e instanceof Error ? e.message : 'Erreur'));
  };
  useEffect(() => { load(); setHistoire(id); noterGeste('page'); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!etat) return <DrLoShell narrow backDirect back={{ to: '/cas-du-soir', label: 'Retour aux cas' }} palette={palette}><p style={{ marginTop: 60, textAlign: 'center', color: DC.muted }}>Un instant…</p></DrLoShell>;
  if (!etat.visible || !etat.histoire) return <Navigate to="/" replace />;
  const h = etat.histoire;
  const prix = eps?.prix ?? etat.prix ?? CAS_DU_SOIR_PRIX;

  const pay = async (what: 'suite' | 'autreFin', n?: number) => {
    setBusy(what); setError('');
    try {
      if (what === 'suite' && n) { await avancer(n); refreshBalance?.(); setConfirme(null); navigate(`/cas-du-soir/${id}/${n}`); return; }
      if (what === 'autreFin') { await acheterAutreFin(); refreshBalance?.(); setConfirme(null); load(); }
    } catch (e) {
      if (e instanceof CdsError && e.status === 402) setConfirme(null);
      if (e instanceof CdsError && e.status === 402) openNoKorisModal(what === 'suite' ? 'Lire la suite du cas du soir' : 'L\'autre fin du cas du soir', what === 'suite' ? (n ? prix.suite[n] ?? 0 : 0) : prix.autreFin);
      setError(e instanceof Error ? e.message : 'Erreur');
    } finally { setBusy(''); }
  };

  const rayons = ((): ('mentale' | 'sexuelle')[] => { const un = h.categorie ?? 'mentale'; return h.categorieAussi && h.categorieAussi !== un ? [un, h.categorieAussi] : [un]; })();
  const liste = eps?.episodes ?? [];
  const nbLus = liste.filter(e => e.etat === 'lu').length;
  const courant = liste.find(e => e.etat === 'a_lire') ?? null;
  const prochain = liste.find(e => e.etat === 'prochain') ?? null;

  /** Une ligne d'épisode : miniature, titre, état à droite. Le prochain porte « tout de suite · N étincelles ». */
  const ligne = (e: CdsEpisodeCarte) => {
    if (e.attente) {
      return (
        <Link key={e.n} to={`/cas-du-soir/${id}/3`} className="drl-btn" style={{ ...ligneStyle, textDecoration: 'none' }}>
          <span style={{ ...vignette, display: 'flex', alignItems: 'center', justifyContent: 'center', background: DC.glass }}><Hourglass size={20} color={palette.accent} aria-hidden="true" /></span>
          <span style={{ flex: 1, minWidth: 0 }}>
            <span style={petit}>ÉPISODE {e.n}</span>
            <span style={titreLigne}>Ta suite dépend de ton choix</span>
            <span style={sousLigne}>Vote à l'épisode 3, deux issues possibles</span>
          </span>
        </Link>
      );
    }
    const lien = e.etat === 'lu' || e.etat === 'a_lire' ? `/cas-du-soir/${id}/${e.n}` : undefined;
    const ferme = !lien;
    const encours = courant?.n === e.n;
    const sous = e.etat === 'lu' ? 'Lu' : e.etat === 'a_lire' ? 'À lire'
      : e.etat === 'prochain' ? (e.parution ? `${Maj(quandLabel(e.parution))} · gratuit` : 'Gratuit le lendemain soir de ta première lecture')
      : e.etat === 'compte' ? 'Crée ton espace pour lire la suite'
      : e.parution ? `Paraît ${quandLabel(e.parution)}` : 'Plus loin dans l\'histoire';
    const droite = e.etat === 'lu'
      ? <span aria-hidden="true" style={{ ...rondIcone, background: `${palette.accent}33`, color: palette.accent }}><Check size={13} /></span>
      : e.etat === 'a_lire'
        ? <span aria-hidden="true" style={{ ...rondIcone, width: 30, height: 30, background: palette.accent, color: '#1C1612' }}><Play size={12} /></span>
        : <Lock size={15} color={DC.muted} aria-hidden="true" style={{ flexShrink: 0 }} />;
    const corps = (
      <>
        <span style={{ ...vignette, filter: e.etat === 'verrouille' || e.etat === 'prochain' || e.etat === 'compte' ? 'grayscale(1) brightness(.5)' : undefined }}>
          {e.image ? <img src={e.image} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} /> : <span style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center' }}><Moon size={20} color={palette.accent} aria-hidden="true" /></span>}
        </span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={petit}>ÉPISODE {e.n}</span>
          <span style={{ ...titreLigne, color: ferme ? DC.muted : DC.title }}>{e.titre}</span>
          <span style={sousLigne}>{sous}</span>
          {e.etat === 'prochain' && e.avance?.ok && (
            <button type="button" disabled={!!busy} onClick={() => setConfirme({ what: 'suite', n: e.n, parution: e.parution })} className="drl-btn"
              style={{ marginTop: 6, minHeight: 36, padding: '0 12px', borderRadius: 999, border: 0, background: palette.accent, color: '#1C1612', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
              Tout de suite · {etoiles(e.avance?.prix ?? prix.suite[e.n] ?? 0)}
            </button>
          )}
          {e.etat === 'compte' && <Link to="/espace" style={{ display: 'inline-block', marginTop: 4, fontSize: 13, fontWeight: 700, color: palette.accent, textDecoration: 'none' }}>Créer mon espace</Link>}
        </span>
        {droite}
      </>
    );
    const style = { ...ligneStyle, ...(encours ? { border: `1px solid ${palette.accent}`, background: `${palette.accent}1A` } : null) };
    return lien
      ? <Link key={e.n} to={lien} aria-label={`Épisode ${e.n}, ${e.titre}, ${sous}`} className="drl-btn" style={{ ...style, textDecoration: 'none' }}>{corps}</Link>
      : <div key={e.n} style={style}>{corps}</div>;
  };

  const sousReprise = courant ? null : prochain ? (prochain.parution ? `Prochain épisode : ${quandLabel(prochain.parution)}` : 'Prochain épisode : demain soir') : null;
  const boutonReprise: React.CSSProperties = { flex: 1, minHeight: 50, borderRadius: 999, border: 0, background: palette.accent, color: '#1C1612', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', textAlign: 'center', padding: '0 14px' };

  return (
    <DrLoShell narrow backDirect back={{ to: '/cas-du-soir', label: 'Retour aux cas' }} palette={palette}>
      <GateAdultes actif={!!h.adultes} accent={palette.accent} retour={() => navigate('/cas-du-soir')}>
      {/* La vitrine : la couverture en grand, les rayons, le titre, l'accroche */}
      <div style={{ position: 'relative', margin: '12px -18px 0', height: 290, overflow: 'hidden' }}>
        {h.image ? <img src={h.image} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Moon size={44} color={palette.accent} aria-hidden="true" /></span>}
        <span aria-hidden="true" style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(10,6,3,.35) 0, rgba(10,6,3,0) 25%, rgba(19,13,8,.45) 62%, #130D08 100%)' }} />
        <div style={{ position: 'absolute', left: 18, right: 18, bottom: 8 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {rayons.map(r => (
              <span key={r} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 700, letterSpacing: '.03em', borderRadius: 99, padding: '4px 8px', background: 'rgba(19,13,8,.68)', color: r === 'sexuelle' ? DC.intime : DC.sage }}>
                <i aria-hidden="true" style={{ width: 5, height: 5, borderRadius: '50%', background: r === 'sexuelle' ? DC.intime : DC.sage, display: 'inline-block' }} />{r === 'sexuelle' ? 'SANTÉ SEXUELLE' : 'SANTÉ MENTALE'}
              </span>
            ))}
            {h.adultes && <span style={{ fontSize: 10, fontWeight: 700, borderRadius: 99, padding: '4px 8px', background: 'rgba(19,13,8,.68)', color: DC.soft }}>18+</span>}
          </div>
          <h1 style={{ margin: '8px 0 4px', fontFamily: 'Fraunces, serif', fontSize: 27, lineHeight: 1.1, color: DC.title, textWrap: 'balance' as React.CSSProperties['textWrap'] }}>{h.titre}</h1>
          <p style={{ margin: 0, fontSize: 13, lineHeight: 1.45, color: DC.soft }}>{h.accroche}</p>
          <p style={{ margin: '6px 0 0', fontSize: 12, color: DC.soft }}>{h.total} épisodes · {h.minutes} min · {h.stats?.lecteurs ? `${h.stats.lecteurs} lecteurs` : 'Nouveau'}{h.stats?.utile ? ` · ${h.stats.utile} ont trouvé ce cas utile` : ''}</p>
        </div>
      </div>

      {/* Un seul gros bouton : reprendre là où on en est */}
      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        {courant
          ? <Link to={`/cas-du-soir/${id}/${courant.n}`} className="drl-btn" style={boutonReprise}>{nbLus > 0 ? `Reprendre · épisode ${courant.n}` : 'Commencer l\'histoire'}</Link>
          : eps?.finie
            ? <Link to={`/cas-du-soir/${id}/lecon`} className="drl-btn" style={boutonReprise}>La leçon de Dr Lô</Link>
            : <div style={{ ...boutonReprise, background: DC.glass, color: DC.soft, border: `1px solid ${DC.line}`, fontSize: 13, fontWeight: 600 }}>{sousReprise ?? 'La suite arrive bientôt'}</div>}
        {h.intrigue && (
          <button type="button" onClick={() => setIntrigue(v => !v)} aria-pressed={intrigue} aria-label="Écouter l'intrigue" className="drl-btn"
            style={{ width: 50, minHeight: 50, borderRadius: 999, border: `1px solid ${intrigue ? palette.accent : DC.line}`, background: DC.glass, color: intrigue ? palette.accent : DC.text, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Play size={16} aria-hidden="true" /></button>
        )}
      </div>
      {intrigue && h.intrigue && (
        <div style={{ ...card, marginTop: 10, padding: 12 }}>
          <p style={{ margin: 0, fontSize: 12, fontWeight: 700, letterSpacing: '.06em', color: palette.accent }}>L'INTRIGUE</p>
          <AudioSynchro compact parolesApresLecture src={h.intrigue} minutage={h.intrigueMinutage} label="Écouter l'intrigue" accent={palette.accent} />
        </div>
      )}
      <PartagerCas id={h.id} titre={h.titre} accroche={h.accroche} accent={palette.accent} />

      {etat.proprio && etat.chiffres && <ChiffresProprio chiffres={etat.chiffres} />}
      {etat.proprio && <BandeauApercu accent={palette.accent} onChange={load} total={h.total} embranchement={h.embranchement} />}

      {/* Où j'en suis : une barre de segments, un par épisode */}
      <div style={{ display: 'flex', gap: 4, margin: '20px 0 6px' }} role="img" aria-label={`${nbLus} épisode${nbLus > 1 ? 's' : ''} lu${nbLus > 1 ? 's' : ''} sur ${h.total}`}>
        {Array.from({ length: h.total }, (_, k) => {
          const e = liste.find(x => x.n === k + 1);
          const fond = e?.etat === 'lu' ? palette.accent : e?.etat === 'a_lire' ? `${palette.accent}73` : 'rgba(255,255,255,.16)';
          return <i key={k} style={{ flex: 1, height: 4, borderRadius: 2, background: fond }} />;
        })}
      </div>
      <p style={{ margin: '0 0 12px', fontSize: 12, color: DC.soft }}>{nbLus > 0 ? `${nbLus} épisode${nbLus > 1 ? 's' : ''} lu${nbLus > 1 ? 's' : ''} sur ${h.total}` : 'Pas encore commencé'}</p>

      {error && <p role="alert" style={{ margin: '0 0 12px', fontSize: 14, color: '#F6C2AE' }}>{error}</p>}
      {!eps ? <p style={{ textAlign: 'center', color: DC.muted }}>Un instant…</p> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {liste.map(ligne)}
          {/* La leçon de Dr Lô, à la fin de la liste : fermée jusqu'au dernier épisode */}
          {eps.finie ? (
            <Link to={`/cas-du-soir/${id}/lecon`} aria-label="La leçon de Dr Lô, gratuite" className="drl-btn" style={{ ...ligneStyle, textDecoration: 'none', border: `1px solid ${palette.accent}`, background: `${palette.accent}1A` }}>
              <span style={{ ...vignette, borderRadius: '50%', width: 47 }}><img src="/images/cas-du-soir/drlo-lecon.webp" alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: '60% 12%', display: 'block' }} /></span>
              <span style={{ flex: 1, minWidth: 0 }}><span style={petit}>À LA FIN</span><span style={titreLigne}>La leçon de Dr Lô</span><span style={sousLigne}>Gratuite · à écouter</span></span>
              <span aria-hidden="true" style={{ ...rondIcone, width: 30, height: 30, background: palette.accent, color: '#1C1612' }}><Play size={12} /></span>
            </Link>
          ) : (
            <div style={ligneStyle}>
              <span style={{ ...vignette, borderRadius: '50%', width: 47, filter: 'grayscale(1) brightness(.5)' }}><img src="/images/cas-du-soir/drlo-lecon.webp" alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: '60% 12%', display: 'block' }} /></span>
              <span style={{ flex: 1, minWidth: 0 }}><span style={petit}>À LA FIN</span><span style={{ ...titreLigne, color: DC.muted }}>La leçon de Dr Lô</span><span style={sousLigne}>Gratuite, après l'épisode {h.total}</span></span>
              <Lock size={15} color={DC.muted} aria-hidden="true" style={{ flexShrink: 0 }} />
            </div>
          )}
        </div>
      )}

      {/* Pas envie d'attendre : ouvrir tout le cas (le prix et « si tu attends, c'est gratuit » sont dans la fenêtre de confirmation) */}
      {h.debloquer ? (
        <section style={{ ...card, marginTop: 14, padding: 14 }}>
          <p style={{ margin: 0, fontFamily: 'Fraunces, serif', fontSize: 17, fontWeight: 600, color: DC.title }}>Pas envie d'attendre ?</p>
          <p style={{ margin: '4px 0 0', fontSize: 13, lineHeight: 1.5, color: DC.soft }}>Un épisode s'ouvre chaque soir à 20 h, gratuitement. Tu peux aussi ouvrir tout le cas maintenant.</p>
          <DebloquerCas id={h.id} titre={h.titre} ouverture={h.ouverture} prix={h.debloquer} accent={palette.accent} onDone={load} />
        </section>
      ) : null}

      {eps?.finie && h.autreFin && eps.autreFin.possible && (
        <section style={{ ...card, marginTop: 14 }}>
          <p style={{ margin: 0, fontSize: 15, color: DC.text }}>{h.autreFin.mention}</p>
          {eps.autreFin.achetee ? (
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              {[4, 5].map(k => <Link key={k} to={`/cas-du-soir/${id}/${k}?autre=1`} className="drl-btn" style={{ flex: 1, minHeight: 44, borderRadius: 999, border: `1px solid ${DC.line}`, background: DC.glass, color: DC.text, fontSize: 14, fontWeight: 600, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}>L'autre épisode {k}</Link>)}
            </div>
          ) : (
            <button type="button" disabled={!!busy} onClick={() => setConfirme({ what: 'autreFin' })} style={{ width: '100%', marginTop: 10, minHeight: 48, borderRadius: 999, border: `1px solid ${DC.line}`, background: DC.glass, color: DC.text, fontSize: 15, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>L'autre fin · {etoiles(prix.autreFin)}</button>
          )}
        </section>
      )}

      {confirme && (
        <FenetreConfirmer accent={palette.accent} busy={!!busy} error={error}
          titre={confirme.what === 'suite' ? `Lire l'épisode ${confirme.n} maintenant ?` : 'Débloquer l\'autre fin ?'}
          prix={confirme.what === 'suite' ? (confirme.n ? (eps?.episodes.find(x => x.n === confirme.n)?.avance?.prix ?? prix.suite[confirme.n] ?? 0) : 0) : prix.autreFin}
          gratuit={confirme.what === 'suite' ? gratuitEpisode(confirme.parution) : null}
          onConfirm={() => pay(confirme.what, confirme.n)} onClose={() => { setConfirme(null); setError(''); }} />
      )}
      <PiedCas titre={h.titre} avertissement={h.avertissement} />
      </GateAdultes>
    </DrLoShell>
  );
};

export default CasDuSoirCasPage;
