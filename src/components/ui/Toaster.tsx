import { useNotificationStore } from '@/stores/useNotificationStore';
import { X, CheckCircle2, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { clsx } from 'clsx';

const ICONS = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
  warning: AlertTriangle,
};

const COLORS = {
  success: 'bg-green-50 text-green-600 border-green-100 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/20',
  error: 'bg-red-50 text-red-600 border-red-100 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20',
  info: 'bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20',
  warning: 'bg-yellow-50 text-yellow-600 border-yellow-100 dark:bg-yellow-500/10 dark:text-yellow-400 dark:border-yellow-500/20',
};

import { XCircle } from 'lucide-react';

export function Toaster() {
  const { notifications, removeNotification } = useNotificationStore();

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3 pointer-events-none">
      {notifications.map((n) => {
        const Icon = ICONS[n.type];
        return (
          <div 
            key={n.id}
            className={clsx(
              "pointer-events-auto min-w-[300px] p-4 rounded-2xl border shadow-2xl flex items-center justify-between gap-4 animate-in slide-in-from-right-8 duration-300",
              COLORS[n.type]
            )}
          >
            <div className="flex items-center gap-3">
              <Icon size={18} />
              <span className="text-sm font-bold tracking-tight">{n.message}</span>
            </div>
            <button 
              onClick={() => removeNotification(n.id)}
              className="p-1 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
