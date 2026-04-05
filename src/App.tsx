import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { MainLayout } from '@/components/layout/MainLayout'
import Dashboard from '@/pages/Dashboard'
import Chat from '@/pages/Chat'
import Agents from '@/pages/Agents'
import Office from '@/pages/Office'
import Channels from '@/pages/Channels'
import Logs from '@/pages/Logs'
import Tasks from '@/pages/Tasks'
import Skills from '@/pages/Skills'
import Settings from '@/pages/Settings'
import Login from '@/pages/Login'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<MainLayout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="chat" element={<Chat />} />
          <Route path="agents" element={<Agents />} />
          <Route path="office" element={<Office />} />
          <Route path="channels" element={<Channels />} />
          <Route path="logs" element={<Logs />} />
          <Route path="tasks" element={<Tasks />} />
          <Route path="skills" element={<Skills />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
