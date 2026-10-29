import React from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  FileText,
  Users2,
  Bell,
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
      title: language === "fr" ? "GESTION" : "MANAGEMENT",
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
              <p className="text-[13px] font-bold tracking-[0.12em] text-muted uppercase px-4 mb-2">
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
              className="flex items-center space-x-3 px-4 py-2.5 rounded-card bg-gold font-bold transition-colors"
            >
              <externalItem.icon className="h-4.5 w-4.5" />
              <span className="text-sm font-bold">{externalItem.label}</span>
              <svg
                className="h-3.5 w-3.5 ml-auto opacity-60"
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
