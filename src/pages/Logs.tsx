import { useState, useEffect, useRef } from 'react';
import { Terminal, Trash2, Download, Activity, Info, AlertTriangle, XCircle, ShieldCheck } from 'lucide-react';
import { clsx } from 'clsx';
import { LogEntry } from '@/types';
import { useAppStore } from '@/stores/useAppStore';
import { translations } from '@/stores/i18n';
import { realtimeClient } from '@/services/realtime';

const LOG_LEVEL_COLORS = {
  info: 'text-blue-500',
  warn: 'text-yellow-500',
  error: 'text-red-500',
  debug: 'text-gray-500',
};

const LOG_LEVEL_BG = {
  info: 'bg-blue-500/10 border-blue-500/20',
  warn: 'bg-yellow-500/10 border-yellow-500/20',
  error: 'bg-red-500/10 border-red-500/20',
  debug: 'bg-gray-500/10 border-gray-500/20',
};

const LOG_LEVEL_ICONS = {
  info: Info,
  warn: AlertTriangle,
  error: XCircle,
  debug: Activity,
};

export default function Logs() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isPaused, setIsPaused] = useState(false);
  const { language } = useAppStore();
  const t = (key: string) => translations[language][key] || key;

  // SSE log stream from backend
  useEffect(() => {
    if (isPaused) return;

    const unsubscribe = realtimeClient.subscribeLogs((log: LogEntry) => {
      setLogs(prev => [...prev.slice(-100), log]);
    });

    return unsubscribe;
  }, [isPaused]);

  useEffect(() => {
    if (scrollRef.current && !isPaused) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, isPaused]);

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-black p-6 space-y-4">
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 text-primary rounded-xl">
            <Terminal size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">{t('logs')}</h1>
            <p className="text-xs text-gray-500 font-medium uppercase tracking-widest">{t('logs_subtitle')}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setIsPaused(!isPaused)}
            className={clsx(
              "px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-2",
              isPaused 
                ? "bg-yellow-500 text-white shadow-yellow-500/20" 
                : "bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400"
            )}
          >
            {isPaused ? t('resume_stream') : t('pause_stream')}
          </button>
          <button 
            onClick={() => setLogs([])}
            className="p-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl text-gray-500 hover:text-red-500 transition-colors shadow-sm"
          >
            <Trash2 size={18} />
          </button>
          <button className="p-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl text-gray-500 hover:text-primary transition-colors shadow-sm">
            <Download size={18} />
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 bg-white dark:bg-[#0a0a0a] border border-gray-200 dark:border-gray-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden font-mono text-[13px] leading-relaxed">
        <div className="h-10 border-b border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-950/50 flex items-center px-4 justify-between shrink-0">
          <div className="flex items-center gap-4">
             <div className="flex gap-1.5">
               <div className="w-2.5 h-2.5 rounded-full bg-red-500/20 border border-red-500/40" />
               <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/20 border border-yellow-500/40" />
               <div className="w-2.5 h-2.5 rounded-full bg-green-500/20 border border-green-500/40" />
             </div>
             <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{t('console_output')}</span>
          </div>
          <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest flex items-center gap-2">
            <Activity size={12} className="text-green-500" /> Live: {logs.length} events
          </div>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-1 custom-scrollbar">
          {logs.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-4 opacity-50">
               <ShieldCheck size={48} strokeWidth={1} />
               <p className="text-sm">{t('waiting_logs')}</p>
            </div>
          )}
          {logs.map((log) => {
            const Icon = LOG_LEVEL_ICONS[log.level];
            return (
              <div key={log.id} className="group hover:bg-gray-50 dark:hover:bg-gray-800/20 rounded px-2 py-0.5 flex gap-4 transition-colors">
                <span className="text-gray-400 dark:text-gray-600 shrink-0 select-none w-20">
                  {new Date(log.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
                <span className={clsx(
                  "px-1.5 py-0.5 rounded text-[10px] font-black uppercase tracking-tighter shrink-0 border h-fit mt-0.5 flex items-center gap-1",
                  LOG_LEVEL_BG[log.level],
                  LOG_LEVEL_COLORS[log.level]
                )}>
                  <Icon size={10} /> {log.level}
                </span>
                <span className="text-primary/70 font-bold shrink-0 min-w-[100px] uppercase tracking-tighter">
                  [{log.module}]
                </span>
                <span className="text-gray-700 dark:text-gray-300 break-all">
                  {log.message}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
