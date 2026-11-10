/**
 * Illustration — une image de carte (16:9) ou d'épisode (4:3), chargée à la demande.
 * Tant qu'elle n'est pas chargée, ou si le fichier manque, on voit un fond dégradé aux couleurs de la carte
 * (avec, au centre, le petit motif habituel s'il y en a un) : jamais d'icône d'image cassée.
 * Un fichier manquant n'est demandé qu'une fois par visite.
 */
import React, { useEffect, useState } from 'react';

const manquantes = new Set<string>();

const Illustration: React.FC<{
  src?: string | null;
  /** '16 / 9' (couvertures) ou '4 / 3' (épisodes) ; ignoré si « height » est donné */
  ratio?: '16 / 9' | '4 / 3';
  /** Hauteur fixe en pixels (cartes de l'accueil) : l'image est recadrée au centre */
  height?: number;
  tint: string;
  /** Motif affiché au centre tant qu'il n'y a pas d'image */
  fallback?: React.ReactNode;
  radius?: number | string;
  /** Texte alternatif : vide si l'image est décorative (le titre de la carte dit déjà tout) */
  alt?: string;
  style?: React.CSSProperties;
}> = ({ src, ratio = '16 / 9', height, tint, fallback, radius = 16, alt = '', style }) => {
  const [ok, setOk] = useState(false);
  const [ko, setKo] = useState(() => !src || manquantes.has(src));
  // Une autre image (ex. l'épisode suivant) : on repart de zéro
  useEffect(() => { setOk(false); setKo(!src || manquantes.has(src)); }, [src]);
  return (
    <div style={{
      position: 'relative', ...(height ? { height } : { aspectRatio: ratio }), width: '100%', overflow: 'hidden', borderRadius: radius,
      background: `radial-gradient(70% 90% at 85% 10%, ${tint}55, transparent 70%), linear-gradient(140deg, ${tint}33, rgba(20,14,10,.85) 75%)`,
      ...style,
    }}>
      {!ok && fallback && <div aria-hidden="true" style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{fallback}</div>}
      {src && !ko && (
        <img src={src} alt={alt} loading="lazy" decoding="async"
          onLoad={() => setOk(true)}
          onError={() => { manquantes.add(src); setKo(true); }}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center', opacity: ok ? 1 : 0, transition: 'opacity .35s ease' }} />
      )}
    </div>
  );
};

export default Illustration;
