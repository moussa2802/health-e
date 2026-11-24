/**
 * CdsParts — les pièces communes du « Cas du soir » : les résultats d'un vote, la fin (leçon, quiz, tests),
 * le bandeau d'aperçu du propriétaire, la mention « Histoire inspirée de faits réels ».
 */
import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Check, ChevronRight, Loader2, MessageCircle, Share2, Unlock } from 'lucide-react';
import { DC, card } from '../accueil/DrLoShell';
import { openDrLoChat } from '../DrLoChat/drLoEvents';
import { getScaleMeta } from '../../utils/scaleMeta';
import { CdsError, confirmerAdulte, debloquerCas, getBrancheApercu, getJourApercu, getListe, noterGeste, quandLabel, repondreUtile, setBrancheApercu, setJourApercu, type CdsChiffres, type CdsEpisodeReponse, type CdsFin, type CdsHistoire, type CdsResultats } from '../../services/casDuSoirService';
import { useKoris } from '../../contexts/KorisContext';
import { useAuth } from '../../contexts/AuthContext';
import { retenirRetour } from '../../utils/retourInscription';

export const ANIMAL_NOM: Record<string, string> = {
  lion: 'Lion', aigle: 'Aigle', cheval: 'Cheval', loup: 'Loup', dauphin: 'Dauphin', elephant: 'Éléphant',
  cerf: 'Cerf', hibou: 'Hibou', panthere: 'Panthère', renard: 'Renard', tortue: 'Tortue', ours: 'Ours',
};
export const etoiles = (n: number) => `${n} étincelle${n > 1 ? 's' : ''}`;
export const Maj = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

/** « Crée ton espace » depuis un cas : l'inscription s'ouvre directement, et on revient ensuite sur cette page du cas. */
export function creerEspaceDepuis(navigate: (to: string, opts?: { state?: unknown }) => void, retour: string): void {
  retenirRetour(retour);
  navigate('/compagnon', { state: { signup: true } });
}

export const Resultats: React.FC<{ ep: CdsEpisodeReponse; r: CdsResultats; monChoix: string; accent: string }> = ({ ep, r, monChoix, accent }) => (
  <div style={{ marginTop: 14 }}>
    {r.echo && <p style={{ margin: 0, fontSize: 15, lineHeight: 1.5, color: DC.text }}>{r.echo}</p>}
    <h4 style={{ margin: '14px 0 0', fontSize: 14, fontWeight: 700, color: DC.muted }}>Ce qu'ont choisi les autres</h4>
    {!r.parChoix && <p style={{ margin: '6px 0 0', fontSize: 14, color: DC.soft }}>Les pourcentages s'affichent à partir de {r.seuil ?? 30} votes ({r.total} pour l'instant).</p>}
    {r.parChoix && ep.episode.choix.map(c => (
      <div key={c.id} style={{ marginTop: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 14, color: c.id === monChoix ? DC.title : DC.soft, fontWeight: c.id === monChoix ? 700 : 500 }}>
          <span>{c.id === monChoix && <Check size={14} aria-hidden="true" style={{ verticalAlign: 'middle', marginRight: 4 }} />}{c.label}</span>
          <span style={{ fontVariantNumeric: 'tabular-nums' }}>{r.parChoix?.[c.id] ?? 0} %</span>
        </div>
        <span aria-hidden="true" style={{ display: 'block', marginTop: 4, height: 8, borderRadius: 4, background: 'rgba(255,255,255,.06)' }}>
          <span style={{ display: 'block', height: '100%', width: `${r.parChoix?.[c.id] ?? 0}%`, borderRadius: 4, background: c.id === monChoix ? accent : 'rgba(255,255,255,.25)' }} />
        </span>
      </div>
    ))}
    {r.parChoix && <p style={{ margin: '10px 0 0', fontSize: 13, color: DC.faint }}>{r.total} votes</p>}
    {r.animal && <p style={{ margin: '8px 0 0', fontSize: 14, color: DC.soft }}>Toi qui es {ANIMAL_NOM[r.animal.animal] ?? r.animal.animal} : {r.animal.groupe} ont surtout choisi « {r.animal.label} ».</p>}
    {r.parAnimal && r.parAnimal.length > 0 && (
      <div style={{ marginTop: 12 }}>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: DC.muted }}>Par animal</p>
        {r.parAnimal.map(a => (
          <p key={a.animal} style={{ margin: '4px 0 0', fontSize: 14, color: DC.soft }}>
            {ANIMAL_NOM[a.animal] ?? a.animal} : {ep.episode.choix.map(c => `${c.id} ${a.parChoix[c.id] ?? 0} %`).join(' · ')}
          </p>
        ))}
      </div>
    )}
  </div>
);

/**
 * « Pour toi » : les tests liés à ce que l'épisode vient de dire (style d'attachement, estime de soi…). Chaque bouton ouvre le test dans le compagnon.
 * L'épisode les déclare dans ses données (tests: ['ecr_r']) ; sans test, rien ne s'affiche.
 */
export const TestsEpisode: React.FC<{ ids: string[]; accent: string }> = ({ ids, accent }) => {
  const navigate = useNavigate();
  if (!ids.length) return null;
  return (
    <section aria-labelledby="cds-pour-toi" style={{ marginTop: 20, paddingTop: 16, borderTop: `1px solid ${DC.line}` }}>
      <p id="cds-pour-toi" style={{ margin: 0, fontSize: 13, fontWeight: 700, letterSpacing: '.08em', color: accent }}>POUR TOI</p>
      <p style={{ margin: '4px 0 0', fontSize: 15, lineHeight: 1.5, color: DC.soft }}>Un test ne dit pas qui tu es : il t'aide à mettre des mots sur ce que tu vis.</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
        {ids.map(id => (
          <button key={id} type="button" onClick={() => { noterGeste('test', id); navigate('/compagnon', { state: { prescribe: id } }); }} className="drl-btn"
            style={{ minHeight: 48, padding: '0 16px', borderRadius: 14, border: `1px solid ${accent}`, background: 'transparent', color: accent, fontSize: 15, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, fontFamily: 'inherit' }}>
            <span>Faire le test : {getScaleMeta(id).label}</span><ChevronRight size={18} aria-hidden="true" />
          </button>
        ))}
      </div>
    </section>
  );
};

/**
 * « Ce cas t'a été utile ? » à la fin de la leçon : oui ou non, une seule réponse par personne (qu'on peut changer).
 * Le « non » (et le texte facultatif « Qu'est-ce qui a manqué ? ») reste privé : seul Dr Lô le lit. Le public ne voit que le nombre de « oui »,
 * et seulement au-dessus de 10 (le serveur n'envoie rien sinon).
 */
export const UtileCas: React.FC<{ fin: CdsFin; accent: string }> = ({ fin, accent }) => {
  const [choix, setChoix] = useState<'oui' | 'non' | null>(fin.monUtile ?? null);
  const [texte, setTexte] = useState('');
  const [texteEnvoye, setTexteEnvoye] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const envoyer = async (oui: boolean, t?: string) => {
    setBusy(true); setError('');
    try { await repondreUtile(oui, t); setChoix(oui ? 'oui' : 'non'); if (oui) setTexteEnvoye(false); if (!oui && t) setTexteEnvoye(true); }
    catch (er) { setError(er instanceof Error ? er.message : 'Erreur'); }
    finally { setBusy(false); }
  };
  const bouton = (actif: boolean): React.CSSProperties => ({ flex: 1, minHeight: 48, borderRadius: 14, fontFamily: 'inherit', fontSize: 15, fontWeight: 700, cursor: busy ? 'default' : 'pointer', color: actif ? '#1C1612' : DC.text, border: `1px solid ${actif ? accent : DC.line}`, background: actif ? accent : DC.glass });
  return (
    <div style={{ marginTop: 20, paddingTop: 16, borderTop: `1px solid ${DC.line}` }}>
      <h3 id="cds-utile" style={{ margin: 0, fontSize: 16, color: DC.title }}>Ce cas t'a été utile ?</h3>
      <div role="group" aria-labelledby="cds-utile" style={{ display: 'flex', gap: 8, marginTop: 10 }}>
        <button type="button" disabled={busy} aria-pressed={choix === 'oui'} onClick={() => { if (choix !== 'oui') void envoyer(true); }} style={bouton(choix === 'oui')}>Oui</button>
        <button type="button" disabled={busy} aria-pressed={choix === 'non'} onClick={() => { if (choix !== 'non') void envoyer(false); }} style={bouton(choix === 'non')}>Non</button>
      </div>
      {choix === 'oui' && <p role="status" style={{ margin: '10px 0 0', fontSize: 14, color: DC.soft }}>Merci.</p>}
      {choix === 'non' && (
        <div style={{ marginTop: 10 }}>
          <p role="status" style={{ margin: 0, fontSize: 14, color: DC.soft }}>Merci. {texteEnvoye ? 'Ton message est bien arrivé.' : 'Qu\'est-ce qui a manqué ? (facultatif : seul Dr Lô le lit)'}</p>
          {!texteEnvoye && (
            <>
              <label htmlFor="cds-utile-texte" style={{ position: 'absolute', left: -9999 }}>Qu'est-ce qui a manqué ?</label>
              <textarea id="cds-utile-texte" value={texte} onChange={e => setTexte(e.target.value.slice(0, 300))} rows={3} maxLength={300} placeholder="Écris comme tu parles. Pas de numéro ni de lien."
                style={{ width: '100%', boxSizing: 'border-box', marginTop: 8, borderRadius: 12, border: `1px solid ${DC.line}`, background: 'rgba(255,255,255,.06)', padding: 10, fontFamily: 'inherit', fontSize: 15, color: DC.text }} />
              <button type="button" disabled={busy || texte.trim().length < 2} onClick={() => void envoyer(false, texte.trim())}
                style={{ marginTop: 8, minHeight: 44, padding: '0 16px', borderRadius: 12, border: `1px solid ${DC.line}`, background: DC.glass, color: DC.text, fontFamily: 'inherit', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>Envoyer</button>
            </>
          )}
        </div>
      )}
      {error && <p role="alert" style={{ margin: '8px 0 0', fontSize: 14, color: '#F6C2AE' }}>{error}</p>}
      {fin.utile && <p style={{ margin: '10px 0 0', fontSize: 13, color: DC.faint }}>{fin.utile} personnes ont trouvé ce cas utile.</p>}
    </div>
  );
};

/** (Dr Lô seul) Les chiffres bruts d'un cas, jamais arrondis ni masqués, et les « non » avec leur texte. */
export const ChiffresProprio: React.FC<{ chiffres: CdsChiffres }> = ({ chiffres: c }) => {
  const total = c.utileOui + c.utileNon;
  return (
    <div style={{ ...card, marginTop: 14, padding: 12 }}>
      <p style={{ margin: 0, fontSize: 13, color: DC.muted }}>Chiffres (visibles par toi seul, jamais arrondis)</p>
      <p style={{ margin: '6px 0 0', fontSize: 15, color: DC.text }}>{c.lecteurs} lecteur{c.lecteurs > 1 ? 's' : ''} · « utile » : {c.utileOui} oui, {c.utileNon} non{total ? ` (${Math.round((100 * c.utileOui) / total)} % de oui)` : ''}</p>
      {c.non && c.non.length > 0 && (
        <div style={{ marginTop: 8 }}>
          <p style={{ margin: 0, fontSize: 13, color: DC.muted }}>Ce qui a manqué, d'après les « non » :</p>
          <ul style={{ margin: '4px 0 0', paddingLeft: 18, fontSize: 14, lineHeight: 1.5, color: DC.soft }}>{c.non.map((n, i) => <li key={i}>{n.texte}</li>)}</ul>
        </div>
      )}
    </div>
  );
};

/** Ce qui suit la leçon (sous la lecture en plein écran) : le quiz, « utile ? », les tests, les sources, le cas suivant. */
export const FinLecon: React.FC<{ fin: CdsFin; accent: string; id?: string }> = ({ fin, accent, id }) => {
  const sources = fin.texte.split(/\n\s*\n\s*Sources\s*:/)[1]?.trim();
  const navigate = useNavigate();
  const [rep, setRep] = useState<Record<number, number>>({});
  const tous = fin.quiz.every((_, i) => rep[i] !== undefined);
  useEffect(() => { if (tous) noterGeste('quiz'); }, [tous]);
  const testBtn: React.CSSProperties = { minHeight: 48, borderRadius: 14, border: `1px solid ${DC.line}`, background: DC.glass, color: DC.text, fontSize: 15, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontFamily: 'inherit' };
  return (
    <section>
      <h2 style={{ margin: 0, fontFamily: 'Fraunces, serif', fontSize: 24, lineHeight: 1.2, color: DC.title }}>Le quiz : 3 questions</h2>
      {fin.quiz.map((q, i) => (
        <div key={i} style={{ marginTop: 12 }}>
          <p style={{ margin: 0, fontSize: 15, color: DC.text }}>{i + 1}. {q.question}</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 6 }}>
            {q.reponses.map((r, j) => {
              const choisi = rep[i] === j; const fait = rep[i] !== undefined;
              return (
                <button key={j} type="button" disabled={fait} onClick={() => setRep({ ...rep, [i]: j })}
                  style={{ minHeight: 44, textAlign: 'left', padding: '8px 12px', borderRadius: 12, fontFamily: 'inherit', fontSize: 14, cursor: fait ? 'default' : 'pointer', color: DC.text,
                    border: `1px solid ${fait && j === q.bonne ? accent : choisi ? 'rgba(240,154,122,.6)' : DC.line}`, background: fait && j === q.bonne ? `${accent}22` : DC.glass }}>
                  {r}
                </button>
              );
            })}
          </div>
          {rep[i] !== undefined && <p style={{ margin: '6px 0 0', fontSize: 14, color: DC.soft }}>{rep[i] === q.bonne ? 'Oui. ' : 'Pas tout à fait. '}{q.explication}</p>}
        </div>
      ))}
      {tous && fin.apresQuiz && <p style={{ margin: '14px 0 0', fontSize: 15, color: DC.text }}>{fin.apresQuiz}</p>}
      <UtileCas fin={fin} accent={accent} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 18 }}>
        {fin.testLie && (
          <button type="button" onClick={() => navigate('/compagnon', { state: { prescribe: fin.testLie } })} className="drl-btn" style={testBtn}>
            Faire le test : {getScaleMeta(fin.testLie).label} <ChevronRight size={16} aria-hidden="true" />
          </button>
        )}
        {fin.testAussi && (
          <button type="button" onClick={() => navigate('/compagnon', { state: { prescribe: fin.testAussi } })} className="drl-btn" style={{ ...testBtn, minHeight: 44, fontSize: 14, fontWeight: 500, color: DC.soft }}>
            Aussi : le test {getScaleMeta(fin.testAussi).label}
          </button>
        )}
      </div>
      {id && <CasSuivant id={id} accent={accent} />}
      {sources && <p style={{ margin: '22px 0 0', fontSize: 12, lineHeight: 1.5, color: DC.faint }}>Sources : {sources}</p>}
    </section>
  );
};


/**
 * « Le cas suivant » : à la fin d'un cas (sous la leçon), le cas qui vient après lui dans la liste.
 * Ouvert : on y va. Pas encore ouvert : sa date, et « Débloquer tout de suite · ✦N » (la fenêtre de confirmation redit le prix
 * et « si tu attends, c'est gratuit »). Aucun cas après lui : rien n'est montré.
 */
export const CasSuivant: React.FC<{ id: string; accent: string }> = ({ id, accent }) => {
  const [suivant, setSuivant] = useState<(CdsHistoire & { statut: 'bientot' | 'en_cours' | 'termine' }) | null>(null);
  const charger = () => getListe().then(l => {
    const hs = l.histoires ?? []; const i = hs.findIndex(h => h.id === id);
    setSuivant(i >= 0 ? hs.slice(i + 1).find(h => h.statut !== 'termine') ?? null : null);
  }).catch(() => setSuivant(null));
  useEffect(() => { void charger(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!suivant) return null;
  const ouvert = suivant.statut === 'en_cours';
  return (
    <div style={{ marginTop: 22, paddingTop: 18, borderTop: `1px solid ${DC.line}` }}>
      <p style={{ margin: 0, fontSize: 13, fontWeight: 700, letterSpacing: '.08em', color: accent }}>LE CAS SUIVANT</p>
      <h3 style={{ margin: '4px 0 0', fontFamily: 'Fraunces, serif', fontSize: 20, lineHeight: 1.2, color: DC.title }}>{suivant.titre}</h3>
      {suivant.accroche && <p style={{ margin: '6px 0 0', fontSize: 15, lineHeight: 1.5, color: DC.soft }}>{suivant.accroche}</p>}
      {ouvert ? (
        <Link to={`/cas-du-soir/${suivant.id}`} className="drl-btn"
          style={{ width: '100%', minHeight: 50, marginTop: 12, borderRadius: 999, border: 0, background: accent, color: '#1C1612', fontSize: 16, fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, textDecoration: 'none', boxSizing: 'border-box' }}>
          Commencer ce cas <ChevronRight size={18} aria-hidden="true" />
        </Link>
      ) : (
        <>
          <p style={{ margin: '8px 0 0', fontSize: 14, color: DC.soft }}>{suivant.ouverture ? `${Maj(quandLabel(suivant.ouverture))} · gratuit` : 'Bientôt · gratuit à son ouverture'}</p>
          {suivant.debloquer ? <DebloquerCas id={suivant.id} titre={suivant.titre} ouverture={suivant.ouverture} prix={suivant.debloquer} accent={accent} onDone={() => { void charger(); }} /> : null}
        </>
      )}
    </div>
  );
};

/** Aperçu du propriétaire : simuler le jour 1 à 5 avant la date de départ (visible par lui seul). */
export const BandeauApercu: React.FC<{ accent: string; onChange: () => void; total?: number; embranchement?: number | null }> = ({ accent, onChange, total = 5, embranchement }) => {
  const [jour, setJour] = useState<number | null>(getJourApercu());
  const [branche, setBranche] = useState<'A' | 'B'>(getBrancheApercu());
  const choisir = (j: number | null) => { setJour(j); setJourApercu(j); onChange(); };
  const suite = (b: 'A' | 'B') => { setBranche(b); setBrancheApercu(b); onChange(); };
  const b = (on: boolean): React.CSSProperties => ({ minWidth: 44, minHeight: 44, padding: '0 12px', borderRadius: 12, border: `1px solid ${on ? accent : DC.line}`, background: DC.glass, color: DC.text, cursor: 'pointer', fontSize: 14, fontFamily: 'inherit' });
  return (
    <div style={{ ...card, marginTop: 14, padding: 12 }}>
      <p style={{ margin: 0, fontSize: 13, color: DC.muted }}>Aperçu (visible par toi seul) : simuler le jour</p>
      <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
        {Array.from({ length: total }, (_, i) => i + 1).map(j => <button key={j} type="button" onClick={() => choisir(j)} style={b(jour === j)}>{j}</button>)}
        <button type="button" onClick={() => choisir(null)} style={b(jour === null)}>Aujourd'hui</button>
      </div>
      {embranchement ? <>
      <p style={{ margin: '10px 0 0', fontSize: 13, color: DC.muted }}>Suite vue en aperçu (le choix de l'épisode {embranchement})</p>
      <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
        {(['A', 'B'] as const).map(x => <button key={x} type="button" onClick={() => suite(x)} style={b(branche === x)}>Suite {x}</button>)}
      </div>
      </> : null}
    </div>
  );
};

/** « En parler avec le compagnon » et la mention, toujours en bas. */
/**
 * La fenêtre de confirmation de TOUTE dépense d'étincelles du cas du soir (cas entier, épisode, autre fin, votes par animal).
 * Quand l'attente est gratuite, elle le dit avec la date : « si tu attends …, c'est gratuit ». Échap, le fond ou « Attendre » la ferment ;
 * le focus part sur « Attendre » (le choix qui ne coûte rien) et revient au bouton d'origine à la fermeture.
 */
export const FenetreConfirmer: React.FC<{
  titre: string; prix: number; gratuit?: string | null; accent: string; busy?: boolean; error?: string;
  onConfirm: () => void; onClose: () => void;
}> = ({ titre, prix, gratuit, accent, busy, error, onConfirm, onClose }) => {
  const attendre = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const avant = document.activeElement as HTMLElement | null;
    attendre.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !busy) onClose(); };
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('keydown', onKey); avant?.focus?.(); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const bouton: React.CSSProperties = { width: '100%', minHeight: 50, borderRadius: 999, fontSize: 16, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: 'inherit' };
  return (
    <div onClick={() => { if (!busy) onClose(); }} style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(8,6,4,.88)', WebkitBackdropFilter: 'blur(8px)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div role="dialog" aria-modal="true" aria-labelledby="cds-confirm-titre" onClick={e => e.stopPropagation()}
        style={{ ...card, background: '#241C16', width: '100%', maxWidth: 420, maxHeight: 'calc(100dvh - 32px)', overflowY: 'auto', padding: 20, margin: 0, border: `1px solid ${accent}55`, boxShadow: '0 20px 60px rgba(0,0,0,.6)' }}>
        <h2 id="cds-confirm-titre" style={{ margin: 0, fontFamily: 'Fraunces, serif', fontSize: 22, lineHeight: 1.2, color: DC.title }}>{titre}</h2>
        {gratuit && (
          <p style={{ margin: '12px 0 0', padding: '10px 12px', borderRadius: 12, border: `1px solid ${accent}`, background: '#2E241C', fontSize: 15, lineHeight: 1.5, color: '#FBF5EA' }}>
            <strong style={{ color: accent }}>Tu peux aussi attendre.</strong> {gratuit}
          </p>
        )}
        <p style={{ margin: '12px 0 0', fontSize: 15, lineHeight: 1.5, color: '#E4D8C8' }}>
          {gratuit ? 'Si tu préfères ne pas attendre, ça coûte' : 'Ça coûte'} <strong style={{ color: DC.title }}>{etoiles(prix)}</strong>, prises sur ton solde.
        </p>
        {error && <p role="alert" style={{ margin: '10px 0 0', fontSize: 14, color: '#F6C2AE' }}>{error}</p>}
        <button type="button" onClick={onConfirm} disabled={busy} className="drl-btn" style={{ ...bouton, marginTop: 16, border: 0, background: accent, color: '#1C1612' }}>
          {busy ? <Loader2 size={18} className="animate-spin" aria-hidden="true" /> : <Unlock size={18} aria-hidden="true" />}
          Débloquer maintenant · {etoiles(prix)}
        </button>
        <button ref={attendre} type="button" onClick={onClose} disabled={busy} className="drl-btn" style={{ ...bouton, marginTop: 10, fontWeight: 600, border: `1px solid ${DC.line}`, background: DC.glass, color: DC.text }}>
          {gratuit ? 'Attendre, c’est gratuit' : 'Annuler'}
        </button>
      </div>
    </div>
  );
};

/** « Tu peux attendre » pour un cas entier : la date d'ouverture si elle est fixée, sinon l'ouverture au public (sans date). */
export const gratuitCas = (ouverture?: number | null) => ouverture
  ? `Si tu attends ${quandLabel(ouverture)}, le cas s'ouvre gratuitement : un épisode chaque soir, sans rien payer.`
  : 'Quand le cas ouvrira au public (la date n’est pas encore annoncée), il sera gratuit : un épisode chaque soir, sans rien payer.';
/** « Tu peux attendre » pour l'épisode suivant : sa parution gratuite (le rythme de CE lecteur). */
export const gratuitEpisode = (parution?: number | null) => parution
  ? `Si tu attends ${quandLabel(parution)}, la suite s'ouvre gratuitement.`
  : 'Si tu attends le lendemain soir de ta lecture, la suite s’ouvre gratuitement.';

/**
 * « Débloquer tout de suite » : ouvre tout le cas pour cette personne avant son ouverture publique, contre des étincelles.
 * Un tap ouvre TOUJOURS la fenêtre de confirmation (prix + « si tu attends, c'est gratuit ») : rien ne se paie d'un seul tap.
 * Un visiteur est envoyé créer son espace ; un solde insuffisant ouvre la fenêtre d'achat.
 */
export const DebloquerCas: React.FC<{ id: string; prix: number; accent: string; onDone: () => void; compact?: boolean; ouverture?: number | null; titre?: string }> = ({ id, prix, accent, onDone, compact, ouverture, titre }) => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { openNoKorisModal, refreshBalance } = useKoris();
  const [ouvert, setOuvert] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const clic = (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    if (!isAuthenticated) { creerEspaceDepuis(navigate, `/cas-du-soir/${id}`); return; }
    setError(''); setOuvert(true);
  };
  const payer = async () => {
    setBusy(true); setError('');
    try { await debloquerCas(id); refreshBalance?.(); setOuvert(false); onDone(); }
    catch (er) {
      if (er instanceof CdsError && er.status === 402) { setOuvert(false); openNoKorisModal('Débloquer ce cas', prix); }
      else setError(er instanceof Error ? er.message : 'Erreur');
    } finally { setBusy(false); }
  };
  return (
    <div style={{ marginTop: compact ? 8 : 12 }} onClick={e => e.stopPropagation()}>
      <button type="button" onClick={clic} className="drl-btn"
        style={{ minHeight: 44, padding: '0 16px', borderRadius: 999, border: `1px solid ${accent}`, background: 'transparent', color: accent, fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: 'inherit' }}>
        <Unlock size={16} aria-hidden="true" />
        {!isAuthenticated ? 'Créer mon espace pour débloquer' : `Débloquer tout de suite · ${etoiles(prix)}`}
      </button>
      {ouvert && <FenetreConfirmer titre={titre ? `Débloquer « ${titre} » maintenant ?` : 'Débloquer ce cas maintenant ?'} prix={prix} gratuit={gratuitCas(ouverture)} accent={accent} busy={busy} error={error} onConfirm={payer} onClose={() => setOuvert(false)} />}
    </div>
  );
};

const ADULTE_KEY = 'he_cds_adulte_ok';
const adulteSurAppareil = () => { try { return localStorage.getItem(ADULTE_KEY) === '1'; } catch { return false; } };
const garderSurAppareil = () => { try { localStorage.setItem(ADULTE_KEY, '1'); } catch { /* navigateur sans stockage : on redemandera, sans bloquer */ } };

/**
 * « 18 ans ou plus » : une déclaration, pas une vérification d'âge. Elle se fait en un toucher (le bouton « Commencer (18 ans et plus) »),
 * puis elle est gardée sur l'appareil ET sur le compte (si connecté) pour ne plus jamais revenir.
 *   ok : déjà confirmé ; confirmer() : à appeler au toucher d'un bouton qui ouvre l'histoire.
 */
export function useAdulte(actif: boolean, surCompte?: boolean, connecte?: boolean): { ok: boolean; confirmer: () => void } {
  const [surAppareil, setSurAppareil] = useState(adulteSurAppareil);
  const ok = !actif || surAppareil || !!surCompte;
  useEffect(() => {
    if (!actif) return;
    // Confirmé sur le compte (autre téléphone) : on le garde aussi ici
    if (surCompte && !surAppareil) { garderSurAppareil(); setSurAppareil(true); }
    // Confirmé sur ce téléphone avant d'avoir un compte : on le garde aussi sur le compte
    else if (surAppareil && connecte && surCompte === false) confirmerAdulte();
  }, [actif, surCompte, connecte, surAppareil]);
  const confirmer = () => { if (ok) return; garderSurAppareil(); confirmerAdulte(); setSurAppareil(true); };
  return { ok, confirmer };
}

/** La petite mention sous le bouton d'un cas 18+ (13 px). */
export const MentionAdultes: React.FC<{ style?: React.CSSProperties }> = ({ style }) => (
  <p style={{ margin: '6px 0 0', fontSize: 13, lineHeight: 1.4, color: DC.faint, textAlign: 'center', ...style }}>Pour adultes. En continuant, tu confirmes avoir 18 ans ou plus.</p>
);

/**
 * Arrivée DIRECTE sur un épisode ou la leçon d'un cas 18+ sans l'avoir confirmé (lien partagé) : pas d'écran qui cache tout,
 * la couverture et le titre restent visibles, et un seul toucher « Lire (18 ans et plus) » ouvre le contenu.
 */
export const PorteAdultes: React.FC<{ actif: boolean; surCompte?: boolean; connecte?: boolean; image?: string | null; titre: string; accroche?: string; libelle: string; accent: string; children: React.ReactNode }> = ({ actif, surCompte, connecte, image, titre, accroche, libelle, accent, children }) => {
  const { ok, confirmer } = useAdulte(actif, surCompte, connecte);
  if (ok) return <>{children}</>;
  return (
    <section aria-label={titre} style={{ marginTop: 12 }}>
      {image && <img src={image} alt="" style={{ width: '100%', height: 220, objectFit: 'cover', borderRadius: 18, display: 'block' }} />}
      <h1 style={{ margin: '14px 0 4px', fontFamily: 'Fraunces, serif', fontSize: 26, lineHeight: 1.15, color: DC.title }}>{titre}</h1>
      {accroche && <p style={{ margin: 0, fontSize: 15, lineHeight: 1.5, color: DC.soft }}>{accroche}</p>}
      <button type="button" onClick={confirmer} className="drl-btn"
        style={{ width: '100%', minHeight: 50, marginTop: 16, borderRadius: 999, border: 0, background: accent, color: '#1C1612', fontSize: 16, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>{libelle} (18 ans et plus)</button>
      <MentionAdultes />
    </section>
  );
};

/** Partager un cas : le partage du téléphone (WhatsApp, SMS…) avec le lien du cas ; sinon le lien est copié. */
export const PartagerCas: React.FC<{ id: string; titre: string; accroche?: string; accent: string }> = ({ id, titre, accroche, accent }) => {
  const [msg, setMsg] = useState('');
  const partager = async () => {
    const url = `https://health-e.sn/cas-du-soir/${id}`;
    const text = `Le cas du soir « ${titre} » sur Health-e, par Dr Lô. ${accroche ? accroche + ' ' : ''}Une histoire en épisodes, à écouter le soir.`;
    try {
      if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') { await navigator.share({ title: `Le cas du soir : ${titre}`, text, url }); return; }
    } catch (e) { if (e instanceof DOMException && e.name === 'AbortError') return; }
    try { await navigator.clipboard.writeText(`${text}\n${url}`); setMsg('Lien copié'); } catch { setMsg(url); }
    window.setTimeout(() => setMsg(''), 4000);
  };
  return (
    <button type="button" onClick={partager} className="drl-btn"
      style={{ marginTop: 12, minHeight: 44, padding: '0 16px', borderRadius: 999, border: `1px solid ${accent}`, background: 'transparent', color: accent, fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: 'inherit' }}>
      <Share2 size={16} aria-hidden="true" /> {msg || 'Partager ce cas'}
    </button>
  );
};

export const PiedCas: React.FC<{ titre?: string; avertissement?: string }> = ({ titre, avertissement }) => (
  <>
    <button type="button" onClick={() => openDrLoChat({ greeting: titre ? `Tu lis « ${titre} ». Qu'est-ce que cette histoire te fait ?` : 'Qu\'est-ce qui t\'a touché dans le cas du soir ?', source: 'cas_du_soir' })} className="drl-btn"
      style={{ width: '100%', minHeight: 50, marginTop: 16, borderRadius: 999, background: DC.glass, color: DC.text, border: `1px solid ${DC.line}`, fontSize: 16, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: 'inherit' }}>
      <MessageCircle size={18} aria-hidden="true" /> En parler avec le compagnon
    </button>
    {avertissement && <p style={{ margin: '14px 0 0', fontSize: 13, lineHeight: 1.5, color: DC.faint, textAlign: 'center' }}>{avertissement}</p>}
  </>
);
