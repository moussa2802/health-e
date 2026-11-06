/**
 * AdminStats — « Statistiques » : l'utilisation du site, jour par jour (administrateurs).
 * Données : fonction admin-stats (totaux seulement, jamais de personne en particulier).
 *  - le suivi d'utilisation (visiteurs, pages, fonctions, heures, entonnoir) existe depuis sa mise en ligne ;
 *  - inscriptions, tests, messages au compagnon, humeurs et étincelles sont aussi calculés pour AVANT.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { RefreshCw, Loader2, Table2 } from 'lucide-react';
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid,
} from 'recharts';
import AdminLayout from '../../components/admin/AdminLayout';
import { DC } from '../../components/accueil/DrLoShell';
import { authedFetch } from '../../utils/authedFetch';
import { getScaleMeta } from '../../utils/scaleMeta';

interface Day { d: string; visiteurs: number | null; actifs: number; nouveaux: number; revenants: number; inscriptions: number; comptes: number; tests: number; chatMsgs: number; chatUsers: number; humeurs: number; exercices: number }
interface KV { key: string; n: number }
interface Stats {
  daily: Day[];
  totals: Record<string, number | null>;
  features: { key: string; users: number }[];
  pages: KV[]; goes: KV[]; tests: KV[]; hours: number[];
  funnel: { accueil: number; debut: number; testCommence: number; testFini: number; inscription: number };
  koris: { spentByFeature: KV[]; offeredByFeature: KV[]; purchases: number; purchased: number };
  acquisition: KV[];
  retention: { lendemain: number | null; semaine: number | null };
  trackingSince: string | null; notifOn: number | null; since: string;
}

// Couleurs des séries (palette validée sur le fond sombre : bleu puis orange, toujours dans cet ordre)
const S1 = '#3987e5';
const S2 = '#d95926';
const GRID = 'rgba(255,255,255,.08)';
const AXIS = { fontSize: 12, fill: '#B5AA9C' };

const FEATURE_LABEL: Record<string, string> = {
  compagnon: 'Compagnon (messages)', tests: 'Tests', humeur: 'Humeur du jour', exercices: 'Exercices guidés', micro: 'Micro (dictée)',
  journal: 'Me confier (journal)', programme: 'Programme', question: 'Question à Dr Lô', parrainage: 'Invitation d\'un proche', partage: 'Partage d\'un résultat',
  mot_du_jour: 'Mot du jour', cadeau: 'Cadeau du jour', inscription: 'Inscription', penc: 'Pénc mi', animal: 'Animal intérieur', chaines: 'Chaînes',
  defi: 'Défi', compat: 'Compatibilité', achat: 'Achat d\'étincelles',
};
const PAGE_LABEL: Record<string, string> = {
  accueil: 'Accueil', compagnon: 'Compagnon', moi: 'Moi', tests: 'Tests', resultats: 'Résultats', animal: 'Animal intérieur', compat: 'Compatibilité',
  penc: 'Pénc mi', journal: 'Journal', achat: 'Acheter des étincelles', chaines: 'Chaînes', question: 'Questions / messages', defi: 'Défi',
  humeur: 'Humeur', bilan: 'Point de la semaine', outils: 'Outils', autre: 'Autres pages',
};
const KORIS_LABEL: Record<string, string> = { chat: 'Messages au compagnon', test: 'Tests', analysis: 'Analyses', compatibility: 'Compatibilité', daily_gift: 'Cadeau du jour', referral: 'Parrainage', welcome: 'Bienvenue', penc: 'Pénc mi' };

const fmtDay = (d: string) => { const [, m, j] = d.split('-'); return `${Number(j)}/${Number(m)}`; };
const pct = (x: number | null) => (x === null || x === undefined ? '—' : `${Math.round(x * 100)} %`);
const nf = (n: number | null | undefined) => (n === null || n === undefined ? '—' : n.toLocaleString('fr-FR'));

const card: React.CSSProperties = { borderRadius: 18, border: `1px solid ${DC.line}`, background: 'rgba(255,255,255,.035)', padding: 16 };
const h2: React.CSSProperties = { margin: 0, fontFamily: 'Fraunces, serif', fontSize: 19, fontWeight: 600, color: DC.title };
const sub: React.CSSProperties = { margin: '4px 0 12px', fontSize: 13, color: DC.faint, lineHeight: 1.45 };

const Tip: React.FC<{ active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }> = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#241B14', border: `1px solid ${DC.line}`, borderRadius: 10, padding: '8px 10px', fontSize: 13, color: DC.text }}>
      <p style={{ margin: 0, fontWeight: 700 }}>{label && /^\d{4}-/.test(label) ? fmtDay(label) : label}</p>
      {payload.map(p => (
        <p key={p.name} style={{ margin: '2px 0 0', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: 2, background: p.color }} />{p.name} : <b>{nf(p.value)}</b>
        </p>
      ))}
    </div>
  );
};

const Kpi: React.FC<{ label: string; value: string; hint?: string }> = ({ label, value, hint }) => (
  <div style={{ ...card, padding: 14 }}>
    <p style={{ margin: 0, fontSize: 13, color: DC.muted }}>{label}</p>
    <p style={{ margin: '4px 0 0', fontSize: 28, fontWeight: 700, color: DC.title, fontVariantNumeric: 'tabular-nums' }}>{value}</p>
    {hint && <p style={{ margin: '2px 0 0', fontSize: 13, color: DC.faint }}>{hint}</p>}
  </div>
);

/** Barres horizontales simples (classements) : une seule couleur, la valeur écrite au bout. */
const Ranking: React.FC<{ rows: { label: string; n: number }[]; unit?: string; empty: string }> = ({ rows, unit = '', empty }) => {
  const max = Math.max(1, ...rows.map(r => r.n));
  if (!rows.length) return <p style={{ margin: 0, fontSize: 14, color: DC.faint }}>{empty}</p>;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {rows.map(r => (
        <div key={r.label} style={{ display: 'grid', gridTemplateColumns: 'minmax(110px, 38%) 1fr auto', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 14, color: DC.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={r.label}>{r.label}</span>
          <span aria-hidden="true" style={{ height: 10, borderRadius: 4, background: 'rgba(255,255,255,.06)' }}>
            <span style={{ display: 'block', height: '100%', width: `${(r.n / max) * 100}%`, minWidth: 3, borderRadius: 4, background: S1 }} />
          </span>
          <span style={{ fontSize: 14, color: DC.soft, fontVariantNumeric: 'tabular-nums' }}>{nf(r.n)}{unit}</span>
        </div>
      ))}
    </div>
  );
};

const AdminStats: React.FC = () => {
  const [days, setDays] = useState(30);
  const [data, setData] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [table, setTable] = useState(false);

  const load = (n = days) => {
    setLoading(true); setError(null);
    authedFetch(`/.netlify/functions/admin-stats?days=${n}`)
      .then(async r => { const j = await r.json(); if (!r.ok) throw new Error(j.error || 'Erreur'); setData(j as Stats); })
      .catch(e => setError(e.message || 'Erreur'))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(days); }, [days]); // eslint-disable-line react-hooks/exhaustive-deps

  const d = data?.daily ?? [];
  const T = data?.totals ?? {};
  const tracked = useMemo(() => d.filter(x => x.visiteurs !== null), [d]);
  const funnel = data?.funnel;
  const hours = (data?.hours ?? []).map((n, h) => ({ h: `${h} h`, n }));

  const chartBox: React.CSSProperties = { width: '100%', height: 240 };
  const axisProps = { tick: AXIS, tickLine: false, axisLine: false } as const;

  return (
    <AdminLayout>
      <div style={{ maxWidth: 1180, margin: '0 auto', padding: '8px 0 40px', display: 'flex', flexDirection: 'column', gap: 16, color: DC.text }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <h1 style={{ margin: 0, flex: 1, minWidth: 200, fontFamily: 'Fraunces, serif', fontSize: 28, fontWeight: 600, color: DC.title }}>Statistiques</h1>
          <div role="group" aria-label="Période" style={{ display: 'flex', gap: 6 }}>
            {[7, 30, 90].map(n => (
              <button key={n} type="button" onClick={() => setDays(n)} aria-pressed={days === n}
                style={{ minHeight: 40, padding: '0 14px', borderRadius: 999, border: `1px solid ${days === n ? DC.gold : DC.line}`, background: days === n ? 'rgba(242,182,109,.15)' : 'transparent', color: days === n ? DC.gold : DC.soft, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                {n} jours
              </button>
            ))}
          </div>
          <button type="button" onClick={() => load()} aria-label="Actualiser" style={{ width: 40, height: 40, borderRadius: '50%', border: `1px solid ${DC.line}`, background: 'transparent', color: DC.soft, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            {loading ? <Loader2 size={17} className="animate-spin" aria-hidden="true" /> : <RefreshCw size={17} aria-hidden="true" />}
          </button>
        </div>

        {error && <p role="alert" style={{ margin: 0, color: '#E9A28F' }}>Impossible de charger les statistiques : {error}</p>}
        {data && (
          <p style={{ margin: 0, fontSize: 13, color: DC.faint, lineHeight: 1.5 }}>
            Inscriptions, tests, messages au compagnon, humeurs et étincelles : calculés sur toute la période (aussi avant le suivi).
            Visiteurs, pages, fonctions, heures et entonnoir : {data.trackingSince ? `suivis depuis le ${fmtDay(data.trackingSince)}` : 'le suivi démarre avec ce déploiement'}.
            Jours à l'heure de Dakar.
          </p>
        )}

        {data && (<>
          {/* Les chiffres clés */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
            <Kpi label="Actifs aujourd'hui" value={nf(T.actifsAujourdhui)} hint={`${nf(T.visiteursAujourdhui)} visiteurs (appareils)`} />
            <Kpi label="Actifs sur 7 jours" value={nf(T.actifs7j)} hint={`${nf(T.actifsPeriode)} sur ${days} jours`} />
            <Kpi label="Inscriptions" value={nf(T.inscriptions)} hint={`${nf(T.comptes)} comptes au total`} />
            <Kpi label="Messages au compagnon" value={nf(T.chatMsgs)} hint={`${nf(T.chatUsers)} personnes lui ont écrit`} />
            <Kpi label="Tests terminés" value={nf(T.tests)} hint={`${nf(T.avecTest)} comptes ont fait au moins 1 test`} />
            <Kpi label="Animal intérieur révélé" value={nf(T.animal)} hint="comptes, au total" />
            <Kpi label="Revenus le lendemain" value={pct(data.retention.lendemain)} hint={`${pct(data.retention.semaine)} reviennent dans les 7 jours`} />
            <Kpi label="Notifications activées" value={nf(data.notifOn)} hint="comptes, au total" />
          </div>

          {/* Fréquentation */}
          <section style={card} aria-label="Personnes actives par jour">
            <h2 style={h2}>Personnes actives par jour</h2>
            <p style={sub}>Comptes : venus sur le site (suivi), ou qui ont écrit au compagnon, fait un test ou noté leur humeur. Visiteurs : appareils, avec ou sans compte.</p>
            <div style={chartBox}>
              <ResponsiveContainer>
                <LineChart data={d} margin={{ top: 8, right: 12, left: -18, bottom: 0 }}>
                  <CartesianGrid stroke={GRID} vertical={false} />
                  <XAxis dataKey="d" tickFormatter={fmtDay} {...axisProps} minTickGap={18} />
                  <YAxis allowDecimals={false} {...axisProps} />
                  <Tooltip content={<Tip />} />
                  <Legend wrapperStyle={{ fontSize: 13, color: DC.soft }} />
                  <Line type="linear" dataKey="actifs" name="Comptes actifs" stroke={S1} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                  <Line type="linear" dataKey="visiteurs" name="Visiteurs" stroke={S2} strokeWidth={2} dot={false} activeDot={{ r: 4 }} connectNulls={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
            <section style={card} aria-label="Nouveaux et revenants">
              <h2 style={h2}>Nouveaux et revenants</h2>
              <p style={sub}>Parmi les comptes actifs : inscrits le jour même, ou déjà inscrits avant.</p>
              <div style={chartBox}>
                <ResponsiveContainer>
                  <BarChart data={d} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                    <CartesianGrid stroke={GRID} vertical={false} />
                    <XAxis dataKey="d" tickFormatter={fmtDay} {...axisProps} minTickGap={18} />
                    <YAxis allowDecimals={false} {...axisProps} />
                    <Tooltip content={<Tip />} cursor={{ fill: 'rgba(255,255,255,.04)' }} />
                    <Legend wrapperStyle={{ fontSize: 13, color: DC.soft }} />
                    <Bar dataKey="revenants" name="Revenants" stackId="a" fill={S1} />
                    <Bar dataKey="nouveaux" name="Nouveaux" stackId="a" fill={S2} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>
            <section style={card} aria-label="Inscriptions par jour">
              <h2 style={h2}>Inscriptions par jour</h2>
              <p style={sub}>Nouveaux comptes créés.</p>
              <div style={chartBox}>
                <ResponsiveContainer>
                  <BarChart data={d} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                    <CartesianGrid stroke={GRID} vertical={false} />
                    <XAxis dataKey="d" tickFormatter={fmtDay} {...axisProps} minTickGap={18} />
                    <YAxis allowDecimals={false} {...axisProps} />
                    <Tooltip content={<Tip />} cursor={{ fill: 'rgba(255,255,255,.04)' }} />
                    <Bar dataKey="inscriptions" name="Inscriptions" fill={S1} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>
          </div>

          {/* Compagnon */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
            <section style={card} aria-label="Messages au compagnon par jour">
              <h2 style={h2}>Messages au compagnon</h2>
              <p style={sub}>Chaque message envoyé (1 étincelle).</p>
              <div style={chartBox}>
                <ResponsiveContainer>
                  <BarChart data={d} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                    <CartesianGrid stroke={GRID} vertical={false} />
                    <XAxis dataKey="d" tickFormatter={fmtDay} {...axisProps} minTickGap={18} />
                    <YAxis allowDecimals={false} {...axisProps} />
                    <Tooltip content={<Tip />} cursor={{ fill: 'rgba(255,255,255,.04)' }} />
                    <Bar dataKey="chatMsgs" name="Messages" fill={S1} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>
            <section style={card} aria-label="Personnes qui écrivent au compagnon">
              <h2 style={h2}>Personnes qui écrivent au compagnon</h2>
              <p style={sub}>Comptes différents par jour.</p>
              <div style={chartBox}>
                <ResponsiveContainer>
                  <LineChart data={d} margin={{ top: 8, right: 12, left: -18, bottom: 0 }}>
                    <CartesianGrid stroke={GRID} vertical={false} />
                    <XAxis dataKey="d" tickFormatter={fmtDay} {...axisProps} minTickGap={18} />
                    <YAxis allowDecimals={false} {...axisProps} />
                    <Tooltip content={<Tip />} />
                    <Line type="linear" dataKey="chatUsers" name="Personnes" stroke={S1} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </section>
          </div>

          {/* Tests */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
            <section style={card} aria-label="Tests terminés par jour">
              <h2 style={h2}>Tests terminés par jour</h2>
              <p style={sub}>Un test refait compte à sa dernière date.</p>
              <div style={chartBox}>
                <ResponsiveContainer>
                  <BarChart data={d} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                    <CartesianGrid stroke={GRID} vertical={false} />
                    <XAxis dataKey="d" tickFormatter={fmtDay} {...axisProps} minTickGap={18} />
                    <YAxis allowDecimals={false} {...axisProps} />
                    <Tooltip content={<Tip />} cursor={{ fill: 'rgba(255,255,255,.04)' }} />
                    <Bar dataKey="tests" name="Tests" fill={S1} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>
            <section style={card} aria-label="Tests les plus faits">
              <h2 style={h2}>Tests les plus faits</h2>
              <p style={sub}>Sur la période.</p>
              <Ranking rows={(data.tests ?? []).slice(0, 12).map(t => ({ label: getScaleMeta(t.key)?.label || t.key, n: t.n }))} empty="Aucun test sur la période." />
            </section>
          </div>

          {/* Ce qui est utilisé */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
            <section style={card} aria-label="Ce qu'ils utilisent">
              <h2 style={h2}>Ce qu'ils utilisent</h2>
              <p style={sub}>Nombre de comptes différents qui ont utilisé chaque fonction sur la période.</p>
              <Ranking rows={(data.features ?? []).map(f => ({ label: FEATURE_LABEL[f.key] || f.key, n: f.users }))} empty="Pas encore de données." />
            </section>
            <section style={card} aria-label="Pages les plus visitées">
              <h2 style={h2}>Pages les plus visitées</h2>
              <p style={sub}>Ouvertures de chaque rubrique (suivi).</p>
              <Ranking rows={(data.pages ?? []).map(p => ({ label: PAGE_LABEL[p.key] || p.key, n: p.n }))} empty="Le suivi des pages démarre avec ce déploiement." />
            </section>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
            <section style={card} aria-label="Heures d'activité">
              <h2 style={h2}>Heures d'activité</h2>
              <p style={sub}>Quand le site est utilisé (heure de Dakar, suivi).</p>
              <div style={chartBox}>
                <ResponsiveContainer>
                  <BarChart data={hours} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                    <CartesianGrid stroke={GRID} vertical={false} />
                    <XAxis dataKey="h" {...axisProps} interval={2} />
                    <YAxis allowDecimals={false} {...axisProps} />
                    <Tooltip content={<Tip />} cursor={{ fill: 'rgba(255,255,255,.04)' }} />
                    <Bar dataKey="n" name="Activité" fill={S1} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>
            {funnel && (
              <section style={card} aria-label="Entonnoir">
                <h2 style={h2}>Du premier écran au compte</h2>
                <p style={sub}>Nombre de fois, sur la période (suivi). Le % se lit par rapport à l'étape d'avant.</p>
                <ol style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {([
                    ['Accueil du compagnon vu', funnel.accueil],
                    ['Conversation commencée', funnel.debut],
                    ['Test commencé', funnel.testCommence],
                    ['Test terminé', funnel.testFini],
                    ['Compte créé', funnel.inscription],
                  ] as [string, number][]).map(([label, n], i, arr) => (
                    <li key={label} style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 12, alignItems: 'center' }}>
                      <span style={{ fontSize: 14 }}>{label}</span>
                      <b style={{ fontVariantNumeric: 'tabular-nums' }}>{nf(n)}</b>
                      <span style={{ minWidth: 56, textAlign: 'right', fontSize: 13, color: DC.faint }}>{i > 0 && arr[i - 1][1] ? pct(n / arr[i - 1][1]) : ''}</span>
                    </li>
                  ))}
                </ol>
              </section>
            )}
          </div>

          {/* Étincelles et inscriptions */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
            <section style={card} aria-label="Étincelles dépensées">
              <h2 style={h2}>Étincelles dépensées</h2>
              <p style={sub}>{nf(data.koris.purchases)} achat{data.koris.purchases > 1 ? 's' : ''} sur la période ({nf(data.koris.purchased)} étincelles achetées).</p>
              <Ranking rows={data.koris.spentByFeature.map(k => ({ label: KORIS_LABEL[k.key] || k.key, n: k.n }))} empty="Aucune dépense sur la période." />
              <p style={{ ...sub, margin: '16px 0 8px' }}>Offertes sur la période</p>
              <Ranking rows={data.koris.offeredByFeature.map(k => ({ label: KORIS_LABEL[k.key] || k.key, n: k.n }))} empty="Rien d'offert sur la période." />
            </section>
            <section style={card} aria-label="Sources des inscriptions">
              <h2 style={h2}>D'où viennent les inscrits</h2>
              <p style={sub}>Sur la période (« direct » : sans lien particulier).</p>
              <Ranking rows={data.acquisition.map(a => ({ label: a.key === 'defi' ? 'Lien de défi' : a.key === 'ref' ? 'Invitation d\'un proche' : a.key, n: a.n }))} empty="Aucune inscription sur la période." />
              <p style={{ ...sub, margin: '16px 0 8px' }}>Boutons les plus touchés (suivi)</p>
              <Ranking rows={data.goes.slice(0, 8).map(g => ({ label: g.key.replace(/_/g, ' '), n: g.n }))} empty="Le suivi démarre avec ce déploiement." />
            </section>
          </div>

          {/* Le tableau jour par jour */}
          <section style={card} aria-label="Tableau jour par jour">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <h2 style={{ ...h2, flex: 1 }}>Jour par jour</h2>
              <button type="button" onClick={() => setTable(t => !t)} aria-expanded={table}
                style={{ minHeight: 40, padding: '0 14px', borderRadius: 999, border: `1px solid ${DC.line}`, background: 'transparent', color: DC.soft, fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <Table2 size={16} aria-hidden="true" />{table ? 'Masquer le tableau' : 'Voir le tableau'}
              </button>
            </div>
            {table && (
              <div style={{ marginTop: 12, overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14, fontVariantNumeric: 'tabular-nums' }}>
                  <thead>
                    <tr style={{ color: DC.muted, textAlign: 'right' }}>
                      {['Jour', 'Visiteurs', 'Actifs', 'Nouveaux', 'Inscriptions', 'Comptes', 'Tests', 'Messages', 'Écrivent', 'Humeurs', 'Exercices'].map((h, i) => (
                        <th key={h} style={{ padding: '6px 8px', fontWeight: 600, textAlign: i ? 'right' : 'left', borderBottom: `1px solid ${DC.line}`, whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[...d].reverse().map(x => (
                      <tr key={x.d} style={{ textAlign: 'right' }}>
                        <td style={{ padding: '6px 8px', textAlign: 'left', whiteSpace: 'nowrap' }}>{fmtDay(x.d)}</td>
                        {[x.visiteurs, x.actifs, x.nouveaux, x.inscriptions, x.comptes, x.tests, x.chatMsgs, x.chatUsers, x.humeurs, x.exercices].map((v, i) => (
                          <td key={i} style={{ padding: '6px 8px', color: DC.soft }}>{nf(v)}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {!table && <p style={{ ...sub, margin: '6px 0 0' }}>{tracked.length ? `${tracked.length} jour${tracked.length > 1 ? 's' : ''} avec le suivi détaillé.` : 'Toutes les colonnes, jour par jour.'}</p>}
          </section>
        </>)}
        {!data && loading && <p style={{ color: DC.muted }}>Calcul des statistiques…</p>}
      </div>
    </AdminLayout>
  );
};

export default AdminStats;
