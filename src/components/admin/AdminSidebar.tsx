import React from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  UserCheck,
  Calendar,
  BarChart2,
  FileText,
  MessageSquare,
  Users2,
  ShieldCheck,
  DollarSign,
  Bell,
  UsersRound,
  ClipboardCheck,
  Coins,
} from "lucide-react";
import { useLanguage } from "../../contexts/LanguageContext";

interface MenuItem {
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  external?: boolean;
  highlight?: boolean;
}

interface MenuSection {
  title: string;
  items: MenuItem[];
}

const AdminSidebar = () => {
  const location = useLocation();
  const { language } = useLanguage();

  const sections: MenuSection[] = [
    {
      title: language === "fr" ? "ÉVALUATIONS" : "EVALUATIONS",
      items: [
        {
          path: "/admin/dashboard",
          icon: LayoutDashboard,
          label: language === "fr" ? "Tableau de bord" : "Dashboard",
        },
        {
          path: "/admin/notifications",
          icon: Bell,
          label: language === "fr" ? "Notifications" : "Notifications",
        },
        {
          path: "/admin/users",
          icon: Users,
          label: language === "fr" ? "Utilisateurs" : "Users",
        },
        {
          path: "/admin/evaluations",
          icon: ClipboardCheck,
          label: language === "fr" ? "Évaluations" : "Evaluations",
        },
        {
          path: "/admin/koris-credit",
          icon: Coins,
          label: language === "fr" ? "Créditer Koris" : "Credit Koris",
        },
        {
          path: "/admin/content",
          icon: FileText,
          label: language === "fr" ? "Contenu" : "Content",
        },
      ],
    },
    {
      title: language === "fr" ? "TÉLÉCONSULTATION" : "TELECONSULTATION",
      items: [
        {
          path: "/admin/professionals",
          icon: ShieldCheck,
          label: language === "fr" ? "Professionnels" : "Professionals",
        },
        {
          path: "/admin/patients",
          icon: UserCheck,
          label: language === "fr" ? "Patients" : "Patients",
        },
        {
          path: "/admin/appointments",
          icon: Calendar,
          label: language === "fr" ? "Consultations" : "Appointments",
        },
        {
          path: "/admin/statistics",
          icon: BarChart2,
          label: language === "fr" ? "Statistiques" : "Statistics",
        },
        {
          path: "/admin/messages",
          icon: MessageSquare,
          label: language === "fr" ? "Messagerie" : "Messages",
        },
        {
          path: "/admin/support",
          icon: MessageSquare,
          label: language === "fr" ? "Support" : "Support",
        },
        {
          path: "/admin/withdrawals",
          icon: DollarSign,
          label: language === "fr" ? "Retraits" : "Withdrawals",
        },
        {
          path: "/admin/group-therapy",
          icon: UsersRound,
          label: language === "fr" ? "Thérapie de groupe" : "Group Therapy",
        },
      ],
    },
  ];

  const externalItem: MenuItem = {
    path: "https://health-eshare.netlify.app/",
    icon: Users2,
    label: language === "fr" ? "Collaborateurs" : "Collaborators",
    external: true,
    highlight: true,
  };

  return (
    <aside className="h-full pt-8 flex flex-col">
      <nav className="mt-4 flex-1 overflow-y-auto">
        <div className="px-4 pb-4">
          {sections.map((section, si) => (
            <div key={section.title} className={si > 0 ? "mt-5" : ""}>
              <p className="text-[10px] font-bold tracking-[0.12em] text-muted uppercase px-4 mb-2">
                {section.title}
              </p>
              <ul className="space-y-1">
                {section.items.map(({ path, icon: Icon, label }) => (
                  <li key={path}>
                    <Link
                      to={path}
                      className={`flex items-center space-x-3 px-4 py-2.5 rounded-card transition-colors ${
                        location.pathname === path
                          ? "bg-accent-soft text-accent"
                          : "text-ink-soft hover:bg-paper"
                      }`}
                    >
                      <Icon className="h-4.5 w-4.5" />
                      <span className="text-sm">{label}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* External link */}
          <div className="mt-5 pt-3 border-t border-line">
            <a
              href={externalItem.path}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-3 px-4 py-2.5 rounded-card bg-accent text-white hover:bg-accent/90 shadow-soft transition-colors"
            >
              <externalItem.icon className="h-4.5 w-4.5 text-white" />
              <span className="text-sm font-medium">{externalItem.label}</span>
              <svg
                className="h-3.5 w-3.5 ml-auto text-white/60"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                />
              </svg>
            </a>
          </div>
        </div>
      </nav>
    </aside>
  );
};

export default AdminSidebar;
