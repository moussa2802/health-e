/**
 * CompanionNaming — « Comment veux-tu m'appeler ? » : chaque personne nomme son compagnon (l'IA).
 * « Docteur », « Dr », « médecin » et « Lô » sont refusés : Dr Lô désigne toujours le vrai médecin.
 */
import React, { useState } from 'react';
import { cleanCompanionName, COMPANION_MAX } from '../../utils/companion';
import { DC, card } from './DrLoShell';

const SUGGESTIONS = ['Kora', 'Confident', 'Allié'];

const CompanionNaming: React.FC<{ current?: string; onSave: (name: string) => void; onSkip?: () => void; accent: string }> = ({ current = '', onSave, onSkip, accent }) => {
  const [text, setText] = useState(current);
  const [error, setError] = useState('');
  const submit = (raw: string) => {
    const name = cleanCompanionName(raw);
    if (!name) {
      setError(raw.trim() ? '« Docteur », « Dr », « médecin » et « Lô » sont réservés au vrai médecin. Choisis un autre nom, sans signes spéciaux.' : 'Écris un nom, ou choisis-en un ci-dessus.');
      return;
    }
    setError('');
    onSave(name);
  };
  return (
    <section aria-label="Donner un nom à ton compagnon" className="drl-in" style={{ ...card, marginTop: 14, borderColor: 'rgba(242,182,109,.4)', background: 'rgba(242,182,109,.07)', textAlign: 'left' }}>
      <p style={{ margin: 0, fontSize: 15, lineHeight: 1.5, color: DC.text }}>
        {current ? 'Comment veux-tu m\'appeler ?' : 'Je suis une IA, là pour ton bien-être. Comment veux-tu m\'appeler ?'}
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
        {SUGGESTIONS.map(s => (
          <button key={s} type="button" onClick={() => submit(s)} className="drl-btn"
            style={{ minHeight: 44, padding: '0 16px', borderRadius: 999, border: `1px solid ${DC.line}`, background: DC.glass, color: DC.text, fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>{s}</button>
        ))}
      </div>
      <form onSubmit={e => { e.preventDefault(); submit(text); }} style={{ display: 'flex', gap: 8, marginTop: 10 }}>
        <input value={text} maxLength={COMPANION_MAX} onChange={e => { setText(e.target.value); setError(''); }} placeholder="Ou choisis ton propre nom" aria-label="Nom de ton compagnon"
          style={{ flex: 1, minWidth: 0, minHeight: 46, boxSizing: 'border-box', borderRadius: 14, border: `1px solid ${DC.line}`, background: 'rgba(255,255,255,.06)', padding: '0 14px', fontFamily: 'inherit', fontSize: 16, color: DC.text, outline: 'none' }} />
        <button type="submit" className="drl-btn" style={{ minHeight: 46, padding: '0 18px', borderRadius: 14, border: 0, background: accent, color: DC.ink, fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>Valider</button>
      </form>
      {error && <p role="alert" style={{ margin: '8px 0 0', fontSize: 14, lineHeight: 1.45, color: '#F09A7A' }}>{error}</p>}
      {onSkip && (
        <button type="button" onClick={onSkip} className="drl-btn" style={{ marginTop: 6, minHeight: 44, border: 0, background: 'transparent', color: DC.muted, fontSize: 14, fontWeight: 600, cursor: 'pointer', padding: 0 }}>
          {current ? 'Annuler' : 'Plus tard'}
        </button>
      )}
    </section>
  );
};

export default CompanionNaming;
