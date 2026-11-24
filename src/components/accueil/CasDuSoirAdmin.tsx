/**
 * CasDuSoirAdmin — « Cas du soir » dans l'espace Dr Lô : les chiffres bruts de chaque cas (jamais arrondis, jamais montrés au public) :
 * lecteurs, progression par épisode, achats, votes, « Ce cas t'a été utile ? » et ce que les « non » disent avoir manqué.
 */
import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { DC, card } from './DrLoShell';
import type { MomentPalette } from '../../utils/drloMoment';
import { getScaleMeta } from '../../utils/scaleMeta';
import { getStatistiques, type CdsStatCas } from '../../services/casDuSoirService';

const pct = (a: number, b: number) => (b > 0 ? `${Math.round((100 * a) / b)} %` : '—');
const nb = (n: number, un: string, plusieurs = `${un}s`) => `${n} ${n > 1 ? plusieurs : un}`;
const SOURCE: Record<string, string> = { tiktok: 'TikTok', instagram: 'Instagram', facebook: 'Facebook', whatsapp: 'WhatsApp', youtube: 'YouTube' };
const cell: React.CSSProperties = { padding: '6px 8px', fontSize: 14, color: DC.text, textAlign: 'right', whiteSpace: 'nowrap' };
const head: React.CSSProperties = { ...cell, fontSize: 12, color: DC.faint, fontWeight: 700 };

const Tuile: React.FC<{ valeur: string; legende: string }> = ({ valeur, legende }) => (
  <div style={{ flex: '1 1 96px', minWidth: 96, padding: '8px 10px', borderRadius: 12, border: `1px solid ${DC.line}`, background: 'rgba(255,255,255,.04)' }}>
    <div style={{ fontFamily: 'Fraunces, serif', fontSize: 22, color: DC.title }}>{valeur}</div>
    <div style={{ fontSize: 12, color: DC.muted }}>{legende}</div>
  </div>
);

const Cas: React.FC<{ c: CdsStatCas; palette: MomentPalette }> = ({ c, palette }) => {
  const reponses = c.utileOui + c.utileNon;
  return (
    <article style={{ ...card, marginTop: 12 }}>
      <h3 style={{ margin: 0, fontFamily: 'Fraunces, serif', fontSize: 19, color: DC.title }}>{c.titre}</h3>
      <p style={{ margin: '2px 0 0', fontSize: 13, color: DC.faint }}>{[c.categorie, c.categorieAussi].filter(Boolean).map(k => (k === 'sexuelle' ? 'Santé sexuelle' : 'Santé mentale')).join(' · ')}{c.cache ? ' · en construction (caché au public)' : ''}</p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
        <Tuile valeur={String(c.visiteurs)} legende={`${nb(c.visiteurs, 'visiteur')} (dont ${c.visiteursCompte} avec compte)`} />
        <Tuile valeur={String(c.episodes[0]?.lus ?? 0)} legende={`ont lu l'épisode 1, avec ou sans compte (${pct(c.episodes[0]?.lus ?? 0, c.visiteurs)} des visiteurs)`} />
        <Tuile valeur={String(c.lecteurs)} legende={`${nb(c.lecteurs, 'lecteur')} avec compte (${pct(c.lecteurs, c.visiteurs)} des visiteurs)`} />
        <Tuile valeur={String(c.payeurs)} legende={`ont payé (${pct(c.payeurs, c.commences)})`} />
        <Tuile valeur={reponses ? pct(c.utileOui, reponses) : '—'} legende={`« utile » : ${c.utileOui} oui, ${c.utileNon} non`} />
      </div>
      {(c.sources?.length ?? 0) > 0 && <p style={{ margin: '8px 0 0', fontSize: 14, color: DC.soft }}>Venus d'un lien en bio : {c.sources!.map((x) => `${SOURCE[x.id] ?? x.id} ${x.n}`).join(' · ')}</p>}
      <div style={{ overflowX: 'auto', marginTop: 10 }}>
        <table style={{ borderCollapse: 'collapse', width: '100%' }}>
          <thead><tr><th style={{ ...head, textAlign: 'left' }}>Épisode</th><th style={head}>Lus</th><th style={head}>Payés</th><th style={head}>Votes</th><th style={head}>Choix</th></tr></thead>
          <tbody>
            {c.episodes.map((e) => (
              <tr key={e.n} style={{ borderTop: `1px solid ${DC.line}` }}>
                <td style={{ ...cell, textAlign: 'left', whiteSpace: 'normal' }}>{e.n}. {e.titre}</td>
                <td style={cell}>{e.lus}</td>
                <td style={cell}>{e.ouverts}</td>
                <td style={cell}>{e.votes}</td>
                <td style={cell}>{Object.keys(e.counts).sort().map((k) => `${k} ${e.counts[k]}`).join(' · ') || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p style={{ margin: '10px 0 0', fontSize: 14, color: DC.soft }}>Leçon lue : {c.lectureFin} · quiz terminé : {c.quiz}</p>
      {c.tests.length > 0 && <p style={{ margin: '4px 0 0', fontSize: 14, color: DC.soft }}>Tests ouverts depuis le cas : {c.tests.map((t) => `${getScaleMeta(t.id).label} ${t.n}`).join(' · ')}</p>}
      {c.non.length > 0 && (
        <div style={{ marginTop: 10 }}>
          <p style={{ margin: 0, fontSize: 13, color: palette.accent }}>Ce qui a manqué, d'après les « non » :</p>
          <ul style={{ margin: '4px 0 0', paddingLeft: 18, fontSize: 14, lineHeight: 1.5, color: DC.soft }}>{c.non.map((n, i) => <li key={i}>{n.texte}</li>)}</ul>
        </div>
      )}
    </article>
  );
};

const CasDuSoirAdmin: React.FC<{ palette: MomentPalette }> = ({ palette }) => {
  const [cas, setCas] = useState<CdsStatCas[] | null>(null);
  const [boite, setBoite] = useState<{ reponses: number; vues: number; utile: number; moi: number; pasclair: number } | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let vivant = true;
    getStatistiques().then((r) => { if (vivant) setCas(r.cas); setBoite(r.boite); }).catch((e) => { if (vivant) setError(e instanceof Error ? e.message : 'Erreur'); });
    return () => { vivant = false; };
  }, []);
  if (error) return <p role="alert" style={{ color: '#F09A7A', fontSize: 14 }}>{error}</p>;
  if (!cas) return <Loader2 className="animate-spin" style={{ marginTop: 20 }} />;
  const tot = cas.reduce((a, c) => ({ l: a.l + c.lecteurs, p: a.p + c.payeurs, o: a.o + c.utileOui, n: a.n + c.utileNon }), { l: 0, p: 0, o: 0, n: 0 });
  return (
    <section>
      <p style={{ margin: '0 0 4px', fontSize: 14, color: DC.soft }}>Chiffres exacts, visibles par toi seul. Tous cas confondus : {nb(tot.l, 'lecteur')}, {nb(tot.p, 'payeur')}, « utile » {tot.o} oui / {tot.n} non.</p>
      {boite && (
        <article style={{ ...card, marginTop: 12 }}>
          <h3 style={{ margin: 0, fontFamily: 'Fraunces, serif', fontSize: 19, color: DC.title }}>Boîte anonyme</h3>
          <p style={{ margin: '6px 0 0', fontSize: 14, color: DC.soft }}>{nb(boite.reponses, 'réponse publiée', 'réponses publiées')} · {nb(boite.vues, 'vue')} · « Utile » {boite.utile} · « Moi aussi » {boite.moi} · « Pas clair » {boite.pasclair} (privé)</p>
        </article>
      )}
      {cas.map((c) => <Cas key={c.id} c={c} palette={palette} />)}
    </section>
  );
};

export default CasDuSoirAdmin;
