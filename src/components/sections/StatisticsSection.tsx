import React from 'react';
import { TrendingUp, Users, Calendar, Star } from 'lucide-react';

const StatisticsSection: React.FC = () => {
  const stats = [
    {
      icon: Users,
      value: "500+",
      label: "Patients satisfaits",
    },
    {
      icon: Calendar,
      value: "1000+",
      label: "Consultations réalisées",
    },
    {
      icon: Star,
      value: "4.9/5",
      label: "Note moyenne",
    },
    {
      icon: TrendingUp,
      value: "98%",
      label: "Taux de satisfaction",
    }
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
      {stats.map((stat, index) => (
        <div key={index} className="text-center">
          <div className="w-16 h-16 bg-accent-soft rounded-full flex items-center justify-center mx-auto mb-4">
            <stat.icon className="h-8 w-8 text-accent" />
          </div>
          <div className="font-display text-3xl font-bold text-ink mb-2">{stat.value}</div>
          <div className="text-ink-soft">{stat.label}</div>
        </div>
      ))}
    </div>
  );
};

export default StatisticsSection;
