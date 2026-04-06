import { Bell, Moon, Sun, User } from 'lucide-react';
import { useEffect, useState } from 'react';
import { apiClient, clearTokens } from '@/services/api-client';
import { useNotificationStore } from '@/stores/useNotificationStore';
import { useNavigate } from 'react-router-dom';

interface HealthPayload {
  gateway: {
    connected: boolean;
    mode: 'real' | 'mock';
  };
}

export function Header() {
  const [isDark, setIsDark] = useState(true);
  const [health, setHealth] = useState<HealthPayload | null>(null);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const { notifications, clearNotifications } = useNotificationStore();
  const navigate = useNavigate();

  // Initialize theme
  useEffect(() => {
    const isDarkMode = document.documentElement.classList.contains('dark');
    setIsDark(isDarkMode);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadHealth = async () => {
      try {
        const res = await apiClient.get('/health');
        if (!cancelled) {
          setHealth(res.data.data as HealthPayload);
        }
      } catch (error) {
        if (!cancelled) {
          console.error('Failed to load gateway health:', error);
        }
      }
    };

    void loadHealth();
    const timer = window.setInterval(() => void loadHealth(), 30000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    if (next) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const handleLogout = () => {
    clearTokens();
    navigate('/login');
  };

  return (
    <header className="h-16 border-b border-gray-200 dark:border-gray-800 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm flex items-center justify-between px-6 sticky top-0 z-10">
      <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
        <span>
          Gateway:{' '}
          <span className={health?.gateway.connected ? 'text-green-500 font-medium' : 'text-red-500 font-medium'}>
            {health ? `${health.gateway.mode} / ${health.gateway.connected ? 'connected' : 'disconnected'}` : 'checking'}
          </span>
        </span>
      </div>

      <div className="flex items-center gap-4">
        <button 
          onClick={toggleTheme}
          className="p-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          {isDark ? <Sun size={18} /> : <Moon size={18} />}
        </button>
        <div className="relative">
          <button onClick={() => { setIsNotificationsOpen((value) => !value); setIsProfileOpen(false); }} className="p-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <Bell size={18} />
          </button>
          {isNotificationsOpen && (
            <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold">Notifications</span>
                <button onClick={clearNotifications} className="text-xs text-primary font-semibold">Clear all</button>
              </div>
              <div className="space-y-2 max-h-72 overflow-auto">
                {notifications.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400">No notifications</p>
                ) : notifications.map((notification) => (
                  <div key={notification.id} className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60 text-sm">
                    {notification.message}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="relative">
          <button onClick={() => { setIsProfileOpen((value) => !value); setIsNotificationsOpen(false); }} className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-primary cursor-pointer">
            <User size={16} />
          </button>
          {isProfileOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-2xl p-3 space-y-2">
              <div className="px-3 py-2 text-xs uppercase tracking-widest text-gray-400">Session</div>
              <button onClick={handleLogout} className="w-full text-left px-3 py-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-sm font-medium">
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
