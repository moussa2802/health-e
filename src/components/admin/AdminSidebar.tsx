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
} from "lucide-react";
import { useLanguage } from "../../contexts/LanguageContext";

const AdminSidebar = () => {
  const location = useLocation();
  const { language } = useLanguage();

  const menuItems = [
    {
      path: "/admin/dashboard",
      icon: LayoutDashboard,
      label: language === "fr" ? "Tableau de bord" : "Dashboard",
    },
    {
      path: "/admin/notifications",
      icon: Bell,
      label:
        language === "fr" ? "Centre de notifications" : "Notification Center",
    },
    {
      path: "/admin/users",
      icon: Users,
      label: language === "fr" ? "Utilisateurs" : "Users",
    },
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
      path: "/admin/evaluations",
      icon: ClipboardCheck,
      label: language === "fr" ? "Evaluations" : "Evaluations",
    },
    {
      path: "/admin/content",
      icon: FileText,
      label: language === "fr" ? "Contenu" : "Content",
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
    // Item externe pour Health-eShare intégré dans le menu principal
    {
      path: "https://health-eshare.netlify.app/",
      icon: Users2,
      label: language === "fr" ? "Collaborateurs" : "Collaborators",
      external: true,
      highlight: true,
    },
  ];

  return (
    <aside className="h-full pt-8 flex flex-col">
      <nav className="mt-4 flex-1 overflow-y-auto">
        <ul className="space-y-2 px-4 pb-4">
          {menuItems.map(({ path, icon: Icon, label, external, highlight }) => {
            // Vérifier si c'est un lien externe
            const isExternal = external && path.startsWith("http");

            if (isExternal) {
              return (
                <li key={path}>
                  <a
                    href={path}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex items-center space-x-3 px-4 py-3 rounded-card transition-colors ${
                      highlight
                        ? "bg-accent text-white hover:bg-accent/90 shadow-soft"
                        : "text-ink-soft hover:bg-paper"
                    }`}
                  >
                    <Icon
                      className={`h-5 w-5 ${highlight ? "text-white" : ""}`}
                    />
                    <span className="font-medium">{label}</span>
                    <svg
                      className="h-4 w-4 ml-auto text-muted"
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
                    {highlight && (
                      <span className="ml-2 px-2 py-1 bg-white/20 rounded-pill text-xs font-medium">
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
                  className={`flex items-center space-x-3 px-4 py-3 rounded-card transition-colors ${
                    location.pathname === path
                      ? "bg-accent-soft text-accent"
                      : "text-ink-soft hover:bg-paper"
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
