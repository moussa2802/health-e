/**
 * HomePenc — Pénc mi sur l'accueil (connecté).
 *   En direct : la grande carte « EN DIRECT » (qui anime, combien écoutent, Écouter).
 *   À venir   : les 2 prochains de la semaine, avec « Me rappeler ».
 *   Rien      : une entrée vers la page Pénc mi, avec son motif (la place où l'on se retrouve).
 */
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, BellRing } from 'lucide-react';
import { DC } from '../accueil/DrLoShell';
import { GAP, IMG_H, ImageCard, SectionTitle, Stack } from '../accueil/HomeParts';
import { PencLiveCard, PencMotif } from './PencVisuals';
import { IMAGES } from '../../config/images';
import type { MomentPalette } from '../../utils/drloMoment';
import { getAgenda, registerPenc, whenLabel, type Penc } from '../../services/pencService';

const Maj = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

/**
 * L'agenda gardé sur ce téléphone : la section s'affiche tout de suite (avant, elle arrivait en dernier,
 * le temps que le serveur réponde), puis se met à jour. Un « en direct » de plus de 15 min n'est pas repris.
 */
const CACHE = 'he_penc_agenda_v1';
type Agenda = { live: Penc[]; upcoming: Penc[] };
function readCache(): Agenda | null {
  try {
    const c = JSON.parse(localStorage.getItem(CACHE) || 'null') as { at: number; a: Agenda } | null;
    if (!c || Date.now() - c.at > 3 * 86400000) return null;
    const now = Date.now();
    return {
      live: Date.now() - c.at < 15 * 60000 ? c.a.live : [],
      upcoming: c.a.upcoming.filter(p => p.startAt > now - 30 * 60000),
    };
  } catch { return null; }
}
const writeCache = (a: Agenda) => { try { localStorage.setItem(CACHE, JSON.stringify({ at: Date.now(), a })); } catch { /* ignore */ } };

/** full = Pénc mi « en continu » (vague 4) : agenda et entrée permanente ; sinon, seulement la carte quand un Pénc est en direct. */
const HomePenc: React.FC<{ palette: MomentPalette; full?: boolean; onLive?: (live: boolean) => void }> = ({ palette, full = true, onLive }) => {
  const cached = useState(readCache)[0];
  const pick = (a: Agenda) => ({
    live: a.live.filter(p => !p.locked).slice(0, 2),
    next: a.upcoming.filter(p => !p.locked && p.startAt - Date.now() < 7 * 86400000).slice(0, 2),
  });
  const [live, setLive] = useState<Penc[]>(() => (cached ? pick(cached).live : []));
  const [next, setNext] = useState<Penc[]>(() => (cached ? pick(cached).next : []));
  const [loaded, setLoaded] = useState(!!cached);
  const [busy, setBusy] = useState('');
  const load = () => getAgenda().then(r => {
    writeCache({ live: r.live, upcoming: r.upcoming });
    const x = pick(r);
    setLive(x.live);
    onLive?.(x.live.length > 0);
    setNext(x.next);
  }).catch(() => {}).finally(() => setLoaded(true));
  useEffect(() => { if (cached) onLive?.(pick(cached).live.length > 0); load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const remind = async (p: Penc) => { setBusy(p.id); try { await registerPenc(p.id, !p.registered); await load(); } catch { /* la page Pénc mi explique les erreurs */ } finally { setBusy(''); } };
  // Première visite (rien en mémoire) : une place réservée, pour que l'accueil ne saute pas quand ça arrive
  if (!loaded) return full ? <div aria-hidden="true" style={{ marginTop: 26 + 34 + GAP, height: IMG_H + 96, borderRadius: 20, background: 'rgba(255,255,255,.03)', border: `1px solid ${DC.line}` }} /> : null;
  if (!full && !live.length) return null;
  const all = <Link to="/penc" style={{ fontSize: 14, fontWeight: 700, color: palette.accent, whiteSpace: 'nowrap' }}>Tout voir</Link>;
  const motif = <PencMotif size={80} color={palette.accent} />;

  // Rien de prévu : la section Pénc mi, avec une carte d'entrée
  if (!live.length && !next.length) {
    return (
      <>
        <SectionTitle>Pénc mi</SectionTitle>
        <ImageCard to="/penc" image={IMAGES.penc} tint={palette.accent} fallback={motif}
          title="On se retrouve pour parler, en direct." line="Écoute, pose ta question, prends la parole si tu veux." />
      </>
    );
  }
  return (
    <>
      {live.length > 0 && (
        <>
          <SectionTitle aside={full ? all : undefined}>En direct maintenant</SectionTitle>
          <Stack>{live.map(p => <PencLiveCard key={p.id} p={p} palette={palette} />)}</Stack>
        </>
      )}
      {full && next.length > 0 && (
        <>
          <SectionTitle aside={live.length ? undefined : all}>Pénc mi cette semaine</SectionTitle>
          {/* Chaque Pénc à venir : une carte avec image (la même pour tous), la date, le sujet et le bouton dans la carte */}
          <Stack>
            {next.map(p => {
              const paid = p.access === 'paid';
              const btn: React.CSSProperties = { minHeight: 44, padding: '0 16px', borderRadius: 999, fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: 'inherit', textDecoration: 'none' };
              return (
                <ImageCard key={p.id} to={`/penc/${p.id}`} image={IMAGES.penc} tint={palette.accent} fallback={motif}
                  kicker={`${Maj(whenLabel(p.startAt))}${paid ? ` · ${p.price} étincelle${p.price > 1 ? 's' : ''}` : ''}`}
                  title={p.title} line={`${p.host.name}${p.host.title ? ` · ${p.host.title}` : ''}`}
                  footer={paid
                    ? (p.registered
                      ? <span style={{ fontSize: 14, fontWeight: 700, color: palette.accent }}>Ta place est réservée</span>
                      : <Link to={`/penc/${p.id}`} className="drl-btn" style={{ ...btn, border: `1px solid ${palette.accent}`, color: palette.accent }}>Réserver ta place</Link>)
                    : (
                      <button type="button" onClick={() => remind(p)} disabled={busy === p.id} aria-pressed={!!p.registered} className="drl-btn"
                        style={{ ...btn, border: `1px solid ${p.registered ? palette.accent : DC.line}`, background: p.registered ? `${palette.accent}26` : 'transparent', color: p.registered ? palette.accent : DC.text }}>
                        {p.registered ? <BellRing size={16} aria-hidden="true" /> : <Bell size={16} aria-hidden="true" />}{p.registered ? 'Rappel activé' : 'Me rappeler'}
                      </button>
                    )} />
              );
            })}
          </Stack>
        </>
      )}
    </>
  );
};

export default HomePenc;
