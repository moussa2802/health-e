import { useState, useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { ArrowLeft, ChevronRight, Users } from 'lucide-react';
import { db } from '../utils/firebase';
import { useAuth } from '../contexts/AuthContext';

interface MeDefi {
  slug: string;
  displayName: string;
  createdAt: unknown;
  expiresAt?: unknown;
  titre?: string;
  audience?: string;
}

function toDate(val: unknown): Date {
  if (!val) return new Date(0);
  if (typeof val === 'object' && val !== null && 'toDate' in val) return (val as { toDate: () => Date }).toDate();
  return new Date(val as string | number);
}

const DefiMesDefisPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, isAuthenticated, authReady } = useAuth();

  const [defis, setDefis] = useState<MeDefi[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) return;
    const q = query(
      collection(db, 'userProfiles', currentUser.id, 'mesDefis'),
      orderBy('createdAt', 'desc'),
    );
    getDocs(q)
      .then(snap => {
        setDefis(snap.docs.map(d => ({ slug: d.id, ...d.data() } as MeDefi)));
      })
      .catch(() => setDefis([]))
      .finally(() => setLoading(false));
  }, [currentUser?.id]);

  if (!authReady) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-[3px] border-line border-t-gold animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) return <Navigate to="/patient/access" replace />;

  return (
    <div className="min-h-screen bg-paper">
      <div className="sticky top-0 z-20 bg-paper/95 backdrop-blur-md border-b border-line">
        <div className="max-w-[600px] mx-auto px-5 py-3.5 flex items-center gap-3">
          <button onClick={() => navigate('/defi')} className="p-0 border-none bg-transparent cursor-pointer text-ink">
            <ArrowLeft size={20} />
          </button>
          <h1 className="font-display text-[18px] font-semibold text-ink m-0">Mes défis</h1>
        </div>
      </div>

      <div className="max-w-[600px] mx-auto px-5 py-6">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-10 h-10 rounded-full border-[3px] border-line border-t-gold animate-spin" />
          </div>
        ) : defis.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-3">🎯</div>
            <p className="text-ink font-medium text-[15px] m-0 mb-2">Tu n'as pas encore lancé de défi</p>
            <p className="text-muted text-sm m-0 mb-5">Découvre qui te connaît le mieux !</p>
            <button
              onClick={() => navigate('/defi/creer')}
              className="px-6 py-3 rounded-[14px] border-none bg-gold text-white text-[15px] font-bold cursor-pointer shadow-soft"
            >
              Lancer mon premier défi
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {defis.map(d => {
              const created = toDate(d.createdAt);
              const expired = d.expiresAt ? toDate(d.expiresAt).getTime() <= Date.now() : false;
              return (
                <button
                  key={d.slug}
                  onClick={() => navigate(`/defi/${d.slug}/suivi`)}
                  className="w-full bg-card border border-line rounded-2xl p-4 cursor-pointer text-left flex items-center gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-ink m-0 truncate">
                      {d.titre || `Défi de ${d.displayName}`}
                    </p>
                    <p className="text-xs text-muted m-0 mt-1">
                      {created.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                      {expired && <span className="ml-2 text-xs text-muted">· Terminé</span>}
                    </p>
                  </div>
                  <ChevronRight size={16} className="text-muted flex-shrink-0" />
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default DefiMesDefisPage;
