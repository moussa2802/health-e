/**
 * VoiceInput — le bloc « vocal » des écrans de Dr Lô : enregistrer avec le micro OU importer un fichier
 * (5 min au plus, 4 Mo au plus après conversion), écouter avant d'envoyer, supprimer.
 * Utilisé par : nouvelle publication de chaîne, message à la communauté, réponses (ReplyComposer).
 */
import React, { useRef } from 'react';
import { Mic, Square, Trash2, Upload } from 'lucide-react';
import { MAX_VOICE_SEC, VOICE_FILE_ACCEPT, type useVoiceRecorder } from '../../hooks/useVoiceRecorder';
import { DC } from './DrLoShell';
import AudioPlayer from './AudioPlayer';

type Voice = ReturnType<typeof useVoiceRecorder>;

export const mmss = (sec: number) => `${Math.floor(sec / 60)}:${String(Math.round(sec % 60)).padStart(2, '0')}`;

const pill: React.CSSProperties = { minHeight: 44, padding: '0 14px', borderRadius: 999, border: `1px solid ${DC.line}`, background: DC.glass, color: DC.soft, fontWeight: 600, fontSize: 14, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 };
const square: React.CSSProperties = { width: 44, height: 44, flexShrink: 0, borderRadius: 12, border: `1px solid ${DC.line}`, background: DC.glass, color: DC.muted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' };

interface Props {
  voice: Voice;
  /** Libellé du bouton micro (ex. « Enregistrer un vocal », « Répondre par vocal »). */
  recordLabel?: string;
  /** Petit texte sous le vocal prêt (ex. « Le texte devient facultatif. »). */
  readyHint?: string;
}

const VoiceInput: React.FC<Props> = ({ voice, recordLabel = 'Enregistrer', readyHint }) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const pick = () => fileRef.current?.click();

  return (
    <div>
      <input ref={fileRef} type="file" accept={VOICE_FILE_ACCEPT} hidden aria-label="Choisir un fichier audio"
        onChange={e => { const f = e.target.files?.[0]; e.target.value = ''; void voice.loadFile(f); }} />

      {voice.state === 'recording' ? (
        <button type="button" onClick={voice.stop} className="drl-btn" aria-label="Arrêter l'enregistrement"
          style={{ ...pill, border: '1px solid rgba(240,154,122,.6)', background: 'rgba(240,154,122,.12)', color: DC.text, fontWeight: 700, gap: 8 }}>
          <Square size={14} fill="currentColor" aria-hidden="true" /> Enregistrement… {mmss(voice.elapsed)} / {mmss(MAX_VOICE_SEC)}
        </button>
      ) : voice.state === 'processing' ? (
        <p role="status" style={{ margin: 0, fontSize: 14, color: DC.muted }}>Préparation du vocal pour tous les téléphones…</p>
      ) : voice.state === 'ready' && voice.clip ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <AudioPlayer src={voice.clip.url} ariaLabel="Écouter le vocal avant de l'envoyer" style={{ flex: 1 }} />
          <button type="button" onClick={voice.reset} aria-label="Supprimer le vocal" className="drl-btn" style={square}><Trash2 size={16} aria-hidden="true" /></button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {voice.state !== 'unsupported' && (
            <button type="button" onClick={voice.start} className="drl-btn" style={pill}>
              <Mic size={16} aria-hidden="true" /> {recordLabel}
            </button>
          )}
          <button type="button" onClick={pick} className="drl-btn" style={pill}>
            <Upload size={16} aria-hidden="true" /> Importer un fichier
          </button>
        </div>
      )}

      {voice.state !== 'ready' && voice.state !== 'recording' && voice.state !== 'processing' && !voice.error && (
        <p style={{ margin: '6px 0 0', fontSize: 13, color: DC.faint, lineHeight: 1.45 }}>5 min au plus. Fichier : MP3, M4A (mémo vocal iPhone), OGG (note WhatsApp), WAV.</p>
      )}
      {voice.state === 'denied' && <p role="alert" style={{ margin: '6px 0 0', fontSize: 13, color: '#F09A7A' }}>Le micro est bloqué. Autorise-le dans ton navigateur, ou importe un fichier.</p>}
      {voice.error && <p role="alert" style={{ margin: '6px 0 0', fontSize: 13, color: '#F09A7A', lineHeight: 1.45 }}>{voice.error}</p>}
      {voice.clip && voice.state === 'ready' && (
        <p style={{ margin: '6px 0 0', fontSize: 13, color: DC.faint }}>Vocal de {mmss(voice.clip.durationSec)}.{readyHint ? ` ${readyHint}` : ''}</p>
      )}
    </div>
  );
};

export default VoiceInput;
