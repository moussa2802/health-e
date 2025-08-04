import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  UserCheck,
  Calendar, 
  BarChart2, 
  FileText, 
  MessageSquare 
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
    }
  ];

  return (
    <aside className="h-full pt-16">
      <nav className="mt-8">
        <ul className="space-y-2 px-4">
          {menuItems.map(({ path, icon: Icon, label }) => (
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
          ))}
        </ul>
      </nav>
    </aside>
  );
};

export default AdminSidebar;