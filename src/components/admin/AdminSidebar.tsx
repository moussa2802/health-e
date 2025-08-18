import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  UserCheck,
  Calendar, 
  BarChart2, 
  FileText, 
  MessageSquare,
  Users2,
  ShieldCheck
} from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

const AdminSidebar = () => {
  const location = useLocation();
  const { language } = useLanguage();

  const menuItems = [
    { 
      path: '/admin/dashboard', 
      icon: LayoutDashboard, 
      label: language === 'fr' ? 'Tableau de bord' : 'Dashboard' 
    },
    { 
      path: '/admin/users', 
      icon: Users, 
      label: language === 'fr' ? 'Utilisateurs' : 'Users' 
    },
    { 
      path: '/admin/professionals', 
      icon: ShieldCheck, 
      label: language === 'fr' ? 'Professionnels' : 'Professionals' 
    },
    { 
      path: '/admin/patients', 
      icon: UserCheck, 
      label: language === 'fr' ? 'Patients' : 'Patients' 
    },
    { 
      path: '/admin/appointments', 
      icon: Calendar, 
      label: language === 'fr' ? 'Consultations' : 'Appointments' 
    },
    { 
      path: '/admin/statistics', 
      icon: BarChart2, 
      label: language === 'fr' ? 'Statistiques' : 'Statistics' 
    },
    { 
      path: '/admin/content', 
      icon: FileText, 
      label: language === 'fr' ? 'Contenu' : 'Content' 
    },
    { 
      path: '/admin/messages', 
      icon: MessageSquare, 
      label: language === 'fr' ? 'Messagerie' : 'Messages' 
    },
    { 
      path: '/admin/support', 
      icon: MessageSquare, 
      label: language === 'fr' ? 'Support' : 'Support' 
    },
    // Item externe pour Health-eShare intégré dans le menu principal
    {
      path: 'https://health-eshare.netlify.app/',
      icon: Users2,
      label: language === 'fr' ? 'Collaborateurs' : 'Collaborators',
      external: true,
      highlight: true
    }
  ];

  return (
    <aside className="h-full pt-16">
      <nav className="mt-8">
        <ul className="space-y-2 px-4">
          {menuItems.map(({ path, icon: Icon, label, external, highlight }) => {
            // Vérifier si c'est un lien externe
            const isExternal = external && path.startsWith('http');
            
            if (isExternal) {
              return (
                <li key={path}>
                  <a
                    href={path}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                      highlight 
                        ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 shadow-md' 
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className={`h-5 w-5 ${highlight ? 'text-white' : ''}`} />
                    <span className="font-medium">{label}</span>
                    <svg className="h-4 w-4 ml-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    {highlight && (
                      <span className="ml-2 px-2 py-1 bg-white bg-opacity-20 rounded-full text-xs font-medium">
                        Nouveau
                      </span>
                    )}
                  </a>
                </li>
              );
            }
            
            return (
              <li key={path}>
                <Link
                  to={path}
                  className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                    location.pathname === path
                      ? 'bg-blue-50 text-blue-600'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span>{label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
};

export default AdminSidebar;