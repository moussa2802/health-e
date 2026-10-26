/** Affiche une réponse de Dr Lô proprement : paragraphes, gras, italique, petites listes. */
import React from 'react';
import { parseRich } from '../../utils/richText';

const RichText: React.FC<{ text: string }> = ({ text }) => {
  const blocks = parseRich(text);
  if (blocks.length <= 1 && blocks[0]?.kind !== 'li') {
    return <>{(blocks[0]?.spans ?? []).map((s, i) => <Sp key={i} s={s} />)}</>;
  }
  return (
    <span style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {blocks.map((b, i) => (
        <span key={i} style={{ display: 'block', ...(b.kind === 'li' ? { paddingLeft: 16, position: 'relative' } : {}), ...(b.kind === 'h' ? { marginTop: i ? 2 : 0 } : {}) }}>
          {b.kind === 'li' && <span aria-hidden="true" style={{ position: 'absolute', left: 2, opacity: 0.7 }}>•</span>}
          {b.spans.map((s, j) => <Sp key={j} s={s} />)}
        </span>
      ))}
    </span>
  );
};

const Sp: React.FC<{ s: { t: string; b?: boolean; i?: boolean } }> = ({ s }) =>
  s.b ? <strong style={{ fontWeight: 700 }}>{s.t}</strong> : s.i ? <em>{s.t}</em> : <>{s.t}</>;

export default RichText;
