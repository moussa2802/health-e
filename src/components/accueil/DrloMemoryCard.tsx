/**
 * DrloMemoryCard — « Ce que {nom} sait de toi » (Moi).
 * Le carnet du compagnon : il s'enrichit au fil des discussions (plus tu lui parles, mieux il te connaît).
 * La personne voit où il en est, lit ce qu'il sait (rangé par thème), efface, ou lui dit elle-même quelque chose.
 * Visible par elle seule, jamais partagé.
 */
import React, { useEffect, useState } from 'react';
import { ChevronDown, Plus, Trash2 } from 'lucide-react';
import { DC, card } from './DrLoShell';
import type { MomentPalette } from '../../utils/drloMoment';
import { getCompanionColor, getCompanionName } from '../../utils/companion';
import { KNOW_STEPS, knowLevel, loadMemory, MEMORY_CATS, MEMORY_MAX, saveMemory, type MemoryNote } from '../../utils/companionMemory';

const DrloMemoryCard: React.FC<{ uid: string; palette: MomentPalette }> = ({ uid }) => {
  const [notes, setNotes] = useState<MemoryNote[] | null>(null);
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState('');
  const [confirmAll, setConfirmAll] = useState(false);
  // L'intime reste voilé tant qu'on ne touche pas : quelqu'un peut regarder l'écran
  const [intimeOpen, setIntimeOpen] = useState(false);
  const name = getCompanionName() || 'Ton compagnon';
  const hex = getCompanionColor().hex;

  useEffect(() => {
    let off = false;
    loadMemory(uid).then(n => { if (!off) setNotes(n); }).catch(() => { if (!off) setNotes([]); });
    return () => { off = true; };
  }, [uid]);

  const save = (next: MemoryNote[]) => { setNotes(next); saveMemory(uid, next).catch(() => {}); };
  const add = () => {
    const t = draft.replace(/\s+/g, ' ').trim().slice(0, 160);
    if (!t || !notes) return;
    save([{ text: t, cat: 'vie' as const, at: new Date().toISOString() }, ...notes].slice(0, MEMORY_MAX));
    setDraft(''); setAdding(false); setOpen(true);
  };

  if (!notes) return null;
  const level = knowLevel(notes.length);

  return (
    <section aria-label={`Ce que ${name} sait de toi`} style={{ ...card, marginTop: 14 }}>
      <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: DC.title }}>Ce que {name} sait de toi</p>
      <p style={{ margin: '4px 0 0', fontSize: 14, lineHeight: 1.45, color: DC.soft }}>
        {name} <b style={{ color: hex }}>{level.text}</b>.
      </p>
      <div aria-hidden="true" style={{ display: 'flex', gap: 4, margin: '10px 0 6px' }}>
        {Array.from({ length: KNOW_STEPS }, (_, i) => (
          <span key={i} style={{ flex: 1, height: 6, borderRadius: 3, background: i < level.step ? hex : DC.line, boxShadow: i === level.step - 1 ? `0 0 8px ${hex}88` : 'none' }} />
        ))}
      </div>
      <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5, color: DC.faint }}>
        Plus vous parlez, mieux il te connaît. Visible par toi seul, jamais partagé.
      </p>

      {notes.length > 0 && (
        <button type="button" onClick={() => setOpen(v => !v)} aria-expanded={open} className="drl-btn"
          style={{ marginTop: 10, width: '100%', minHeight: 44, padding: '0 12px', borderRadius: 12, border: `1px solid ${DC.line}`, background: 'transparent', color: DC.soft, fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontFamily: 'inherit' }}>
          <span>{open ? 'Masquer' : `Voir ce qu'il sait (${notes.length})`}</span>
          <ChevronDown size={16} aria-hidden="true" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }} />
        </button>
      )}

      {open && notes.length > 0 && (
        <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {MEMORY_CATS.map(c => {
            const list = notes.map((n, i) => ({ n, i })).filter(x => x.n.cat === c.id);
            if (!list.length) return null;
            if (c.id === 'intime' && !intimeOpen) return (
              <div key={c.id}>
                <p style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase', color: hex }}>{c.label}</p>
                <button type="button" onClick={() => setIntimeOpen(true)} className="drl-btn"
                  style={{ width: '100%', minHeight: 44, borderRadius: 12, border: `1px dashed ${DC.line}`, background: 'rgba(255,255,255,.03)', color: DC.muted, fontFamily: 'inherit', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                  {list.length} note{list.length > 1 ? 's' : ''} · Touche pour afficher
                </button>
              </div>
            );
            return (
              <div key={c.id}>
                <p style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase', color: hex }}>{c.label}</p>
                <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {list.map(({ n, i }) => (
                    <li key={`${i}-${n.text}`} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 14, lineHeight: 1.45, color: DC.soft }}>
                      <span style={{ flex: 1, paddingTop: 6 }}>{n.text}</span>
                      <button onClick={() => save(notes.filter((_, j) => j !== i))} aria-label={`Effacer : ${n.text}`} className="drl-btn"
                        style={{ flexShrink: 0, width: 32, height: 32, borderRadius: 10, border: 0, background: 'transparent', color: DC.faint, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Trash2 size={15} aria-hidden="true" />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
          <button onClick={() => { if (!confirmAll) { setConfirmAll(true); return; } save([]); setConfirmAll(false); setOpen(false); }} className="drl-btn"
            style={{ alignSelf: 'flex-start', minHeight: 40, padding: '0 14px', borderRadius: 12, border: `1px solid ${DC.line}`, background: 'transparent', color: confirmAll ? '#E9A28F' : DC.muted, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
            {confirmAll ? 'Touche encore pour tout effacer' : 'Tout effacer'}
          </button>
        </div>
      )}

      {adding ? (
        <form onSubmit={e => { e.preventDefault(); add(); }} style={{ marginTop: 10, display: 'flex', gap: 6 }}>
          <input value={draft} onChange={e => setDraft(e.target.value)} maxLength={160} autoFocus aria-label={`Ce que ${name} doit savoir`}
            placeholder="Ex. : je prépare un concours en juin"
            style={{ flex: 1, minWidth: 0, minHeight: 44, padding: '0 12px', borderRadius: 12, border: `1px solid ${DC.line}`, background: 'rgba(255,255,255,.04)', color: DC.text, fontSize: 15, fontFamily: 'inherit' }} />
          <button type="submit" disabled={!draft.trim()} className="drl-btn"
            style={{ minHeight: 44, padding: '0 14px', borderRadius: 12, border: 0, background: draft.trim() ? hex : DC.line, color: DC.ink, fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Garder</button>
        </form>
      ) : (
        <button type="button" onClick={() => setAdding(true)} className="drl-btn"
          style={{ marginTop: 8, minHeight: 40, padding: 0, border: 0, background: 'transparent', color: DC.muted, fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'inherit' }}>
          <Plus size={15} aria-hidden="true" />Lui dire quelque chose sur toi
        </button>
      )}
    </section>
  );
};

export default DrloMemoryCard;
