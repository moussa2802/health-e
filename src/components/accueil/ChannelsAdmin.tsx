/**
 * ChannelsAdmin — « Chaînes » dans l'espace Dr Lô : créer, modifier, archiver une chaîne.
 * Dr Lô choisit tout lui-même : photo, nom, description, conditions d'entrée, prix, texte de cadrage.
 * Les membres ne sont jamais listés ici avec leurs résultats : seulement leur nombre.
 */
import React, { useEffect, useRef, useState } from 'react';
import { Archive, ArchiveRestore, Camera, Loader2, MessageSquarePlus, Pencil, Plus, Users, X } from 'lucide-react';
import { DC, card } from './DrLoShell';
import ChannelPostsAdmin from './ChannelPostsAdmin';
import type { MomentPalette } from '../../utils/drloMoment';
import { SCALE_META } from '../../utils/scaleMeta';
import { getChannelActivity, listAdminChannels, saveChannel, type AdminChannel, type ChannelRules, type ChannelsActivity } from '../../services/drloChannelService';
import type { Level } from '../../services/drloBroadcastService';

const TOTEMS = ['lion', 'loup', 'cerf', 'dauphin', 'tortue', 'hibou', 'aigle', 'éléphant', 'panthère', 'renard', 'cheval', 'ours'];
const TOTEM_IDS: Record<string, string> = { 'éléphant': 'elephant', 'panthère': 'panthere' };
const LEVELS: { id: Level; label: string }[] = [
  { id: 'bon', label: 'Tout va bien' }, { id: 'leger', label: 'Léger' }, { id: 'modere', label: 'Modéré' }, { id: 'eleve', label: 'Élevé' },
];
const AGES = [{ v: 18, l: '18 ans et plus (tous)' }, { v: 26, l: '26 ans et plus' }, { v: 36, l: '36 ans et plus' }, { v: 46, l: '46 ans et plus' }, { v: 55, l: '55 ans et plus' }];
const FRAMING_MAX = 2000;

const field: React.CSSProperties = { width: '100%', boxSizing: 'border-box', borderRadius: 14, border: `1px solid ${DC.line}`, background: 'rgba(255,255,255,.06)', padding: '12px 14px', fontFamily: 'inherit', fontSize: 16, color: DC.text, outline: 'none' };
const lab: React.CSSProperties = { margin: '16px 0 6px', fontSize: 13, fontWeight: 700, color: DC.soft };
const scaleLabel = (id: string) => SCALE_META[id]?.label ?? id;

/** Réduit la photo (900 px max, JPEG) pour qu'elle passe toujours à l'envoi. */
function shrinkPhoto(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const k = Math.min(1, 900 / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      const ctx = c.getContext('2d');
      if (!ctx) { URL.revokeObjectURL(url); reject(new Error('Photo illisible')); return; }
      ctx.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL('image/jpeg', 0.85));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Cette photo ne peut pas être lue.')); };
    img.src = url;
  });
}

const Form: React.FC<{ initial: AdminChannel | null; palette: MomentPalette; onDone: () => void; onCancel: () => void }> = ({ initial, palette, onDone, onCancel }) => {
  const [name, setName] = useState(initial?.name ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [price, setPrice] = useState(String(initial?.price ?? 0));
  const [framing, setFraming] = useState(initial?.framingText ?? '');
  const [ack, setAck] = useState(initial?.requireFramingAck ?? false);
  const [tests, setTests] = useState<NonNullable<ChannelRules['tests']>>(initial?.rules.tests ?? []);
  const [totems, setTotems] = useState<string[]>(initial?.rules.totems ?? []);
  const [minAge, setMinAge] = useState<number>(initial?.rules.minAge ?? 18);
  const [photo, setPhoto] = useState<string | null>(null); // data URL d'une nouvelle photo
  const [removePhoto, setRemovePhoto] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const shownPhoto = photo ?? (removePhoto ? null : initial?.photoUrl ?? null);
  const scaleOptions = Object.entries(SCALE_META).map(([id, m]) => ({ id, label: m.label })).sort((a, b) => a.label.localeCompare(b.label, 'fr'));

  const chip = (on: boolean): React.CSSProperties => ({
    minHeight: 36, padding: '0 12px', borderRadius: 999, cursor: 'pointer', fontSize: 13, fontWeight: 600,
    border: `1px solid ${on ? palette.accent : DC.line}`, background: on ? 'rgba(242,182,109,.15)' : DC.glass, color: on ? palette.accent : DC.muted,
  });
  const toggle = <T,>(list: T[], v: T): T[] => (list.includes(v) ? list.filter(x => x !== v) : [...list, v]);
  const priceNum = Number(price);
  const priceOk = price.trim() !== '' && Number.isInteger(priceNum) && priceNum >= 0 && priceNum <= 5000;
  const canSave = name.trim().length >= 3 && description.trim().length >= 10 && priceOk && !busy;

  const pick = async (f: File | undefined) => {
    if (!f) return;
    setErr('');
    try { setPhoto(await shrinkPhoto(f)); setRemovePhoto(false); }
    catch (e) { setErr(e instanceof Error ? e.message : 'Photo illisible'); }
  };
  const addTest = (id: string) => { if (id && !tests.some(t => t.scaleId === id)) setTests(v => [...v, { scaleId: id }]); };
  const toggleLevel = (id: string, l: Level) => setTests(v => v.map(t => {
    if (t.scaleId !== id) return t;
    const cur = t.levels ?? [];
    const next = toggle(cur, l);
    return next.length ? { ...t, levels: next } : { scaleId: t.scaleId };
  }));

  const save = async () => {
    setBusy(true); setErr('');
    try {
      const rules: ChannelRules = {};
      if (tests.length) rules.tests = tests;
      if (totems.length) rules.totems = totems;
      if (minAge > 18) rules.minAge = minAge;
      await saveChannel({
        ...(initial ? { id: initial.id } : {}),
        name: name.trim(), description: description.trim(), price: priceNum, framingText: framing.trim(), requireFramingAck: ack && framing.trim().length > 0,
        rules, ...(photo ? { photo: { data: photo.split(',')[1], mime: 'image/jpeg' } } : {}), ...(removePhoto && !photo ? { removePhoto: true } : {}),
      });
      onDone();
    } catch (e) { setErr(e instanceof Error ? e.message : 'Erreur'); }
    finally { setBusy(false); }
  };

  return (
    <section style={{ ...card, marginTop: 14 }} aria-label={initial ? 'Modifier la chaîne' : 'Nouvelle chaîne'}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <h2 style={{ margin: 0, fontFamily: 'Georgia, serif', fontSize: 19, color: DC.title }}>{initial ? 'Modifier la chaîne' : 'Nouvelle chaîne'}</h2>
        <button type="button" onClick={onCancel} aria-label="Fermer" className="drl-btn" style={{ marginLeft: 'auto', width: 38, height: 38, borderRadius: 12, border: `1px solid ${DC.line}`, background: DC.glass, color: DC.muted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={16} aria-hidden="true" /></button>
      </div>

      <p style={lab}>Photo de la chaîne</p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 96, height: 96, borderRadius: 18, overflow: 'hidden', border: `1px solid ${DC.line}`, background: 'rgba(157,191,175,.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
          {shownPhoto ? <img src={shownPhoto} alt="Photo de la chaîne" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Camera size={26} color={DC.sage} aria-hidden="true" />}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" aria-label="Choisir une photo" hidden onChange={e => { pick(e.target.files?.[0]); e.target.value = ''; }} />
          <button type="button" onClick={() => fileRef.current?.click()} className="drl-btn" style={{ minHeight: 40, padding: '0 14px', borderRadius: 999, border: `1px solid ${DC.line}`, background: DC.glass, color: DC.text, fontWeight: 700, fontSize: 13.5, cursor: 'pointer' }}>{shownPhoto ? 'Changer la photo' : 'Ajouter une photo'}</button>
          {shownPhoto && <button type="button" onClick={() => { setPhoto(null); setRemovePhoto(true); }} style={{ background: 'none', border: 0, color: DC.faint, fontSize: 12.5, cursor: 'pointer', textAlign: 'left', padding: 0 }}>Retirer la photo</button>}
        </div>
      </div>

      <p style={lab}>Nom</p>
      <input aria-label="Nom de la chaîne" maxLength={60} value={name} onChange={e => setName(e.target.value)} placeholder="Ex. Gérer ses émotions" className="drl-input" style={field} />
      <p style={lab}>Description courte (pour qui est cette chaîne ?)</p>
      <textarea aria-label="Description" rows={3} maxLength={280} value={description} onChange={e => setDescription(e.target.value)} placeholder="Sans tabou, avec rigueur médicale…" className="drl-input" style={{ ...field, resize: 'vertical' }} />
      <p style={{ margin: '4px 0 0', fontSize: 12, color: DC.faint, textAlign: 'right' }}>{description.length} / 280</p>

      <p style={lab}>Conditions d'entrée</p>
      <p style={{ margin: '0 0 8px', fontSize: 12.5, color: DC.faint, lineHeight: 1.5 }}>Tout se combine : la personne doit remplir toutes les conditions. Ne rien choisir = ouvert à tous les comptes.</p>

      <p style={{ ...lab, marginTop: 6 }}>Tests à avoir faits</p>
      {tests.map(t => (
        <div key={t.scaleId} style={{ border: `1px solid ${DC.line}`, borderRadius: 14, padding: 10, marginBottom: 8, background: 'rgba(255,255,255,.03)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <b style={{ color: DC.text, fontSize: 14 }}>{scaleLabel(t.scaleId)}</b>
            <button type="button" onClick={() => setTests(v => v.filter(x => x.scaleId !== t.scaleId))} aria-label={`Retirer ${scaleLabel(t.scaleId)}`} style={{ marginLeft: 'auto', background: 'none', border: 0, color: DC.faint, cursor: 'pointer' }}><X size={16} aria-hidden="true" /></button>
          </div>
          <p style={{ margin: '8px 0 6px', fontSize: 12, color: DC.faint }}>Niveau demandé (facultatif) :</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {LEVELS.map(l => <button key={l.id} type="button" onClick={() => toggleLevel(t.scaleId, l.id)} style={chip(!!t.levels?.includes(l.id))}>{l.label}</button>)}
          </div>
        </div>
      ))}
      <select aria-label="Ajouter un test" value="" onChange={e => addTest(e.target.value)} className="drl-input" style={{ ...field, minHeight: 46, padding: '0 12px' }}>
        <option value="">+ Ajouter un test exigé</option>
        {scaleOptions.filter(o => !tests.some(t => t.scaleId === o.id)).map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
      </select>

      <p style={lab}>Totem (facultatif)</p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {TOTEMS.map(t => { const id = TOTEM_IDS[t] ?? t; return <button key={id} type="button" onClick={() => setTotems(v => toggle(v, id))} style={chip(totems.includes(id))}>{t}</button>; })}
      </div>

      <p style={lab}>Âge minimum</p>
      <select aria-label="Âge minimum" value={minAge} onChange={e => setMinAge(Number(e.target.value))} className="drl-input" style={{ ...field, minHeight: 46, padding: '0 12px' }}>
        {AGES.map(a => <option key={a.v} value={a.v}>{a.l}</option>)}
      </select>
      <p style={{ margin: '6px 0 0', fontSize: 12, color: DC.faint, lineHeight: 1.5 }}>Le site connaît la tranche d'âge (18-25, 26-35…), pas la date de naissance. Tous les comptes ont 18 ans ou plus.</p>

      <p style={lab}>Prix d'entrée (étincelles)</p>
      <input aria-label="Prix d'entrée" inputMode="numeric" value={price} onChange={e => setPrice(e.target.value.replace(/\D/g, '').slice(0, 4))} className="drl-input" style={{ ...field, maxWidth: 160 }} />
      <p style={{ margin: '6px 0 0', fontSize: 12, color: DC.faint, lineHeight: 1.5 }}>Payé une seule fois, non remboursable. 0 = gratuit. {!priceOk && price !== '' && <span style={{ color: '#F09A7A' }}>Entre 0 et 5000.</span>}</p>

      <p style={lab}>Texte de cadrage (facultatif)</p>
      <textarea aria-label="Texte de cadrage" rows={6} maxLength={FRAMING_MAX} value={framing} onChange={e => setFraming(e.target.value)} placeholder="Ce que la personne doit savoir avant d'entrer…" className="drl-input" style={{ ...field, resize: 'vertical' }} />
      <p style={{ margin: '4px 0 0', fontSize: 12, color: DC.faint, textAlign: 'right' }}>{framing.length} / {FRAMING_MAX}</p>
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, fontSize: 14, color: framing.trim() ? DC.soft : DC.faint, cursor: framing.trim() ? 'pointer' : 'default' }}>
        <input type="checkbox" disabled={!framing.trim()} checked={ack && !!framing.trim()} onChange={e => setAck(e.target.checked)} /> Exiger la case « J'ai lu et j'ai compris »
      </label>

      {err && <p role="alert" style={{ margin: '14px 0 0', color: '#F09A7A', fontSize: 13.5 }}>{err}</p>}
      <button type="button" disabled={!canSave} onClick={save} className="drl-btn"
        style={{ marginTop: 16, width: '100%', minHeight: 48, borderRadius: 999, border: 0, background: palette.primary, color: DC.ink, fontWeight: 700, fontSize: 15, cursor: canSave ? 'pointer' : 'default', opacity: canSave ? 1 : 0.45, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
        {busy ? <Loader2 size={16} className="animate-spin" aria-label="Enregistrement" /> : initial ? 'Enregistrer les modifications' : 'Créer la chaîne'}
      </button>
    </section>
  );
};

const conditionsText = (c: AdminChannel): string => {
  const p: string[] = [];
  if (c.rules.tests?.length) p.push(`${c.rules.tests.length} test${c.rules.tests.length > 1 ? 's' : ''} : ${c.rules.tests.map(t => scaleLabel(t.scaleId)).join(', ')}`);
  if (c.rules.totems?.length) p.push(`totem : ${c.rules.totems.join(', ')}`);
  if (c.rules.minAge) p.push(`${c.rules.minAge} ans et plus`);
  return p.length ? p.join(' · ') : 'Ouverte à tous les comptes';
};

const ChannelsAdmin: React.FC<{ palette: MomentPalette }> = ({ palette }) => {
  const [items, setItems] = useState<AdminChannel[] | null>(null);
  const [editing, setEditing] = useState<AdminChannel | 'new' | null>(null);
  const [managing, setManaging] = useState<{ id: string; tab: 'publish' | 'members' } | null>(null);
  const [err, setErr] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [act, setAct] = useState<ChannelsActivity['byChannel']>({});
  useEffect(() => { getChannelActivity().then(r => setAct(r.byChannel)).catch(() => {}); }, []);
  const load = () => listAdminChannels().then(r => { setItems(r.items); setErr(''); }).catch(e => setErr(e instanceof Error ? e.message : 'Erreur'));
  useEffect(() => { load(); }, []);

  const toggleArchive = async (c: AdminChannel) => {
    setBusyId(c.id); setErr('');
    try { await saveChannel({ id: c.id, status: c.status === 'active' ? 'archived' : 'active' }); await load(); }
    catch (e) { setErr(e instanceof Error ? e.message : 'Erreur'); }
    finally { setBusyId(null); }
  };

  const managed = managing ? (items ?? []).find(c => c.id === managing.id) : undefined;
  if (managed && managing) return <ChannelPostsAdmin channel={managed} palette={palette} initialTab={managing.tab} onBack={() => { setManaging(null); load(); }} />;
  return (
    <div style={{ marginTop: 14 }}>
      <p style={{ margin: 0, fontSize: 13.5, color: DC.muted, lineHeight: 1.5 }}>Tes chaînes : des espaces thématiques où tu publies dans la durée. Tu choisis les conditions d'entrée, le prix et le texte d'accueil. Tu vois seulement le nombre de membres.</p>
      {editing === null && (
        <button type="button" onClick={() => setEditing('new')} className="drl-btn"
          style={{ marginTop: 12, minHeight: 46, padding: '0 18px', borderRadius: 999, border: 0, background: palette.primary, color: DC.ink, fontWeight: 700, fontSize: 14.5, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <Plus size={16} aria-hidden="true" /> Nouvelle chaîne
        </button>
      )}
      {editing !== null && <Form initial={editing === 'new' ? null : editing} palette={palette} onCancel={() => setEditing(null)} onDone={() => { setEditing(null); load(); }} />}
      {err && <p role="alert" style={{ color: '#F09A7A', fontSize: 13.5 }}>{err}</p>}
      {items === null && !err && <Loader2 className="animate-spin" aria-label="Chargement" style={{ marginTop: 16 }} />}
      {items !== null && items.length === 0 && editing === null && <p style={{ color: DC.faint, fontSize: 14, marginTop: 16 }}>Aucune chaîne pour l'instant. Crée la première.</p>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 14 }}>
        {(items ?? []).map(c => (
          <article key={c.id} style={{ ...card, padding: 0, overflow: 'hidden', opacity: c.status === 'archived' ? 0.7 : 1 }}>
            <div style={{ height: 110, background: c.photoUrl ? `center / cover url(${c.photoUrl})` : 'linear-gradient(135deg, rgba(157,191,175,.35), rgba(233,200,143,.25))', position: 'relative' }}>
              {c.status === 'archived' && <span style={{ position: 'absolute', top: 10, left: 10, padding: '3px 10px', borderRadius: 999, background: 'rgba(0,0,0,.6)', color: DC.text, fontSize: 12, fontWeight: 700 }}>Archivée</span>}
            </div>
            <div style={{ padding: 14 }}>
              <h3 style={{ margin: 0, fontFamily: 'Georgia, serif', fontSize: 18, color: DC.title }}>{c.name}</h3>
              <p style={{ margin: '4px 0 8px', fontSize: 13.5, color: DC.soft, lineHeight: 1.45 }}>{c.description}</p>
              {act[c.id] && (act[c.id].members + act[c.id].comments + act[c.id].replies) > 0 && (
                <p style={{ margin: '0 0 8px', fontSize: 12.5, fontWeight: 700, color: palette.accent }}>
                  Nouveau : {[act[c.id].members > 0 && `${act[c.id].members} membre${act[c.id].members > 1 ? 's' : ''}`, act[c.id].comments > 0 && `${act[c.id].comments} commentaire${act[c.id].comments > 1 ? 's' : ''}`, act[c.id].replies > 0 && `${act[c.id].replies} réponse${act[c.id].replies > 1 ? 's' : ''}`].filter(Boolean).join(' · ')}
                </p>
              )}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, fontSize: 12.5, color: DC.muted }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Users size={14} aria-hidden="true" /> {c.memberCount} membre{c.memberCount > 1 ? 's' : ''}</span>
                <span>· {c.price > 0 ? `${c.price} étincelle${c.price > 1 ? 's' : ''}` : 'Gratuite'}</span>
              </div>
              <p style={{ margin: '6px 0 0', fontSize: 12.5, color: DC.faint, lineHeight: 1.45 }}>{conditionsText(c)}</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
                <button type="button" onClick={() => setManaging({ id: c.id, tab: 'publish' })} className="drl-btn" style={{ minHeight: 38, padding: '0 14px', borderRadius: 999, border: `1px solid ${palette.accent}`, background: 'rgba(242,182,109,.15)', color: palette.accent, fontSize: 13.5, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}><MessageSquarePlus size={14} aria-hidden="true" /> Publier et gérer</button>
                <button type="button" onClick={() => setEditing(c)} className="drl-btn" style={{ minHeight: 38, padding: '0 14px', borderRadius: 999, border: `1px solid ${DC.line}`, background: DC.glass, color: DC.text, fontSize: 13.5, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}><Pencil size={14} aria-hidden="true" /> Modifier</button>
                <button type="button" onClick={() => setManaging({ id: c.id, tab: 'members' })} className="drl-btn" style={{ minHeight: 38, padding: '0 14px', borderRadius: 999, border: `1px solid ${DC.line}`, background: DC.glass, color: DC.text, fontSize: 13.5, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}><Users size={14} aria-hidden="true" /> Membres · {c.memberCount}</button>
                <button type="button" disabled={busyId === c.id} onClick={() => toggleArchive(c)} className="drl-btn" style={{ minHeight: 38, padding: '0 14px', borderRadius: 999, border: `1px solid ${DC.line}`, background: DC.glass, color: DC.muted, fontSize: 13.5, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  {c.status === 'active' ? <><Archive size={14} aria-hidden="true" /> Archiver</> : <><ArchiveRestore size={14} aria-hidden="true" /> Réactiver</>}
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
};

export default ChannelsAdmin;
