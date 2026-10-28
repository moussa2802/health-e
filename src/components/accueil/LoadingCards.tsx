/**
 * LoadingCards — chargement bien visible (cartes « fantômes » qui brillent + un mot), pour qu'une page
 * en train de charger ne ressemble jamais à une page vide quand la connexion est lente.
 */
import React from 'react';
import { DC } from './DrLoShell';

const bar = (w: string, h = 12): React.CSSProperties => ({
  width: w, height: h, borderRadius: 8,
  background: 'linear-gradient(90deg, rgba(255,255,255,.05) 0%, rgba(255,255,255,.13) 50%, rgba(255,255,255,.05) 100%)',
  backgroundSize: '560px 100%', animation: 'drlShimmer 1.3s linear infinite',
});

const LoadingCards: React.FC<{ label: string; count?: number; withMedia?: boolean }> = ({ label, count = 2, withMedia = false }) => (
  <div role="status" aria-live="polite" style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
    <p style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: DC.muted, fontWeight: 600 }}>
      <span aria-hidden="true" style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid rgba(242,182,109,.3)', borderTopColor: '#F2B66D', animation: 'drlSpin .8s linear infinite' }} />
      {label}
    </p>
    {Array.from({ length: count }, (_, i) => (
      <div key={i} aria-hidden="true" style={{ borderRadius: 20, border: `1px solid ${DC.line}`, background: DC.glass, padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ ...bar('36px', 36), borderRadius: '50%' }} />
          <span style={{ display: 'flex', flexDirection: 'column', gap: 6 }}><span style={bar('90px')} /><span style={bar('60px', 10)} /></span>
        </div>
        {withMedia && <span style={bar('100%', 40)} />}
        <span style={bar('100%')} /><span style={bar('85%')} /><span style={bar('60%')} />
      </div>
    ))}
  </div>
);

export default LoadingCards;
