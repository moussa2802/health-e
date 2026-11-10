/**
 * CasDuSoirCard — « Le cas du soir » sur l'accueil. N'apparaît que si le serveur répond « visible »
 * (aujourd'hui : le compte du propriétaire seulement, tant que Papa Moussa n'a pas validé).
 */
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Moon } from 'lucide-react';
import { DC } from '../accueil/DrLoShell';
import { getEtat, type CdsEtat } from '../../services/casDuSoirService';

// Réponse gardée sur le téléphone : 10 minutes si visible, 6 heures si masqué (pour ne pas interroger le serveur à chaque accueil)
const CACHE = 'he_cds_etat_v1';
const read = (): CdsEtat | null => {
  try {
    const c = JSON.parse(localStorage.getItem(CACHE) || 'null') as { at: number; e: CdsEtat } | null;
    if (!c) return null;
    return Date.now() - c.at < (c.e.visible ? 10 * 60000 : 6 * 3600000) ? c.e : null;
  } catch { return null; }
};

const CasDuSoirCard: React.FC<{ accent: string }> = ({ accent }) => {
  const [etat, setEtat] = useState<CdsEtat | null>(read);
  useEffect(() => {
    if (read()) return;
    getEtat().then(st => { setEtat(st); try { localStorage.setItem(CACHE, JSON.stringify({ at: Date.now(), e: st })); } catch { /* ignore */ } }).catch(() => {});
  }, []);
  const h = etat?.visible ? etat.histoire : undefined;
  if (!h) return null;
  const ep = Math.max(1, h.parus);
  return (
    <Link to="/cas-du-soir" className="drl-btn" style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 14, padding: 16, borderRadius: 20, textDecoration: 'none', border: `1px solid ${accent}55`, background: `linear-gradient(135deg, ${accent}22, rgba(20,14,10,.6) 70%)` }}>
      <Moon size={28} color={accent} aria-hidden="true" />
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'block', fontSize: 13, fontWeight: 700, color: accent }}>Le cas du soir · {h.parus ? `Épisode ${ep} sur ${h.total}` : 'bientôt'}{etat?.apercu ? ' · aperçu' : ''}</span>
        <b style={{ display: 'block', marginTop: 4, fontFamily: 'Fraunces, serif', fontSize: 19, color: DC.title }}>{h.titre}</b>
        <span style={{ display: 'block', marginTop: 2, fontSize: 14, lineHeight: 1.4, color: DC.muted }}>{h.accroche}</span>
        <span style={{ display: 'inline-block', marginTop: 8, fontSize: 14, fontWeight: 700, color: accent }}>{h.audio ? `Écouter (${h.minutes} min)` : `Lire (${h.minutes} min)`}</span>
      </span>
      <ArrowRight size={18} color={DC.muted} aria-hidden="true" />
    </Link>
  );
};

export default CasDuSoirCard;
