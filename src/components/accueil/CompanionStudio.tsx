/**
 * CompanionStudio — « L'atelier » : l'écran à lui, en plein écran, pour le personnaliser (remplace l'ancien panneau).
 * Il est au centre, en grand, et change sous tes yeux. Trois onglets :
 *   Sa lumière (6 lumières aux noms d'ici) · Sa façon de parler (douce / franche / taquine, + ou − de wolof) · Son chemin (ses 4 stades).
 * Le nom se modifie en touchant le nom. « Docteur », « Dr », « médecin », « Lô » restent refusés (Dr Lô est le vrai médecin).
 */
import React, { useEffect, useRef, useState } from 'react';
import { Check, Dices, Lock, Pencil, X } from 'lucide-react';
import CompanionAura from './CompanionAura';
import { DC } from './DrLoShell';
import {
  cleanCompanionName, COMPANION_COLORS, COMPANION_LANGS, COMPANION_MAX, COMPANION_NAME_IDEAS, COMPANION_STYLES,
  getCompanionColor, getCompanionLang, getCompanionStyle,
} from '../../utils/companion';
import { STAGES, getCompanionStage } from '../../utils/companionStage';

type Tab = 'lumiere' | 'parler' | 'chemin';

const CompanionStudio: React.FC<{
  current: string;
  first?: boolean;
  onSave: (name: string, colorId: string, style: string, lang: string) => void;
  onClose: () => void;
}> = ({ current, first, onSave, onClose }) => {
  const [name, setName] = useState(current || '');
  const [editing, setEditing] = useState(!current);
  const [colorId, setColorId] = useState(getCompanionColor().id);
  const [style, setStyle] = useState<string>(getCompanionStyle());
  const [lang, setLang] = useState<string>(getCompanionLang());
  const [tab, setTab] = useState<Tab>('lumiere');
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const color = COMPANION_COLORS.find(c => c.id === colorId) ?? COMPANION_COLORS[0];
  const stage = getCompanionStage();

  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const surprise = () => {
    const pool = COMPANION_NAME_IDEAS.filter(n => n !== name);
    setName(pool[Math.floor(Math.random() * pool.length)]);
    setEditing(false);
    setError('');
  };
  const save = () => {
    const clean = cleanCompanionName(name);
    if (!clean) {
      setEditing(true);
      setError(name.trim() ? '« Docteur », « Dr », « médecin » et « Lô » sont réservés au vrai médecin. Choisis un autre nom, sans signes spéciaux.' : 'Donne-lui un nom, ou touche le dé.');
      return;
    }
    onSave(clean, colorId, style, lang);
  };

  const tabBtn = (t: Tab, label: string) => (
    <button key={t} type="button" role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className="drl-btn"
      style={{ flex: 1, minHeight: 38, borderRadius: 999, border: 0, cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 700,
        background: tab === t ? `${color.hex}38` : 'transparent', color: tab === t ? DC.title : DC.muted }}>{label}</button>
  );
  const k: React.CSSProperties = { margin: 0, fontSize: 13, fontWeight: 800, letterSpacing: '.1em', color: DC.muted };

  return (
    <div role="dialog" aria-modal="true" aria-label="L'atelier du compagnon" className="drl-in"
      style={{ position: 'fixed', inset: 0, zIndex: 80, display: 'flex', flexDirection: 'column', color: DC.text, background: '#120C07', overflow: 'hidden' }}>
      <div aria-hidden="true" className="drl-amb" style={{ position: 'absolute', inset: 0, pointerEvents: 'none', transition: 'background .6s ease',
        background: `radial-gradient(70% 40% at 50% 18%, ${color.hex}55, transparent 70%), radial-gradient(60% 30% at 100% 80%, ${color.hex}1F, transparent 70%), linear-gradient(180deg, #1C130C, #100A06 70%)` }} />
      <div className="drl-wrap-chat" style={{ position: 'relative', width: '100%', margin: '0 auto', height: '100%', display: 'flex', flexDirection: 'column',
        paddingTop: 'env(safe-area-inset-top, 0px)', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px 0' }}>
          <button type="button" onClick={onClose} aria-label="Fermer l'atelier" className="drl-btn"
            style={{ width: 40, height: 40, borderRadius: '50%', border: 0, background: 'rgba(255,255,255,.06)', color: DC.muted, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <X size={18} aria-hidden="true" />
          </button>
          <p style={{ margin: 0, fontFamily: 'Fraunces, serif', fontSize: 17, fontWeight: 600, color: DC.title }}>L'atelier</p>
          <span aria-hidden="true" style={{ width: 40 }} />
        </header>

        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '0 0 12px' }}>
          {/* Lui, en grand, qui change sous tes yeux */}
          <div style={{ position: 'relative', height: 230, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span aria-hidden="true" style={{ position: 'absolute', width: 230, height: 230, borderRadius: '50%', border: `1px dashed ${color.hex}55` }} />
            <CompanionAura size={210} color={color.hex} live stage={stage} mood="joie" />
          </div>

          {/* Son nom : on touche le nom pour le changer */}
          <div style={{ padding: '0 18px', textAlign: 'center' }}>
            {editing ? (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'center' }}>
                <input ref={inputRef} value={name} maxLength={COMPANION_MAX} onChange={e => { setName(e.target.value); setError(''); }}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); if (cleanCompanionName(name)) setEditing(false); else save(); } }}
                  placeholder="Son nom" aria-label="Le nom de ton compagnon" className="drl-input"
                  style={{ width: 210, minHeight: 50, textAlign: 'center', borderRadius: 16, border: `1px solid ${color.hex}88`, background: 'rgba(255,255,255,.06)', fontFamily: 'Fraunces, serif', fontSize: 24, fontWeight: 600, color: DC.title, outline: 'none' }} />
                <button type="button" onClick={() => { if (cleanCompanionName(name)) { setEditing(false); setError(''); } else save(); }} aria-label="Valider le nom" className="drl-btn"
                  style={{ width: 46, height: 46, borderRadius: '50%', border: 0, background: color.hex, color: DC.ink, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                  <Check size={20} aria-hidden="true" />
                </button>
              </div>
            ) : (
              <button type="button" onClick={() => setEditing(true)} aria-label={`Changer son nom : ${name}`} className="drl-btn"
                style={{ border: 0, background: 'transparent', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 10, padding: 0, color: DC.title, fontFamily: 'Fraunces, serif', fontSize: 34, fontWeight: 600 }}>
                {name}<Pencil size={16} color={DC.muted} aria-hidden="true" />
              </button>
            )}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 4 }}>
              <span style={{ fontSize: 13, fontWeight: 800, letterSpacing: '.1em', color: color.hex }}>{STAGES[stage].name.toUpperCase()}</span>
              <button type="button" onClick={surprise} className="drl-btn"
                style={{ minHeight: 34, padding: '0 12px', borderRadius: 999, border: `1px solid ${DC.line}`, background: 'transparent', color: DC.soft, fontSize: 13, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontFamily: 'inherit' }}>
                <Dices size={14} aria-hidden="true" /> Un autre nom
              </button>
            </div>
            {error && <p role="alert" style={{ margin: '8px 0 0', fontSize: 14, lineHeight: 1.45, color: '#F09A7A' }}>{error}</p>}
            {first && !error && <p style={{ margin: '8px 0 0', fontSize: 14, lineHeight: 1.5, color: DC.soft }}>Je suis une IA, là pour ton bien-être. Donne-moi un nom et une lumière : je serai à toi.</p>}
          </div>

          <div role="tablist" aria-label="Personnaliser" style={{ display: 'flex', gap: 4, margin: '16px 14px 0', padding: 4, borderRadius: 999, background: 'rgba(255,255,255,.05)' }}>
            {tabBtn('lumiere', 'Sa lumière')}{tabBtn('parler', 'Sa façon de parler')}{tabBtn('chemin', 'Son chemin')}
          </div>

          <div style={{ padding: '14px 16px 0', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {tab === 'lumiere' && (
              <div role="radiogroup" aria-label="Sa lumière" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10 }}>
                {COMPANION_COLORS.map(c => {
                  const on = c.id === colorId;
                  return (
                    <button key={c.id} type="button" role="radio" aria-checked={on} onClick={() => setColorId(c.id)} className="drl-btn"
                      style={{ borderRadius: 18, border: `1px solid ${on ? c.hex : DC.line}`, background: on ? `${c.hex}1F` : 'rgba(255,255,255,.03)', padding: '12px 6px 10px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, cursor: 'pointer', color: DC.text, fontFamily: 'inherit' }}>
                      <span aria-hidden="true" style={{ width: 36, height: 36, borderRadius: '50%', background: `radial-gradient(circle at 40% 35%, #ffffff99, ${c.hex} 45%, ${c.hex}99)`, boxShadow: `0 0 18px ${c.hex}88` }} />
                      <b style={{ fontSize: 13, color: DC.title, textAlign: 'center', lineHeight: 1.25 }}>{c.label}</b>
                      <span style={{ fontSize: 13, color: DC.muted, textAlign: 'center', lineHeight: 1.25 }}>{c.word}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {tab === 'parler' && (
              <>
                <p style={k}>SON TON</p>
                <div role="radiogroup" aria-label="Son ton" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {COMPANION_STYLES.map(s => {
                    const on = s.id === style;
                    return (
                      <button key={s.id} type="button" role="radio" aria-checked={on} onClick={() => setStyle(s.id)} className="drl-btn"
                        style={{ borderRadius: 16, border: `1px solid ${on ? color.hex : DC.line}`, background: on ? `${color.hex}1A` : 'rgba(255,255,255,.03)', padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', textAlign: 'left', color: DC.text, fontFamily: 'inherit' }}>
                        <span style={{ flex: 1, minWidth: 0 }}>
                          <b style={{ display: 'block', fontSize: 15, color: DC.title }}>{s.label}</b>
                          <span style={{ fontSize: 13, color: DC.muted }}>{s.sub}</span>
                        </span>
                        <span style={{ maxWidth: '50%', fontFamily: 'Fraunces, serif', fontSize: 14, lineHeight: 1.35, color: DC.soft, textAlign: 'right' }}>{s.sample}</span>
                      </button>
                    );
                  })}
                </div>
                <p style={{ ...k, marginTop: 4 }}>SA LANGUE</p>
                <div role="radiogroup" aria-label="Sa langue" style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {COMPANION_LANGS.map(l => {
                    const on = l.id === lang;
                    return (
                      <button key={l.id} type="button" role="radio" aria-checked={on} onClick={() => setLang(l.id)} className="drl-btn"
                        style={{ minHeight: 42, padding: '0 14px', borderRadius: 999, border: `1px solid ${on ? color.hex : DC.line}`, background: on ? `${color.hex}26` : 'transparent', color: on ? DC.title : DC.soft, fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                        {l.label}
                      </button>
                    );
                  })}
                </div>
                <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5, color: DC.faint }}>Il garde toujours la même prudence : dans un moment difficile, il redevient doux, quel que soit son ton.</p>
              </>
            )}

            {tab === 'chemin' && (
              <>
                <ol aria-label="Ses stades" style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 0 }}>
                  {STAGES.map((s, i) => {
                    const done = i <= stage;
                    return (
                      <li key={s.name} style={{ display: 'flex', gap: 12, alignItems: 'stretch' }}>
                        <span aria-hidden="true" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 24 }}>
                          <span style={{ width: 20, height: 20, borderRadius: '50%', marginTop: 3, flexShrink: 0, background: done ? color.hex : 'transparent', border: `2px solid ${done ? color.hex : DC.line}`, boxShadow: i === stage ? `0 0 12px ${color.hex}` : 'none' }} />
                          {i < STAGES.length - 1 && <span style={{ flex: 1, width: 2, minHeight: 26, background: i < stage ? color.hex : DC.line, opacity: 0.6 }} />}
                        </span>
                        <span style={{ paddingBottom: 14 }}>
                          <b style={{ display: 'block', fontSize: 15, color: done ? DC.title : DC.muted }}>{s.name}{i === stage ? ' · aujourd\'hui' : ''}</b>
                          <span style={{ fontSize: 13, color: DC.muted }}>{s.when.charAt(0).toUpperCase() + s.when.slice(1)}</span>
                        </span>
                      </li>
                    );
                  })}
                </ol>
                <div style={{ borderRadius: 16, border: `1px dashed ${DC.line}`, padding: '12px 14px', display: 'flex', gap: 10, alignItems: 'center' }}>
                  <Lock size={18} color={DC.muted} aria-hidden="true" />
                  <span style={{ fontSize: 14, lineHeight: 1.45, color: DC.soft }}><b style={{ color: DC.title }}>Ses tenues arrivent bientôt.</b> Foulard wax, bonnet… certaines se gagneront en grandissant.</span>
                </div>
              </>
            )}
          </div>
        </div>

        <div style={{ padding: '10px 16px 12px', display: 'flex', gap: 8 }}>
          {first && (
            <button type="button" onClick={onClose} className="drl-btn"
              style={{ minHeight: 50, padding: '0 18px', borderRadius: 999, border: `1px solid ${DC.line}`, background: 'transparent', color: DC.soft, fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Plus tard</button>
          )}
          <button type="button" onClick={save} className="drl-btn"
            style={{ flex: 1, minHeight: 50, borderRadius: 999, border: 0, background: color.hex, color: DC.ink, fontSize: 16, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit' }}>C'est {name.trim() && cleanCompanionName(name) ? cleanCompanionName(name) : 'lui'}</button>
        </div>
      </div>
    </div>
  );
};

export default CompanionStudio;
