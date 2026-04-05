import { Activity, Cpu, Network, Users } from 'lucide-react';
import { useAppStore } from '@/stores/useAppStore';
import { translations } from '@/stores/i18n';

export default function Dashboard() {
  const { language } = useAppStore();
  const t = (key: string) => translations[language][key] || key;

  const stats = [
    { label: t('active_agents'), value: '4 / 12', icon: Users, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { label: t('total_sessions'), value: '1,284', icon: Activity, color: 'text-green-500', bg: 'bg-green-500/10' },
    { label: t('avg_latency'), value: '1.2s', icon: Network, color: 'text-purple-500', bg: 'bg-purple-500/10' },
    { label: t('gateway_cpu'), value: '24%', icon: Cpu, color: 'text-orange-500', bg: 'bg-orange-500/10' },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">{t('dashboard')}</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div key={i} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-6 rounded-xl shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{stat.label}</p>
                  <p className="text-3xl font-bold mt-2">{stat.value}</p>
                </div>
                <div className={`p-3 rounded-full ${stat.bg} ${stat.color}`}>
                  <Icon size={24} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 shadow-sm min-h-[300px]">
          <h2 className="text-lg font-semibold mb-4">{t('recent_activity')}</h2>
          <div className="text-sm text-gray-500 dark:text-gray-400 text-center mt-20">
            Activity stream placeholder...
          </div>
        </div>
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 shadow-sm min-h-[300px]">
          <h2 className="text-lg font-semibold mb-4">{t('agents')} {t('status')}</h2>
          <div className="text-sm text-gray-500 dark:text-gray-400 text-center mt-20">
            Agent status distribution placeholder...
          </div>
        </div>
      </div>
    </div>
  );
}
