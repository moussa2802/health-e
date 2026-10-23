/** « Ton chemin vers Dr Lô » : les trois étapes qui débloquent une question au vrai Dr Lô. */
import React from 'react';
import { Link } from 'react-router-dom';
import { Check, Lock } from 'lucide-react';
import { DC, card } from './DrLoShell';
import type { DrloStatus } from '../../services/drloQuestionService';
import type { MomentPalette } from '../../utils/drloMoment';

const PaliersCard: React.FC<{ status: DrloStatus; palette: MomentPalette; withCta?: boolean }> = ({ status, palette, withCta = true }) => {
  const { steps, remaining, unlocked } = status.paliers;
  const unseen = status.questions.some(q => q.answer && !q.seen);
  return (
    <section aria-label="Ton chemin vers Dr Lô" style={{ ...card, marginTop: 14, borderColor: 'rgba(233,200,143,.35)', background: 'rgba(233,200,143,.07)' }}>
      <h2 style={{ margin: 0, fontFamily: 'Fraunces, serif', fontSize: 19, fontWeight: 600, color: DC.title }}>Ton chemin vers Dr Lô</h2>
      <p style={{ margin: '6px 0 0', fontSize: 13.5, lineHeight: 1.5, color: DC.muted }}>
        {unlocked
          ? 'C\'est débloqué : tu peux écrire au vrai Dr Lô. C\'est gratuit, ta récompense.'
          : `Encore ${remaining} étape${remaining > 1 ? 's' : ''} et tu pourras lui écrire directement. C'est gratuit : ta récompense.`}
      </p>
      <ol style={{ listStyle: 'none', margin: '12px 0 0', padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {steps.map(s => (
          <li key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span aria-hidden="true" style={{ width: 26, height: 26, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: s.done ? 'rgba(127,209,160,.18)' : 'rgba(255,255,255,.06)', border: `1px solid ${s.done ? 'rgba(127,209,160,.5)' : DC.line}` }}>
              {s.done ? <Check size={14} color={DC.ok} strokeWidth={2.6} /> : <span style={{ width: 6, height: 6, borderRadius: '50%', background: DC.faint }} />}
            </span>
            <span style={{ flex: 1 }}>
              <span style={{ display: 'block', fontSize: 14, fontWeight: 700, color: s.done ? DC.text : DC.soft }}>{s.label}{s.done ? ' · fait' : ''}</span>
              <span style={{ display: 'block', fontSize: 12.5, color: DC.faint }}>
                {s.detail}{!s.done && s.goal ? ` · ${s.progress ?? 0}/${s.goal}` : ''}
              </span>
            </span>
          </li>
        ))}
      </ol>
      {withCta && (
        <Link to="/question" className="drl-btn"
          style={{ marginTop: 12, minHeight: 46, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, textDecoration: 'none', fontSize: 14.5, fontWeight: 700,
            ...(unlocked || unseen ? { background: palette.primary, color: DC.ink } : { border: `1px solid ${DC.line}`, background: DC.glass, color: DC.muted }) }}>
          {!unlocked && !unseen && <Lock size={15} aria-hidden="true" />}
          {unseen ? 'Dr Lô t\'a répondu' : 'Écrire au vrai Dr Lô'}
        </Link>
      )}
    </section>
  );
};

export default PaliersCard;
