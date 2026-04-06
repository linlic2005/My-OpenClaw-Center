import { useEffect, useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal } from '@/components/ui/Modal';
import { OfficeRuntime } from '@/components/office/runtime/OfficeRuntime';
import { AssetDrawer } from '@/components/office/AssetDrawer';
import { StatusBar } from '@/components/office/StatusBar';
import {
  OFFICE_STATE_LABELS,
  type OfficeRuntimeAgent,
  type OfficeVisualState,
} from '@/components/office/runtime/officeSceneConfig';
import { useAgentStore } from '@/stores/useAgentStore';
import { useChatStore } from '@/stores/useChatStore';
import { useNotificationStore } from '@/stores/useNotificationStore';
import { useOfficeStore } from '@/stores/useOfficeStore';
import { apiClient } from '@/services/api-client';
import {
  Bot,
  DoorOpen,
  LayoutGrid,
  MessageSquare,
  Paintbrush,
  PencilLine,
  Plus,
  Power,
  Radar,
  RefreshCcw,
  Save,
  Server,
  SlidersHorizontal,
  Trash2,
} from 'lucide-react';

interface PlacementDraft {
  roomId: string;
  idleX: number;
  idleY: number;
  workX: number;
  workY: number;
  sleepX: number;
  sleepY: number;
}

interface RoomDraft {
  id: string;
  name: string;
  background: string;
  type: 'public' | 'private';
}

const EMPTY_PLACEMENT: PlacementDraft = {
  roomId: 'public',
  idleX: 1000,
  idleY: 600,
  workX: 920,
  workY: 540,
  sleepX: 1100,
  sleepY: 650,
};

const EMPTY_ROOM: RoomDraft = {
  id: '',
  name: '',
  background: '/assets/star-office/office_bg_small.webp',
  type: 'private',
};

export default function Office() {
  const navigate = useNavigate();
  const { agents, fetchAgents } = useAgentStore();
  const { addNotification } = useNotificationStore();
  const { sessions, activeSessionId, isStreaming, createSession, setActiveSession } = useChatStore();
  const {
    agentAnchors,
    selectedAgentId,
    setSelectedAgent,
    activeRoomId,
    setActiveRoom,
    rooms,
    fetchOfficeData,
  } = useOfficeStore();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedAgentToPlace, setSelectedAgentToPlace] = useState('');
  const [placementDraft, setPlacementDraft] = useState<PlacementDraft>(EMPTY_PLACEMENT);
  const [isSavingPlacement, setIsSavingPlacement] = useState(false);
  const [isRoomModalOpen, setIsRoomModalOpen] = useState(false);
  const [roomModalMode, setRoomModalMode] = useState<'create' | 'edit'>('edit');
  const [roomDraft, setRoomDraft] = useState<RoomDraft>(EMPTY_ROOM);
  const [isSavingRoom, setIsSavingRoom] = useState(false);
  const [isDeletingRoom, setIsDeletingRoom] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [bgVersion, setBgVersion] = useState(0);

  const [isFurnitureModalOpen, setIsFurnitureModalOpen] = useState(false);
  const [furnitureDraft, setFurnitureDraft] = useState<Record<string, number>>({});

  const handleBackgroundChanged = useCallback(() => {
    setBgVersion((v) => v + 1);
    addNotification('背景已更新，刷新场景中...');
  }, [addNotification]);

  useEffect(() => {
    void fetchAgents();
    void fetchOfficeData();
  }, [fetchAgents, fetchOfficeData]);

  const streamingSession = sessions.find((session) => session.id === activeSessionId) || null;
  const streamingAgentId = isStreaming ? streamingSession?.agentId || null : null;
  const currentRoom = rooms[activeRoomId] || rooms.public || null;

  const roomCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    agents.forEach((agent) => {
      const roomId = agentAnchors[agent.id]?.roomId || agent.roomId || 'public';
      counts[roomId] = (counts[roomId] || 0) + 1;
    });
    return counts;
  }, [agentAnchors, agents]);

  const roomAgents = useMemo(() => (
    agents.filter((agent) => {
      const roomId = agentAnchors[agent.id]?.roomId || agent.roomId || 'public';
      return roomId === activeRoomId;
    })
  ), [activeRoomId, agentAnchors, agents]);

  const selectedAgent = useMemo(() => (
    roomAgents.find((agent) => agent.id === selectedAgentId) || null
  ), [roomAgents, selectedAgentId]);

  useEffect(() => {
    if (!selectedAgent) {
      setPlacementDraft(EMPTY_PLACEMENT);
      return;
    }

    const env = agentAnchors[selectedAgent.id];
    setPlacementDraft({
      roomId: env?.roomId || selectedAgent.roomId || 'public',
      idleX: env?.anchors.idle.x ?? EMPTY_PLACEMENT.idleX,
      idleY: env?.anchors.idle.y ?? EMPTY_PLACEMENT.idleY,
      workX: env?.anchors.work.x ?? EMPTY_PLACEMENT.workX,
      workY: env?.anchors.work.y ?? EMPTY_PLACEMENT.workY,
      sleepX: env?.anchors.sleep.x ?? EMPTY_PLACEMENT.sleepX,
      sleepY: env?.anchors.sleep.y ?? EMPTY_PLACEMENT.sleepY,
    });
  }, [agentAnchors, selectedAgent]);

  const runtimeAgents = useMemo<OfficeRuntimeAgent[]>(() => (
    roomAgents.map((agent, index) => {
      const env = agentAnchors[agent.id];
      const isAgentStreaming = streamingAgentId === agent.id;
      const officeState: OfficeVisualState =
        agent.status === 'error'
          ? 'error'
          : agent.status === 'offline'
            ? 'offline'
            : isAgentStreaming
              ? 'syncing'
              : agent.status === 'active'
                ? 'writing'
                : 'idle';

      const fallbackBaseX = 860 + (index % 4) * 110;
      const fallbackBaseY = 500 + Math.floor(index / 4) * 88;
      const fallbackPosition = {
        x: fallbackBaseX,
        y: fallbackBaseY,
      };

      const position =
        officeState === 'error'
          ? env?.anchors.sleep || fallbackPosition
          : officeState === 'offline'
            ? env?.anchors.sleep || fallbackPosition
            : officeState === 'syncing' || officeState === 'writing'
              ? env?.anchors.work || fallbackPosition
              : env?.anchors.idle || fallbackPosition;

      return {
        id: agent.id,
        name: agent.name,
        model: agent.model,
        status: agent.status,
        state: officeState,
        position,
        isSelected: selectedAgentId === agent.id,
        isStreaming: isAgentStreaming,
        roleIndex: index,
      };
    })
  ), [agentAnchors, roomAgents, selectedAgentId, streamingAgentId]);

  const roomOfficeState = useMemo<Exclude<OfficeVisualState, 'offline'>>(() => {
    if (runtimeAgents.some((agent) => agent.state === 'error')) {
      return 'error';
    }
    if (runtimeAgents.some((agent) => agent.state === 'syncing')) {
      return 'syncing';
    }
    if (runtimeAgents.some((agent) => agent.state === 'writing')) {
      return 'writing';
    }
    return 'idle';
  }, [runtimeAgents]);

  if (!currentRoom) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-black text-white">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm uppercase tracking-widest text-white/60">Loading Office</p>
        </div>
      </div>
    );
  }

  const openRoomModal = (mode: 'create' | 'edit') => {
    setRoomModalMode(mode);
    if (mode === 'create') {
      setRoomDraft(EMPTY_ROOM);
    } else {
      setRoomDraft({
        id: currentRoom.id,
        name: currentRoom.name,
        background: currentRoom.background,
        type: currentRoom.type,
      });
    }
    setIsRoomModalOpen(true);
  };

  const handlePlacementDraftChange = (field: keyof PlacementDraft, value: string) => {
    setPlacementDraft((state) => ({
      ...state,
      [field]: field === 'roomId' ? value : Number(value),
    }));
  };

  const handleRoomDraftChange = (field: keyof RoomDraft, value: string) => {
    setRoomDraft((state) => ({
      ...state,
      [field]: value,
    }));
  };

  const handlePlaceAgent = async () => {
    if (!selectedAgentToPlace) {
      addNotification('Please select an agent first.', 'warning');
      return;
    }

    const placementIndex = roomAgents.length;
    const baseX = 880 + (placementIndex % 4) * 140;
    const baseY = 500 + Math.floor(placementIndex / 4) * 120;

    try {
      await apiClient.put(`/office/agents/${selectedAgentToPlace}`, {
        roomId: activeRoomId,
        anchors: {
          idle: { x: baseX, y: baseY },
          work: { x: baseX - 80, y: baseY - 40 },
          sleep: { x: baseX + 120, y: baseY + 40 },
        },
      });
      await fetchOfficeData();
      await fetchAgents();
      setIsAddModalOpen(false);
      setSelectedAgentToPlace('');
      addNotification('Agent placed in room.');
    } catch (error) {
      console.error('Failed to place agent in room:', error);
      addNotification('Failed to place agent in room.', 'error');
    }
  };

  const handleSavePlacement = async () => {
    if (!selectedAgent) {
      return;
    }

    setIsSavingPlacement(true);
    try {
      await apiClient.put(`/office/agents/${selectedAgent.id}`, {
        roomId: placementDraft.roomId,
        anchors: {
          idle: { x: placementDraft.idleX, y: placementDraft.idleY },
          work: { x: placementDraft.workX, y: placementDraft.workY },
          sleep: { x: placementDraft.sleepX, y: placementDraft.sleepY },
        },
      });
      await fetchOfficeData();
      await fetchAgents();
      addNotification(`${selectedAgent.name} placement updated.`);
      if (placementDraft.roomId !== activeRoomId) {
        setSelectedAgent(null);
      }
    } catch (error) {
      console.error('Failed to update placement:', error);
      addNotification(`Failed to update ${selectedAgent.name}.`, 'error');
    } finally {
      setIsSavingPlacement(false);
    }
  };

  const handleSaveRoom = async () => {
    setIsSavingRoom(true);
    try {
      if (roomModalMode === 'create') {
        await apiClient.post('/office/rooms', roomDraft);
        setActiveRoom(roomDraft.id);
        addNotification(`Room ${roomDraft.name} created.`);
      } else {
        await apiClient.patch(`/office/rooms/${roomDraft.id}`, {
          name: roomDraft.name,
          background: roomDraft.background,
          type: roomDraft.type,
        });
        addNotification(`Room ${roomDraft.name} updated.`);
      }

      await fetchOfficeData();
      setIsRoomModalOpen(false);
    } catch (error: any) {
      console.error('Failed to save room:', error);
      const message = error?.response?.data?.error?.message || 'Failed to save room.';
      addNotification(message, 'error');
    } finally {
      setIsSavingRoom(false);
    }
  };

  const handleSaveFurniture = async () => {
    if (!currentRoom) return;
    setIsSavingRoom(true);
    try {
      await apiClient.patch(`/office/rooms/${currentRoom.id}`, {
        furniture: furnitureDraft,
      });
      addNotification(`家具布置已更新。`);
      await fetchOfficeData();
      setIsFurnitureModalOpen(false);
    } catch (error: any) {
      console.error('Failed to save furniture:', error);
      const message = error?.response?.data?.error?.message || 'Failed to save furniture.';
      addNotification(message, 'error');
    } finally {
      setIsSavingRoom(false);
    }
  };

  const handleDeleteRoom = async () => {
    if (roomModalMode !== 'edit') {
      return;
    }

    const confirmed = window.confirm(`Delete room "${roomDraft.name}"? This cannot be undone.`);
    if (!confirmed) {
      return;
    }

    setIsDeletingRoom(true);
    try {
      await apiClient.delete(`/office/rooms/${roomDraft.id}`);
      await fetchOfficeData();
      setActiveRoom('public');
      setIsRoomModalOpen(false);
      addNotification(`Room ${roomDraft.name} deleted.`);
    } catch (error: any) {
      console.error('Failed to delete room:', error);
      const message = error?.response?.data?.error?.message || 'Failed to delete room.';
      addNotification(message, 'error');
    } finally {
      setIsDeletingRoom(false);
    }
  };

  const handleQuickChat = async () => {
    if (!selectedAgent) {
      return;
    }

    const existingSession = sessions.find((session) => session.agentId === selectedAgent.id);
    if (existingSession) {
      setActiveSession(existingSession.id);
      navigate('/chat');
      return;
    }

    const sessionId = await createSession(selectedAgent.id);
    if (sessionId) {
      navigate('/chat');
    }
  };

  const handleRestartAgent = async () => {
    if (!selectedAgent) {
      return;
    }

    try {
      await apiClient.post(`/agents/${selectedAgent.id}/restart`);
      addNotification(`${selectedAgent.name} restarted.`);
      await fetchAgents();
    } catch (error) {
      console.error('Failed to restart agent:', error);
      addNotification(`Failed to restart ${selectedAgent.name}.`, 'error');
    }
  };

  return (
    <div className="relative min-h-full overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.12),_transparent_30%),radial-gradient(circle_at_top_right,_rgba(124,58,237,0.12),_transparent_26%),linear-gradient(180deg,_#050816_0%,_#0b1020_48%,_#0a0f1d_100%)] p-6">
      <div className="mx-auto flex max-w-[1680px] flex-col gap-6">
        <div className="flex flex-col gap-4 rounded-[28px] border border-white/10 bg-white/5 p-5 shadow-[0_24px_80px_rgba(2,8,23,0.48)] backdrop-blur-xl xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center">
            <div className="flex items-center gap-3 rounded-2xl border border-cyan-400/25 bg-cyan-400/10 px-4 py-3">
              <DoorOpen size={18} className="text-cyan-200" />
              <div className="font-['ArkPixel',monospace] text-xs uppercase tracking-[0.28em] text-cyan-100">
                Star Office Runtime
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {Object.values(rooms).map((room) => (
                <button
                  key={room.id}
                  onClick={() => setActiveRoom(room.id)}
                  className={[
                    'rounded-2xl border px-4 py-3 text-left transition-all',
                    activeRoomId === room.id
                      ? 'border-cyan-300/60 bg-cyan-300/15 text-white shadow-[0_0_24px_rgba(34,211,238,0.15)]'
                      : 'border-white/10 bg-white/5 text-slate-400 hover:border-white/20 hover:bg-white/10 hover:text-slate-100',
                  ].join(' ')}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-semibold">{room.name}</span>
                    <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] uppercase tracking-[0.2em] text-slate-300">
                      {roomCounts[room.id] || 0}
                    </span>
                  </div>
                  <div className="mt-1 text-xs uppercase tracking-[0.25em] text-slate-500">{room.type}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => {
                void fetchAgents();
                void fetchOfficeData();
              }}
              className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:bg-white/10"
            >
              <RefreshCcw size={16} />
              刷新场景
            </button>
            <button
              onClick={() => openRoomModal('edit')}
              className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:bg-white/10"
            >
              <PencilLine size={16} />
              管理房间
            </button>
            <button
              onClick={() => {
                setFurnitureDraft(currentRoom?.furniture || {
                  poster: 0, flower: 0, plant1: 0, plant2: 0, plant3: 0, cat: 0
                });
                setIsFurnitureModalOpen(true);
              }}
              className="inline-flex items-center gap-2 rounded-2xl border border-indigo-300/30 bg-indigo-300/10 px-4 py-3 text-sm font-semibold text-indigo-100 transition hover:bg-indigo-300/15"
            >
              <LayoutGrid size={16} />
              布置家具
            </button>
            <button
              onClick={() => setIsDrawerOpen(true)}
              className="inline-flex items-center gap-2 rounded-2xl border border-amber-300/30 bg-amber-300/10 px-4 py-3 text-sm font-semibold text-amber-100 transition hover:bg-amber-300/15"
            >
              <Paintbrush size={16} />
              装修图床
            </button>
            <button
              onClick={() => openRoomModal('create')}
              className="inline-flex items-center gap-2 rounded-2xl border border-cyan-300/30 bg-cyan-300/10 px-4 py-3 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-300/15"
            >
              <Plus size={16} />
              新建房间
            </button>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-2xl bg-cyan-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:brightness-110"
            >
              <Plus size={16} />
              放置 Agent
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="flex min-w-0 flex-col gap-5">
            <div className="rounded-[32px] border border-white/10 bg-[#040814]/70 p-4 backdrop-blur-xl">
              <OfficeRuntime
                key={`${currentRoom.id}:${currentRoom.background}:${bgVersion}`}
                payload={{
                  agents: runtimeAgents,
                  roomName: currentRoom.name,
                  roomBackground: currentRoom.background,
                  officeState: roomOfficeState,
                  furniture: currentRoom.furniture,
                }}
                onAgentSelect={setSelectedAgent}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <div className="rounded-[24px] border border-white/10 bg-white/5 p-5">
                <div className="flex items-center gap-3 text-slate-100">
                  <Radar size={18} className="text-cyan-200" />
                  <span className="font-['ArkPixel',monospace] text-xs uppercase tracking-[0.25em]">房间状态</span>
                </div>
                <div className="mt-4 text-2xl font-black text-white">{OFFICE_STATE_LABELS[roomOfficeState]}</div>
                <p className="mt-2 text-sm text-slate-400">
                  房间状态由当前 Agent 活动状态聚合计算，将持续驱动办公室的整体氛围动画。
                </p>
              </div>

              <div className="rounded-[24px] border border-white/10 bg-white/5 p-5">
                <div className="flex items-center gap-3 text-slate-100">
                  <Bot size={18} className="text-cyan-200" />
                  <span className="font-['ArkPixel',monospace] text-xs uppercase tracking-[0.25em]">当前数量</span>
                </div>
                <div className="mt-4 text-2xl font-black text-white">{roomAgents.length}</div>
                <p className="mt-2 text-sm text-slate-400">
                  分配到当前房间的 Agent。点击场景中的任意角色即可查看并管理他的配置。
                </p>
              </div>

              <div className="rounded-[24px] border border-white/10 bg-white/5 p-5">
                <div className="flex items-center gap-3 text-slate-100">
                  <Server size={18} className="text-cyan-200" />
                  <span className="font-['ArkPixel',monospace] text-xs uppercase tracking-[0.25em]">实时活跃状态</span>
                </div>
                <div className="mt-4 text-2xl font-black text-white">
                  {streamingAgentId ? '有对话进行中' : '全员待机'}
                </div>
                <p className="mt-2 text-sm text-slate-400">
                  当有活跃对话正在进行时，场景会点亮同步灯特效并触发对应的气泡反馈。
                </p>
              </div>
            </div>
          </div>

          <aside className="flex flex-col gap-5">
            <div className="rounded-[28px] border border-white/10 bg-white/5 p-5 shadow-[0_20px_60px_rgba(2,8,23,0.35)]">
              <div className="font-['ArkPixel',monospace] text-xs uppercase tracking-[0.28em] text-cyan-100">
                当前选中角色
              </div>

              {selectedAgent ? (
                <div className="mt-4 space-y-4">
                  <div className="rounded-3xl border border-white/10 bg-[#0b1220] p-4">
                    <div className="text-lg font-black text-white">{selectedAgent.name}</div>
                    <div className="mt-1 text-xs uppercase tracking-[0.25em] text-slate-400">{selectedAgent.model}</div>
                    <div className="mt-4 inline-flex rounded-full border border-cyan-300/30 bg-cyan-300/10 px-3 py-1 text-xs font-semibold text-cyan-100">
                      {selectedAgent.status}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => void handleQuickChat()}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl bg-cyan-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:brightness-110"
                    >
                      <MessageSquare size={16} />
                      发起对话
                    </button>
                    <button
                      onClick={() => void handleRestartAgent()}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl border border-rose-300/25 bg-rose-400/10 px-4 py-3 text-sm font-semibold text-rose-100 transition hover:bg-rose-400/15"
                    >
                      <Power size={16} />
                      重新启动
                    </button>
                  </div>

                  <div className="rounded-3xl border border-white/10 bg-[#0b1220] p-4">
                    <div className="mb-4 flex items-center gap-2 text-white">
                      <SlidersHorizontal size={16} className="text-cyan-200" />
                      <span className="font-semibold">坐标配置器</span>
                    </div>

                    <div className="space-y-4 text-sm text-slate-300">
                      <div>
                        <label className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                          所在房间
                        </label>
                        <select
                          value={placementDraft.roomId}
                          onChange={(e) => handlePlacementDraftChange('roomId', e.target.value)}
                          className="w-full rounded-2xl border border-white/10 bg-[#111a2d] px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-cyan-300/40"
                        >
                          {Object.values(rooms).map((room) => (
                            <option key={room.id} value={room.id}>{room.name}</option>
                          ))}
                        </select>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <label className="block">
                          <span className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-slate-500">空闲参数 X</span>
                          <input
                            type="number"
                            value={placementDraft.idleX}
                            onChange={(e) => handlePlacementDraftChange('idleX', e.target.value)}
                            className="w-full rounded-2xl border border-white/10 bg-[#111a2d] px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-cyan-300/40"
                          />
                        </label>
                        <label className="block">
                          <span className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-slate-500">空闲参数 Y</span>
                          <input
                            type="number"
                            value={placementDraft.idleY}
                            onChange={(e) => handlePlacementDraftChange('idleY', e.target.value)}
                            className="w-full rounded-2xl border border-white/10 bg-[#111a2d] px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-cyan-300/40"
                          />
                        </label>
                        <label className="block">
                          <span className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-slate-500">工作参数 X</span>
                          <input
                            type="number"
                            value={placementDraft.workX}
                            onChange={(e) => handlePlacementDraftChange('workX', e.target.value)}
                            className="w-full rounded-2xl border border-white/10 bg-[#111a2d] px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-cyan-300/40"
                          />
                        </label>
                        <label className="block">
                          <span className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-slate-500">工作参数 Y</span>
                          <input
                            type="number"
                            value={placementDraft.workY}
                            onChange={(e) => handlePlacementDraftChange('workY', e.target.value)}
                            className="w-full rounded-2xl border border-white/10 bg-[#111a2d] px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-cyan-300/40"
                          />
                        </label>
                        <label className="block">
                          <span className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-slate-500">休眠参数 X</span>
                          <input
                            type="number"
                            value={placementDraft.sleepX}
                            onChange={(e) => handlePlacementDraftChange('sleepX', e.target.value)}
                            className="w-full rounded-2xl border border-white/10 bg-[#111a2d] px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-cyan-300/40"
                          />
                        </label>
                        <label className="block">
                          <span className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-slate-500">休眠参数 Y</span>
                          <input
                            type="number"
                            value={placementDraft.sleepY}
                            onChange={(e) => handlePlacementDraftChange('sleepY', e.target.value)}
                            className="w-full rounded-2xl border border-white/10 bg-[#111a2d] px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-cyan-300/40"
                          />
                        </label>
                      </div>

                      <button
                        onClick={() => void handleSavePlacement()}
                        disabled={isSavingPlacement}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-cyan-300/30 bg-cyan-300/10 px-4 py-3 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-300/15 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <Save size={16} />
                        {isSavingPlacement ? '保存中...' : '保存坐标配置'}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="mt-4 text-sm text-slate-400">
                  选中左侧场景中的角色替身以查看扩展面板，发起对话或调整该角色在房间内的专属坐标。
                </p>
              )}
            </div>

            <div className="rounded-[28px] border border-white/10 bg-white/5 p-5 shadow-[0_20px_60px_rgba(2,8,23,0.35)]">
              <div className="font-['ArkPixel',monospace] text-xs uppercase tracking-[0.28em] text-cyan-100">
                房间角色名单
              </div>
              <div className="mt-4 space-y-3">
                {roomAgents.length > 0 ? roomAgents.map((agent) => (
                  <button
                    key={agent.id}
                    onClick={() => setSelectedAgent(agent.id)}
                    className={[
                      'flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left transition',
                      selectedAgent?.id === agent.id
                        ? 'border-cyan-300/50 bg-cyan-300/10'
                        : 'border-white/10 bg-[#0b1220] hover:border-white/20 hover:bg-[#111a2d]',
                    ].join(' ')}
                  >
                    <div>
                      <div className="font-semibold text-white">{agent.name}</div>
                      <div className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-500">{agent.model}</div>
                    </div>
                    <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">{agent.status}</div>
                  </button>
                )) : (
                  <p className="text-sm text-slate-400">当前房间暂未分配任何角色。</p>
                )}
              </div>
            </div>
          </aside>
        </div>

        {/* Status Bar */}
        <div className="flex justify-center">
          <StatusBar
            roomName={currentRoom.name}
            officeState={roomOfficeState}
            detail={runtimeAgents.find((a) => a.isStreaming)?.name || undefined}
          />
        </div>
      </div>

      {/* Asset Drawer */}
      <AssetDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onBackgroundChanged={handleBackgroundChanged}
      />

      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="将角色分配至房间"
      >
        <div className="space-y-4 py-4">
          <div>
            <label className="mb-1 block text-xs font-bold uppercase text-gray-400">选择角色</label>
            <select
              value={selectedAgentToPlace}
              onChange={(e) => setSelectedAgentToPlace(e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-800 dark:bg-gray-900"
            >
              <option value="">请选择你要投放的 Agent</option>
              {agents.map((agent) => (
                <option key={agent.id} value={agent.id}>{agent.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold uppercase text-gray-400">目标房间</label>
            <div className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm dark:border-gray-800 dark:bg-gray-800/50">
              {currentRoom.name}
            </div>
          </div>
          <button
            onClick={() => void handlePlaceAgent()}
            className="w-full rounded-xl bg-primary py-3 font-bold text-white transition-opacity hover:opacity-90"
          >
            确认放置
          </button>
        </div>
      </Modal>

      <Modal
        isOpen={isRoomModalOpen}
        onClose={() => setIsRoomModalOpen(false)}
        title={roomModalMode === 'create' ? '新建房间' : '修改房间配置'}
      >
        <div className="space-y-4 py-4">
          <div>
            <label className="mb-1 block text-xs font-bold uppercase text-gray-400">房间 ID</label>
            <input
              value={roomDraft.id}
              onChange={(e) => handleRoomDraftChange('id', e.target.value)}
              disabled={roomModalMode === 'edit'}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm disabled:cursor-not-allowed disabled:bg-gray-100 dark:border-gray-800 dark:bg-gray-900 dark:disabled:bg-gray-800"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold uppercase text-gray-400">名称组合</label>
            <input
              value={roomDraft.name}
              onChange={(e) => handleRoomDraftChange('name', e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-800 dark:bg-gray-900"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold uppercase text-gray-400">背景图 URL</label>
            <input
              value={roomDraft.background}
              onChange={(e) => handleRoomDraftChange('background', e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-800 dark:bg-gray-900"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold uppercase text-gray-400">房间访问类型</label>
            <select
              value={roomDraft.type}
              onChange={(e) => handleRoomDraftChange('type', e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-800 dark:bg-gray-900"
            >
              <option value="public">Public (公开展示)</option>
              <option value="private">Private (私密场景)</option>
            </select>
          </div>

          <button
            onClick={() => void handleSaveRoom()}
            disabled={isSavingRoom}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 font-bold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Save size={16} />
            {isSavingRoom ? '正在保存...' : roomModalMode === 'create' ? '立即创建' : '保存更改'}
          </button>

          {roomModalMode === 'edit' && (
            <button
              onClick={() => void handleDeleteRoom()}
              disabled={isDeletingRoom}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 py-3 font-bold text-rose-600 transition-colors hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200 dark:hover:bg-rose-500/15"
            >
              <Trash2 size={16} />
              {isDeletingRoom ? '执行中...' : '删除此房间'}
            </button>
          )}
        </div>
      </Modal>

      <Modal
        isOpen={isFurnitureModalOpen}
        onClose={() => setIsFurnitureModalOpen(false)}
        title="布置家具 (自定义场景组件)"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: '海报 (32种)', key: 'poster', max: 31 },
              { label: '前景花 (16种)', key: 'flower', max: 15 },
              { label: '背景草丛 A (16种)', key: 'plant1', max: 15 },
              { label: '背景草丛 B (16种)', key: 'plant2', max: 15 },
              { label: '背景草丛 C (16种)', key: 'plant3', max: 15 },
              { label: '小猫咪 (16种)', key: 'cat', max: 15 },
            ].map(({ label, key, max }) => (
              <div key={key} className="flex flex-col gap-1">
                <label className="text-xs font-bold text-gray-400">{label}</label>
                <div className="flex gap-2">
                  <input
                    type="range"
                    min="0"
                    max={max}
                    value={furnitureDraft[key] ?? 0}
                    onChange={(e) => setFurnitureDraft((prev) => ({ ...prev, [key]: parseInt(e.target.value) }))}
                    className="flex-1"
                  />
                  <span className="w-6 text-xs text-gray-500 font-mono">{furnitureDraft[key] ?? 0}</span>
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={() => void handleSaveFurniture()}
            disabled={isSavingRoom}
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-500 py-3 font-bold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Save size={16} />
            {isSavingRoom ? '正在保存...' : '应用方案'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
