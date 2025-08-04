import React, { useState } from 'react';
import { Calendar, Users, Clock, Activity, Download } from 'lucide-react';
import AdminLayout from '../../components/admin/AdminLayout';

interface StatisticsFilters {
  dateRange: string;
  type: string;
}

const AdminStatistics: React.FC = () => {
  const [filters, setFilters] = useState<StatisticsFilters>({
    dateRange: 'month',
    type: 'all',
  });

  // Mock statistics data - in a real app this would come from an API
  const statistics = {
    totalUsers: {
      patients: 150,
      professionals: 25,
    },
    consultations: {
      total: 324,
      completed: 289,
      cancelled: 35,
      noShow: 12,
    },
    averages: {
      waitTime: '3.5 jours',
      consultationDuration: '45 minutes',
      satisfactionRate: '4.8/5',
    },
    peakHours: [
      { hour: '09:00', count: 45 },
      { hour: '10:00', count: 62 },
      { hour: '11:00', count: 58 },
      { hour: '14:00', count: 51 },
      { hour: '15:00', count: 49 },
    ],
  };

  const handleExport = () => {
    // Implementation for exporting statistics
    console.log('Exporting statistics...');
  };

  return (
    <AdminLayout>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Statistiques</h1>
          <div className="flex gap-4">
            <select
              value={filters.dateRange}
              onChange={(e) => setFilters({ ...filters, dateRange: e.target.value })}
              className="border border-gray-300 rounded-md p-2"
            >
              <option value="week">Cette semaine</option>
              <option value="month">Ce mois</option>
              <option value="quarter">Ce trimestre</option>
              <option value="year">Cette année</option>
            </select>
            <button
              onClick={handleExport}
              className="flex items-center px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
            >
              <Download className="w-4 h-4 mr-2" />
              Exporter
            </button>
          </div>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-700">Utilisateurs</h3>
              <Users className="h-6 w-6 text-blue-500" />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Patients</span>
                <span className="text-2xl font-bold">{statistics.totalUsers.patients}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Professionnels</span>
                <span className="text-2xl font-bold">{statistics.totalUsers.professionals}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-700">Consultations</h3>
              <Calendar className="h-6 w-6 text-blue-500" />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Total</span>
                <span className="text-2xl font-bold">{statistics.consultations.total}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Complétées</span>
                <span className="text-2xl font-bold">{statistics.consultations.completed}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-700">Temps d'attente</h3>
              <Clock className="h-6 w-6 text-blue-500" />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Moyenne</span>
                <span className="text-2xl font-bold">{statistics.averages.waitTime}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Durée moyenne</span>
                <span className="text-2xl font-bold">{statistics.averages.consultationDuration}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-700">Satisfaction</h3>
              <Activity className="h-6 w-6 text-blue-500" />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Note moyenne</span>
                <span className="text-2xl font-bold">{statistics.averages.satisfactionRate}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">No-show</span>
                <span className="text-2xl font-bold">{statistics.consultations.noShow}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Peak Hours Chart */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-700 mb-4">Heures de forte affluence</h3>
          <div className="h-64">
            <div className="flex h-full items-end space-x-2">
              {statistics.peakHours.map((hour) => (
                <div key={hour.hour} className="flex-1 flex flex-col items-center">
                  <div 
                    className="w-full bg-blue-500 rounded-t"
                    style={{ height: `${(hour.count / 70) * 100}%` }}
                  ></div>
                  <span className="text-sm text-gray-600 mt-2">{hour.hour}</span>
                  <span className="text-xs text-gray-500">{hour.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminStatistics;