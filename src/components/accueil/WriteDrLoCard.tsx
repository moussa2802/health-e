/**
 * WriteDrLoCard — « Écrire au vrai Dr Lô », visible dans « Les messages de Dr Lô » (avant : seulement en bas de Mon espace).
 * Débloqué → bouton direct vers la page d'envoi. Sinon → on déplie les étapes qui restent (Ton chemin vers Dr Lô).
 */
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, PenLine } from 'lucide-react';
import { DC, card } from './DrLoShell';
import PaliersCard from './PaliersCard';
import { getDrloStatus, type DrloStatus } from '../../services/drloQuestionService';
import type { MomentPalette } from '../../utils/drloMoment';

const WriteDrLoCard: React.FC<{ palette: MomentPalette }> = ({ palette }) => {
  const [status, setStatus] = useState<DrloStatus | null>(null);
  const [open, setOpen] = useState(false);
  useEffect(() => { getDrloStatus().then(setStatus).catch(() => {}); }, []);
  if (!status) return null;
  const { unlocked, remaining } = status.paliers;
  const unseen = status.questions.some(q => q.answer && !q.seen);
  const ready = unlocked || unseen;
  return (
    <section style={{ ...card, marginTop: 12, borderColor: ready ? 'rgba(233,200,143,.5)' : DC.line }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span aria-hidden="true" style={{ width: 42, height: 42, borderRadius: 13, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(233,200,143,.14)', color: '#E9C88F' }}>
          <PenLine size={20} />
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 15.5, fontWeight: 700, color: DC.text }}>Écrire au vrai Dr Lô</p>
          <p style={{ margin: '2px 0 0', fontSize: 13, color: DC.muted, lineHeight: 1.45 }}>
            {unseen ? 'Il t\'a répondu : va lire sa réponse.' : unlocked ? 'C\'est débloqué : pose-lui ta question, gratuitement.' : `Encore ${remaining} étape${remaining > 1 ? 's' : ''} pour lui écrire. C'est gratuit.`}
          </p>
        </div>
      </div>
      {ready ? (
        <Link to="/question" className="drl-btn" style={{ marginTop: 12, minHeight: 46, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, textDecoration: 'none', fontSize: 14.5, fontWeight: 700, background: palette.primary, color: DC.ink }}>
          {unseen ? 'Lire sa réponse' : 'Lui écrire'}
        </Link>
      ) : (
        <button type="button" onClick={() => setOpen(o => !o)} aria-expanded={open} className="drl-btn"
          style={{ marginTop: 12, width: '100%', minHeight: 44, borderRadius: 14, border: `1px solid ${DC.line}`, background: DC.glass, color: DC.text, fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          {open ? 'Masquer les étapes' : 'Voir les étapes'} <ChevronDown size={16} aria-hidden="true" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }} />
        </button>
      )}
      {open && !ready && <PaliersCard status={status} palette={palette} withCta={false} />}
    </section>
  );
};

export default WriteDrLoCard;
