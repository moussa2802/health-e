/**
 * CompanionNaming — « Comment veux-tu m'appeler ? » : chaque personne nomme son compagnon (l'IA) et choisit sa couleur.
 * « Docteur », « Dr », « médecin » et « Lô » sont refusés : Dr Lô désigne toujours le vrai médecin.
 */
import React, { useState } from 'react';
import { Dices } from 'lucide-react';
import { cleanCompanionName, COMPANION_COLORS, COMPANION_ICONS, COMPANION_MAX, COMPANION_NAME_IDEAS, getCompanionColor, getCompanionIcon } from '../../utils/companion';
import { DC, card } from './DrLoShell';
import CompanionMark, { ICON_PATHS } from './CompanionMark';

const SUGGESTIONS = ['Kora', 'Confident', 'Allié'];

const CompanionNaming: React.FC<{ current?: string; onSave: (name: string, colorId: string, iconId: string) => void; onSkip?: () => void; accent: string }> = ({ current = '', onSave, onSkip, accent }) => {
  const [text, setText] = useState(current);
  const [colorId, setColorId] = useState(getCompanionColor().id);
  const [iconId, setIconId] = useState<string>(getCompanionIcon());
  const [error, setError] = useState('');
  const color = COMPANION_COLORS.find(c => c.id === colorId) ?? COMPANION_COLORS[0];

  const submit = (raw: string) => {
    const name = cleanCompanionName(raw);
    if (!name) {
      setError(raw.trim() ? '« Docteur », « Dr », « médecin » et « Lô » sont réservés au vrai médecin. Choisis un autre nom, sans signes spéciaux.' : 'Écris un nom, ou choisis-en un ci-dessus.');
      return;
    }
    setError('');
    onSave(name, colorId, iconId);
  };
  const surprise = () => {
    const pool = COMPANION_NAME_IDEAS.filter(n => n !== text);
    setText(pool[Math.floor(Math.random() * pool.length)]);
    setColorId(COMPANION_COLORS[Math.floor(Math.random() * COMPANION_COLORS.length)].id);
    setIconId(COMPANION_ICONS[Math.floor(Math.random() * COMPANION_ICONS.length)].id);
    setError('');
  };
  const chip: React.CSSProperties = { minHeight: 44, padding: '0 16px', borderRadius: 999, border: `1px solid ${DC.line}`, background: DC.glass, color: DC.text, fontSize: 15, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 };

  return (
    <section aria-label="Donner un nom et une couleur à ton compagnon" className="drl-in" style={{ ...card, marginTop: 14, borderColor: `${color.hex}66`, background: `${color.hex}12`, textAlign: 'left' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <CompanionMark size={64} color={color.hex} icon={iconId} />
        <p style={{ margin: 0, flex: 1, fontSize: 15, lineHeight: 1.5, color: DC.text }}>
          {current ? 'Change son nom ou sa couleur quand tu veux.' : 'Je suis une IA, là pour ton bien-être. Comment veux-tu m\'appeler ?'}
        </p>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 14 }}>
        {SUGGESTIONS.map(s => (
          <button key={s} type="button" onClick={() => { setText(s); setError(''); }} className="drl-btn" style={{ ...chip, borderColor: text === s ? color.hex : DC.line }}>{s}</button>
        ))}
        <button type="button" onClick={surprise} className="drl-btn" style={{ ...chip, color: color.hex, borderColor: `${color.hex}88` }}><Dices size={16} aria-hidden="true" /> Surprends-moi</button>
      </div>

      <input value={text} maxLength={COMPANION_MAX} onChange={e => { setText(e.target.value); setError(''); }} placeholder="Ou choisis ton propre nom" aria-label="Nom de ton compagnon"
        style={{ width: '100%', marginTop: 10, minHeight: 46, boxSizing: 'border-box', borderRadius: 14, border: `1px solid ${DC.line}`, background: 'rgba(255,255,255,.06)', padding: '0 14px', fontFamily: 'inherit', fontSize: 16, color: DC.text, outline: 'none' }} />

      <p style={{ margin: '14px 0 8px', fontSize: 13, fontWeight: 700, color: DC.soft }}>Son emblème</p>
      <div role="radiogroup" aria-label="Emblème du compagnon" style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
        {COMPANION_ICONS.map(i => (
          <button key={i.id} type="button" role="radio" aria-checked={i.id === iconId} aria-label={i.label} onClick={() => setIconId(i.id)} className="drl-btn"
            style={{ width: 48, height: 48, borderRadius: 16, border: i.id === iconId ? `2px solid ${color.hex}` : `1px solid ${DC.line}`, background: i.id === iconId ? `${color.hex}26` : DC.glass, cursor: 'pointer', boxSizing: 'border-box', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke={color.hex} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{ICON_PATHS[i.id]}</svg>
          </button>
        ))}
      </div>

      <p style={{ margin: '14px 0 8px', fontSize: 13, fontWeight: 700, color: DC.soft }}>Sa couleur</p>
      <div role="radiogroup" aria-label="Couleur du compagnon" style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
        {COMPANION_COLORS.map(c => (
          <button key={c.id} type="button" role="radio" aria-checked={c.id === colorId} aria-label={c.label} onClick={() => setColorId(c.id)} className="drl-btn"
            style={{ width: 44, height: 44, borderRadius: '50%', border: c.id === colorId ? '3px solid #fff' : `1px solid ${DC.line}`, background: c.hex, cursor: 'pointer', boxSizing: 'border-box' }} />
        ))}
      </div>

      {error && <p role="alert" style={{ margin: '10px 0 0', fontSize: 14, lineHeight: 1.45, color: '#F09A7A' }}>{error}</p>}
      <button type="button" onClick={() => submit(text)} className="drl-btn" style={{ marginTop: 14, width: '100%', minHeight: 48, borderRadius: 14, border: 0, background: accent, color: DC.ink, fontSize: 16, fontWeight: 700, cursor: 'pointer' }}>Valider</button>
      {onSkip && (
        <button type="button" onClick={onSkip} className="drl-btn" style={{ marginTop: 6, minHeight: 44, border: 0, background: 'transparent', color: DC.muted, fontSize: 14, fontWeight: 600, cursor: 'pointer', padding: 0 }}>
          {current ? 'Annuler' : 'Plus tard'}
        </button>
      )}
    </section>
  );
};

export default CompanionNaming;
