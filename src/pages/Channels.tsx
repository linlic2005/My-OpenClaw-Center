import { Plus, Settings2, Power, Zap } from 'lucide-react';
import { clsx } from 'clsx';
import { Channel } from '@/types';
import { useAppStore } from '@/stores/useAppStore';
import { translations } from '@/stores/i18n';

const MOCK_CHANNELS: Channel[] = [
  { id: 'c1', name: 'Global Discord Bot', type: 'discord', status: 'connected' },
  { id: 'c2', name: 'Official Website Chat', type: 'web', status: 'connected' },
  { id: 'c3', name: 'Internal Slack Support', type: 'slack', status: 'disconnected' },
  { id: 'c4', name: 'Marketing Telegram', type: 'telegram', status: 'error' },
];

export default function Channels() {
  const { language } = useAppStore();
  const t = (key: string) => translations[language][key] || key;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in slide-in-from-bottom-2 duration-500">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('channels')}</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">{t('channels_desc')}</p>
        </div>
        <button className="bg-primary text-white hover:bg-primary/90 px-5 py-2.5 rounded-xl font-semibold shadow-lg shadow-primary/20 transition-all active:scale-95 flex items-center gap-2 text-sm">
          <Plus size={18} /> {t('add_channel')}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {MOCK_CHANNELS.map((channel) => (
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
                 <button className="p-2 text-gray-400 hover:text-primary hover:bg-primary/5 rounded-xl transition-all">
                   <Settings2 size={18} />
                 </button>
                 <button className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all">
                   <Power size={18} />
                 </button>
              </div>
              <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                v1.2.4
              </div>
            </div>
          </div>
        ))}

        {/* Create Card */}
        <div className="border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-3xl p-6 flex flex-col items-center justify-center text-center group hover:border-primary/50 transition-all cursor-pointer">
           <div className="w-12 h-12 rounded-full bg-gray-50 dark:bg-gray-900 flex items-center justify-center text-gray-400 group-hover:bg-primary/10 group-hover:text-primary transition-all mb-4">
             <Plus size={24} />
           </div>
           <span className="text-sm font-bold text-gray-500 group-hover:text-primary transition-all">{t('new_integration')}</span>
        </div>
      </div>
    </div>
  );
}
