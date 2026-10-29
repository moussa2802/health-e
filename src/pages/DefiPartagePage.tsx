import '../components/accueil/accueil.css';
import PageHeader from '../components/ui/PageHeader';
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { Copy, Check, Share2, ExternalLink, PartyPopper } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../utils/firebase';
import { useAuth } from '../contexts/AuthContext';

const DefiPartagePage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [copied, setCopied] = useState(false);
  const [titre, setTitre] = useState('Mon défi');

  const defiUrl = `https://health-e.sn/api/d/${slug}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(defiUrl);
      setCopied(true);
    } catch {
      const el = document.createElement('textarea');
      el.value = defiUrl;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
    }
  };

  useEffect(() => {
    if (!slug) return;
    getDoc(doc(db, 'defis', slug))
      .then(snap => {
        if (snap.exists() && snap.data().titre) setTitre(snap.data().titre);
      })
      .catch(() => {});
  }, [slug]);

  useEffect(() => {
    if (copied) {
      const t = setTimeout(() => setCopied(false), 2500);
      return () => clearTimeout(t);
    }
  }, [copied]);

  if (!isAuthenticated) return <Navigate to="/patient/access" replace />;
  if (!slug) return <Navigate to="/defi" replace />;

  const whatsappText = encodeURIComponent(
    `Kan moo ma gën a xam ? Penses-tu bien me connaître ? Prouve-le ici : ${defiUrl}`
  );

  return (
    <div className="min-h-screen bg-paper drl-screen drl-page">
      <PageHeader onBack={() => navigate('/defi', { replace: true })} title={titre} />

      <div className="max-w-[600px] mx-auto px-5 py-8 flex flex-col items-center gap-6">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-gold-soft flex items-center justify-center mx-auto mb-3"><PartyPopper size={28} className="text-gold" aria-hidden="true" /></div>
          <h2 className="font-display text-xl font-semibold text-ink m-0 mb-1">
            Ton défi est lancé !
          </h2>
          <p className="text-[14px] text-muted m-0">
            Partage le lien avec tes proches pour savoir qui te connaît le mieux
          </p>
        </div>

        {/* Link display */}
        <div className="w-full rounded-[14px] border border-line bg-white p-4">
          <p className="text-[13px] font-bold uppercase tracking-[0.1em] text-muted m-0 mb-2">
            Lien du défi
          </p>
          <p className="text-[15px] text-ink font-medium m-0 break-all select-all">
            {defiUrl}
          </p>
        </div>

        {/* Actions */}
        <div className="w-full flex flex-col gap-3">
          <button
            onClick={handleCopy}
            className="w-full py-3.5 rounded-[14px] border-none bg-gold text-white text-[15px] font-bold cursor-pointer shadow-soft flex items-center justify-center gap-2"
          >
            {copied ? (
              <>
                <Check size={16} />
                Lien copié !
              </>
            ) : (
              <>
                <Copy size={16} />
                Copier le lien
              </>
            )}
          </button>

          <a
            href={`https://wa.me/?text=${whatsappText}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-3.5 rounded-[14px] border-2 border-[#25D366] bg-white text-[#25D366] text-[15px] font-bold cursor-pointer flex items-center justify-center gap-2 no-underline"
          >
            <Share2 size={16} />
            Partager via WhatsApp
          </a>

          <button
            onClick={() => navigate(`/defi/${slug}/suivi`)}
            className="w-full py-3 rounded-[14px] border border-line bg-white text-ink text-[14px] font-medium cursor-pointer flex items-center justify-center gap-2"
          >
            <ExternalLink size={14} />
            Suivre les réponses
          </button>
        </div>
      </div>
    </div>
  );
};

export default DefiPartagePage;
