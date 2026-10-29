/**
 * DrloMemoryCard — « Ce que Dr Lô retient de toi » (Mon espace).
 * Les notes que Dr Lô garde d'une discussion à l'autre : la personne les voit, en efface une,
 * ou efface tout. Rien n'est jamais partagé.
 */
import React, { useEffect, useState } from 'react';
import { Brain, Trash2 } from 'lucide-react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../utils/firebase';
import { DC, card } from './DrLoShell';
import type { MomentPalette } from '../../utils/drloMoment';

interface Note { text: string; at?: string }

const DrloMemoryCard: React.FC<{ uid: string; palette: MomentPalette }> = ({ uid, palette }) => {
  const [notes, setNotes] = useState<Note[] | null>(null);
  const [confirmAll, setConfirmAll] = useState(false);

  useEffect(() => {
    let off = false;
    getDoc(doc(db!, 'patients', uid))
      .then(s => { if (!off) setNotes(((s.exists() ? s.data().drloMemory : null) ?? []).map((n: Note | string) => (typeof n === 'string' ? { text: n } : n))); })
      .catch(() => { if (!off) setNotes([]); });
    return () => { off = true; };
  }, [uid]);

  const save = (next: Note[]) => {
    setNotes(next);
    setDoc(doc(db!, 'patients', uid), { drloMemory: next }, { merge: true }).catch(() => {});
  };

  if (!notes) return null;
  return (
    <section aria-label="Ce que Dr Lô retient de toi" style={{ ...card, marginTop: 14 }}>
      <p style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8, fontSize: 15, fontWeight: 700, color: DC.title }}>
        <Brain size={17} color={palette.accent} aria-hidden="true" />Ce que Dr Lô retient de toi
      </p>
      <p style={{ margin: '4px 0 10px', fontSize: 13, lineHeight: 1.5, color: DC.faint }}>
        Pour se souvenir de toi d'une discussion à l'autre. Visible par toi seul, jamais partagé. Tu peux effacer ce que tu veux.
      </p>
      {notes.length === 0 ? (
        <p style={{ margin: 0, fontSize: 14, color: DC.muted }}>Rien pour l'instant : ça viendra au fil de vos discussions.</p>
      ) : (
        <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {notes.map((n, i) => (
            <li key={`${i}-${n.text}`} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 14, lineHeight: 1.45, color: DC.soft }}>
              <span style={{ flex: 1 }}>{n.text}</span>
              <button onClick={() => save(notes.filter((_, j) => j !== i))} aria-label={`Effacer : ${n.text}`} className="drl-btn"
                style={{ flexShrink: 0, width: 32, height: 32, borderRadius: 10, border: 0, background: 'transparent', color: DC.faint, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Trash2 size={15} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
      {notes.length > 0 && (
        <button onClick={() => { if (!confirmAll) { setConfirmAll(true); return; } save([]); setConfirmAll(false); }} className="drl-btn"
          style={{ marginTop: 10, minHeight: 40, padding: '0 14px', borderRadius: 12, border: `1px solid ${DC.line}`, background: 'transparent', color: confirmAll ? '#E9A28F' : DC.muted, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          {confirmAll ? 'Touche encore pour tout effacer' : 'Tout effacer'}
        </button>
      )}
    </section>
  );
};

export default DrloMemoryCard;
