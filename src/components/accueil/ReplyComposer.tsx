/**
 * ReplyComposer — écrire ou modifier une réponse de Dr Lô : texte et/ou vocal (enregistré ou importé, 5 min au plus).
 * Rien n'est envoyé tant que Dr Lô n'appuie pas sur le bouton.
 */
import React, { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { blobToBase64, useVoiceRecorder } from '../../hooks/useVoiceRecorder';
import VoiceInput from './VoiceInput';
import { DC } from './DrLoShell';
import type { VoiceClip } from '../../services/drloBroadcastService';
import AudioPlayer from './AudioPlayer';

const MAX = 600;
const mmss = (sec: number) => `${Math.floor(sec / 60)}:${String(Math.round(sec % 60)).padStart(2, '0')}`;
const btn: React.CSSProperties = { minHeight: 38, padding: '0 12px', borderRadius: 10, border: `1px solid ${DC.line}`, background: DC.glass, color: DC.muted, cursor: 'pointer', fontSize: 13 };

interface Props {
  initialText?: string;
  existingAudio?: { url: string | null; sec: number } | null;
  placeholder: string;
  submitLabel: string;
  onSubmit: (text: string, clip?: VoiceClip, removeAudio?: boolean) => Promise<void>;
  onCancel?: () => void;
}

const ReplyComposer: React.FC<Props> = ({ initialText = '', existingAudio = null, placeholder, submitLabel, onSubmit, onCancel }) => {
  const [text, setText] = useState(initialText);
  const [keepAudio, setKeepAudio] = useState(!!existingAudio);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const voice = useVoiceRecorder();
  const hasAudio = !!voice.clip || (keepAudio && !!existingAudio);
  const recording = voice.state === 'recording' || voice.state === 'processing';
  const canSend = (text.trim().length >= 2 || hasAudio) && !recording && !busy;

  const send = async () => {
    setBusy(true); setError('');
    try {
      const clip = voice.clip ? { data: await blobToBase64(voice.clip.blob), mime: voice.clip.mime, durationSec: voice.clip.durationSec } : undefined;
      await onSubmit(text.trim(), clip, existingAudio && !keepAudio && !clip ? true : undefined);
      if (!onCancel) { setText(''); voice.reset(); }
    } catch (e) { setError(e instanceof Error ? e.message : 'Envoi impossible pour le moment.'); }
    finally { setBusy(false); }
  };

  return (
    <div>
      <textarea aria-label="Ta réponse" rows={2} maxLength={MAX} value={text} onChange={e => setText(e.target.value)} placeholder={placeholder} className="drl-input"
        style={{ width: '100%', boxSizing: 'border-box', borderRadius: 12, border: `1px solid ${DC.line}`, background: 'rgba(255,255,255,.06)', padding: '10px 12px', fontFamily: 'inherit', fontSize: 15, lineHeight: 1.5, color: DC.text, outline: 'none', resize: 'vertical' }} />
      <div style={{ marginTop: 8 }}>
        {keepAudio && existingAudio && !voice.clip && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            {existingAudio.url ? <AudioPlayer src={existingAudio.url} ariaLabel="Vocal actuel" style={{ flex: 1 }} /> : <span style={{ fontSize: 13, color: DC.muted }}>Vocal de {mmss(existingAudio.sec)}</span>}
            <button type="button" onClick={() => setKeepAudio(false)} aria-label="Retirer le vocal" className="drl-btn" style={{ ...btn, width: 44, padding: 0 }}><Trash2 size={16} aria-hidden="true" /></button>
          </div>
        )}
        <VoiceInput voice={voice} recordLabel={existingAudio && keepAudio ? 'Remplacer par un vocal' : 'Répondre par vocal'} />
      </div>
      {error && <p role="alert" style={{ margin: '8px 0 0', fontSize: 13, color: '#F09A7A', lineHeight: 1.45 }}>{error}</p>}
      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
        <button type="button" onClick={send} disabled={!canSend} className="drl-btn" style={{ ...btn, flex: 1, minHeight: 44, border: 0, background: '#E9C88F', color: DC.ink, fontWeight: 700, opacity: canSend ? 1 : 0.4 }}>{busy ? 'Envoi…' : submitLabel}</button>
        {onCancel && <button type="button" onClick={onCancel} className="drl-btn" style={{ ...btn, minHeight: 44, padding: '0 16px' }}>Annuler</button>}
      </div>
    </div>
  );
};

export default ReplyComposer;
