/**
 * ProApplyPage — /espace-pro/rejoindre : un professionnel de santé demande à rejoindre l'Espace pro.
 * Dr Lô vérifie (numéro d'inscription ou diplôme) puis valide ; ensuite le pro crée librement ses chaînes.
 */
import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import DrLoShell, { DC, card, usePalette } from '../../components/accueil/DrLoShell';
import { useAuth } from '../../contexts/AuthContext';
import { applyPro, getProMe, PROFESSIONS, type ProMe } from '../../services/proService';

const field: React.CSSProperties = { width: '100%', boxSizing: 'border-box', borderRadius: 14, border: `1px solid ${DC.line}`, background: 'rgba(255,255,255,.06)', padding: '12px 14px', fontFamily: 'inherit', fontSize: 16, color: DC.text, outline: 'none' };
const lab: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, fontWeight: 700, color: DC.soft };
const h1: React.CSSProperties = { margin: '6px 0 0', fontFamily: 'Fraunces, serif', fontSize: 28, lineHeight: 1.2, fontWeight: 600, color: DC.title };

const ProApplyPage: React.FC = () => {
  const palette = usePalette();
  const navigate = useNavigate();
  const { authReady, isAuthenticated } = useAuth();
  const [me, setMe] = useState<ProMe | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [f, setF] = useState({ fullName: '', profession: '', title: '', license: '', city: '', bio: '' });

  useEffect(() => { if (authReady && !isAuthenticated) navigate(`/patient/access?returnTo=${encodeURIComponent('/espace-pro/rejoindre')}`, { replace: true }); }, [authReady, isAuthenticated, navigate]);
  useEffect(() => { if (isAuthenticated) getProMe().then(setMe).catch(e => setError(e instanceof Error ? e.message : 'Erreur')); }, [isAuthenticated]);
  if (!authReady || !isAuthenticated) return null;

  const set = (k: keyof typeof f, v: string) => { setF(x => ({ ...x, [k]: v })); setError(''); };
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setError('');
    try { await applyPro(f); setMe(await getProMe()); } catch (er) { setError(er instanceof Error ? er.message : 'Erreur'); } finally { setBusy(false); }
  };
  const app = me?.application;
  const showForm = me && me.role === 'none' && !me.suspended && (!app || app.status === 'rejected');

  return (
    <DrLoShell back={{ to: '/equipe', label: 'Accès équipe' }} palette={palette}>
      <p style={{ margin: '18px 0 0', fontSize: 13, letterSpacing: '.14em', textTransform: 'uppercase', color: palette.accent, fontWeight: 700 }}>Espace pro</p>
      <h1 style={h1}>Rejoindre Health-e en tant que professionnel</h1>
      <p style={{ margin: '10px 0 0', fontSize: 15, color: DC.soft, lineHeight: 1.55 }}>
        Psychologue, médecin, sage-femme, sexologue… Une fois ton profil vérifié par Dr Lô, tu crées tes chaînes et tu animes tes propres discussions avec la communauté. Tu ne vois jamais les résultats de tests des membres.
      </p>

      {!me && !error && <Loader2 className="animate-spin" style={{ marginTop: 20 }} aria-label="Chargement" />}
      {me && (me.role === 'owner' || me.role === 'pro') && (
        <section style={{ ...card, marginTop: 16 }}>
          <p style={{ margin: 0, fontSize: 15, color: DC.text }}>Ton accès à l'Espace pro est actif.</p>
          <Link to="/drlo" style={{ display: 'inline-flex', marginTop: 12, minHeight: 44, padding: '0 16px', alignItems: 'center', borderRadius: 999, background: palette.primary, color: DC.ink, fontWeight: 700, textDecoration: 'none' }}>Ouvrir l'Espace pro</Link>
        </section>
      )}
      {me?.suspended && <section style={{ ...card, marginTop: 16 }}><p style={{ margin: 0, fontSize: 15, color: DC.text }}>Ton accès pro est suspendu. Écris à Dr Lô pour en parler.</p></section>}
      {app?.status === 'pending' && (
        <section style={{ ...card, marginTop: 16, borderColor: 'rgba(242,182,109,.5)' }}>
          <p style={{ margin: 0, fontSize: 15, color: DC.text, lineHeight: 1.5 }}>Ta demande est en cours de vérification. Tu recevras une notification dès qu'elle est validée.</p>
        </section>
      )}
      {app?.status === 'rejected' && (
        <section style={{ ...card, marginTop: 16 }}>
          <p style={{ margin: 0, fontSize: 15, color: DC.text, lineHeight: 1.5 }}>Ta demande n'a pas été validée.{app.rejectReason ? ` Raison : ${app.rejectReason}` : ''} Tu peux la compléter et la renvoyer.</p>
        </section>
      )}

      {showForm && (
        <form onSubmit={submit} style={{ ...card, marginTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <label style={lab}>Nom complet<input value={f.fullName} maxLength={60} onChange={e => set('fullName', e.target.value)} autoComplete="name" className="drl-input" style={field} /></label>
          <label style={lab}>Profession
            <select value={f.profession} onChange={e => set('profession', e.target.value)} style={{ ...field, minHeight: 48 }}>
              <option value="">Choisis…</option>
              {PROFESSIONS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
            </select>
          </label>
          <label style={lab}>Titre affiché (facultatif)<input value={f.title} maxLength={60} onChange={e => set('title', e.target.value)} placeholder="Ex. : Psychologue clinicienne" className="drl-input" style={field} /></label>
          <label style={lab}>Numéro d'inscription à l'ordre ou diplôme<input value={f.license} maxLength={80} onChange={e => set('license', e.target.value)} className="drl-input" style={field} /></label>
          <label style={lab}>Ville<input value={f.city} maxLength={40} onChange={e => set('city', e.target.value)} className="drl-input" style={field} /></label>
          <label style={lab}>Présente-toi en quelques phrases<textarea value={f.bio} maxLength={600} rows={4} onChange={e => set('bio', e.target.value)} className="drl-input" style={{ ...field, resize: 'vertical' }} /></label>
          <p style={{ margin: 0, fontSize: 13, color: DC.faint, lineHeight: 1.5 }}>Ces informations servent seulement à la vérification. Ton nom, ton titre et ta présentation seront visibles sur tes chaînes.</p>
          {error && <p role="alert" style={{ margin: 0, color: '#F09A7A', fontSize: 14 }}>{error}</p>}
          <button type="submit" disabled={busy} className="drl-btn" style={{ minHeight: 50, borderRadius: 999, border: 0, background: palette.primary, color: DC.ink, fontSize: 16, fontWeight: 700, cursor: 'pointer' }}>
            {busy ? <Loader2 size={18} className="animate-spin" aria-label="Envoi" /> : 'Envoyer ma demande'}
          </button>
        </form>
      )}
      {!showForm && error && <p role="alert" style={{ marginTop: 14, color: '#F09A7A', fontSize: 14 }}>{error}</p>}
    </DrLoShell>
  );
};

export default ProApplyPage;
