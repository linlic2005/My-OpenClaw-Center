import { Wrench, Plus, Zap, Shield, LayoutGrid, List } from 'lucide-react';
import { useState } from 'react';
import { clsx } from 'clsx';
import { useAppStore } from '@/stores/useAppStore';
import { translations } from '@/stores/i18n';

interface Skill {
  id: string;
  name: string;
  description: string;
  version: string;
  category: 'core' | 'tool' | 'plugin';
  enabled: boolean;
  author: string;
}

const MOCK_SKILLS: Skill[] = [
  { id: 's1', name: 'Web Browser', description: 'Allows agents to search and interact with websites in real-time.', version: '2.1.0', category: 'tool', enabled: true, author: 'OpenClaw Team' },
  { id: 's2', name: 'Python Interpreter', description: 'Executes python code snippets for complex calculations and data processing.', version: '1.4.5', category: 'tool', enabled: true, author: 'OpenClaw Team' },
  { id: 's3', name: 'SQL Connect', description: 'Read and write access to structured databases with natural language.', version: '0.9.2', category: 'plugin', enabled: false, author: 'Community' },
  { id: 's4', name: 'Vision Pro', description: 'Image analysis and visual understanding capabilities.', version: '1.0.0', category: 'core', enabled: true, author: 'OpenClaw Team' },
];

export default function Skills() {
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const { language } = useAppStore();
  const t = (key: string) => translations[language][key] || key;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('skills')}</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">{t('skills_desc')}</p>
        </div>
        <div className="flex gap-2">
           <div className="bg-gray-100 dark:bg-gray-800 p-1 rounded-xl flex">
              <button 
                onClick={() => setView('grid')}
                className={clsx("p-2 rounded-lg transition-all", view === 'grid' ? "bg-white dark:bg-gray-700 shadow-sm text-primary" : "text-gray-400")}
              >
                <LayoutGrid size={18} />
              </button>
              <button 
                onClick={() => setView('list')}
                className={clsx("p-2 rounded-lg transition-all", view === 'list' ? "bg-white dark:bg-gray-700 shadow-sm text-primary" : "text-gray-400")}
              >
                <List size={18} />
              </button>
           </div>
           <button className="bg-primary text-white hover:bg-primary/90 px-5 py-2.5 rounded-xl font-semibold shadow-lg shadow-primary/20 transition-all active:scale-95 flex items-center gap-2 text-sm">
            <Plus size={18} /> {t('install_skill')}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {MOCK_SKILLS.map((skill) => (
          <div key={skill.id} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-6 shadow-sm hover:shadow-xl transition-all group relative">
            <div className="absolute top-6 right-6">
               <div className={clsx(
                 "h-3 w-3 rounded-full border-2 border-white dark:border-black shadow-sm",
                 skill.enabled ? "bg-green-500" : "bg-gray-300"
               )} />
            </div>
            
            <div className="flex items-center gap-4 mb-6">
              <div className={clsx(
                "p-3 rounded-2xl shadow-inner",
                skill.category === 'core' ? "bg-purple-500/10 text-purple-500" :
                skill.category === 'tool' ? "bg-blue-500/10 text-blue-500" :
                "bg-orange-500/10 text-orange-500"
              )}>
                {skill.category === 'core' ? <Shield size={24} /> : 
                 skill.category === 'tool' ? <Wrench size={24} /> : <Zap size={24} />}
              </div>
              <div>
                <h3 className="font-bold text-lg">{skill.name}</h3>
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">v{skill.version} • {skill.author}</span>
              </div>
            </div>

            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed min-h-[40px]">
              {skill.description}
            </p>

            <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
              <div className="flex gap-1">
                <span className="px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-[10px] font-bold text-gray-500 uppercase">{t(`skill_${skill.category}`)}</span>
              </div>
              <button className={clsx(
                "text-xs font-bold px-4 py-2 rounded-xl transition-all",
                skill.enabled 
                  ? "text-red-500 bg-red-50 hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/20" 
                  : "text-green-500 bg-green-50 hover:bg-green-100 dark:bg-green-500/10 dark:hover:bg-green-500/20"
              )}>
                {skill.enabled ? t('disable') : t('enable')}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
