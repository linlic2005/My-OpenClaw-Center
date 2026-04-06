import { Suspense, lazy } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import Dashboard from '@/pages/Dashboard';
import Chat from '@/pages/Chat';
import Agents from '@/pages/Agents';
import Channels from '@/pages/Channels';
import Logs from '@/pages/Logs';
import Tasks from '@/pages/Tasks';
import Skills from '@/pages/Skills';
import Settings from '@/pages/Settings';
import Login from '@/pages/Login';

const Office = lazy(() => import('@/pages/Office'));

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<MainLayout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="chat" element={<Chat />} />
            <Route path="agents" element={<Agents />} />
            <Route
              path="office"
              element={(
                <Suspense
                  fallback={(
                    <div className="flex h-full items-center justify-center bg-[#060913] text-slate-100">
                      <div className="text-center">
                        <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-cyan-300 border-t-transparent" />
                        <p className="font-['ArkPixel',monospace] text-xs uppercase tracking-[0.35em] text-cyan-100">
                          Loading Office Runtime
                        </p>
                      </div>
                    </div>
                  )}
                >
                  <Office />
                </Suspense>
              )}
            />
            <Route path="channels" element={<Channels />} />
            <Route path="logs" element={<Logs />} />
            <Route path="tasks" element={<Tasks />} />
            <Route path="skills" element={<Skills />} />
            <Route path="settings" element={<Settings />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
