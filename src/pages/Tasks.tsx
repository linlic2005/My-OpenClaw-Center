import { Clock, Play, Pause, Trash2, Plus, CheckCircle2, AlertCircle } from 'lucide-react';
import { clsx } from 'clsx';
import { useAppStore } from '@/stores/useAppStore';
import { useNotificationStore } from '@/stores/useNotificationStore';
import { translations } from '@/stores/i18n';
import { useState, useEffect } from 'react';
import { apiClient } from '@/services/api-client';
import { Modal } from '@/components/ui/Modal';
import { useAgentStore } from '@/stores/useAgentStore';

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

export default function Tasks() {
  const { language } = useAppStore();
  const t = (key: string) => translations[language][key] || key;
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', schedule: '', agentId: '', type: 'cron' as 'cron' | 'once' });
  const { addNotification } = useNotificationStore();
  const { agents, fetchAgents } = useAgentStore();

  useEffect(() => {
    apiClient.get('/tasks').then(res => setTasks(res.data.data)).catch(console.error);
  }, []);

  useEffect(() => {
    void fetchAgents();
  }, [fetchAgents]);

  const handleToggleTask = async (task: Task) => {
    const enabled = task.status !== 'running';

    try {
      await apiClient.post(`/tasks/${task.id}/toggle`, { enabled });
      setTasks((state) => state.map((item) => (
        item.id === task.id
          ? { ...item, status: enabled ? 'running' : 'paused' }
          : item
      )));
      addNotification(enabled ? `${task.name} resumed.` : `${task.name} paused.`);
    } catch (error) {
      console.error('Failed to toggle task:', error);
      addNotification(`Failed to update ${task.name}.`, 'error');
    }
  };

  const handleDeleteTask = async (task: Task) => {
    try {
      await apiClient.delete(`/tasks/${task.id}`);
      setTasks((state) => state.filter((item) => item.id !== task.id));
      addNotification(`${task.name} deleted.`);
    } catch (error) {
      console.error('Failed to delete task:', error);
      addNotification(`Failed to delete ${task.name}.`, 'error');
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiClient.post('/tasks', formData);
      setTasks((state) => [res.data.data, ...state]);
      setIsCreateOpen(false);
      setFormData({ name: '', schedule: '', agentId: '', type: 'cron' });
      addNotification('Task created.');
    } catch (error) {
      console.error('Failed to create task:', error);
      addNotification('Failed to create task.', 'error');
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('tasks')}</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">{t('tasks_desc')}</p>
        </div>
        <button
          onClick={() => setIsCreateOpen(true)}
          className="bg-primary text-white hover:bg-primary/90 px-5 py-2.5 rounded-xl font-semibold shadow-lg shadow-primary/20 transition-all active:scale-95 flex items-center gap-2 text-sm"
        >
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
              {tasks.map((task) => (
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
                       <button onClick={() => void handleToggleTask(task)} className="p-2 text-gray-400 hover:text-primary transition-all">
                         {task.status === 'paused' ? <Play size={18} /> : <Pause size={18} />}
                       </button>
                       <button onClick={() => void handleDeleteTask(task)} className="p-2 text-gray-400 hover:text-red-500 transition-all">
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

      <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title={t('create_task')}>
        <form onSubmit={handleCreateTask} className="space-y-4">
          <input required value={formData.name} onChange={(e) => setFormData((state) => ({ ...state, name: e.target.value }))} placeholder="Task name" className="w-full bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-3 text-sm outline-none" />
          <input required value={formData.schedule} onChange={(e) => setFormData((state) => ({ ...state, schedule: e.target.value }))} placeholder="0 9 * * *" className="w-full bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-3 text-sm outline-none font-mono" />
          <select required value={formData.agentId} onChange={(e) => setFormData((state) => ({ ...state, agentId: e.target.value }))} className="w-full bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-3 text-sm outline-none">
            <option value="">Select agent</option>
            {agents.map((agent) => (
              <option key={agent.id} value={agent.id}>{agent.name}</option>
            ))}
          </select>
          <select value={formData.type} onChange={(e) => setFormData((state) => ({ ...state, type: e.target.value as 'cron' | 'once' }))} className="w-full bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-3 text-sm outline-none">
            <option value="cron">cron</option>
            <option value="once">once</option>
          </select>
          <button className="w-full bg-primary text-white py-3 rounded-xl font-semibold">Create Task</button>
        </form>
      </Modal>
    </div>
  );
}
