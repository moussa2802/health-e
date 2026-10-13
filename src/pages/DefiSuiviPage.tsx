import { useState, useEffect } from 'react';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { doc, onSnapshot, getDoc } from 'firebase/firestore';
import { ArrowLeft, Copy, Check, Clock, Share2 } from 'lucide-react';
import { db } from '../utils/firebase';
import { useAuth } from '../contexts/AuthContext';

interface ClassementEntry {
  pseudo: string;
  score: number;
  tempsServeur: number;
  respondedAt: unknown;
}

interface DefiLive {
  displayName: string;
  genre: string;
  nbReponses: number;
  scoreMoyen: number;
  classement: ClassementEntry[];
  expiresAt: unknown;
}

function toDate(val: unknown): Date {
  if (!val) return new Date(0);
  if (typeof val === 'object' && val !== null && 'toDate' in val) return (val as { toDate: () => Date }).toDate();
  return new Date(val as string | number);
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return 'Terminé';
  const h = Math.floor(ms / 3_600_000);
  const d = Math.floor(h / 24);
  const rh = h % 24;
  if (d > 0) return `${d} j ${rh} h`;
  const m = Math.floor((ms % 3_600_000) / 60_000);
  if (h > 0) return `${h} h ${m} min`;
  return `${m} min`;
}

const MEDAL = ['🥇', '🥈', '🥉'];

const DefiSuiviPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { currentUser, isAuthenticated, loading: authLoading } = useAuth();

  const [defi, setDefi] = useState<DefiLive | null>(null);
  const [isOwner, setIsOwner] = useState<boolean | null>(null);
  const [copied, setCopied] = useState(false);
  const [countdown, setCountdown] = useState('');

  useEffect(() => {
    if (!currentUser || !slug) return;
    getDoc(doc(db, 'userProfiles', currentUser.id, 'mesDefis', slug))
      .then(snap => setIsOwner(snap.exists()))
      .catch(() => setIsOwner(false));
  }, [currentUser?.id, slug]);

  useEffect(() => {
    if (!slug || isOwner === false) return;
    const unsub = onSnapshot(doc(db, 'defis', slug), snap => {
      if (!snap.exists()) return;
      setDefi(snap.data() as DefiLive);
    });
    return unsub;
  }, [slug, isOwner]);

  useEffect(() => {
    if (!defi) return;
    const update = () => {
      const exp = toDate(defi.expiresAt);
      setCountdown(formatCountdown(exp.getTime() - Date.now()));
    };
    update();
    const id = setInterval(update, 60_000);
    return () => clearInterval(id);
  }, [defi]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-[3px] border-line border-t-gold animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) return <Navigate to="/patient/access" replace />;
  if (isOwner === false) return <Navigate to={`/api/d/${slug}`} replace />;
  if (!defi || isOwner === null) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-[3px] border-line border-t-gold animate-spin" />
      </div>
    );
  }

  const expired = toDate(defi.expiresAt).getTime() <= Date.now();
  const classement = defi.classement || [];
  const nbReponses = defi.nbReponses || 0;
  const scoreMoyen = defi.scoreMoyen || 0;
  const shareUrl = `https://health-e.sn/api/d/${slug}`;
  const winner = classement[0];

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
    } catch {
      const el = document.createElement('textarea');
      el.value = shareUrl;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
    }
    setTimeout(() => setCopied(false), 2000);
  };

  const whatsappText = encodeURIComponent(
    `Kan moo ma gën a xam ? 👀 Réponds à mon défi et montre que tu me connais 👉 ${shareUrl}`
  );

  return (
    <div className="min-h-screen bg-paper">
      <div className="sticky top-0 z-20 bg-paper/95 backdrop-blur-md border-b border-line">
        <div className="max-w-[600px] mx-auto px-5 py-3.5 flex items-center gap-3">
          <button onClick={() => navigate('/defi')} className="p-0 border-none bg-transparent cursor-pointer text-ink">
            <ArrowLeft size={20} />
          </button>
          <h1 className="font-display text-[18px] font-semibold text-ink m-0">Suivi du défi</h1>
        </div>
      </div>

      <div className="max-w-[600px] mx-auto px-5 py-6">
        {/* Header */}
        <div className="text-center mb-6">
          <h2 className="font-display text-xl font-semibold text-ink m-0 mb-1">
            Kan moo ma gën a xam ?
          </h2>
          <div className="flex items-center justify-center gap-2 mt-2">
            <Clock size={14} className={expired ? 'text-muted' : 'text-gold'} />
            <span className={`text-sm font-medium ${expired ? 'text-muted' : 'text-gold'}`}>
              {expired ? 'Terminé' : `Se termine dans ${countdown}`}
            </span>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-card border border-line rounded-2xl p-4 text-center">
            <div className="text-3xl font-display font-bold text-ink">{nbReponses}</div>
            <div className="text-xs text-muted mt-1">
              {nbReponses <= 1 ? 'proche a répondu' : 'proches ont répondu'}
            </div>
          </div>
          <div className="bg-card border border-line rounded-2xl p-4 text-center">
            <div className="text-3xl font-display font-bold text-gold">{scoreMoyen} %</div>
            <div className="text-xs text-muted mt-1">score moyen</div>
          </div>
        </div>

        {/* Winner banner (défi terminé) */}
        {expired && winner && (
          <div
            className="rounded-2xl p-5 mb-6 text-center"
            style={{ background: 'linear-gradient(160deg, #2A2520 0%, #3D352C 100%)' }}
          >
            <div className="text-3xl mb-2">👑</div>
            <p className="text-[15px] font-bold text-[#F4F1E9] m-0">
              {winner.pseudo} te connaît le mieux !
            </p>
            <p className="text-[13px] text-gold/80 m-0 mt-1">{winner.score} %</p>
          </div>
        )}

        {/* Classement */}
        {classement.length > 0 ? (
          <div className="mb-6">
            <h3 className="text-sm font-bold text-ink m-0 mb-3">
              Classement {nbReponses > 50 ? `(top 50 sur ${nbReponses})` : ''}
            </h3>
            <div className="bg-card border border-line rounded-2xl overflow-hidden divide-y divide-line">
              {classement.map((entry, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-3">
                  <span className="text-lg w-8 text-center flex-shrink-0">
                    {i < 3 ? MEDAL[i] : <span className="text-sm text-muted">{i + 1}</span>}
                  </span>
                  <span className="flex-1 text-sm font-medium text-ink truncate">{entry.pseudo}</span>
                  <span className="text-sm font-bold text-gold">{entry.score} %</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-card border border-line rounded-2xl p-6 text-center mb-6">
            <p className="text-muted text-sm m-0 mb-1">Personne n'a encore répondu…</p>
            <p className="text-ink text-sm font-medium m-0">Relance ton lien 👇</p>
          </div>
        )}

        {/* Actions partage */}
        {!expired && (
          <div className="space-y-3 mb-6">
            {nbReponses < 3 && (
              <a
                href={`https://wa.me/?text=${whatsappText}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3.5 rounded-[14px] border-none text-white text-[15px] font-bold flex items-center justify-center gap-2 no-underline"
                style={{ background: '#25D366' }}
              >
                <Share2 size={16} />
                Relancer sur WhatsApp
              </a>
            )}
            <div className="flex gap-2">
              <button
                onClick={handleCopy}
                className="flex-1 py-3 rounded-[14px] border border-line bg-card text-ink text-sm font-medium cursor-pointer flex items-center justify-center gap-2"
              >
                {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                {copied ? 'Copié !' : 'Copier le lien'}
              </button>
              <a
                href={`https://wa.me/?text=${whatsappText}`}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex-1 py-3 rounded-[14px] border-none text-white text-sm font-medium flex items-center justify-center gap-2 no-underline ${nbReponses < 3 ? 'hidden' : ''}`}
                style={{ background: '#25D366' }}
              >
                <Share2 size={14} />
                WhatsApp
              </a>
            </div>
          </div>
        )}

        {/* CTA */}
        {expired ? (
          <button
            onClick={() => navigate('/defi/creer')}
            className="w-full py-3.5 rounded-[14px] border-none bg-gold text-white text-[15px] font-bold cursor-pointer shadow-soft"
          >
            Lancer un nouveau défi
          </button>
        ) : (
          <button
            onClick={() => navigate('/defi/mes-defis')}
            className="w-full py-3 rounded-[14px] border border-line bg-card text-ink text-sm font-medium cursor-pointer"
          >
            Mes défis
          </button>
        )}
      </div>
    </div>
  );
};

export default DefiSuiviPage;
