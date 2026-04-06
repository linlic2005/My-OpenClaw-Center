import { Activity, Cpu, Network, Users, Coins, TrendingUp } from 'lucide-react';
import { useAppStore } from '@/stores/useAppStore';
import { useNotificationStore } from '@/stores/useNotificationStore';
import { translations } from '@/stores/i18n';
import { clsx } from 'clsx';
import { useState, useEffect } from 'react';
import { apiClient } from '@/services/api-client';
import { useNavigate } from 'react-router-dom';

interface Metrics {
  cpuUsage: number;
  memoryUsage: number;
  activeAgents: number;
  totalAgents: number;
  totalSessions: number;
  avgLatency: number;
}

export default function Dashboard() {
  const { language } = useAppStore();
  const t = (key: string) => translations[language][key] || key;
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const { addNotification } = useNotificationStore();
  const navigate = useNavigate();

  useEffect(() => {
    apiClient.get('/logs/metrics').then(res => setMetrics(res.data.data)).catch(console.error);
  }, []);

  const m = metrics;
  const stats = [
    { label: t('active_agents'), value: m ? `${m.activeAgents} / ${m.totalAgents}` : '-', icon: Users, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { label: t('total_sessions'), value: m ? m.totalSessions.toLocaleString() : '-', icon: Activity, color: 'text-green-500', bg: 'bg-green-500/10' },
    { label: t('total_tokens'), value: '842.5k', icon: Coins, color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
    { label: t('avg_latency'), value: m ? `${m.avgLatency.toFixed(1)}s` : '-', icon: Network, color: 'text-purple-500', bg: 'bg-purple-500/10' },
    { label: t('gateway_cpu'), value: m ? `${Math.round(m.cpuUsage)}%` : '-', icon: Cpu, color: 'text-orange-500', bg: 'bg-orange-500/10' },
  ];

  // Mock token ranking data
  const tokenRanking = [
    { name: 'Customer Support Agent', tokens: '342,100', percentage: 85 },
    { name: 'Data Analyst', tokens: '210,450', percentage: 62 },
    { name: 'Social Media Bot', tokens: '156,200', percentage: 45 },
    { name: 'Research Assistant', tokens: '84,300', percentage: 25 },
    { name: 'Code Expert', tokens: '49,450', percentage: 15 },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500">
      <h1 className="text-2xl font-bold tracking-tight">{t('dashboard')}</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div key={i} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-5 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-black uppercase text-gray-400 tracking-wider leading-none mb-2">{stat.label}</p>
                  <p className="text-2xl font-bold tracking-tight">{stat.value}</p>
                </div>
                <div className={clsx("p-2.5 rounded-xl", stat.bg, stat.color)}>
                  <Icon size={20} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        {/* Token Usage Ranking */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-6 shadow-sm lg:col-span-1">
          <div className="flex items-center gap-2 mb-6">
             <div className="p-2 bg-yellow-500/10 text-yellow-500 rounded-lg">
               <TrendingUp size={18} />
             </div>
             <h2 className="text-lg font-bold tracking-tight">{t('token_usage_ranking')}</h2>
          </div>
          
          <div className="space-y-5">
            {tokenRanking.map((item, index) => (
              <div key={index} className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                    <span className="text-[10px] w-4 h-4 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500">{index + 1}</span>
                    {item.name}
                  </span>
                  <span className="font-mono text-gray-500">{item.tokens}</span>
                </div>
                <div className="h-1.5 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-yellow-500 rounded-full transition-all duration-1000" 
                    style={{ width: `${item.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-6 shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold tracking-tight">{t('recent_activity')}</h2>
            <button onClick={() => { addNotification('Opening logs view.'); navigate('/logs'); }} className="text-xs font-bold text-primary hover:underline uppercase tracking-widest">View All</button>
          </div>
          <div className="space-y-4">
             {[1, 2, 3, 4].map((i) => (
               <div key={i} className="flex gap-4 p-3 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors border border-transparent hover:border-gray-100 dark:hover:border-gray-700">
                  <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <Activity size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate">Agent "Support" processed a new inquiry</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Session ID: s_2841 • 242 tokens used</p>
                  </div>
                  <div className="text-[10px] text-gray-400 font-medium whitespace-nowrap mt-1">
                    {i * 5}m ago
                  </div>
               </div>
             ))}
          </div>
        </div>
      </div>
    </div>
  );
}
