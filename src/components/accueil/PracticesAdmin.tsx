/**
 * PracticesAdmin — onglet « Pratiques » de l'espace Dr Lô : la banque d'exercices guidés, de techniques et de carnets.
 * Dr Lô fixe le prix (débloqué une fois par la personne), écrit la source et les précautions, et peut saisir le script
 * de l'audio : il n'est jamais montré aux personnes, il sert à Dr Lô IA.
 * Les pratiques se proposent ensuite sous un épisode de chaîne (onglet Chaînes → Publier).
 */
import React, { useEffect, useState } from 'react';
import { BookOpen, Headphones, ListChecks, Loader2, Pencil, Plus, Trash2, X } from 'lucide-react';
import { DC, card } from './DrLoShell';
import AudioPlayer from './AudioPlayer';
import VoiceInput from './VoiceInput';
import { blobToBase64, useVoiceRecorder } from '../../hooks/useVoiceRecorder';
import type { MomentPalette } from '../../utils/drloMoment';
import {
  listAdminPractices, savePractice, deletePractice, PRACTICE_THEMES, PRACTICE_TYPES, typeLabel,
  type AdminPractice, type CarnetField, type FieldKind, type PracticeType,
} from '../../services/practiceService';

const field: React.CSSProperties = { width: '100%', boxSizing: 'border-box', borderRadius: 14, border: `1px solid ${DC.line}`, background: 'rgba(255,255,255,.06)', padding: '12px 14px', color: DC.text, fontSize: 15, fontFamily: 'inherit' };
const lab: React.CSSProperties = { display: 'block', margin: '16px 0 6px', fontSize: 13, fontWeight: 700, color: DC.soft };
const hint: React.CSSProperties = { margin: '4px 0 0', fontSize: 13, color: DC.faint, lineHeight: 1.45 };
const small: React.CSSProperties = { minHeight: 38, padding: '0 14px', borderRadius: 999, border: `1px solid ${DC.line}`, background: DC.glass, color: DC.text, fontSize: 14, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 };
const KINDS: { id: FieldKind; label: string }[] = [
  { id: 'scale', label: 'Note de 0 à 10' }, { id: 'check', label: 'Case « fait »' }, { id: 'text', label: 'Texte court' }, { id: 'choice', label: 'Choix' },
];
const TYPE_ICON: Record<PracticeType, React.ReactNode> = { guided: <Headphones size={16} aria-hidden="true" />, technique: <ListChecks size={16} aria-hidden="true" />, carnet: <BookOpen size={16} aria-hidden="true" /> };
const STATUS_LABEL = { draft: 'Brouillon', published: 'Publiée', retired: 'Retirée' } as const;

type DraftField = { id?: string; kind: FieldKind; label: string; options: string; low: string; high: string };
const toDraft = (f: CarnetField): DraftField => ({ id: f.id, kind: f.kind, label: f.label, options: (f.options ?? []).join(', '), low: f.low ?? '', high: f.high ?? '' });

const Form: React.FC<{ initial: AdminPractice | null; palette: MomentPalette; onCancel: () => void; onDone: () => void }> = ({ initial, palette, onCancel, onDone }) => {
  const [type, setType] = useState<PracticeType>(initial?.type ?? 'guided');
  const [title, setTitle] = useState(initial?.title ?? '');
  const [summary, setSummary] = useState(initial?.summary ?? '');
  const [theme, setTheme] = useState(initial?.theme ?? 'stress');
  const [minutes, setMinutes] = useState(initial?.minutes ?? 3);
  const [price, setPrice] = useState(initial?.price ?? 2);
  const [freeForMembers, setFreeForMembers] = useState(initial?.freeForMembers ?? false);
  const [steps, setSteps] = useState((initial?.steps ?? []).join('\n'));
  const [fields, setFields] = useState<DraftField[]>(initial?.fields?.length ? initial.fields.map(toDraft) : [{ kind: 'scale', label: '', options: '', low: '', high: '' }]);
  const [script, setScript] = useState(initial?.script ?? '');
  const [source, setSource] = useState(initial?.source ?? '');
  const [cautions, setCautions] = useState(initial?.cautions ?? '');
  const [removeAudio, setRemoveAudio] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const voice = useVoiceRecorder();
  const hasOldAudio = !!initial?.audioUrl && !removeAudio;

  const setF = (i: number, patch: Partial<DraftField>) => setFields(fs => fs.map((f, j) => (j === i ? { ...f, ...patch } : f)));
  const save = async (status: AdminPractice['status']) => {
    setBusy(true); setErr('');
    try {
      const audio = voice.clip ? { data: await blobToBase64(voice.clip.blob), mime: voice.clip.mime, durationSec: voice.clip.durationSec } : undefined;
      await savePractice({
        id: initial?.id, type, title: title.trim(), summary: summary.trim(), theme, minutes: Number(minutes), price: Number(price), freeForMembers,
        steps: steps.split('\n').map(s => s.trim()).filter(Boolean),
        fields: type === 'carnet' ? fields.filter(f => f.label.trim()).map(f => ({ id: f.id, kind: f.kind, label: f.label.trim(), options: f.kind === 'choice' ? f.options.split(',').map(o => o.trim()).filter(Boolean) : undefined, low: f.low.trim() || undefined, high: f.high.trim() || undefined })) : [],
        script: script.trim(), source: source.trim(), cautions: cautions.trim(), status, audio, removeAudio: removeAudio && !audio,
      });
      onDone();
    } catch (e) { setErr(e instanceof Error ? e.message : 'Erreur'); }
    finally { setBusy(false); }
  };

  return (
    <section style={{ ...card, marginTop: 14 }} aria-label={initial ? 'Modifier la pratique' : 'Nouvelle pratique'}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h3 style={{ margin: 0, fontFamily: "'Fraunces', Georgia, serif", fontSize: 20, color: DC.title }}>{initial ? 'Modifier la pratique' : 'Nouvelle pratique'}</h3>
        <button type="button" onClick={onCancel} aria-label="Fermer" style={{ ...small, padding: 0, width: 38, justifyContent: 'center' }}><X size={16} /></button>
      </div>

      <span style={lab}>Type</span>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {PRACTICE_TYPES.map(t => (
          <button key={t.id} type="button" onClick={() => setType(t.id)} aria-pressed={type === t.id} className="drl-btn"
            style={{ textAlign: 'left', padding: '10px 14px', borderRadius: 14, border: `1px solid ${type === t.id ? palette.accent : DC.line}`, background: type === t.id ? 'rgba(242,182,109,.12)' : DC.glass, color: DC.text, cursor: 'pointer' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: 15 }}>{TYPE_ICON[t.id]} {t.label}</span>
            <span style={{ display: 'block', fontSize: 13, color: DC.faint, marginTop: 2 }}>{t.hint}</span>
          </button>
        ))}
      </div>

      <label style={lab} htmlFor="pr-title">Titre</label>
      <input id="pr-title" maxLength={80} value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex. Carnet du plaisir" className="drl-input" style={field} />
      <label style={lab} htmlFor="pr-sum">Présentation (ce que la personne lit avant de débloquer)</label>
      <textarea id="pr-sum" rows={3} maxLength={280} value={summary} onChange={e => setSummary(e.target.value)} placeholder="Chaque soir, tu notes ce qui t'a fait du bien et ton énergie. En une semaine, tu vois ce qui te recharge." className="drl-input" style={{ ...field, resize: 'vertical' }} />

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 140px' }}>
          <label style={lab} htmlFor="pr-theme">Thème</label>
          <select id="pr-theme" value={theme} onChange={e => setTheme(e.target.value)} className="drl-input" style={{ ...field, minHeight: 46 }}>
            {PRACTICE_THEMES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
        </div>
        <div style={{ flex: '1 1 100px' }}>
          <label style={lab} htmlFor="pr-min">Durée (min)</label>
          <input id="pr-min" type="number" min={1} max={60} value={minutes} onChange={e => setMinutes(Number(e.target.value))} className="drl-input" style={field} />
        </div>
        <div style={{ flex: '1 1 100px' }}>
          <label style={lab} htmlFor="pr-price">Prix (étincelles)</label>
          <input id="pr-price" type="number" min={0} max={500} value={price} onChange={e => setPrice(Number(e.target.value))} className="drl-input" style={field} />
        </div>
      </div>
      <p style={hint}>Payé une seule fois : la personne garde la pratique et la refait autant qu'elle veut. 0 = gratuite.</p>
      <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginTop: 10, fontSize: 14, color: DC.soft, cursor: 'pointer' }}>
        <input type="checkbox" checked={freeForMembers} onChange={e => setFreeForMembers(e.target.checked)} style={{ marginTop: 3 }} />
        <span>Offerte aux membres des chaînes où je la propose<span style={{ display: 'block', fontSize: 13, color: DC.faint }}>Les autres la débloquent au prix indiqué.</span></span>
      </label>

      {type !== 'carnet' && (
        <>
          <span style={lab}>Audio (en français, 5 min au plus){type === 'guided' ? ' — obligatoire pour publier' : ' — facultatif'}</span>
          {hasOldAudio && !voice.clip && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ flex: 1 }}><AudioPlayer src={initial!.audioUrl!} durationHint={initial!.audioSec} ariaLabel="Écouter l'audio actuel" accent={palette.accent} /></div>
              <button type="button" onClick={() => setRemoveAudio(true)} style={{ ...small, color: '#F08A7A' }}>Retirer</button>
            </div>
          )}
          <div style={{ marginTop: hasOldAudio ? 8 : 0 }}>
            <VoiceInput voice={voice} recordLabel={hasOldAudio ? 'Réenregistrer' : 'Enregistrer l\'audio'} readyHint="Il remplacera l'audio actuel à l'enregistrement." />
          </div>
        </>
      )}

      {type !== 'carnet' ? (
        <>
          <label style={lab} htmlFor="pr-steps">Étapes (une par ligne)</label>
          <textarea id="pr-steps" rows={5} value={steps} onChange={e => setSteps(e.target.value)} placeholder={'Assieds-toi confortablement.\nInspire par le nez pendant 4 secondes.\n…'} className="drl-input" style={{ ...field, resize: 'vertical', lineHeight: 1.5 }} />
        </>
      ) : (
        <>
          <span style={lab}>Lignes du carnet (ce que la personne remplit chaque jour)</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {fields.map((f, i) => (
              <div key={i} style={{ padding: 12, borderRadius: 14, border: `1px solid ${DC.line}`, background: 'rgba(255,255,255,.03)' }}>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input aria-label={`Nom de la ligne ${i + 1}`} maxLength={60} value={f.label} onChange={e => setF(i, { label: e.target.value })} placeholder="Ex. Mon énergie" className="drl-input" style={{ ...field, flex: 1 }} />
                  <button type="button" aria-label={`Supprimer la ligne ${i + 1}`} onClick={() => setFields(fs => fs.filter((_, j) => j !== i))} style={{ ...small, width: 44, padding: 0, justifyContent: 'center' }}><Trash2 size={15} /></button>
                </div>
                <select aria-label={`Type de la ligne ${i + 1}`} value={f.kind} onChange={e => setF(i, { kind: e.target.value as FieldKind })} className="drl-input" style={{ ...field, marginTop: 8, minHeight: 44 }}>
                  {KINDS.map(k => <option key={k.id} value={k.id}>{k.label}</option>)}
                </select>
                {f.kind === 'choice' && <input aria-label="Choix possibles" value={f.options} onChange={e => setF(i, { options: e.target.value })} placeholder="Choix séparés par des virgules : Matin, Midi, Soir" className="drl-input" style={{ ...field, marginTop: 8 }} />}
                {f.kind === 'scale' && (
                  <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                    <input aria-label="Mot pour 0" maxLength={30} value={f.low} onChange={e => setF(i, { low: e.target.value })} placeholder="0 = (ex. vidé)" className="drl-input" style={{ ...field, flex: 1 }} />
                    <input aria-label="Mot pour 10" maxLength={30} value={f.high} onChange={e => setF(i, { high: e.target.value })} placeholder="10 = (ex. plein d'énergie)" className="drl-input" style={{ ...field, flex: 1 }} />
                  </div>
                )}
              </div>
            ))}
          </div>
          {fields.length < 10 && <button type="button" onClick={() => setFields(fs => [...fs, { kind: 'scale', label: '', options: '', low: '', high: '' }])} style={{ ...small, marginTop: 10 }}><Plus size={15} /> Ajouter une ligne</button>}
          <label style={lab} htmlFor="pr-steps">Consignes (facultatif, une par ligne)</label>
          <textarea id="pr-steps" rows={3} value={steps} onChange={e => setSteps(e.target.value)} placeholder="Remplis-le le soir, en 1 minute." className="drl-input" style={{ ...field, resize: 'vertical' }} />
        </>
      )}

      <label style={lab} htmlFor="pr-script">{type === 'carnet' ? 'Notes pour Dr Lô IA (jamais montrées aux personnes)' : 'Script de l\'audio (jamais montré aux personnes)'}</label>
      <textarea id="pr-script" rows={4} value={script} onChange={e => setScript(e.target.value)} placeholder="Le texte de ce que tu dis. Il permet à Dr Lô IA de connaître l'exercice et de répondre aux questions dessus." className="drl-input" style={{ ...field, resize: 'vertical' }} />
      <label style={lab} htmlFor="pr-source">Source (obligatoire, affichée)</label>
      <input id="pr-source" maxLength={300} value={source} onChange={e => setSource(e.target.value)} placeholder="Ex. Activation comportementale (Lewinsohn) ; pleine conscience (MBSR, Kabat-Zinn)" className="drl-input" style={field} />
      <label style={lab} htmlFor="pr-caut">Précautions (affichées avant de commencer)</label>
      <textarea id="pr-caut" rows={2} maxLength={1000} value={cautions} onChange={e => setCautions(e.target.value)} placeholder="Ex. Si une zone du corps réveille un souvenir difficile, ouvre les yeux et reviens à ta respiration." className="drl-input" style={{ ...field, resize: 'vertical' }} />

      {err && <p role="alert" style={{ margin: '12px 0 0', color: '#F09A7A', fontSize: 14 }}>{err}</p>}
      <div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
        <button type="button" disabled={busy} onClick={() => save('published')} className="drl-btn" style={{ flex: '1 1 160px', minHeight: 48, borderRadius: 999, border: 0, background: palette.primary, color: DC.ink, fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>
          {busy ? <Loader2 size={16} className="animate-spin" aria-label="Enregistrement" /> : 'Publier'}
        </button>
        <button type="button" disabled={busy} onClick={() => save('draft')} className="drl-btn" style={{ flex: '1 1 160px', minHeight: 48, borderRadius: 999, border: `1px solid ${DC.line}`, background: DC.glass, color: DC.text, fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>Garder en brouillon</button>
      </div>
    </section>
  );
};

const pct = (n = 0, total = 0) => (total ? `${Math.round((n / total) * 100)} %` : '—');

const PracticesAdmin: React.FC<{ palette: MomentPalette }> = ({ palette }) => {
  const [items, setItems] = useState<AdminPractice[] | null>(null);
  const [err, setErr] = useState('');
  const [editing, setEditing] = useState<AdminPractice | 'new' | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmDel, setConfirmDel] = useState<string | null>(null);
  const load = () => listAdminPractices().then(r => { setItems(r.items); setErr(''); }).catch(e => setErr(e instanceof Error ? e.message : 'Erreur'));
  useEffect(() => { load(); }, []);
  const setStatus = async (p: AdminPractice, status: AdminPractice['status']) => {
    setBusyId(p.id); setErr('');
    try { await savePractice({ id: p.id, status }); await load(); } catch (e) { setErr(e instanceof Error ? e.message : 'Erreur'); } finally { setBusyId(null); }
  };

  const remove = async (p: AdminPractice) => {
    setBusyId(p.id); setErr('');
    try { await deletePractice(p.id); setConfirmDel(null); await load(); } catch (e) { setErr(e instanceof Error ? e.message : 'Erreur'); setConfirmDel(null); } finally { setBusyId(null); }
  };

  return (
    <div style={{ marginTop: 14 }}>
      <p style={{ margin: 0, fontSize: 14, color: DC.muted, lineHeight: 1.5 }}>Ta banque d'exercices, de techniques et de carnets. Tu fixes le prix, payé une seule fois. Tu les proposes ensuite sous un épisode (onglet Chaînes → Publier).</p>
      {editing === null && (
        <button type="button" onClick={() => setEditing('new')} className="drl-btn" style={{ marginTop: 12, minHeight: 46, padding: '0 18px', borderRadius: 999, border: 0, background: palette.primary, color: DC.ink, fontWeight: 700, fontSize: 15, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <Plus size={16} aria-hidden="true" /> Nouvelle pratique
        </button>
      )}
      {editing !== null && <Form key={editing === 'new' ? 'new' : editing.id} initial={editing === 'new' ? null : editing} palette={palette} onCancel={() => setEditing(null)} onDone={() => { setEditing(null); load(); }} />}
      {err && <p role="alert" style={{ color: '#F09A7A', fontSize: 14 }}>{err}</p>}
      {items === null && !err && <Loader2 className="animate-spin" aria-label="Chargement" style={{ marginTop: 16 }} />}
      {items?.length === 0 && editing === null && <p style={{ color: DC.faint, fontSize: 14, marginTop: 16 }}>Aucune pratique pour l'instant. Commence par le carnet du plaisir ou un exercice guidé.</p>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 14 }}>
        {(items ?? []).map(p => {
          const st = p.stats || {};
          const felt = (st.mieux ?? 0) + (st.pareil ?? 0) + (st.moins ?? 0);
          return (
            <article key={p.id} style={{ ...card, opacity: p.status === 'retired' ? 0.65 : 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', fontSize: 13, color: DC.muted }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: palette.accent, fontWeight: 700 }}>{TYPE_ICON[p.type]} {typeLabel(p.type)}</span>
                <span>· {p.minutes} min</span>
                <span>· {p.price > 0 ? `${p.price} étincelle${p.price > 1 ? 's' : ''}` : 'Gratuite'}{p.freeForMembers ? ' (offerte aux membres)' : ''}</span>
                <span style={{ marginLeft: 'auto', padding: '2px 10px', borderRadius: 999, background: p.status === 'published' ? 'rgba(127,209,160,.15)' : DC.glass, color: p.status === 'published' ? DC.ok : DC.faint, fontWeight: 700 }}>{STATUS_LABEL[p.status]}</span>
              </div>
              <h3 style={{ margin: '8px 0 0', fontFamily: "'Fraunces', Georgia, serif", fontSize: 20, color: DC.title }}>{p.title}</h3>
              {p.summary && <p style={{ margin: '4px 0 0', fontSize: 14, color: DC.soft, lineHeight: 1.45 }}>{p.summary}</p>}
              <p style={{ margin: '8px 0 0', fontSize: 13, color: DC.faint, lineHeight: 1.5 }}>
                Débloquée {st.unlocks ?? 0} fois · {st.earned ?? 0} étincelles · {p.type === 'carnet' ? `${st.logs ?? 0} jours remplis` : `faite ${st.runs ?? 0} fois · « mieux » ${pct(st.mieux, felt)} · arrêts ${st.stops ?? 0}`}
              </p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
                <button type="button" onClick={() => setEditing(p)} className="drl-btn" style={small}><Pencil size={14} aria-hidden="true" /> Modifier</button>
                {p.status !== 'published' && <button type="button" disabled={busyId === p.id} onClick={() => setStatus(p, 'published')} className="drl-btn" style={{ ...small, border: `1px solid ${palette.accent}`, color: palette.accent }}>Publier</button>}
                {p.status === 'published' && <button type="button" disabled={busyId === p.id} onClick={() => setStatus(p, 'retired')} className="drl-btn" style={{ ...small, color: DC.muted }}>Retirer</button>}
                <button type="button" disabled={busyId === p.id} onClick={() => setConfirmDel(p.id)} aria-label={`Supprimer la pratique ${p.title}`} className="drl-btn" style={{ ...small, border: '1px solid rgba(240,138,122,.55)', background: 'transparent', color: '#F08A7A' }}><Trash2 size={14} aria-hidden="true" /> Supprimer</button>
              </div>
              {confirmDel === p.id && (
                <div role="alertdialog" aria-label="Confirmer la suppression" style={{ marginTop: 12, padding: 12, borderRadius: 14, border: '1px solid rgba(240,138,122,.55)', background: 'rgba(240,138,122,.08)' }}>
                  <p style={{ margin: 0, fontSize: 14, color: DC.text, lineHeight: 1.5 }}>Supprimer « {p.title} » pour de bon ? C'est impossible si des personnes l'ont déjà débloquée (utilise alors « Retirer »). Elle ne sera plus proposée sous les épisodes.</p>
                  <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                    <button type="button" disabled={busyId === p.id} onClick={() => remove(p)} className="drl-btn" style={{ ...small, flex: 1, justifyContent: 'center', border: '1px solid rgba(240,138,122,.7)', color: '#F08A7A', fontWeight: 700 }}>{busyId === p.id ? 'Suppression…' : 'Oui, supprimer'}</button>
                    <button type="button" onClick={() => setConfirmDel(null)} className="drl-btn" style={{ ...small, flex: 1, justifyContent: 'center' }}>Annuler</button>
                  </div>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
};

export default PracticesAdmin;
