import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Users,
  ClipboardList,
  Smartphone,
  AlertTriangle,
  AlertCircle,
  TrendingUp,
  Trophy,
  Percent,
  Moon,
  Search,
  User,
  Phone,
  Mail,
  Calendar,
  KeyRound,
  Clock,
  BarChart3,
  ArrowLeft,
} from 'lucide-react';
import AdminLayout from '../../components/admin/AdminLayout';
import AdminKorisSection from '../../components/admin/AdminKorisSection';
import {
  getEvaluationStats,
  computeEvaluationStatsFromRaw,
  saveEvaluationStats,
  getSignupsByWeek,
  getTestsByDay,
  getTestPopularity,
  getAverageScores,
  getRecentAlerts,
  type EvaluationStats,
  type WeeklySignup,
  type DailyTests,
  type TestPopularity as TestPop,
  type AverageScore,
  type AnonymousAlert,
} from '../../services/evaluationStatsService';
import {
  getAllUsersForAdmin,
  getUserDetail,
  getUserMetrics,
  type TopUser,
  type UserDetail,
  type UserMetrics,
} from '../../services/adminUsersService';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';

// ══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════════════════════

function severityColor(severity: string): string {
  switch (severity) {
    case 'none': case 'minimal': case 'positive': return '#3C7A5A'; // ok
    case 'mild': return '#8F6A1F'; // gold
    case 'moderate': return '#B5732A'; // warn
    case 'severe': case 'alert': return '#B23A3A'; // danger
    default: return '#6E7078'; // muted
  }
}

function severityLabel(severity: string): string {
  switch (severity) {
    case 'none': return 'Normal';
    case 'minimal': return 'Minimal';
    case 'positive': return 'Positif';
    case 'mild': return 'Leger';
    case 'moderate': return 'Modere';
    case 'severe': return 'Severe';
    case 'alert': return 'Alerte';
    default: return severity;
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// SHARED UI COMPONENTS
// ══════════════════════════════════════════════════════════════════════════════

type Tone = 'ink' | 'accent' | 'sage' | 'gold' | 'ok' | 'warn' | 'danger' | 'muted';

const TONE_TEXT: Record<Tone, string> = {
  ink: 'text-ink',
  accent: 'text-accent',
  sage: 'text-sage',
  gold: 'text-gold',
  ok: 'text-ok',
  warn: 'text-warn',
  danger: 'text-danger',
  muted: 'text-muted',
};

const KpiCard: React.FC<{
  icon: React.ReactNode;
  value: string | number;
  label: string;
  sub?: string;
  tone?: Tone;
}> = ({ icon, value, label, sub, tone = 'sage' }) => (
  <div className="bg-card rounded-block px-[18px] py-4 border border-line shadow-soft flex-1 min-w-[150px]">
    <div className="flex items-center gap-2 mb-2">
      <span className={TONE_TEXT[tone]}>{icon}</span>
      <span className="text-[11px] text-muted font-semibold">{label}</span>
    </div>
    <p className={`m-0 font-display text-2xl font-extrabold ${TONE_TEXT[tone]}`}>{value}</p>
    {sub && <p className="mt-0.5 text-[11px] text-muted">{sub}</p>}
  </div>
);

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="bg-card rounded-block p-5 border border-line shadow-soft">
    <h3 className="m-0 mb-3.5 font-display text-sm font-bold text-ink">{title}</h3>
    {children}
  </div>
);

// ══════════════════════════════════════════════════════════════════════════════
// SUB-TAB NAVIGATION
// ══════════════════════════════════════════════════════════════════════════════

type SubTab = 'overview' | 'tests' | 'alerts' | 'users';

const SUB_TABS: { id: SubTab; label: string; icon: React.ElementType }[] = [
  { id: 'overview', label: "Vue d'ensemble", icon: BarChart3 },
  { id: 'tests', label: 'Tests', icon: ClipboardList },
  { id: 'alerts', label: 'Alertes', icon: AlertTriangle },
  { id: 'users', label: 'Top Users', icon: Users },
];

const SubTabNav: React.FC<{ active: SubTab; onChange: (tab: SubTab) => void }> = ({ active, onChange }) => (
  <div className="flex gap-1 bg-paper p-1 rounded-card mb-5">
    {SUB_TABS.map(tab => {
      const Icon = tab.icon;
      return (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`flex-1 px-3 py-2 rounded-card border-none text-xs font-semibold cursor-pointer transition-all whitespace-nowrap ${
            active === tab.id ? 'bg-card text-accent shadow-soft' : 'bg-transparent text-ink-soft'
          }`}
        >
          <Icon className="h-3.5 w-3.5 inline-block mr-1 -mt-0.5" />
          {tab.label}
        </button>
      );
    })}
  </div>
);

// ══════════════════════════════════════════════════════════════════════════════
// TAB 1 — VUE D'ENSEMBLE
// ══════════════════════════════════════════════════════════════════════════════

const OverviewTab: React.FC<{
  stats: EvaluationStats;
  weeklySignups: WeeklySignup[];
  dailyTests: DailyTests[];
  popularity: TestPop[];
  alerts: AnonymousAlert[];
  onNavigate: (tab: SubTab) => void;
}> = ({ stats, weeklySignups, dailyTests, popularity, alerts, onNavigate }) => {
  const totalAlerts = (stats.alertsLevel2 ?? 0) + (stats.alertsLevel3 ?? 0);
  const googlePct = stats.totalUsers > 0 ? Math.round((stats.googleUsers / stats.totalUsers) * 100) : 0;

  return (
    <div className="flex flex-col gap-4">
      {/* KPI row */}
      <div className="flex gap-3 flex-wrap">
        <KpiCard icon={<Users className="h-[18px] w-[18px]" />} value={stats.totalUsers?.toLocaleString('fr-FR') ?? '0'} label="Utilisateurs" />
        <KpiCard icon={<ClipboardList className="h-[18px] w-[18px]" />} value={stats.totalTests?.toLocaleString('fr-FR') ?? '0'} label="Tests faits" sub={`${Object.keys(stats.testCounts ?? {}).length} tests differents`} />
        <KpiCard icon={<Smartphone className="h-[18px] w-[18px]" />} value={`${googlePct}% / ${100 - googlePct}%`} label="Google / SMS" tone="accent" />
        <KpiCard icon={<AlertTriangle className="h-[18px] w-[18px]" />} value={totalAlerts} label="Alertes 2-3" sub={`${stats.alertsLevel3 ?? 0} critiques`} tone="danger" />
      </div>

      {/* Sparkline charts */}
      <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
        <div className="bg-card rounded-block px-4 py-3.5 border border-line">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-ink-soft mb-2">
            <TrendingUp className="h-3.5 w-3.5" /> Inscriptions / semaine
          </div>
          {weeklySignups.length > 0 ? (
            <ResponsiveContainer width="100%" height={130}>
              <LineChart data={weeklySignups}>
                <XAxis dataKey="label" tick={{ fontSize: 9, fill: '#6E7078' }} interval="preserveStartEnd" />
                <YAxis hide allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: 8, fontSize: 11 }} />
                <Line type="monotone" dataKey="count" stroke="#B5522F" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : <p className="text-muted text-xs">Aucune donnee</p>}
        </div>
        <div className="bg-card rounded-block px-4 py-3.5 border border-line">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-ink-soft mb-2">
            <TrendingUp className="h-3.5 w-3.5" /> Tests / jour (30j)
          </div>
          {dailyTests.length > 0 ? (
            <ResponsiveContainer width="100%" height={130}>
              <LineChart data={dailyTests}>
                <XAxis dataKey="label" tick={{ fontSize: 9, fill: '#6E7078' }} interval={6} />
                <YAxis hide allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: 8, fontSize: 11 }} />
                <Line type="monotone" dataKey="count" stroke="#4A5D57" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : <p className="text-muted text-xs">Aucune donnee</p>}
        </div>
      </div>

      {/* Top 3 tests + Top 3 alerts */}
      <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
        <div className="bg-card rounded-block p-4 border border-line">
          <div className="flex justify-between items-center mb-3">
            <span className="text-[13px] font-bold text-ink flex items-center gap-1.5">
              <Trophy className="h-4 w-4 text-gold" /> Tests les plus faits
            </span>
            <button onClick={() => onNavigate('tests')} className="text-[11px] text-accent bg-transparent border-none cursor-pointer font-semibold">Voir tout →</button>
          </div>
          {popularity.slice(0, 3).map((t, i) => (
            <div key={t.scaleId} className={`flex justify-between py-1.5 ${i < 2 ? 'border-b border-line' : ''}`}>
              <span className="text-xs text-ink-soft"><span className="mr-1.5">{t.icon}</span>{t.name}</span>
              <span className="text-xs font-bold text-sage">{t.count}</span>
            </div>
          ))}
        </div>

        <div className="bg-card rounded-block p-4 border border-line">
          <div className="flex justify-between items-center mb-3">
            <span className="text-[13px] font-bold text-ink flex items-center gap-1.5">
              <AlertTriangle className="h-4 w-4 text-danger" /> Alertes recentes
            </span>
            <button onClick={() => onNavigate('alerts')} className="text-[11px] text-accent bg-transparent border-none cursor-pointer font-semibold">Voir tout →</button>
          </div>
          {alerts.length === 0
            ? <p className="text-muted text-xs">Aucune alerte</p>
            : alerts.slice(0, 3).map((a, i) => (
              <div key={i} className={`flex justify-between items-center py-1.5 ${i < 2 ? 'border-b border-line' : ''}`}>
                <span className="text-xs text-ink-soft"><span className="mr-1.5">{a.icon}</span>{a.scaleName}</span>
                <div className="flex gap-1.5 items-center">
                  <span className="text-[10px] text-muted">{a.date}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-card ${
                    a.alertLevel >= 3 ? 'bg-danger/15 text-danger' : 'bg-gold-soft text-gold'
                  }`}>Niv. {a.alertLevel}</span>
                </div>
              </div>
            ))
          }
        </div>
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// TAB 2 — TESTS
// ══════════════════════════════════════════════════════════════════════════════

const TestsTab: React.FC<{
  popularity: TestPop[];
  avgScores: AverageScore[];
  dailyTests: DailyTests[];
}> = ({ popularity, avgScores, dailyTests }) => {
  const [sortCol, setSortCol] = useState<'name' | 'count' | 'avg' | 'severity'>('count');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const toggleSort = (col: typeof sortCol) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('desc'); }
  };

  const sortedScores = useMemo(() => {
    const copy = [...avgScores];
    copy.sort((a, b) => {
      let cmp = 0;
      switch (sortCol) {
        case 'name': cmp = a.name.localeCompare(b.name); break;
        case 'count': cmp = a.count - b.count; break;
        case 'avg': cmp = a.avgScore - b.avgScore; break;
        case 'severity': cmp = a.mostCommonSeverity.localeCompare(b.mostCommonSeverity); break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return copy;
  }, [avgScores, sortCol, sortDir]);

  const arrow = (col: typeof sortCol) => sortCol === col ? (sortDir === 'asc' ? ' ↑' : ' ↓') : '';

  return (
    <div className="flex flex-col gap-5">
      {/* Bar chart — all tests */}
      <Section title="Classement des tests par popularite">
        {popularity.length === 0 ? (
          <p className="text-muted text-sm">Aucune donnee</p>
        ) : (
          <ResponsiveContainer width="100%" height={Math.max(300, popularity.length * 30)}>
            <BarChart data={popularity} layout="vertical" margin={{ left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E7E4DA" />
              <XAxis type="number" tick={{ fontSize: 11, fill: '#6E7078' }} />
              <YAxis type="category" dataKey="name" width={180} tick={{ fontSize: 11, fill: '#4B4D55' }} />
              <Tooltip contentStyle={{ borderRadius: 10, fontSize: 12 }} formatter={(v: number) => [`${v} completions`, 'Total']} />
              <Bar dataKey="count" radius={[0, 6, 6, 0]} maxBarSize={20}>
                {popularity.map((_, i) => <Cell key={i} fill={i % 2 === 0 ? '#4A5D57' : '#B5522F'} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </Section>

      {/* Sortable scores table */}
      <Section title="Scores moyens par test">
        {sortedScores.length === 0 ? (
          <p className="text-muted text-sm">Aucune donnee</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="border-b-2 border-line">
                  <th onClick={() => toggleSort('name')} className={THEAD_TH}>Test{arrow('name')}</th>
                  <th onClick={() => toggleSort('count')} className={`${THEAD_TH} text-center`}>Completes{arrow('count')}</th>
                  <th onClick={() => toggleSort('avg')} className={`${THEAD_TH} text-center`}>Score moy.{arrow('avg')}</th>
                  <th onClick={() => toggleSort('severity')} className={`${THEAD_TH} text-center`}>Tendance{arrow('severity')}</th>
                </tr>
              </thead>
              <tbody>
                {sortedScores.map(test => (
                  <tr key={test.scaleId} className="border-b border-line">
                    <td className="py-1.5 px-1.5 font-medium text-ink">
                      <span className="mr-1.5">{test.icon}</span>{test.name}
                    </td>
                    <td className="text-center py-1.5 px-1.5 text-muted">{test.count}</td>
                    <td className="text-center py-1.5 px-1.5 text-ink-soft">
                      {test.avgScore}{test.maxScore > 0 ? ` / ${test.maxScore}` : ''}
                    </td>
                    <td className="text-center py-1.5 px-1.5">
                      <span
                        className="inline-block px-2 py-0.5 rounded-card text-[10px] font-bold"
                        style={{
                          color: severityColor(test.mostCommonSeverity),
                          background: `${severityColor(test.mostCommonSeverity)}15`,
                        }}
                      >{severityLabel(test.mostCommonSeverity)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      {/* Full daily tests chart */}
      <Section title="Tests completes par jour (30 derniers jours)">
        {dailyTests.length === 0 ? (
          <p className="text-muted text-sm">Aucune donnee</p>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={dailyTests}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E7E4DA" />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#6E7078' }} interval="preserveStartEnd" />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#6E7078' }} />
              <Tooltip contentStyle={{ borderRadius: 10, fontSize: 12 }} />
              <Line type="monotone" dataKey="count" stroke="#4A5D57" strokeWidth={2} dot={false} name="Tests" />
            </LineChart>
          </ResponsiveContainer>
        )}
      </Section>
    </div>
  );
};

const THEAD_TH =
  'text-left py-2 px-1.5 text-muted font-semibold cursor-pointer select-none text-[11px] whitespace-nowrap';

// ══════════════════════════════════════════════════════════════════════════════
// TAB 3 — ALERTES
// ══════════════════════════════════════════════════════════════════════════════

const AlertsTab: React.FC<{
  alerts: AnonymousAlert[];
  stats: EvaluationStats;
}> = ({ alerts, stats }) => {
  const [filterLevel, setFilterLevel] = useState<0 | 2 | 3>(0);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 20;

  const filtered = useMemo(() => {
    if (filterLevel === 0) return alerts;
    return alerts.filter(a => a.alertLevel === filterLevel);
  }, [alerts, filterLevel]);

  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  // Alert distribution by test
  const alertsByTest = useMemo(() => {
    const counts: Record<string, { name: string; icon: string; count: number }> = {};
    alerts.forEach(a => {
      if (!counts[a.scaleId]) counts[a.scaleId] = { name: a.scaleName, icon: a.icon, count: 0 };
      counts[a.scaleId].count++;
    });
    return Object.values(counts).sort((a, b) => b.count - a.count);
  }, [alerts]);

  const alertRate = stats.totalTests > 0
    ? ((alerts.length / stats.totalTests) * 100).toFixed(1)
    : '0';

  return (
    <div className="flex flex-col gap-5">
      {/* KPIs */}
      <div className="flex gap-3 flex-wrap">
        <KpiCard icon={<AlertCircle className="h-[18px] w-[18px]" />} value={stats.alertsLevel3 ?? 0} label="Niveau 3 (critique)" tone="danger" />
        <KpiCard icon={<AlertTriangle className="h-[18px] w-[18px]" />} value={stats.alertsLevel2 ?? 0} label="Niveau 2 (attention)" tone="warn" />
        <KpiCard icon={<Percent className="h-[18px] w-[18px]" />} value={`${alertRate}%`} label="Taux d'alerte global" tone="muted" />
      </div>

      {/* Filter pills */}
      <div className="flex gap-1.5">
        {([0, 2, 3] as const).map(lvl => (
          <button
            key={lvl}
            onClick={() => { setFilterLevel(lvl); setPage(0); }}
            className={`px-3.5 py-1.5 rounded-pill border text-[11px] font-semibold cursor-pointer ${
              filterLevel === lvl
                ? lvl === 3
                  ? 'bg-danger/15 text-danger border-danger/30'
                  : lvl === 2
                  ? 'bg-gold-soft text-gold border-gold/30'
                  : 'bg-ok/15 text-ink border-ok/30'
                : 'bg-card text-ink-soft border-line'
            }`}
          >
            {lvl === 0 ? 'Toutes' : `Niveau ${lvl}`}
          </button>
        ))}
      </div>

      {/* Alerts list */}
      <Section title={`Alertes recentes — ${filtered.length} resultats`}>
        {paged.length === 0 ? (
          <p className="text-muted text-sm">Aucune alerte.</p>
        ) : (
          <>
            <div className="flex flex-col gap-1.5">
              {paged.map((alert, i) => (
                <div
                  key={i}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-card border ${
                    alert.alertLevel >= 3 ? 'bg-danger/5 border-danger/15' : 'bg-gold-soft/60 border-gold/15'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{alert.icon}</span>
                    <span className="text-xs font-semibold text-ink">{alert.scaleName}</span>
                    <span className="text-[10px] text-muted">{alert.date}</span>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-card ${
                    alert.alertLevel >= 3 ? 'bg-danger/15 text-danger' : 'bg-gold-soft text-gold'
                  }`}>Niveau {alert.alertLevel}</span>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-2 mt-3">
                <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
                  className={`${PAGINATION_BTN} ${page === 0 ? 'opacity-40' : 'opacity-100'}`}>← Precedent</button>
                <span className="text-xs text-ink-soft py-1.5">{page + 1} / {totalPages}</span>
                <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
                  className={`${PAGINATION_BTN} ${page >= totalPages - 1 ? 'opacity-40' : 'opacity-100'}`}>Suivant →</button>
              </div>
            )}
          </>
        )}
      </Section>

      {/* Alerts distribution by test */}
      {alertsByTest.length > 0 && (
        <Section title="Repartition des alertes par test">
          <ResponsiveContainer width="100%" height={Math.max(200, alertsByTest.length * 30)}>
            <BarChart data={alertsByTest} layout="vertical" margin={{ left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E7E4DA" />
              <XAxis type="number" tick={{ fontSize: 11, fill: '#6E7078' }} />
              <YAxis type="category" dataKey="name" width={160} tick={{ fontSize: 11, fill: '#4B4D55' }} />
              <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} formatter={(v: number) => [`${v} alertes`, 'Total']} />
              <Bar dataKey="count" radius={[0, 6, 6, 0]} maxBarSize={18} fill="#B23A3A" />
            </BarChart>
          </ResponsiveContainer>
        </Section>
      )}
    </div>
  );
};

const PAGINATION_BTN =
  'px-3.5 py-1.5 rounded-card border border-line text-[11px] font-semibold cursor-pointer bg-card text-ink-soft hover:bg-paper transition-colors';

// ══════════════════════════════════════════════════════════════════════════════
// TAB 4 — TOP USERS
// ══════════════════════════════════════════════════════════════════════════════

const UsersTab: React.FC<{
  users: TopUser[];
  metrics: UserMetrics | null;
}> = ({ users, metrics }) => {
  const [search, setSearch] = useState('');
  const [sortCol, setSortCol] = useState<'name' | 'tests' | 'koris' | 'lastActivity'>('tests');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(0);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const PAGE_SIZE = 20;

  const toggleSort = (col: typeof sortCol) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('desc'); }
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    let list = users;
    if (q) list = list.filter(u => u.name.toLowerCase().includes(q));

    list = [...list].sort((a, b) => {
      let cmp = 0;
      switch (sortCol) {
        case 'name': cmp = a.name.localeCompare(b.name); break;
        case 'tests': cmp = a.completedTests - b.completedTests; break;
        case 'koris': cmp = a.korisSpent - b.korisSpent; break;
        case 'lastActivity':
          cmp = (a.lastActivityRaw?.getTime() ?? 0) - (b.lastActivityRaw?.getTime() ?? 0);
          break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return list;
  }, [users, search, sortCol, sortDir]);

  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const arrow = (col: typeof sortCol) => sortCol === col ? (sortDir === 'asc' ? ' ↑' : ' ↓') : '';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Metrics */}
      {metrics && (
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <KpiCard icon={<Trophy className="h-[18px] w-[18px]" />} value={metrics.completeProfiles} label="Profils complets" sub="Tous tests faits" color="#059669" />
          <KpiCard icon={<BarChart3 className="h-[18px] w-[18px]" />} value={metrics.avgTestsPerUser} label="Tests moy./user" color="#3B82F6" />
          <KpiCard icon={<Moon className="h-[18px] w-[18px]" />} value={metrics.inactiveUsers30d} label="Inactifs 30j+" color="#94A3B8" />
        </div>
      )}

      {/* Search */}
      <div style={{ position: 'relative' }}>
        <input
          type="text"
          placeholder="Rechercher un utilisateur..."
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(0); }}
          style={{
            width: '100%',
            padding: '10px 14px 10px 36px',
            borderRadius: 10,
            border: '1px solid #E2E8F0',
            fontSize: 13,
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />
        <Search style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} className="h-3.5 w-3.5 text-gray-400" />
      </div>

      {/* Table */}
      <div style={{ background: 'white', borderRadius: 14, border: '1px solid rgba(0,0,0,0.06)', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #F1F5F9', background: '#FAFBFC' }}>
                <th style={{ ...thStyle, width: 36, textAlign: 'center' }}>#</th>
                <th onClick={() => toggleSort('name')} style={thStyle}>Nom{arrow('name')}</th>
                <th style={{ ...thStyle, textAlign: 'center' }}>Inscrit le</th>
                <th onClick={() => toggleSort('tests')} style={{ ...thStyle, textAlign: 'center' }}>Tests{arrow('tests')}</th>
                <th onClick={() => toggleSort('koris')} style={{ ...thStyle, textAlign: 'center' }}>Koris dep.{arrow('koris')}</th>
                <th onClick={() => toggleSort('lastActivity')} style={{ ...thStyle, textAlign: 'center' }}>Derniere activite{arrow('lastActivity')}</th>
              </tr>
            </thead>
            <tbody>
              {paged.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 24, color: '#94A3B8' }}>Aucun utilisateur trouve</td></tr>
              ) : paged.map((user, i) => (
                <tr
                  key={user.id}
                  onClick={() => setSelectedUserId(user.id)}
                  style={{
                    borderBottom: '1px solid #F8FAFC',
                    cursor: 'pointer',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#F8FAFC')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <td style={{ textAlign: 'center', padding: '8px 6px', color: '#94A3B8', fontWeight: 700, fontSize: 11 }}>
                    {page * PAGE_SIZE + i + 1}
                  </td>
                  <td style={{ padding: '8px 6px', fontWeight: 600, color: '#0A2342' }}>
                    {user.name}
                    <span style={{ marginLeft: 6, fontSize: 10, color: '#94A3B8' }}>{user.authProvider}</span>
                  </td>
                  <td style={{ textAlign: 'center', padding: '8px 6px', color: '#64748B' }}>{user.registeredAt}</td>
                  <td style={{ textAlign: 'center', padding: '8px 6px', fontWeight: 700, color: '#0D9488' }}>{user.completedTests}</td>
                  <td style={{ textAlign: 'center', padding: '8px 6px', color: '#D97706', fontWeight: 600 }}>◉ {user.korisSpent}</td>
                  <td style={{ textAlign: 'center', padding: '8px 6px', color: '#64748B', fontSize: 11 }}>{user.lastActivity}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 16px', borderTop: '1px solid #F1F5F9' }}>
            <span style={{ fontSize: 11, color: '#94A3B8' }}>
              Affichage {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filtered.length)} sur {filtered.length}
            </span>
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
                style={{ ...paginationBtn, opacity: page === 0 ? 0.4 : 1 }}>← Precedent</button>
              <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
                style={{ ...paginationBtn, opacity: page >= totalPages - 1 ? 0.4 : 1 }}>Suivant →</button>
            </div>
          </div>
        )}
      </div>

      {/* User detail slide-in panel */}
      {selectedUserId && (
        <UserDetailPanel userId={selectedUserId} onClose={() => setSelectedUserId(null)} />
      )}
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// USER DETAIL SLIDE-IN PANEL
// ══════════════════════════════════════════════════════════════════════════════

const UserDetailPanel: React.FC<{ userId: string; onClose: () => void }> = ({ userId, onClose }) => {
  const [detail, setDetail] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getUserDetail(userId)
      .then(setDetail)
      .finally(() => setLoading(false));
  }, [userId]);

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.25)',
          zIndex: 40, backdropFilter: 'blur(2px)',
        }}
      />

      {/* Panel */}
      <div style={{
        position: 'fixed', right: 0, top: 0, height: '100%',
        width: 'min(400px, 90vw)',
        background: 'white',
        boxShadow: '-8px 0 32px rgba(0,0,0,0.12)',
        zIndex: 50,
        overflowY: 'auto',
        animation: 'slideInRight 0.25s ease-out',
        fontFamily: "'Inter', -apple-system, sans-serif",
      }}>
        {/* Header */}
        <div style={{
          position: 'sticky', top: 0, background: 'white', zIndex: 1,
          padding: '16px 20px', borderBottom: '1px solid #F1F5F9',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', padding: 4, color: '#64748B' }}
          >←</button>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#0A2342' }}>Detail utilisateur</span>
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
            <div style={{
              width: 32, height: 32, border: '3px solid #E2E8F0',
              borderTop: '3px solid #3B82F6', borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
            }} />
          </div>
        ) : !detail ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#94A3B8' }}>Utilisateur non trouve</div>
        ) : (
          <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Identity */}
            <div>
              <h3 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 800, color: '#0A2342', display: 'flex', alignItems: 'center', gap: 6 }}>
                <User className="h-4 w-4" /> {detail.name}
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, color: '#64748B' }}>
                {detail.phone !== '—' && <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Phone className="h-3 w-3" /> {detail.phone}</div>}
                {detail.email !== '—' && <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Mail className="h-3 w-3" /> {detail.email}</div>}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Calendar className="h-3 w-3" /> Inscrit le {detail.registeredAt}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><KeyRound className="h-3 w-3" /> {detail.authProvider}</div>
              </div>
            </div>

            <hr style={{ border: 'none', borderTop: '1px solid #F1F5F9', margin: 0 }} />

            {/* Progress */}
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#0A2342', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                <BarChart3 className="h-3.5 w-3.5" /> Progression : {detail.completedTests}/{detail.totalScales} tests
              </div>
              <div style={{
                height: 8, borderRadius: 4, background: '#F1F5F9', overflow: 'hidden',
              }}>
                <div style={{
                  height: '100%',
                  width: `${Math.min(100, (detail.completedTests / detail.totalScales) * 100)}%`,
                  background: '#4A5D57',
                  borderRadius: 4,
                  transition: 'width 0.5s',
                }} />
              </div>
              <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 4 }}>
                {Math.round((detail.completedTests / detail.totalScales) * 100)}%
              </div>
            </div>

            <hr style={{ border: 'none', borderTop: '1px solid #F1F5F9', margin: 0 }} />

            {/* Koris */}
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#0A2342', marginBottom: 8 }}>◉ Koris</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, fontSize: 12 }}>
                <div style={{ color: '#64748B' }}>Solde actuel</div>
                <div style={{ fontWeight: 700, color: '#D97706' }}>◉ {detail.korisBalance}</div>
                <div style={{ color: '#64748B' }}>Total depense</div>
                <div style={{ fontWeight: 700, color: '#DC2626' }}>◉ {detail.korisSpent}</div>
                <div style={{ color: '#64748B' }}>Total gagne</div>
                <div style={{ fontWeight: 700, color: '#059669' }}>◉ {detail.korisEarned}</div>
              </div>
            </div>

            <hr style={{ border: 'none', borderTop: '1px solid #F1F5F9', margin: 0 }} />

            {/* Tests */}
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#0A2342', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                <ClipboardList className="h-3.5 w-3.5" /> Tests completes ({detail.tests.length})
              </div>
              {detail.tests.length === 0 ? (
                <p style={{ fontSize: 12, color: '#94A3B8' }}>Aucun test complete</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {detail.tests.map(t => (
                    <div key={t.scaleId} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '6px 8px', borderRadius: 8, background: '#F8FAFC', fontSize: 11,
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span>{t.icon}</span>
                        <span style={{ fontWeight: 600, color: '#334155' }}>{t.scaleName}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ color: '#475569' }}>
                          {t.score}{t.maxScore > 0 ? `/${t.maxScore}` : ''}
                        </span>
                        <span style={{
                          padding: '1px 6px', borderRadius: 6, fontWeight: 700, fontSize: 9,
                          color: severityColor(t.severity),
                          background: `${severityColor(t.severity)}15`,
                        }}>{t.label}</span>
                        <span style={{ color: '#94A3B8', fontSize: 10 }}>{t.completedAt}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <hr style={{ border: 'none', borderTop: '1px solid #F1F5F9', margin: 0 }} />

            {/* Recent activity */}
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#0A2342', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Clock className="h-3.5 w-3.5" /> Activite recente
              </div>
              {detail.recentActivity.length === 0 ? (
                <p style={{ fontSize: 12, color: '#94A3B8' }}>Aucune activite recente</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {detail.recentActivity.map((a, i) => (
                    <div key={i} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '5px 8px', borderRadius: 8, fontSize: 11,
                      background: a.type === 'spend' ? '#FEF2F2' : a.type === 'refill' ? '#F0FDF4' : '#F8FAFC',
                    }}>
                      <span style={{ color: '#334155' }}>{a.details || a.feature}</span>
                      <span style={{
                        fontWeight: 700, fontSize: 10,
                        color: a.type === 'spend' ? '#DC2626' : '#059669',
                      }}>
                        {a.type === 'spend' ? '−' : '+'}{a.amount}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════════════════

const AdminEvaluations: React.FC = () => {
  const [activeTab, setActiveTab] = useState<SubTab>('overview');
  const [stats, setStats] = useState<EvaluationStats | null>(null);
  const [weeklySignups, setWeeklySignups] = useState<WeeklySignup[]>([]);
  const [dailyTests, setDailyTests] = useState<DailyTests[]>([]);
  const [popularity, setPopularity] = useState<TestPop[]>([]);
  const [avgScores, setAvgScores] = useState<AverageScore[]>([]);
  const [alerts, setAlerts] = useState<AnonymousAlert[]>([]);
  const [allUsers, setAllUsers] = useState<TopUser[]>([]);
  const [userMetrics, setUserMetrics] = useState<UserMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [initializing, setInitializing] = useState(false);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    setLoading(true);
    setError('');
    try {
      let evalStats = await getEvaluationStats();
      if (!evalStats) {
        setInitializing(true);
        evalStats = await computeEvaluationStatsFromRaw();
        await saveEvaluationStats(evalStats);
        setInitializing(false);
      }
      setStats(evalStats);
      setPopularity(getTestPopularity(evalStats.testCounts));

      const [signups, tests, scores, recentAlerts, users] = await Promise.all([
        getSignupsByWeek(),
        getTestsByDay(),
        getAverageScores(),
        getRecentAlerts(50), // Load more alerts for the dedicated tab
        getAllUsersForAdmin(),
      ]);

      setWeeklySignups(signups);
      setDailyTests(tests);
      setAvgScores(scores);
      setAlerts(recentAlerts);
      setAllUsers(users);

      // Compute user metrics from loaded data
      const metrics = await getUserMetrics(users);
      setUserMetrics(metrics);
    } catch (e: unknown) {
      console.error('Dashboard load error:', e);
      setError((e as Error)?.message || 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshStats = async () => {
    setInitializing(true);
    try {
      const fresh = await computeEvaluationStatsFromRaw();
      await saveEvaluationStats(fresh);
      setStats(fresh);
      setPopularity(getTestPopularity(fresh.testCounts));
    } catch (e: unknown) {
      setError((e as Error)?.message || 'Erreur');
    } finally {
      setInitializing(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{
              width: 40, height: 40, border: '3px solid #E2E8F0',
              borderTop: '3px solid #3B82F6', borderRadius: '50%',
              animation: 'spin 0.8s linear infinite', margin: '0 auto 12px',
            }} />
            <p style={{ color: '#64748B', fontSize: 14 }}>
              {initializing ? 'Initialisation des statistiques...' : 'Chargement...'}
            </p>
          </div>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout>
        <div style={{ textAlign: 'center', padding: 40 }}>
          <p style={{ color: '#DC2626', marginBottom: 12 }}>{error}</p>
          <button onClick={loadDashboard} style={{
            padding: '8px 20px', borderRadius: 10, border: 'none',
            background: '#3B82F6', color: 'white', fontWeight: 600, cursor: 'pointer',
          }}>Reessayer</button>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#0A2342' }}>
              Tableau de bord Evaluations
            </h2>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: '#64748B' }}>
              Statistiques anonymes Health-e 2.0
            </p>
          </div>
          <button
            onClick={handleRefreshStats}
            disabled={initializing}
            style={{
              padding: '6px 14px', borderRadius: 8, border: '1px solid rgba(59,130,246,0.2)',
              background: 'rgba(59,130,246,0.05)', color: '#3B82F6', fontWeight: 600,
              fontSize: 12, cursor: initializing ? 'not-allowed' : 'pointer',
              opacity: initializing ? 0.5 : 1,
            }}
          >
            {initializing ? 'Recalcul...' : 'Recalculer'}
          </button>
        </div>

        {/* Sub-tab navigation */}
        <SubTabNav active={activeTab} onChange={setActiveTab} />

        {/* Tab content */}
        {activeTab === 'overview' && stats && (
          <OverviewTab
            stats={stats}
            weeklySignups={weeklySignups}
            dailyTests={dailyTests}
            popularity={popularity}
            alerts={alerts}
            onNavigate={setActiveTab}
          />
        )}

        {activeTab === 'tests' && (
          <TestsTab
            popularity={popularity}
            avgScores={avgScores}
            dailyTests={dailyTests}
          />
        )}

        {activeTab === 'alerts' && stats && (
          <AlertsTab alerts={alerts} stats={stats} />
        )}

        {activeTab === 'users' && (
          <UsersTab users={allUsers} metrics={userMetrics} />
        )}

        {/* Koris section — always visible at bottom */}
        <div style={{ marginTop: 16 }}>
          <AdminKorisSection />
        </div>

        {/* Footer */}
        <p style={{ fontSize: 10, color: '#94A3B8', textAlign: 'center', margin: '4px 0 0' }}>
          Donnees anonymes.
          {stats?.lastUpdated && (
            <> · Maj : {new Date(stats.lastUpdated).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</>
          )}
        </p>
      </div>
    </AdminLayout>
  );
};

export default AdminEvaluations;
