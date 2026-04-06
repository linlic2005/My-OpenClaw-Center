import { Outlet } from 'react-router-dom';
import { useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { Toaster } from '@/components/ui/Toaster';
import { realtimeClient, type RealtimeEvent } from '@/services/realtime';
import { useAgentStore } from '@/stores/useAgentStore';
import { useOfficeStore } from '@/stores/useOfficeStore';

export function MainLayout() {
  const { fetchAgents, updateAgentStatus, upsertAgent, removeAgent } = useAgentStore();
  const { fetchOfficeData } = useOfficeStore();

  useEffect(() => {
    void fetchAgents();

    const unsubscribeAgents = realtimeClient.subscribeChannel('agents', (event: RealtimeEvent) => {
      if (event.type === 'agent.status_changed' && typeof event.data === 'object' && event.data) {
        const payload = event.data as { id?: string; status?: 'active' | 'idle' | 'error' | 'offline' };
        if (payload.id && payload.status) {
          updateAgentStatus(payload.id, payload.status);
          return;
        }
      }

      if (event.type === 'agent.created' && typeof event.data === 'object' && event.data) {
        upsertAgent(event.data as Parameters<typeof upsertAgent>[0]);
        return;
      }

      if (event.type === 'agent.deleted' && typeof event.data === 'object' && event.data) {
        const payload = event.data as { id?: string };
        if (payload.id) {
          removeAgent(payload.id);
          return;
        }
      }

      void fetchAgents();
    });

    const unsubscribeOffice = realtimeClient.subscribeChannel('office', () => {
      void fetchOfficeData();
    });

    return () => {
      unsubscribeAgents();
      unsubscribeOffice();
    };
  }, [fetchAgents, fetchOfficeData, removeAgent, updateAgentStatus, upsertAgent]);

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
