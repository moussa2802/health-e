/**
 * CasDuSoirCard — « Le cas du soir » sur l'accueil. N'apparaît que si le serveur répond « visible »
 * (aujourd'hui : le compte du propriétaire seulement, tant que Papa Moussa n'a pas validé).
 */
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Moon } from 'lucide-react';
import { ImageCard, SectionTitle } from '../accueil/HomeParts';
import { IMAGES } from '../../config/images';
import { getEtatDuMoment, type CdsEtat } from '../../services/casDuSoirService';

// Réponse gardée sur le téléphone : 10 minutes si visible, 6 heures si masqué (pour ne pas interroger le serveur à chaque accueil)
const CACHE = 'he_cds_etat_v2';
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
    getEtatDuMoment().then(st => { setEtat(st); try { localStorage.setItem(CACHE, JSON.stringify({ at: Date.now(), e: st })); } catch { /* ignore */ } }).catch(() => {});
  }, []);
  const h = etat?.visible ? etat.histoire : undefined;
  if (!h) return null;
  const ep = Math.max(1, h.parus);
  return (
    <>
      <SectionTitle>Le cas du soir</SectionTitle>
      {/* L'image du cas du moment (sa couverture) ; l'image générique seulement s'il n'en a pas */}
      <ImageCard to={`/cas-du-soir/${h.id}`} image={h.image || IMAGES.casDuSoir} tint={accent} fallback={<Moon size={40} color={accent} strokeWidth={1.4} />}
        kicker={`${h.parus ? `Épisode ${ep} sur ${h.total}` : 'Bientôt'}${etat?.apercu ? ' · aperçu' : ''}`}
        title={h.titre} line={h.accroche}
        footer={<Link to={`/cas-du-soir/${h.id}`} className="drl-btn" style={{ minHeight: 44, display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 15, fontWeight: 700, color: accent, textDecoration: 'none' }}>{h.audio ? `Écouter (${h.minutes} min)` : `Lire (${h.minutes} min)`} <ArrowRight size={16} aria-hidden="true" /></Link>} />
    </>
  );
};

export default CasDuSoirCard;
