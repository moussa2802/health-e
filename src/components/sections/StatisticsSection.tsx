import React from 'react';
import { TrendingUp, Users, Calendar, Star } from 'lucide-react';

const StatisticsSection: React.FC = () => {
  const stats = [
    {
      icon: Users,
      value: "500+",
      label: "Patients satisfaits",
      color: "text-blue-500"
    },
    {
      icon: Calendar,
      value: "1000+",
      label: "Consultations réalisées",
      color: "text-green-500"
    },
    {
      icon: Star,
      value: "4.9/5",
      label: "Note moyenne",
      color: "text-yellow-500"
    },
    {
      icon: TrendingUp,
      value: "98%",
      label: "Taux de satisfaction",
      color: "text-purple-500"
    }
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
      {stats.map((stat, index) => (
        <div key={index} className="text-center">
          <div className={`w-16 h-16 ${stat.color} bg-opacity-10 rounded-full flex items-center justify-center mx-auto mb-4`}>
            <stat.icon className={`h-8 w-8 ${stat.color}`} />
          </div>
          <div className="text-3xl font-bold text-gray-900 mb-2">{stat.value}</div>
          <div className="text-gray-600">{stat.label}</div>
        </div>
      ))}
    </div>
  );
};

export default StatisticsSection;