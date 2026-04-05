import { Agent } from '@/types';
import { useOfficeStore } from '@/stores/useOfficeStore';
import { useChatStore } from '@/stores/useChatStore';
import { useAppStore } from '@/stores/useAppStore';
import { translations } from '@/stores/i18n';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, Info, User, Bot, Sparkles } from 'lucide-react';
import { clsx } from 'clsx';

interface AgentSpriteProps {
  agent: Agent;
  position: { x: number; y: number };
}

export function AgentSprite({ agent, position }: AgentSpriteProps) {
  const { selectedAgentId, setSelectedAgent } = useOfficeStore();
  const { isStreaming, activeSessionId, sessions } = useChatStore();
  const { language } = useAppStore();
  const t = (key: string) => translations[language][key] || key;
  const navigate = useNavigate();
  
  const isSelected = selectedAgentId === agent.id;
  const isThinking = isStreaming && sessions.find(s => s.id === activeSessionId)?.agentId === agent.id;

  const handleQuickChat = (e: React.MouseEvent) => {
    e.stopPropagation();
    const existingSession = sessions.find(s => s.agentId === agent.id);
    if (existingSession) {
      useChatStore.getState().setActiveSession(existingSession.id);
    } else {
      useChatStore.getState().createSession(agent.id);
    }
    navigate('/chat');
  };

  return (
    <div 
      className="absolute transition-all duration-500 ease-out cursor-pointer group"
      style={{ 
        left: position.x, 
        top: position.y,
        transform: 'translate(-50%, -50%)' 
      }}
      onClick={(e) => {
        e.stopPropagation();
        setSelectedAgent(isSelected ? null : agent.id);
      }}
    >
      <div className={clsx(
        "absolute inset-[-12px] rounded-full border-2 border-dashed transition-all duration-300 opacity-0 scale-75",
        isSelected ? "opacity-100 scale-100 border-primary animate-[spin_8s_linear_infinite]" : "group-hover:opacity-40 group-hover:scale-90 border-gray-400"
      )} />

      {isThinking && (
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 flex flex-col items-center">
          <div className="bg-white dark:bg-gray-800 px-2 py-1 rounded-md shadow-lg border border-primary/20 flex items-center gap-1.5 animate-bounce">
             <Sparkles size={12} className="text-yellow-500 fill-yellow-500" />
             <span className="text-[10px] font-bold text-primary whitespace-nowrap">{t('thinking')}</span>
          </div>
          <div className="w-2 h-2 bg-white dark:bg-gray-800 rotate-45 border-r border-b border-primary/20 -mt-1" />
        </div>
      )}

      <div className={clsx(
        "relative h-16 w-16 rounded-2xl flex items-center justify-center shadow-2xl transition-all duration-300",
        agent.status === 'active' ? "bg-primary text-white" : "bg-white dark:bg-gray-800 text-gray-500",
        isSelected && "scale-110 shadow-primary/20 ring-4 ring-primary/30"
      )}>
        {agent.status === 'active' ? <Bot size={32} /> : <User size={32} />}
        <div className={clsx(
          "absolute -bottom-1 -right-1 h-5 w-5 rounded-full border-2 border-white dark:border-black shadow-sm",
          agent.status === 'active' ? "bg-green-500" : 
          agent.status === 'idle' ? "bg-gray-400" : "bg-red-500"
        )} />
      </div>

      <div className="absolute top-full mt-3 left-1/2 -translate-x-1/2 whitespace-nowrap pointer-events-none">
        <div className="bg-gray-900/80 dark:bg-gray-800/90 backdrop-blur-sm text-white px-2 py-0.5 rounded text-[11px] font-semibold tracking-tight shadow-md">
          {agent.name}
        </div>
      </div>

      {isSelected && (
        <div className="absolute left-full ml-4 top-1/2 -translate-y-1/2 flex flex-col gap-2 z-20 animate-in fade-in slide-in-from-left-2">
          <button 
            onClick={handleQuickChat}
            className="h-10 w-10 bg-primary text-white rounded-xl shadow-lg flex items-center justify-center hover:scale-110 transition-transform active:scale-95"
            title={t('chat')}
          >
            <MessageSquare size={18} />
          </button>
          <button 
            className="h-10 w-10 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-xl shadow-lg flex items-center justify-center hover:scale-110 transition-transform border border-gray-100 dark:border-gray-700"
            title={t('edit')}
          >
            <Info size={18} />
          </button>
        </div>
      )}
    </div>
  );
}
