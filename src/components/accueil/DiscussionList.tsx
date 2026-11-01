/**
 * DiscussionList — « Mes discussions » : la discussion principale d'abord, puis les autres, la plus récente en haut.
 * Utilisée par la page Compagnon (première page) et par l'écran de conversation.
 */
import React, { useState } from 'react';
import { MessagesSquare, Pencil, Plus, Trash2 } from 'lucide-react';
import { DC } from './DrLoShell';
import { MAIN_ID, sortedConvs, type ConvIndex } from '../../utils/conversations';

interface Props {
  idx: ConvIndex;
  currentId: string;
  accent: string;
  onOpen: (id: string) => void;
  onNew: () => void;
  onRename: (id: string, title: string) => void;
  onRemove: (id: string) => void;
}

const fmt = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const days = Math.floor((Date.now() - d.getTime()) / 864e5);
  if (days <= 0) return 'Aujourd\'hui';
  if (days === 1) return 'Hier';
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
};

const DiscussionList: React.FC<Props> = ({ idx, currentId, accent, onOpen, onNew, onRename, onRemove }) => {
  const [editing, setEditing] = useState<{ id: string; text: string } | null>(null);
  const [confirmDel, setConfirmDel] = useState<string | null>(null);
  const list = sortedConvs(idx);
  const icon: React.CSSProperties = { border: 0, background: 'transparent', color: DC.muted, cursor: 'pointer', minWidth: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, fontSize: 13, fontWeight: 600, fontFamily: 'inherit' };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <button onClick={onNew} className="drl-btn"
        style={{ minHeight: 54, borderRadius: 16, border: 0, background: accent, color: DC.ink, fontSize: 16, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        <Plus size={18} strokeWidth={2.6} aria-hidden="true" /> Nouvelle discussion
      </button>
      <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {list.map(c => {
          const current = c.id === currentId;
          const main = c.id === MAIN_ID;
          return (
            <li key={c.id} style={{ borderRadius: 16, border: `1px solid ${current ? `${accent}77` : DC.line}`, background: current ? `${accent}12` : DC.glass, padding: '12px 8px 12px 14px' }}>
              {editing?.id === c.id ? (
                <form onSubmit={e => { e.preventDefault(); onRename(c.id, editing.text); setEditing(null); }} style={{ display: 'flex', gap: 8, paddingRight: 6 }}>
                  <input autoFocus value={editing.text} maxLength={40} onChange={e => setEditing({ id: c.id, text: e.target.value })} aria-label="Nom de la discussion"
                    style={{ flex: 1, minWidth: 0, minHeight: 44, borderRadius: 12, border: `1px solid ${accent}`, background: 'rgba(255,255,255,.06)', color: DC.text, padding: '0 12px', fontSize: 16, fontFamily: 'inherit', outline: 'none' }} />
                  <button type="submit" style={{ minHeight: 44, padding: '0 16px', borderRadius: 12, border: 0, background: accent, color: DC.ink, fontWeight: 700, cursor: 'pointer' }}>OK</button>
                </form>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <button onClick={() => onOpen(c.id)} style={{ flex: 1, minWidth: 0, minHeight: 48, border: 0, background: 'transparent', color: DC.text, textAlign: 'left', cursor: 'pointer', padding: 0, display: 'flex', gap: 12, alignItems: 'center', fontFamily: 'inherit' }}>
                    <MessagesSquare size={20} color={accent} aria-hidden="true" style={{ flexShrink: 0 }} />
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                        <span style={{ fontSize: 16, fontWeight: 700, color: DC.title, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.title}</span>
                        {main && <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: '.06em', color: accent, flexShrink: 0 }}>PRINCIPALE</span>}
                      </span>
                      <span style={{ display: 'block', marginTop: 2, fontSize: 14, lineHeight: 1.4, color: DC.faint, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {fmt(c.updatedAt)}{c.preview ? ` · ${c.preview}` : ''}
                      </span>
                    </span>
                  </button>
                  <button onClick={() => setEditing({ id: c.id, text: c.title })} aria-label={`Renommer ${c.title}`} style={icon}><Pencil size={16} aria-hidden="true" /></button>
                  {!main && (
                    confirmDel === c.id
                      ? <button onClick={() => { onRemove(c.id); setConfirmDel(null); }} aria-label={`Confirmer la suppression de ${c.title}`} style={{ ...icon, color: '#E8A0A0', padding: '0 8px' }}><Trash2 size={16} aria-hidden="true" /> Supprimer ?</button>
                      : <button onClick={() => setConfirmDel(c.id)} aria-label={`Supprimer ${c.title}`} style={icon}><Trash2 size={16} aria-hidden="true" /></button>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default DiscussionList;
