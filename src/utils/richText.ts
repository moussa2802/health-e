/**
 * richText.ts — les réponses de Dr Lô (IA) arrivent avec un peu de mise en forme (**gras**,
 * *italique*, titres « # », listes « - », paragraphes). On la transforme en blocs simples à
 * afficher, au lieu de montrer les astérisques. Logique pure, testée dans tests/unit/richText.test.ts.
 */

export type Span = { t: string; b?: boolean; i?: boolean };
export type Block = { kind: 'p' | 'li' | 'h'; spans: Span[] };

/** **gras** et *italique* dans une ligne ; un marqueur non refermé (texte en cours d'écriture) est ignoré. */
export function parseInline(line: string): Span[] {
  const out: Span[] = [];
  const re = /\*\*([^*]+?)\*\*|\*([^*\s][^*]*?)\*|__([^_]+?)__/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(line))) {
    if (m.index > last) out.push({ t: line.slice(last, m.index) });
    if (m[1] !== undefined) out.push({ t: m[1], b: true });
    else if (m[2] !== undefined) out.push({ t: m[2], i: true });
    else out.push({ t: m[3], b: true });
    last = m.index + m[0].length;
  }
  if (last < line.length) out.push({ t: line.slice(last) });
  // Restes de marqueurs (réponse coupée ou en cours d'écriture)
  return out.map(s => ({ ...s, t: s.t.replace(/\*{1,2}|__/g, '') })).filter(s => s.t.length > 0);
}

export function parseRich(text: string): Block[] {
  const blocks: Block[] = [];
  for (const raw of String(text ?? '').replace(/\r/g, '').split('\n')) {
    const line = raw.trim();
    if (!line || /^[-*_]{3,}$/.test(line)) continue;
    const h = line.match(/^#{1,6}\s+(.*)$/);
    if (h) { blocks.push({ kind: 'h', spans: parseInline(h[1]).map(s => ({ ...s, b: true })) }); continue; }
    const li = line.match(/^(?:[-•*]|\d+[.)])\s+(.*)$/);
    if (li) { blocks.push({ kind: 'li', spans: parseInline(li[1]) }); continue; }
    blocks.push({ kind: 'p', spans: parseInline(line) });
  }
  return blocks;
}
