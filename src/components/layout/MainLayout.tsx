import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { Toaster } from '@/components/ui/Toaster';

export function MainLayout() {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-gray-50 dark:bg-black">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0">
        <Header />
        <main className="flex-1 overflow-auto relative">
          {/* Outlet is where the child routes (pages) will be rendered */}
          <Outlet />
        </main>
      </div>
      <Toaster />
    </div>
  );
}
