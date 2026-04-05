import { Settings as SettingsIcon, Shield, Globe, Bell, User, Monitor, Cpu, Info } from 'lucide-react';
import { useState } from 'react';
import { clsx } from 'clsx';
import { useAppStore, Language } from '@/stores/useAppStore';
import { useNotificationStore } from '@/stores/useNotificationStore';
import { translations } from '@/stores/i18n';

export default function Settings() {
  const [activeTab, setActiveTab] = useState('general');
  const { language, setLanguage } = useAppStore();
  const t = (key: string) => translations[language][key] || key;
  const { addNotification } = useNotificationStore();

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newLang = e.target.value as Language;
    setLanguage(newLang);
    addNotification(`Language switched to ${newLang.toUpperCase()}`);
  };

  const tabs = [
    { id: 'general', label: t('general'), icon: SettingsIcon },
    { id: 'gateway', label: t('gateway_config'), icon: Globe },
    { id: 'security', label: t('security'), icon: Shield },
    { id: 'notifications', label: t('notifications'), icon: Bell },
    { id: 'profile', label: t('profile'), icon: User },
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      <h1 className="text-3xl font-bold tracking-tight">{t('settings')}</h1>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Settings Navigation */}
        <div className="w-full lg:w-64 shrink-0 space-y-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={clsx(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold transition-all",
                  activeTab === tab.id 
                    ? "bg-primary text-white dark:text-gray-900 shadow-lg shadow-primary/20" 
                    : "text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 dark:text-gray-400"
                )}
              >
                <Icon size={18} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Settings Content Area */}
        <div className="flex-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl shadow-xl p-8 space-y-8">
          {activeTab === 'general' && (
            <div className="space-y-6 animate-in slide-in-from-right-4">
              <section>
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <Monitor size={20} className="text-primary" /> {t('console_identity')}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <div className="space-y-2">
                      <label className="text-xs font-black uppercase text-gray-400 tracking-widest">{t('platform_name')}</label>
                      <input type="text" defaultValue="OpenClaw Web Console" className="w-full bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/50 outline-none transition-all" />
                   </div>
                   <div className="space-y-2">
                      <label className="text-xs font-black uppercase text-gray-400 tracking-widest">{t('default_lang')}</label>
                      <select 
                        value={language}
                        onChange={handleLanguageChange}
                        className="w-full bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-3 text-sm outline-none"
                      >
                        <option value="en">English (US)</option>
                        <option value="zh">简体中文</option>
                        <option value="jp">日本語</option>
                      </select>
                   </div>
                </div>
              </section>

              <section className="pt-6 border-t border-gray-100 dark:border-gray-800">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <Cpu size={20} className="text-primary" /> {t('agent_defaults')}
                </h3>
                <div className="space-y-4">
                   <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-950 rounded-2xl border border-gray-100 dark:border-gray-800">
                      <div>
                        <div className="font-bold text-sm">{t('stream_mode')}</div>
                        <div className="text-xs text-gray-500">{t('stream_desc')}</div>
                      </div>
                      <div className="w-12 h-6 bg-primary rounded-full relative cursor-pointer">
                        <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full" />
                      </div>
                   </div>
                </div>
              </section>

              <div className="flex justify-end pt-4">
                <button className="bg-primary text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-primary/20 hover:opacity-90 active:scale-95 transition-all">
                  {t('save')}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'gateway' && (
            <div className="space-y-6 animate-in slide-in-from-right-4">
              <h3 className="text-lg font-bold mb-4">{t('gateway_config')}</h3>
              <div className="p-4 bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20 rounded-2xl flex gap-3 text-blue-600 dark:text-blue-400 text-sm">
                 <Info size={20} className="shrink-0" />
                 <p>These settings define how the console communicates with your OpenClaw Gateway instance.</p>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase text-gray-400 tracking-widest">Gateway URL</label>
                  <input type="text" placeholder="http://localhost:3000" className="w-full bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-3 text-sm font-mono outline-none" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase text-gray-400 tracking-widest">Secret Token</label>
                  <input type="password" value="************************" className="w-full bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-3 text-sm font-mono outline-none" />
                </div>
              </div>
            </div>
          )}
          
          {activeTab !== 'general' && activeTab !== 'gateway' && (
             <div className="h-64 flex flex-col items-center justify-center text-gray-400 opacity-50">
                <SettingsIcon size={48} className="mb-4 animate-spin-slow" />
                <p className="font-bold uppercase tracking-widest text-xs">Section Under Construction</p>
             </div>
          )}
        </div>
      </div>
    </div>
  );
}
