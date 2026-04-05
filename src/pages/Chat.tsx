import { useChatStore } from '@/stores/useChatStore';
import { useAgentStore } from '@/stores/useAgentStore';
import { useAppStore } from '@/stores/useAppStore';
import { translations } from '@/stores/i18n';
import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Send, Plus, Search, User, Bot, Loader2, MessageSquare } from 'lucide-react';
import { clsx } from 'clsx';

export default function Chat() {
  const { agents } = useAgentStore();
  const { language } = useAppStore();
  const t = (key: string) => translations[language][key] || key;
  
  const { 
    sessions, 
    activeSessionId, 
    setActiveSession, 
    sendMessage, 
    isStreaming, 
    currentStreamingText,
    createSession 
  } = useChatStore();
  
  const [inputText, setInputText] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const activeSession = sessions.find(s => s.id === activeSessionId);
  const activeAgent = agents.find(a => a.id === activeSession?.agentId);

  // Auto scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [activeSession?.messages, currentStreamingText]);

  const handleSend = async () => {
    if (!inputText.trim() || isStreaming) return;
    const text = inputText;
    setInputText('');
    await sendMessage(text);
  };

  return (
    <div className="flex h-full bg-white dark:bg-black overflow-hidden">
      {/* Session Sidebar */}
      <div className="w-80 border-r border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/30 flex flex-col">
        <div className="p-4 border-b border-gray-200 dark:border-gray-800 space-y-4">
          <button 
            onClick={() => createSession(agents[0].id)}
            className="w-full bg-primary text-white px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 text-sm font-semibold shadow-sm hover:bg-primary/90 transition-all active:scale-95"
          >
            <Plus size={18} /> {t('new_chat')}
          </button>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input 
              type="text" 
              placeholder={t('search_history')}
              className="w-full bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {sessions.map((session) => {
            const agent = agents.find(a => a.id === session.agentId);
            const isActive = activeSessionId === session.id;
            return (
              <div 
                key={session.id}
                onClick={() => setActiveSession(session.id)}
                className={clsx(
                  "p-3 rounded-xl cursor-pointer transition-all group border",
                  isActive 
                    ? "bg-white dark:bg-gray-800 shadow-md border-gray-200 dark:border-gray-700" 
                    : "hover:bg-gray-100 dark:hover:bg-gray-800/50 border-transparent"
                )}
              >
                <div className="flex justify-between items-start mb-1">
                  <span className="font-semibold text-sm truncate pr-2">
                    {session.title}
                  </span>
                  <span className="text-[10px] text-gray-400 whitespace-nowrap">
                    {new Date(session.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 truncate flex items-center gap-1">
                  <Bot size={12} className="shrink-0" /> {agent?.name || 'Unknown Agent'}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-white dark:bg-black">
        {activeSession ? (
          <>
            <div className="h-16 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-6 bg-white/80 dark:black/80 backdrop-blur-md z-10">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center ring-1 ring-primary/20">
                  <Bot size={20} />
                </div>
                <div>
                  <div className="font-bold text-sm tracking-tight">{activeAgent?.name}</div>
                  <div className="flex items-center gap-1.5 text-[10px]">
                    <span className={clsx(
                      "w-1.5 h-1.5 rounded-full",
                      activeAgent?.status === 'active' ? "bg-green-500 animate-pulse" : "bg-gray-400"
                    )}></span>
                    <span className="text-gray-500 uppercase tracking-widest font-semibold">{t(activeAgent?.status || 'idle')}</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-8 scroll-smooth">
              {activeSession.messages.map((msg) => (
                <div key={msg.id} className={clsx(
                  "flex gap-4",
                  msg.role === 'user' ? "flex-row-reverse" : "flex-row"
                )}>
                  <div className={clsx(
                    "h-8 w-8 rounded-full shrink-0 flex items-center justify-center text-xs font-bold shadow-sm",
                    msg.role === 'user' 
                      ? "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300" 
                      : "bg-primary/10 text-primary ring-1 ring-primary/20"
                  )}>
                    {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                  </div>
                  <div className={clsx(
                    "max-w-[85%] sm:max-w-[75%] px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-sm border",
                    msg.role === 'user' 
                      ? "bg-primary text-white border-primary rounded-tr-none" 
                      : "bg-gray-50 dark:bg-gray-900 border-gray-100 dark:border-gray-800 rounded-tl-none text-gray-800 dark:text-gray-200"
                  )}>
                    <ReactMarkdown 
                      remarkPlugins={[remarkGfm]}
                      components={{
                        code({ node, inline, className, children, ...props }: any) {
                          const match = /language-(\w+)/.exec(className || '')
                          return !inline && match ? (
                            <SyntaxHighlighter
                              style={vscDarkPlus as any}
                              language={match[1]}
                              PreTag="div"
                              className="rounded-lg my-2 text-xs"
                              {...props}
                            >
                              {String(children).replace(/\n$/, '')}
                            </SyntaxHighlighter>
                          ) : (
                            <code className="bg-gray-200 dark:bg-gray-800 px-1 rounded text-xs" {...props}>
                              {children}
                            </code>
                          )
                        }
                      }}
                    >
                      {msg.content}
                    </ReactMarkdown>
                  </div>
                </div>
              ))}
              
              {isStreaming && (
                <div className="flex gap-4">
                  <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center ring-1 ring-primary/20 shadow-sm">
                    <Bot size={16} />
                  </div>
                  <div className="max-w-[85%] sm:max-w-[75%] px-4 py-3 rounded-2xl rounded-tl-none bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 text-sm shadow-sm">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {currentStreamingText + ' ●'}
                    </ReactMarkdown>
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 pt-2">
              <div className="max-w-4xl mx-auto relative group">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/20 to-purple-500/20 rounded-2xl blur opacity-0 group-focus-within:opacity-100 transition duration-500"></div>
                <div className="relative bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-xl overflow-hidden transition-all duration-300 group-focus-within:border-primary/50 group-focus-within:shadow-primary/5">
                  <textarea 
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    placeholder={`${t('message_placeholder')}`}
                    className="w-full bg-transparent border-none px-5 py-4 pr-14 resize-none focus:ring-0 text-sm leading-relaxed max-h-48"
                    rows={1}
                  />
                  <div className="absolute right-3 bottom-3 flex items-center gap-2">
                    <button 
                      onClick={handleSend}
                      disabled={!inputText.trim() || isStreaming}
                      className={clsx(
                        "p-2.5 rounded-xl transition-all shadow-lg shadow-primary/20",
                        !inputText.trim() || isStreaming 
                          ? "bg-gray-200 dark:bg-gray-800 text-gray-400 cursor-not-allowed" 
                          : "bg-primary text-white hover:bg-primary/90 active:scale-90"
                      )}
                    >
                      {isStreaming ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-center flex-col items-center justify-center text-center p-6">
             <div className="h-16 w-16 bg-gray-100 dark:bg-gray-900 rounded-3xl flex items-center justify-center text-gray-400 mb-4 ring-1 ring-gray-200 dark:ring-gray-800">
               <MessageSquare size={32} />
             </div>
             <h3 className="text-xl font-bold tracking-tight mb-2">{t('select_session')}</h3>
             <button 
               onClick={() => createSession(agents[0].id)}
               className="mt-6 bg-primary text-white px-6 py-2.5 rounded-xl font-semibold shadow-lg shadow-primary/20 hover:opacity-90 transition-all active:scale-95"
             >
               {t('new_chat')}
             </button>
          </div>
        )}
      </div>
    </div>
  );
}
