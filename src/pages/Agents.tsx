import { useAgentStore } from '@/stores/useAgentStore';
import { useNotificationStore } from '@/stores/useNotificationStore';
import { useChatStore } from '@/stores/useChatStore';
import { useAppStore } from '@/stores/useAppStore';
import { translations } from '@/stores/i18n';
import { Search, Plus, Filter, MoreHorizontal, Edit, Trash2, MessageSquare } from 'lucide-react';
import { clsx } from 'clsx';
import { useState, useMemo, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '@/services/api-client';

export default function Agents() {
  const { agents, isLoading, fetchAgents } = useAgentStore();
  const { sessions, setActiveSession, createSession } = useChatStore();
  const { language } = useAppStore();
  const t = (key: string) => translations[language][key] || key;
  const { addNotification } = useNotificationStore();
  const navigate = useNavigate();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'idle' | 'error' | 'offline'>('all');
  const [editingAgentId, setEditingAgentId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    model: 'gpt-4o',
    description: '',
  });

  useEffect(() => { fetchAgents(); }, [fetchAgents]);

  const filteredAgents = useMemo(() => {
    return agents.filter(a => {
      const matchesSearch =
        a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.model.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || a.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [agents, searchQuery, statusFilter]);

  const handleCreateAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (editingAgentId) {
        await apiClient.patch(`/agents/${editingAgentId}`, formData);
        addNotification('Agent updated.');
      } else {
        await apiClient.post('/agents', formData);
        addNotification('New agent successfully deployed to Gateway.');
      }
      await fetchAgents();
      setIsModalOpen(false);
      setEditingAgentId(null);
      setFormData({ name: '', model: 'gpt-4o', description: '' });
    } catch (error) {
      console.error('Failed to save agent:', error);
      addNotification('Failed to save agent.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChat = (agentId: string) => {
    const existingSession = sessions.find((session) => session.agentId === agentId);
    if (existingSession) {
      setActiveSession(existingSession.id);
      navigate('/chat');
    } else {
      void createSession(agentId).then((sessionId) => {
        if (sessionId) {
          navigate('/chat');
        }
      });
    }
  };

  const handleDeleteAgent = async (agentId: string, agentName: string) => {
    try {
      await apiClient.delete(`/agents/${agentId}`);
      await fetchAgents();
      addNotification(`${agentName} deleted.`);
    } catch (error) {
      console.error('Failed to delete agent:', error);
      addNotification(`Failed to delete ${agentName}.`, 'error');
    }
  };

  const handleRestartAgent = async (agentId: string, agentName: string) => {
    try {
      await apiClient.post(`/agents/${agentId}/restart`);
      await fetchAgents();
      addNotification(`${agentName} restarted.`);
    } catch (error) {
      console.error('Failed to restart agent:', error);
      addNotification(`Failed to restart ${agentName}.`, 'error');
    }
  };

  const handleOpenCreateModal = () => {
    setEditingAgentId(null);
    setFormData({ name: '', model: 'gpt-4o', description: '' });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (agentId: string) => {
    const agent = agents.find((item) => item.id === agentId);
    if (!agent) return;
    setEditingAgentId(agent.id);
    setFormData({
      name: agent.name,
      model: agent.model,
      description: agent.description || '',
    });
    setIsModalOpen(true);
  };

  const cycleStatusFilter = () => {
    const order: Array<typeof statusFilter> = ['all', 'active', 'idle', 'error', 'offline'];
    const currentIndex = order.indexOf(statusFilter);
    setStatusFilter(order[(currentIndex + 1) % order.length]);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('agents')}</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">{t('agents_desc')}</p>
        </div>
        <button 
          onClick={handleOpenCreateModal}
          className="bg-primary text-white hover:bg-primary/90 px-5 py-2.5 rounded-xl font-semibold shadow-lg shadow-primary/20 transition-all active:scale-95 flex items-center gap-2 text-sm"
        >
          <Plus size={18} /> {t('create_agent')}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="relative md:col-span-2">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('search')} 
            className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl pl-12 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all shadow-sm"
          />
        </div>
        <div className="flex gap-2">
           <button onClick={cycleStatusFilter} className="flex-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl px-4 py-3 text-sm font-medium flex items-center justify-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors shadow-sm">
             <Filter size={16} /> {t('status')}: {statusFilter}
           </button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl shadow-xl overflow-hidden shadow-gray-200/50 dark:shadow-none">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse">
            <thead className="text-xs text-gray-400 uppercase bg-gray-50/50 dark:bg-gray-950/50 border-b border-gray-200 dark:border-gray-800 font-bold tracking-wider">
              <tr>
                <th className="px-8 py-5">{t('agent_identity')}</th>
                <th className="px-6 py-5">{t('model_engine')}</th>
                <th className="px-6 py-5 text-center">{t('status')}</th>
                <th className="px-6 py-5">{t('last_activity')}</th>
                <th className="px-8 py-5 text-right">{t('actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800/50">
              {filteredAgents.map((agent) => (
                <tr key={agent.id} className="hover:bg-gray-50/80 dark:hover:bg-gray-800/30 transition-colors group">
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-4">
                      <div className={clsx(
                        "h-12 w-12 rounded-2xl flex items-center justify-center font-bold text-lg shadow-inner shrink-0",
                        agent.status === 'active' ? "bg-primary/10 text-primary" : "bg-gray-100 dark:bg-gray-800 text-gray-400"
                      )}>
                        {agent.name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-bold text-gray-900 dark:text-gray-100">{agent.name}</div>
                        <div className="text-xs text-gray-500 mt-0.5 truncate max-w-[200px]">{agent.description}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <code className="px-2 py-1 rounded bg-gray-100 dark:bg-gray-800 text-[11px] font-mono text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700">
                      {agent.model}
                    </code>
                  </td>
                  <td className="px-6 py-5 text-center">
                    <span className={clsx(
                      "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border",
                      agent.status === 'active' ? "bg-green-50 text-green-600 border-green-200 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/20" :
                      agent.status === 'idle' ? "bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20" :
                      "bg-gray-50 text-gray-500 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700"
                    )}>
                      <span className={clsx(
                        "w-1.5 h-1.5 rounded-full",
                        agent.status === 'active' ? "bg-green-500 animate-pulse" : 
                        agent.status === 'idle' ? "bg-blue-500" : "bg-gray-400"
                      )}></span>
                      {t(agent.status)}
                    </span>
                  </td>
                  <td className="px-6 py-5 text-gray-500 dark:text-gray-400 text-xs font-medium">
                    {agent.lastActive ? new Date(agent.lastActive).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : 'Never'}
                  </td>
                  <td className="px-8 py-5 text-right">
                    <div className="flex items-center justify-end gap-2">
                       <button
                         onClick={() => handleOpenChat(agent.id)}
                         className="p-2 text-gray-400 hover:text-primary hover:bg-primary/5 rounded-lg transition-all"
                         title={t('chat')}
                       >
                         <MessageSquare size={16} />
                       </button>
                       <button onClick={() => handleOpenEditModal(agent.id)} className="p-2 text-gray-400 hover:text-primary hover:bg-primary/5 rounded-lg transition-all" title={t('edit')}>
                         <Edit size={16} />
                       </button>
                       <button onClick={() => void handleDeleteAgent(agent.id, agent.name)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all" title={t('delete')}>
                         <Trash2 size={16} />
                       </button>
                       <button onClick={() => void handleRestartAgent(agent.id, agent.name)} className="p-2 text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-lg transition-all" title="Restart">
                         <MoreHorizontal size={18} />
                       </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {isLoading && (
          <div className="p-12 text-center text-gray-500 flex flex-col items-center gap-3">
             <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
             <p className="text-sm font-medium">{t('loading')}</p>
          </div>
        )}
      </div>

      {/* Create Agent Modal */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)}
        title={editingAgentId ? t('edit') : t('create_agent')}
        description={t('agents_desc')}
      >
        <form onSubmit={handleCreateAgent} className="space-y-5">
           <div className="space-y-2">
              <label className="text-[11px] font-black uppercase text-gray-400 tracking-wider">Agent Name</label>
              <input required value={formData.name} onChange={(e) => setFormData((state) => ({ ...state, name: e.target.value }))} type="text" placeholder="e.g. Research Analyst" className="w-full bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/50 outline-none transition-all" />
           </div>
           <div className="space-y-2">
              <label className="text-[11px] font-black uppercase text-gray-400 tracking-wider">{t('model_engine')}</label>
              <select value={formData.model} onChange={(e) => setFormData((state) => ({ ...state, model: e.target.value }))} className="w-full bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-2xl px-4 py-3 text-sm outline-none">
                <option>gpt-4o</option>
                <option>gpt-4-turbo</option>
                <option>claude-3-5-sonnet</option>
                <option>llama-3-70b</option>
              </select>
           </div>
           <div className="space-y-2">
              <label className="text-[11px] font-black uppercase text-gray-400 tracking-wider">Description</label>
              <textarea value={formData.description} onChange={(e) => setFormData((state) => ({ ...state, description: e.target.value }))} rows={3} placeholder="..." className="w-full bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-2xl px-4 py-3 text-sm outline-none resize-none" />
           </div>
           <div className="pt-4 flex gap-3">
              <button 
                type="button"
                onClick={() => { setIsModalOpen(false); setEditingAgentId(null); }}
                className="flex-1 px-6 py-3 rounded-2xl font-bold text-sm text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
              >
                {t('cancel')}
              </button>
              <button 
                disabled={isSubmitting}
                className="flex-1 bg-primary text-white px-6 py-3 rounded-2xl font-bold text-sm shadow-xl shadow-primary/20 hover:opacity-90 active:scale-95 transition-all flex items-center justify-center"
              >
                {isSubmitting ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : t('deploy_agent')}
              </button>
           </div>
        </form>
      </Modal>
    </div>
  );
}
