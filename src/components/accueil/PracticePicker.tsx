/** Choisir 0 à 2 pratiques publiées à proposer sous un épisode (console de Dr Lô). */
import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { DC } from './DrLoShell';
import { listAdminPractices, typeLabel, type AdminPractice } from '../../services/practiceService';

let cache: AdminPractice[] | null = null;

const PracticePicker: React.FC<{ value: string[]; onChange: (ids: string[]) => void; accent: string }> = ({ value, onChange, accent }) => {
  const [items, setItems] = useState<AdminPractice[] | null>(cache);
  const [err, setErr] = useState('');
  useEffect(() => { listAdminPractices().then(r => { cache = r.items; setItems(r.items); }).catch(e => setErr(e instanceof Error ? e.message : 'Erreur')); }, []);
  const live = (items ?? []).filter(p => p.status === 'published' || value.includes(p.id));
  const toggle = (id: string) => onChange(value.includes(id) ? value.filter(x => x !== id) : value.length >= 2 ? value : [...value, id]);
  return (
    <div>
      <p style={{ margin: '0 0 6px', fontSize: 14, color: DC.soft, fontWeight: 700 }}>Pratiques proposées à la fin de l'épisode <span style={{ fontWeight: 400, color: DC.faint }}>(2 au plus)</span></p>
      {err && <p role="alert" style={{ margin: 0, color: '#F09A7A', fontSize: 13 }}>{err}</p>}
      {items === null && !err && <Loader2 size={16} className="animate-spin" aria-label="Chargement des pratiques" />}
      {items !== null && live.length === 0 && <p style={{ margin: 0, fontSize: 13, color: DC.faint }}>Aucune pratique publiée. Crée-en une dans l'onglet « Pratiques ».</p>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {live.map(p => {
          const on = value.includes(p.id);
          const full = !on && value.length >= 2;
          return (
            <label key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 12, border: `1px solid ${on ? accent : DC.line}`, background: on ? 'rgba(242,182,109,.1)' : 'transparent', cursor: full ? 'default' : 'pointer', opacity: full ? 0.5 : 1 }}>
              <input type="checkbox" checked={on} disabled={full} onChange={() => toggle(p.id)} />
              <span style={{ flex: 1, fontSize: 14, color: DC.text }}>{p.title}<span style={{ display: 'block', fontSize: 13, color: DC.faint }}>{typeLabel(p.type)} · {p.minutes} min · {p.price > 0 ? `${p.price} étincelle${p.price > 1 ? 's' : ''}` : 'gratuite'}</span></span>
            </label>
          );
        })}
      </div>
    </div>
  );
};

export default PracticePicker;
