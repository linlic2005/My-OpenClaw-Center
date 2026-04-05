import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bot, Shield, Key, ArrowRight, Github, Chrome, MessageCircle } from 'lucide-react';
import { useAppStore } from '@/stores/useAppStore';
import { translations } from '@/stores/i18n';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { language } = useAppStore();
  const t = (key: string) => translations[language][key] || key;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    await new Promise(r => setTimeout(r, 1200));
    setIsLoading(false);
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-[#f8f9fc] dark:bg-black flex items-center justify-center p-6 font-sans">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] bg-purple-500/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      <div className="w-full max-w-[440px] z-10">
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-[40px] shadow-2xl p-10 relative overflow-hidden">
          <div className="flex flex-col items-center text-center mb-10">
            <div className="h-16 w-16 bg-primary text-white rounded-3xl flex items-center justify-center shadow-2xl shadow-primary/40 mb-6 rotate-3 hover:rotate-0 transition-transform duration-500">
               <Bot size={36} />
            </div>
            <h1 className="text-3xl font-black tracking-tight mb-2">OpenClaw</h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm font-medium uppercase tracking-widest">{t('gateway_console')}</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <label className="text-[11px] font-black uppercase text-gray-400 tracking-wider ml-1">{t('identity')}</label>
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary transition-colors">
                  <Shield size={18} />
                </div>
                <input 
                  type="text" 
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder={t('identity')}
                  className="w-full bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-2xl pl-12 pr-4 py-4 text-sm focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-black uppercase text-gray-400 tracking-wider ml-1">{t('secret_key')}</label>
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary transition-colors">
                  <Key size={18} />
                </div>
                <input 
                  type="password" 
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-2xl pl-12 pr-4 py-4 text-sm focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                />
              </div>
            </div>

            <div className="flex items-center justify-between px-1 text-xs">
              <label className="flex items-center gap-2 text-gray-500 cursor-pointer">
                 <input type="checkbox" className="rounded border-gray-300 text-primary focus:ring-primary" />
                 <span>{t('remember_instance')}</span>
              </label>
              <a href="#" className="text-primary font-bold hover:underline">{t('forgot_access')}</a>
            </div>

            <button 
              type="submit"
              disabled={isLoading}
              className="w-full bg-primary text-white py-4 rounded-2xl font-black uppercase tracking-widest text-sm shadow-xl shadow-primary/30 hover:shadow-primary/40 active:scale-95 transition-all flex items-center justify-center gap-2 group mt-4"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  {t('login_title')}
                  <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <div className="mt-10 pt-8 border-t border-gray-100 dark:border-gray-800 flex justify-center gap-6">
             <button className="text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
               <Github size={20} />
             </button>
             <button className="text-gray-400 hover:text-blue-500 transition-colors">
               <Chrome size={20} />
             </button>
             <button className="text-gray-400 hover:text-primary transition-colors">
               <MessageCircle size={20} />
             </button>
          </div>
        </div>

        <div className="mt-8 text-center">
           <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em]">OpenClaw Foundation • Secure Gateway v2.4.0</p>
        </div>
      </div>
    </div>
  );
}
