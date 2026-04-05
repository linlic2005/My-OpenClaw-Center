import { Clock, Play, Pause, Trash2, Plus, CheckCircle2, AlertCircle } from 'lucide-react';
import { clsx } from 'clsx';
import { useAppStore } from '@/stores/useAppStore';
import { translations } from '@/stores/i18n';

interface Task {
  id: string;
  name: string;
  schedule: string;
  agentName: string;
  lastRun: string;
  nextRun: string;
  status: 'running' | 'paused' | 'failed';
  type: 'cron' | 'once';
}

const MOCK_TASKS: Task[] = [
  { id: 't1', name: 'Daily Social Media Summary', schedule: '0 9 * * *', agentName: 'Social Agent', lastRun: '2024-03-20 09:00', nextRun: '2024-03-21 09:00', status: 'running', type: 'cron' },
  { id: 't2', name: 'Weekly System Health Audit', schedule: '0 0 * * 0', agentName: 'Security Auditor', lastRun: '2024-03-17 00:00', nextRun: '2024-03-24 00:00', status: 'paused', type: 'cron' },
  { id: 't3', name: 'Market Data Sync', schedule: '*/30 * * * *', agentName: 'Analyst Pro', lastRun: '2024-03-20 14:30', nextRun: '2024-03-20 15:00', status: 'failed', type: 'cron' },
];

export default function Tasks() {
  const { language } = useAppStore();
  const t = (key: string) => translations[language][key] || key;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('tasks')}</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">{t('tasks_desc')}</p>
        </div>
        <button className="bg-primary text-white hover:bg-primary/90 px-5 py-2.5 rounded-xl font-semibold shadow-lg shadow-primary/20 transition-all active:scale-95 flex items-center gap-2 text-sm">
          <Plus size={18} /> {t('create_task')}
        </button>
      </div>

      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-400 uppercase bg-gray-50/50 dark:bg-gray-950/50 border-b border-gray-200 dark:border-gray-800 font-bold tracking-wider">
              <tr>
                <th className="px-8 py-5">{t('task_name')}</th>
                <th className="px-6 py-5">{t('schedule')}</th>
                <th className="px-6 py-5">{t('assigned_agent')}</th>
                <th className="px-6 py-5">{t('next_run')}</th>
                <th className="px-6 py-5 text-center">{t('status')}</th>
                <th className="px-8 py-5 text-right">{t('actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800/50">
              {MOCK_TASKS.map((task) => (
                <tr key={task.id} className="hover:bg-gray-50/80 dark:hover:bg-gray-800/30 transition-colors">
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 text-primary rounded-lg">
                        <Clock size={18} />
                      </div>
                      <span className="font-bold">{task.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-5 font-mono text-xs text-gray-500">{task.schedule}</td>
                  <td className="px-6 py-5">
                     <span className="px-2 py-1 rounded-md bg-gray-100 dark:bg-gray-800 text-[11px] font-semibold">
                       {task.agentName}
                     </span>
                  </td>
                  <td className="px-6 py-5 text-gray-500 dark:text-gray-400 text-xs">{task.nextRun}</td>
                  <td className="px-6 py-5 text-center">
                    <span className={clsx(
                      "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border",
                      task.status === 'running' ? "bg-green-50 text-green-600 border-green-200" :
                      task.status === 'paused' ? "bg-gray-50 text-gray-500 border-gray-200" :
                      "bg-red-50 text-red-600 border-red-200"
                    )}>
                      {task.status === 'running' ? <CheckCircle2 size={12}/> : 
                       task.status === 'failed' ? <AlertCircle size={12}/> : <Pause size={12}/>}
                      {t(task.status)}
                    </span>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <div className="flex items-center justify-end gap-2">
                       <button className="p-2 text-gray-400 hover:text-primary transition-all">
                         {task.status === 'paused' ? <Play size={18} /> : <Pause size={18} />}
                       </button>
                       <button className="p-2 text-gray-400 hover:text-red-500 transition-all">
                         <Trash2 size={18} />
                       </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
