/**
 * JournalView — « Mon journal », dans « Me confier » : une seule entité pour écrire et relire.
 * Les entrées sont rangées par jour (Aujourd'hui, Hier, puis la date), avec une recherche
 * quand le journal grandit. On peut relire l'avis de Dr Lô et supprimer une entrée.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Pencil, Search, Trash2 } from 'lucide-react';
import { listJournal, removeConfidence, type JournalItem } from '../../services/confierService';
import { CONFIER } from './confierTheme';

const DAYS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

const keyOf = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

export function dayLabel(d: Date, now = new Date()): string {
  const y = new Date(now); y.setDate(now.getDate() - 1);
  if (keyOf(d) === keyOf(now)) return 'Aujourd\'hui';
  if (keyOf(d) === keyOf(y)) return 'Hier';
  const s = `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}${d.getFullYear() !== now.getFullYear() ? ` ${d.getFullYear()}` : ''}`;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const norm = (t: string) => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

const JournalView: React.FC<{ userId: string | null; refreshKey: number; onWrite: () => void }> = ({ userId, refreshKey, onWrite }) => {
  const [items, setItems] = useState<JournalItem[] | null>(null);
  const [q, setQ] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<string | null>(null);
  /** Filtre par carnet (« Tout » par défaut) */
  const [carnet, setCarnet] = useState<string | null>(null);

  useEffect(() => {
    let off = false;
    setItems(null);
    listJournal(userId).then(list => { if (!off) setItems(list); }).catch(() => { if (!off) setItems([]); });
    return () => { off = true; };
  }, [userId, refreshKey]);

  const groups = useMemo(() => {
    const list = (items ?? []).filter(i => (!carnet || i.carnet === carnet) && (!q.trim() || norm(i.contenu).includes(norm(q.trim()))));
    const out: { label: string; entries: JournalItem[] }[] = [];
    for (const it of list) {
      const d = new Date(it.date);
      const label = Number.isNaN(d.getTime()) ? 'Sans date' : dayLabel(d);
      const g = out[out.length - 1];
      if (g && g.label === label) g.entries.push(it); else out.push({ label, entries: [it] });
    }
    return out;
  }, [items, q, carnet]);
  const carnetCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const i of items ?? []) m.set(i.carnet, (m.get(i.carnet) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [items]);

  const onDelete = async (id: string) => {
    if (confirm !== id) { setConfirm(id); return; }
    try {
      await removeConfidence(userId, id);
      setItems(prev => (prev ?? []).filter(i => i.id !== id));
    } catch { /* on garde l'entrée */ }
    setConfirm(null);
  };

  if (items === null) return <p style={{ margin: '16px 0', textAlign: 'center', color: CONFIER.faint, fontSize: 14 }}>J'ouvre ton journal…</p>;

  if (!items.length) {
    return (
      <div style={{ textAlign: 'center', padding: '24px 8px' }}>
        <p style={{ margin: 0, fontSize: 15, color: CONFIER.text, fontWeight: 600 }}>Ton journal est encore vide.</p>
        <p style={{ margin: '6px 0 14px', fontSize: 13.5, color: CONFIER.muted, lineHeight: 1.5 }}>Raconte ta journée, même en deux phrases : tu pourras tout relire ici, jour après jour.</p>
        <button onClick={onWrite} className="drl-btn" style={{ minHeight: 44, padding: '0 18px', borderRadius: 999, border: 0, background: 'linear-gradient(180deg, #D8CAF0 0%, #B9A6D6 100%)', color: CONFIER.ink, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>Écrire maintenant</button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {carnetCounts.length > 1 && (
        <div role="group" aria-label="Mes carnets" style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {[[null, items.length] as [string | null, number], ...carnetCounts].map(([c, n]) => (
            <button key={c ?? 'tout'} onClick={() => setCarnet(c)} className="drl-btn"
              style={{ minHeight: 34, padding: '0 12px', borderRadius: 999, border: `1px solid ${carnet === c ? CONFIER.accent : CONFIER.line}`, background: carnet === c ? 'rgba(201,184,228,.25)' : 'transparent', color: CONFIER.text, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              {c ?? 'Tout'} <span style={{ color: CONFIER.faint, fontWeight: 500 }}>{n}</span>
            </button>
          ))}
        </div>
      )}
      {items.length >= 6 && (
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, minHeight: 44, padding: '0 14px', borderRadius: 14, border: '1px solid rgba(255,255,255,.14)', background: 'rgba(255,255,255,.05)' }}>
          <Search size={16} color={CONFIER.faint} aria-hidden="true" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Retrouver un passage…" aria-label="Chercher dans mon journal"
            className="drl-input" style={{ flex: 1, minWidth: 0, border: 0, background: 'transparent', color: CONFIER.text, fontSize: 15, outline: 'none', fontFamily: 'inherit' }} />
        </label>
      )}
      {groups.length === 0 && <p style={{ margin: 0, textAlign: 'center', fontSize: 13.5, color: CONFIER.faint }}>Rien trouvé pour « {q} ».</p>}
      {groups.map(g => (
        <section key={g.label} aria-label={g.label}>
          <p style={{ margin: '0 0 8px', fontSize: 12, letterSpacing: '.08em', textTransform: 'uppercase', fontWeight: 700, color: CONFIER.accent }}>{g.label}</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {g.entries.map(it => {
              const d = new Date(it.date);
              const time = Number.isNaN(d.getTime()) ? '' : d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
              const isOpen = open === it.id;
              const long = it.contenu.length > 220;
              return (
                <article key={it.id} style={{ borderRadius: 16, border: `1px solid ${CONFIER.line}`, background: CONFIER.tint, padding: '10px 13px', textAlign: 'left' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 11.5, color: CONFIER.faint }}>{time}{it.humeur ? ` · ${it.humeur}` : ''}{!carnet && carnetCounts.length > 1 ? ` · ${it.carnet}` : ''}</span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    {userId && <Link to={`/journal/${it.id}/modifier`} aria-label="Modifier cette page" style={{ color: CONFIER.faint, display: 'inline-flex', alignItems: 'center', minHeight: 28, padding: '0 4px' }}><Pencil size={13} aria-hidden="true" /></Link>}
                    <button onClick={() => void onDelete(it.id)} aria-label={confirm === it.id ? 'Confirmer la suppression' : 'Supprimer cette entrée'}
                      style={{ border: 0, background: 'transparent', color: confirm === it.id ? '#E8A0A0' : CONFIER.faint, fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4, minHeight: 28 }}>
                      <Trash2 size={13} aria-hidden="true" /> {confirm === it.id ? 'Supprimer ?' : ''}
                    </button>
                    </span>
                  </div>
                  <p onClick={() => long && setOpen(isOpen ? null : it.id)}
                    style={{ margin: '4px 0 0', fontSize: 14.5, lineHeight: 1.55, color: CONFIER.text, whiteSpace: 'pre-wrap', cursor: long ? 'pointer' : 'default' }}>
                    {long && !isOpen ? `${it.contenu.slice(0, 220).trimEnd()}… ` : it.contenu}
                    {long && <span style={{ color: CONFIER.accent, fontWeight: 700, fontSize: 13 }}>{isOpen ? ' Réduire' : 'Lire la suite'}</span>}
                  </p>
                  {it.drLo && (
                    <details style={{ marginTop: 8 }}>
                      <summary style={{ cursor: 'pointer', fontSize: 13, fontWeight: 700, color: CONFIER.accent }}>L'avis de Dr Lô</summary>
                      <p style={{ margin: '6px 0 0', fontSize: 14, lineHeight: 1.55, color: CONFIER.muted, whiteSpace: 'pre-wrap' }}>{it.drLo}</p>
                    </details>
                  )}
                </article>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
};

export default JournalView;
