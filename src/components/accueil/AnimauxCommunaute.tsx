/**
 * AnimauxCommunaute — sur l'accueil : combien de personnes viennent de découvrir leur animal intérieur,
 * et, en dépliant, combien il y en a de chaque. Des totaux seulement ; l'animal de la personne est marqué « toi ».
 */
import React, { useEffect, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { card, DC } from './DrLoShell';
import TotemAvatar from './TotemAvatar';
import { animalName, censusHeadline, getAnimalCensus, newByAnimal, type AnimalCensus } from '../../services/animalCensusService';

const AnimauxCommunaute: React.FC<{ mine?: string | null; accent: string }> = ({ mine, accent }) => {
  const [c, setC] = useState<AnimalCensus | null>(null);
  const [open, setOpen] = useState(false);
  useEffect(() => { let off = false; getAnimalCensus().then(r => { if (!off) setC(r); }).catch(() => {}); return () => { off = true; }; }, []);

  const head = c ? censusHeadline(c) : null;
  if (!c || !head) return null; // rien tant qu'on n'a pas de chiffres : la carte ne s'affiche pas à vide

  const fresh = newByAnimal(head.counts);
  const rows = Object.entries(c.byAnimal).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]);
  const max = rows.length ? rows[0][1] : 1;

  return (
    <section aria-label="Les animaux intérieurs de la communauté" style={{ ...card, marginTop: 14, padding: 16 }}>
      <p style={{ margin: 0, fontSize: 13, fontWeight: 700, letterSpacing: '.12em', color: accent }}>{head.kicker}</p>
      <p style={{ margin: '6px 0 0', fontFamily: 'Fraunces, serif', fontSize: 19, lineHeight: 1.3, fontWeight: 600, color: DC.title }}>{head.text}</p>
      {fresh.length > 0 && (
        <p style={{ margin: '6px 0 0', fontSize: 15, lineHeight: 1.45, color: DC.soft }}>
          {fresh.map(f => `${f.n} ${animalName(f.id, f.n)}`).join(' · ')}
        </p>
      )}
      <button type="button" onClick={() => setOpen(o => !o)} aria-expanded={open} className="drl-btn"
        style={{ marginTop: 8, minHeight: 44, padding: 0, border: 'none', background: 'transparent', color: accent, fontSize: 15, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        {open ? 'Masquer' : 'Voir tous les animaux'} <ChevronDown size={18} aria-hidden="true" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }} />
      </button>
      {open && (
        <ul style={{ listStyle: 'none', margin: '6px 0 0', padding: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {rows.map(([id, n]) => (
            <li key={id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <TotemAvatar animal={id} size={32} />
              <span style={{ width: 84, fontSize: 14, fontWeight: id === mine ? 800 : 600, color: id === mine ? DC.title : DC.text }}>{animalName(id)}{id === mine ? ' · toi' : ''}</span>
              <span aria-hidden="true" style={{ flex: 1, height: 8, borderRadius: 999, background: 'rgba(255,255,255,.08)', overflow: 'hidden' }}>
                <span style={{ display: 'block', height: '100%', width: `${Math.max(4, (n / max) * 100)}%`, borderRadius: 999, background: id === mine ? accent : DC.soft }} />
              </span>
              <span style={{ width: 36, textAlign: 'right', fontSize: 14, fontWeight: 700, color: DC.text }}>{n}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

export default AnimauxCommunaute;
