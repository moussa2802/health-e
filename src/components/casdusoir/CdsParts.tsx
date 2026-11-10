/**
 * CdsParts — les pièces communes du « Cas du soir » : les résultats d'un vote, la fin (leçon, quiz, tests),
 * le bandeau d'aperçu du propriétaire, la mention « Histoire inventée ».
 */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, ChevronRight, MessageCircle } from 'lucide-react';
import { DC, card } from '../accueil/DrLoShell';
import AudioSynchro from './AudioSynchro';
import { openDrLoChat } from '../DrLoChat/drLoEvents';
import { getScaleMeta } from '../../utils/scaleMeta';
import { getJourApercu, setJourApercu, type CdsEpisodeReponse, type CdsFin, type CdsResultats } from '../../services/casDuSoirService';

export const ANIMAL_NOM: Record<string, string> = {
  lion: 'Lion', aigle: 'Aigle', cheval: 'Cheval', loup: 'Loup', dauphin: 'Dauphin', elephant: 'Éléphant',
  cerf: 'Cerf', hibou: 'Hibou', panthere: 'Panthère', renard: 'Renard', tortue: 'Tortue', ours: 'Ours',
};
export const etoiles = (n: number) => `${n} étincelle${n > 1 ? 's' : ''}`;
export const Maj = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

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

export const Fin: React.FC<{ fin: CdsFin; accent: string }> = ({ fin, accent }) => {
  const navigate = useNavigate();
  const [rep, setRep] = useState<Record<number, number>>({});
  const tous = fin.quiz.every((_, i) => rep[i] !== undefined);
  const testBtn: React.CSSProperties = { minHeight: 48, borderRadius: 14, border: `1px solid ${DC.line}`, background: DC.glass, color: DC.text, fontSize: 15, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontFamily: 'inherit' };
  return (
    <section style={{ ...card, marginTop: 16 }}>
      <h2 style={{ margin: 0, fontFamily: 'Fraunces, serif', fontSize: 22, color: DC.title }}>{fin.titre}</h2>
      <AudioSynchro src={fin.audioUrl} minutage={fin.minutage} label="Écouter la leçon" accent={accent}
        texte={fin.texte.split(/\n{2,}/).map((p, i) => <p key={i} style={{ margin: '12px 0 0', fontSize: 15, lineHeight: 1.6, color: DC.text, whiteSpace: 'pre-line' }}>{p}</p>)} />
      <h3 style={{ margin: '20px 0 0', fontSize: 16, color: DC.title }}>Le quiz : 3 questions</h3>
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
    </section>
  );
};


/** Aperçu du propriétaire : simuler le jour 1 à 5 avant la date de départ (visible par lui seul). */
export const BandeauApercu: React.FC<{ accent: string; onChange: () => void }> = ({ accent, onChange }) => {
  const [jour, setJour] = useState<number | null>(getJourApercu());
  const choisir = (j: number | null) => { setJour(j); setJourApercu(j); onChange(); };
  const b = (on: boolean): React.CSSProperties => ({ minWidth: 44, minHeight: 44, padding: '0 12px', borderRadius: 12, border: `1px solid ${on ? accent : DC.line}`, background: DC.glass, color: DC.text, cursor: 'pointer', fontSize: 14, fontFamily: 'inherit' });
  return (
    <div style={{ ...card, marginTop: 14, padding: 12 }}>
      <p style={{ margin: 0, fontSize: 13, color: DC.muted }}>Aperçu (visible par toi seul) : simuler le jour</p>
      <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
        {[1, 2, 3, 4, 5].map(j => <button key={j} type="button" onClick={() => choisir(j)} style={b(jour === j)}>{j}</button>)}
        <button type="button" onClick={() => choisir(null)} style={b(jour === null)}>Aujourd'hui</button>
      </div>
    </div>
  );
};

/** « En parler avec le compagnon » et la mention, toujours en bas. */
export const PiedCas: React.FC<{ titre?: string; avertissement?: string }> = ({ titre, avertissement }) => (
  <>
    <button type="button" onClick={() => openDrLoChat({ greeting: titre ? `Tu lis « ${titre} ». Qu'est-ce que cette histoire te fait ?` : 'Qu\'est-ce qui t\'a touché dans le cas du soir ?', source: 'cas_du_soir' })} className="drl-btn"
      style={{ width: '100%', minHeight: 50, marginTop: 16, borderRadius: 999, background: DC.glass, color: DC.text, border: `1px solid ${DC.line}`, fontSize: 16, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: 'inherit' }}>
      <MessageCircle size={18} aria-hidden="true" /> En parler avec le compagnon
    </button>
    {avertissement && <p style={{ margin: '14px 0 0', fontSize: 13, lineHeight: 1.5, color: DC.faint, textAlign: 'center' }}>{avertissement}</p>}
  </>
);
