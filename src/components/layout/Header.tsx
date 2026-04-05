import { Bell, Moon, Sun, User } from 'lucide-react';
import { useEffect, useState } from 'react';

export function Header() {
  const [isDark, setIsDark] = useState(true);

  // Initialize theme
  useEffect(() => {
    const isDarkMode = document.documentElement.classList.contains('dark');
    setIsDark(isDarkMode);
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

  return (
    <header className="h-16 border-b border-gray-200 dark:border-gray-800 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm flex items-center justify-between px-6 sticky top-0 z-10">
      <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
        {/* Placeholder for Breadcrumbs */}
        <span>Gateway: <span className="text-green-500 font-medium">Connected</span></span>
      </div>

      <div className="flex items-center gap-4">
        <button 
          onClick={toggleTheme}
          className="p-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          {isDark ? <Sun size={18} /> : <Moon size={18} />}
        </button>
        <button className="p-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
          <Bell size={18} />
        </button>
        <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-primary cursor-pointer">
          <User size={16} />
        </div>
      </div>
    </header>
  );
}
