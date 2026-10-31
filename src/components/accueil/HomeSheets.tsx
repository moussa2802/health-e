/**
 * HomeSheets — la feuille « Noter mon humeur » (30 secondes), qui s'ouvre sur l'accueil sans changer de page.
 */
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { X } from 'lucide-react';
import { DC } from './DrLoShell';
import MoodIcon from './MoodIcon';
import { MOODS, dayKey, moodReply, type MoodId } from '../../utils/moodLog';
import { recordMood } from '../../services/moodService';
import { trackAccueil } from '../../utils/accueilTracking';

const Sheet: React.FC<{ label: string; onClose: () => void; children: React.ReactNode }> = ({ label, onClose, children }) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div role="dialog" aria-modal="true" aria-label={label} style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <button aria-label="Fermer" onClick={onClose} style={{ position: 'absolute', inset: 0, border: 0, background: 'rgba(10,8,6,.66)', cursor: 'pointer' }} />
      <div className="drl-in" style={{ position: 'relative', width: '100%', maxWidth: 520, boxSizing: 'border-box', background: '#1F1711', borderTop: `1px solid ${DC.line}`, borderRadius: '22px 22px 0 0', padding: '18px 18px calc(24px + env(safe-area-inset-bottom, 0px))' }}>
        <button onClick={onClose} aria-label="Fermer" className="drl-btn" style={{ position: 'absolute', top: 8, right: 8, width: 44, height: 44, border: 0, background: 'transparent', color: DC.muted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={20} aria-hidden="true" /></button>
        {children}
      </div>
    </div>
  );
};

export const MoodSheet: React.FC<{ uid: string | null; prenom?: string; onNoted: () => void; onClose: () => void }> = ({ uid, prenom, onNoted, onClose }) => {
  const [reply, setReply] = useState<string | null>(null);
  const pick = (id: MoodId) => {
    recordMood(uid, dayKey(), id).catch(() => { /* la copie locale est gardée */ });
    trackAccueil('mood', { guest: !uid, from: 'accueil' }); // jamais la valeur de l'humeur
    setReply(moodReply(id, prenom, false));
    onNoted();
  };
  return (
    <Sheet label="Noter mon humeur" onClose={onClose}>
      {reply === null ? (
        <>
          <p style={{ margin: '0 40px 14px 0', fontFamily: 'Fraunces, serif', fontSize: 20, fontWeight: 600, color: DC.title }}>Comment tu te sens, là, maintenant ?</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: 6 }}>
            {MOODS.map(md => (
              <button key={md.id} onClick={() => pick(md.id)} className="drl-mood"
                style={{ minHeight: 76, borderRadius: 14, border: `1px solid ${DC.line}`, background: DC.glass, color: DC.text, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                <MoodIcon id={md.id} color={md.color} />
                {md.label}
              </button>
            ))}
          </div>
        </>
      ) : (
        <div aria-live="polite">
          <p style={{ margin: '0 40px 0 0', fontSize: 16, lineHeight: 1.55, color: DC.text }}>{reply}</p>
          <div style={{ display: 'flex', gap: 10, marginTop: 16, flexWrap: 'wrap' }}>
            <Link to="/humeur" className="drl-btn" style={{ minHeight: 48, padding: '0 16px', borderRadius: 14, border: `1px solid ${DC.line}`, background: DC.glass, color: DC.text, fontWeight: 700, textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>Voir ma météo</Link>
            <button onClick={onClose} className="drl-btn" style={{ minHeight: 48, padding: '0 16px', borderRadius: 14, border: 0, background: DC.gold, color: '#1C1612', fontWeight: 800, cursor: 'pointer' }}>Fermer</button>
          </div>
        </div>
      )}
    </Sheet>
  );
};
