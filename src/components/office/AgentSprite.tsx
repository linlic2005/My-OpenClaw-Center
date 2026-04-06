import { Agent } from '@/types';
import { useOfficeStore } from '@/stores/useOfficeStore';
import { useChatStore } from '@/stores/useChatStore';
import { useAppStore } from '@/stores/useAppStore';
import { useNotificationStore } from '@/stores/useNotificationStore';
import { translations } from '@/stores/i18n';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, Settings2, Power, Activity } from 'lucide-react';
import { clsx } from 'clsx';
import { useMemo, useState } from 'react';
import { apiClient } from '@/services/api-client';
import { Modal } from '@/components/ui/Modal';

interface AgentSpriteProps {
  agent: Agent;
}

export function AgentSprite({ agent }: AgentSpriteProps) {
  const { selectedAgentId, setSelectedAgent, agentAnchors, rooms, fetchOfficeData } = useOfficeStore();
  const { isStreaming, activeSessionId, sessions } = useChatStore();
  const { language } = useAppStore();
  const { addNotification } = useNotificationStore();
  const t = (key: string) => translations[language][key] || key;
  const navigate = useNavigate();

  const [imgError, setImgError] = useState(false);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [configState, setConfigState] = useState({
    roomId: agent.roomId || 'public',
    idleX: agentAnchors[agent.id]?.anchors.idle.x ?? 1000,
    idleY: agentAnchors[agent.id]?.anchors.idle.y ?? 600,
    workX: agentAnchors[agent.id]?.anchors.work.x ?? 920,
    workY: agentAnchors[agent.id]?.anchors.work.y ?? 540,
    sleepX: agentAnchors[agent.id]?.anchors.sleep.x ?? 1100,
    sleepY: agentAnchors[agent.id]?.anchors.sleep.y ?? 650,
  });

  const isSelected = selectedAgentId === agent.id;
  const isThinking = isStreaming && sessions.find((session) => session.id === activeSessionId)?.agentId === agent.id;

  const currentPos = useMemo(() => {
    const env = agentAnchors[agent.id];
    if (!env) return { x: 0, y: 0 };

    let anchor = env.anchors.idle;
    if (isThinking || agent.status === 'active') anchor = env.anchors.work;
    if (agent.status === 'offline' || agent.status === 'error') anchor = env.anchors.sleep;

    return { x: anchor.x, y: anchor.y };
  }, [agent.status, isThinking, agentAnchors, agent.id]);

  const agentImage = useMemo(() => {
    if (imgError) return '/assets/agents/blob-default.svg';

    let state = 'idle';
    if (isThinking || agent.status === 'active') state = 'working';
    if (agent.status === 'offline' || agent.status === 'error') state = 'sleeping';

    return `/assets/agents/robot-${state}.webp`;
  }, [agent.status, isThinking, imgError]);

  const handleQuickChat = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const existingSession = sessions.find((session) => session.agentId === agent.id);
    if (existingSession) {
      useChatStore.getState().setActiveSession(existingSession.id);
      navigate('/chat');
      return;
    }

    const sessionId = await useChatStore.getState().createSession(agent.id);
    if (sessionId) {
      navigate('/chat');
    }
  };

  const handleRestartAgent = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await apiClient.post(`/agents/${agent.id}/restart`);
      addNotification(`${agent.name} restarted.`);
    } catch (error) {
      console.error('Failed to restart agent:', error);
      addNotification(`Failed to restart ${agent.name}.`, 'error');
    }
  };

  const openConfig = (e: React.MouseEvent) => {
    e.stopPropagation();
    const env = agentAnchors[agent.id];
    setConfigState({
      roomId: env?.roomId || agent.roomId || 'public',
      idleX: env?.anchors.idle.x ?? 1000,
      idleY: env?.anchors.idle.y ?? 600,
      workX: env?.anchors.work.x ?? 920,
      workY: env?.anchors.work.y ?? 540,
      sleepX: env?.anchors.sleep.x ?? 1100,
      sleepY: env?.anchors.sleep.y ?? 650,
    });
    setIsConfigOpen(true);
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.put(`/office/agents/${agent.id}`, {
        roomId: configState.roomId,
        anchors: {
          idle: { x: Number(configState.idleX), y: Number(configState.idleY) },
          work: { x: Number(configState.workX), y: Number(configState.workY) },
          sleep: { x: Number(configState.sleepX), y: Number(configState.sleepY) },
        },
      });
      await fetchOfficeData();
      setIsConfigOpen(false);
      addNotification(`${agent.name} office placement updated.`);
    } catch (error) {
      console.error('Failed to update office placement:', error);
      addNotification(`Failed to update ${agent.name}.`, 'error');
    }
  };

  return (
    <div
      className="absolute transition-all duration-[1500ms] cubic-bezier(0.4, 0, 0.2, 1) cursor-pointer group"
      style={{
        left: currentPos.x,
        top: currentPos.y,
        transform: 'translate(-50%, -50%)',
        zIndex: isSelected ? 50 : 20,
      }}
      onClick={(e) => {
        e.stopPropagation();
        setSelectedAgent(isSelected ? null : agent.id);
      }}
    >
      {isThinking && (
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none z-50">
          <div className="bg-primary text-white px-4 py-1.5 rounded-full text-[10px] font-black tracking-widest flex items-center gap-2 shadow-[0_0_25px_rgba(var(--primary),0.6)] animate-bounce border-2 border-white/20">
            <Activity size={12} className="animate-pulse" />
            {t('thinking')}
          </div>
          <div className="w-0.5 h-10 bg-gradient-to-b from-primary to-transparent" />
        </div>
      )}

      <div
        className={clsx(
          'relative transition-all duration-500 flex flex-col items-center',
          isSelected ? 'scale-110' : 'hover:scale-105',
          agent.status === 'offline' && 'grayscale opacity-60',
        )}
      >
        <div className="animate-[bounce_4s_infinite_ease-in-out]">
          <div className="relative w-64 h-64 flex items-center justify-center">
            <div className="absolute inset-16 bg-blue-500/10 blur-3xl rounded-full pointer-events-none" />
            <img
              src={agentImage}
              alt={agent.name}
              onError={() => setImgError(true)}
              className="w-full h-full object-contain relative z-10 drop-shadow-2xl"
            />
            <div
              className={clsx(
                'absolute inset-4 border-2 border-dashed border-primary/40 rounded-full transition-opacity duration-500',
                isSelected ? 'opacity-100 animate-[spin_10s_linear_infinite]' : 'opacity-0',
              )}
            />
          </div>
        </div>
        <div className="w-24 h-4 bg-black/20 dark:bg-black/40 blur-lg rounded-[100%] transition-all duration-500 animate-[pulse_4s_infinite_ease-in-out] scale-x-125 -mt-8" />
      </div>

      <div
        className={clsx(
          'absolute top-full mt-6 left-1/2 -translate-x-1/2 flex flex-col items-center transition-all duration-300',
          isSelected ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0',
        )}
      >
        <div className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-md px-4 py-1.5 rounded-2xl border border-gray-200 dark:border-white/10 shadow-2xl flex flex-col items-center">
          <span className="text-[11px] font-black uppercase tracking-widest text-gray-800 dark:text-gray-100">{agent.name}</span>
          <span className="text-[9px] font-bold text-primary/70 uppercase tracking-tighter">{agent.model}</span>
        </div>
      </div>

      {isSelected && (
        <div className="absolute left-full ml-10 top-1/2 -translate-y-1/2 flex flex-col gap-3 z-[60] animate-in fade-in slide-in-from-left-6 duration-500">
          <button onClick={handleQuickChat} className="h-14 w-14 bg-primary text-white rounded-2xl shadow-2xl shadow-primary/30 flex items-center justify-center hover:scale-110 active:scale-95 transition-all border-2 border-white/20">
            <MessageSquare size={24} />
          </button>
          <button onClick={openConfig} className="h-12 w-12 bg-white/90 dark:bg-gray-800/90 text-gray-600 dark:text-gray-300 rounded-2xl shadow-xl flex items-center justify-center hover:scale-110 transition-all border border-gray-200 dark:border-white/10 backdrop-blur-md">
            <Settings2 size={20} />
          </button>
          <button onClick={(e) => void handleRestartAgent(e)} className="h-12 w-12 bg-red-50 dark:bg-red-500/10 text-red-500 rounded-2xl shadow-xl flex items-center justify-center hover:scale-110 transition-all border border-red-100 dark:border-red-500/20">
            <Power size={20} />
          </button>
        </div>
      )}

      <Modal isOpen={isConfigOpen} onClose={() => setIsConfigOpen(false)} title={`${agent.name} Office Settings`}>
        <form onSubmit={handleSaveConfig} className="space-y-4">
          <select value={configState.roomId} onChange={(e) => setConfigState((state) => ({ ...state, roomId: e.target.value }))} className="w-full bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-3 text-sm outline-none">
            {Object.values(rooms).map((room) => (
              <option key={room.id} value={room.id}>{room.name}</option>
            ))}
          </select>
          <div className="grid grid-cols-2 gap-3">
            <input type="number" value={configState.idleX} onChange={(e) => setConfigState((state) => ({ ...state, idleX: Number(e.target.value) }))} placeholder="Idle X" className="w-full bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-3 text-sm outline-none" />
            <input type="number" value={configState.idleY} onChange={(e) => setConfigState((state) => ({ ...state, idleY: Number(e.target.value) }))} placeholder="Idle Y" className="w-full bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-3 text-sm outline-none" />
            <input type="number" value={configState.workX} onChange={(e) => setConfigState((state) => ({ ...state, workX: Number(e.target.value) }))} placeholder="Work X" className="w-full bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-3 text-sm outline-none" />
            <input type="number" value={configState.workY} onChange={(e) => setConfigState((state) => ({ ...state, workY: Number(e.target.value) }))} placeholder="Work Y" className="w-full bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-3 text-sm outline-none" />
            <input type="number" value={configState.sleepX} onChange={(e) => setConfigState((state) => ({ ...state, sleepX: Number(e.target.value) }))} placeholder="Sleep X" className="w-full bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-3 text-sm outline-none" />
            <input type="number" value={configState.sleepY} onChange={(e) => setConfigState((state) => ({ ...state, sleepY: Number(e.target.value) }))} placeholder="Sleep Y" className="w-full bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-3 text-sm outline-none" />
          </div>
          <button className="w-full bg-primary text-white py-3 rounded-xl font-semibold">Save Placement</button>
        </form>
      </Modal>
    </div>
  );
}
