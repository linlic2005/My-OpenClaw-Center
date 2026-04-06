import { Plus, Settings2, Power, Zap } from 'lucide-react';
import { clsx } from 'clsx';
import { Channel } from '@/types';
import { useAppStore } from '@/stores/useAppStore';
import { useNotificationStore } from '@/stores/useNotificationStore';
import { translations } from '@/stores/i18n';
import { useState, useEffect } from 'react';
import { apiClient } from '@/services/api-client';
import { Modal } from '@/components/ui/Modal';

export default function Channels() {
  const { language } = useAppStore();
  const t = (key: string) => translations[language][key] || key;
  const [channels, setChannels] = useState<Channel[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingChannelId, setEditingChannelId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    type: 'web' as Channel['type'],
    status: 'disconnected' as Channel['status'],
  });
  const { addNotification } = useNotificationStore();

  useEffect(() => {
    apiClient.get('/channels').then(res => setChannels(res.data.data)).catch(console.error);
  }, []);

  const handleToggleChannel = async (channel: Channel) => {
    const enabled = channel.status !== 'connected';

    try {
      await apiClient.post(`/channels/${channel.id}/toggle`, { enabled });
      setChannels((state) => state.map((item) => (
        item.id === channel.id
          ? { ...item, status: enabled ? 'connected' : 'disconnected' }
          : item
      )));
      addNotification(enabled ? `${channel.name} connected.` : `${channel.name} disconnected.`);
    } catch (error) {
      console.error('Failed to toggle channel:', error);
      addNotification(`Failed to update ${channel.name}.`, 'error');
    }
  };

  const handleSaveChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingChannelId) {
        const res = await apiClient.patch(`/channels/${editingChannelId}`, formData);
        setChannels((state) => state.map((item) => item.id === editingChannelId ? res.data.data : item));
        addNotification('Channel updated.');
      } else {
        const res = await apiClient.post('/channels', formData);
        setChannels((state) => [res.data.data, ...state]);
        addNotification('Channel created.');
      }
      setIsModalOpen(false);
      setEditingChannelId(null);
      setFormData({ name: '', type: 'web', status: 'disconnected' });
    } catch (error) {
      console.error('Failed to save channel:', error);
      addNotification('Failed to save channel.', 'error');
    }
  };

  const handleDeleteChannel = async (channel: Channel) => {
    try {
      await apiClient.delete(`/channels/${channel.id}`);
      setChannels((state) => state.filter((item) => item.id !== channel.id));
      addNotification(`${channel.name} deleted.`);
    } catch (error) {
      console.error('Failed to delete channel:', error);
      addNotification(`Failed to delete ${channel.name}.`, 'error');
    }
  };

  const openCreateModal = () => {
    setEditingChannelId(null);
    setFormData({ name: '', type: 'web', status: 'disconnected' });
    setIsModalOpen(true);
  };

  const openEditModal = (channel: Channel) => {
    setEditingChannelId(channel.id);
    setFormData({
      name: channel.name,
      type: channel.type,
      status: channel.status,
    });
    setIsModalOpen(true);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in slide-in-from-bottom-2 duration-500">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('channels')}</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">{t('channels_desc')}</p>
        </div>
        <button
          onClick={openCreateModal}
          className="bg-primary text-white hover:bg-primary/90 px-5 py-2.5 rounded-xl font-semibold shadow-lg shadow-primary/20 transition-all active:scale-95 flex items-center gap-2 text-sm"
        >
          <Plus size={18} /> {t('add_channel')}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {channels.map((channel) => (
          <div key={channel.id} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
            <div className="flex items-start justify-between mb-6">
              <div className={clsx(
                "p-4 rounded-2xl shadow-inner",
                channel.type === 'discord' ? "bg-indigo-500/10 text-indigo-500" :
                channel.type === 'slack' ? "bg-orange-500/10 text-orange-500" :
                channel.type === 'telegram' ? "bg-sky-500/10 text-sky-500" :
                "bg-emerald-500/10 text-emerald-500"
              )}>
                <Zap size={24} className="fill-current" />
              </div>
              <div className={clsx(
                "px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border",
                channel.status === 'connected' ? "bg-green-50 text-green-600 border-green-200 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/20" :
                channel.status === 'error' ? "bg-red-50 text-red-600 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20" :
                "bg-gray-50 text-gray-500 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700"
              )}>
                {t(channel.status)}
              </div>
            </div>

            <div className="space-y-1">
              <h3 className="font-bold text-lg">{channel.name}</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-tighter font-semibold">{t('identity')}: {channel.type}</p>
            </div>

            <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                 <button
                   onClick={() => openEditModal(channel)}
                   className="p-2 text-gray-400 hover:text-primary hover:bg-primary/5 rounded-xl transition-all"
                 >
                   <Settings2 size={18} />
                 </button>
                 <button
                   onClick={() => void handleToggleChannel(channel)}
                   className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                 >
                   <Power size={18} />
                 </button>
                 <button
                   onClick={() => void handleDeleteChannel(channel)}
                   className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                 >
                   <Plus size={18} className="rotate-45" />
                 </button>
              </div>
              <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                v1.2.4
              </div>
            </div>
          </div>
        ))}

        {/* Create Card */}
        <div
          onClick={openCreateModal}
          className="border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-3xl p-6 flex flex-col items-center justify-center text-center group hover:border-primary/50 transition-all cursor-pointer"
        >
           <div className="w-12 h-12 rounded-full bg-gray-50 dark:bg-gray-900 flex items-center justify-center text-gray-400 group-hover:bg-primary/10 group-hover:text-primary transition-all mb-4">
             <Plus size={24} />
           </div>
           <span className="text-sm font-bold text-gray-500 group-hover:text-primary transition-all">{t('new_integration')}</span>
        </div>
      </div>
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingChannelId ? 'Edit Channel' : t('add_channel')}>
        <form onSubmit={handleSaveChannel} className="space-y-4">
          <input required value={formData.name} onChange={(e) => setFormData((state) => ({ ...state, name: e.target.value }))} placeholder="Channel name" className="w-full bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-3 text-sm outline-none" />
          <select value={formData.type} onChange={(e) => setFormData((state) => ({ ...state, type: e.target.value as Channel['type'] }))} className="w-full bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-3 text-sm outline-none">
            <option value="web">web</option>
            <option value="discord">discord</option>
            <option value="slack">slack</option>
            <option value="telegram">telegram</option>
          </select>
          <select value={formData.status} onChange={(e) => setFormData((state) => ({ ...state, status: e.target.value as Channel['status'] }))} className="w-full bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-3 text-sm outline-none">
            <option value="disconnected">disconnected</option>
            <option value="connected">connected</option>
            <option value="error">error</option>
          </select>
          <button className="w-full bg-primary text-white py-3 rounded-xl font-semibold">{editingChannelId ? 'Save Channel' : 'Create Channel'}</button>
        </form>
      </Modal>
    </div>
  );
}
