import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  MessageSquare, 
  Users, 
  MonitorPlay, 
  Network, 
  CalendarClock, 
  Wrench, 
  Settings, 
  TerminalSquare 
} from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useAppStore } from '@/stores/useAppStore';
import { translations } from '@/stores/i18n';

// Utility for tailwind classes
function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

export function Sidebar() {
  const location = useLocation();
  const { language } = useAppStore();
  const t = (key: string) => translations[language][key] || key;

  const navItems = [
    { icon: LayoutDashboard, label: t('dashboard'), path: '/dashboard' },
    { icon: MessageSquare, label: t('chat'), path: '/chat' },
    { icon: Users, label: t('agents'), path: '/agents' },
    { icon: MonitorPlay, label: t('office'), path: '/office' },
    { icon: Network, label: t('channels'), path: '/channels' },
    { icon: CalendarClock, label: t('tasks'), path: '/tasks' },
    { icon: Wrench, label: t('skills'), path: '/skills' },
  ];

  const bottomNavItems = [
    { icon: TerminalSquare, label: t('logs'), path: '/logs' },
    { icon: Settings, label: t('settings'), path: '/settings' },
  ];

  const NavItem = ({ item }: { item: typeof navItems[0] }) => {
    const isActive = location.pathname.startsWith(item.path);
    const Icon = item.icon;
    
    return (
      <Link
        to={item.path}
        className={cn(
          "flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm font-medium",
          isActive 
            ? "bg-primary/10 text-primary dark:bg-primary/20" 
            : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
        )}
      >
        <Icon size={18} />
        {item.label}
      </Link>
    );
  };

  return (
    <aside className="w-64 border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex flex-col h-full">
      <div className="h-16 flex items-center px-6 border-b border-gray-200 dark:border-gray-800">
        <h1 className="font-bold tracking-tight text-lg text-primary">OpenClaw Console</h1>
      </div>
      
      <div className="flex-1 overflow-y-auto py-4 px-3 flex flex-col gap-1">
        {navItems.map((item) => (
          <NavItem key={item.path} item={item} />
        ))}
      </div>

      <div className="p-3 border-t border-gray-200 dark:border-gray-800 flex flex-col gap-1">
        {bottomNavItems.map((item) => (
          <NavItem key={item.path} item={item} />
        ))}
      </div>
    </aside>
  );
}
