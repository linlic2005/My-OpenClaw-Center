import { useState, useRef } from 'react';
import { useOfficeStore } from '@/stores/useOfficeStore';
import { useAgentStore } from '@/stores/useAgentStore';
import { AgentSprite } from '@/components/office/AgentSprite';
import { Maximize, Minimize, ZoomIn, ZoomOut, RotateCcw, MousePointer2, Sparkles } from 'lucide-react';
import { clsx } from 'clsx';

export default function Office() {
  const { agents } = useAgentStore();
  const { scale, setScale, offset, setOffset, agentPositions, resetView, setSelectedAgent } = useOfficeStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // Only left click for drag
    setIsDragging(true);
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setOffset({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.min(Math.max(scale * delta, 0.5), 2);
    setScale(newScale);
  };

  return (
    <div className="h-full w-full bg-[#f8f9fc] dark:bg-[#050505] relative overflow-hidden flex flex-col">
      {/* Modern Grid Background */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-[0.03] dark:opacity-[0.05]" 
        style={{ 
          backgroundImage: `radial-gradient(circle, currentColor 1px, transparent 1px)`,
          backgroundSize: `${40 * scale}px ${40 * scale}px`,
          backgroundPosition: `${offset.x}px ${offset.y}px`,
          color: 'var(--primary)'
        }}
      />

      {/* Floating Toolbar */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 p-1.5 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border border-gray-200 dark:border-gray-800 rounded-2xl shadow-2xl">
        <div className="flex items-center gap-1 px-3 py-1 border-r border-gray-200 dark:border-gray-700">
          <Sparkles size={16} className="text-primary" />
          <span className="text-xs font-bold tracking-tight uppercase">Star Office View</span>
        </div>
        <div className="flex items-center gap-1 px-1">
          <button 
            onClick={() => setScale(Math.min(scale + 0.1, 2))}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-gray-500 transition-colors"
          >
            <ZoomIn size={16} />
          </button>
          <button 
             onClick={() => setScale(Math.max(scale - 0.1, 0.5))}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-gray-500 transition-colors"
          >
            <ZoomOut size={16} />
          </button>
          <button 
            onClick={resetView}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-gray-500 transition-colors"
          >
            <RotateCcw size={16} />
          </button>
        </div>
        <div className="h-4 w-px bg-gray-200 dark:bg-gray-700 mx-1" />
        <div className="flex items-center gap-2 px-3 py-1 bg-primary/10 rounded-xl">
           <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
           <span className="text-[10px] font-bold text-primary uppercase">{agents.length} Agents Live</span>
        </div>
      </div>

      {/* Scene Canvas (Simulated with DOM) */}
      <div 
        ref={containerRef}
        className={clsx(
          "flex-1 relative cursor-grab active:cursor-grabbing select-none transition-transform duration-75",
          isDragging && "cursor-grabbing"
        )}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        onClick={() => setSelectedAgent(null)}
      >
        <div 
          className="absolute inset-0 origin-top-left transition-transform duration-200 ease-out"
          style={{ 
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})` 
          }}
        >
          {/* Office Floor / Layout Placeholder */}
          <div className="absolute top-0 left-0 w-[2000px] h-[2000px]">
            {/* Visual Floor Panels */}
            <div className="absolute top-[100px] left-[100px] w-[800px] h-[600px] border-4 border-gray-200 dark:border-gray-800 rounded-[40px] bg-white/50 dark:bg-gray-900/20 backdrop-blur-sm shadow-inner" />
            
            {/* Agent Sprites */}
            {agents.map((agent) => {
              const pos = agentPositions[agent.id] || { x: 500, y: 500 };
              return (
                <AgentSprite 
                  key={agent.id} 
                  agent={agent} 
                  position={pos} 
                />
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom Info Bar */}
      <div className="absolute bottom-6 right-6 p-4 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border border-gray-200 dark:border-gray-800 rounded-2xl shadow-lg max-w-xs animate-in slide-in-from-bottom-4">
        <h4 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Controls</h4>
        <div className="grid grid-cols-2 gap-y-2 text-[10px] font-medium text-gray-500">
           <div className="flex items-center gap-2"><MousePointer2 size={12}/> Drag to Pan</div>
           <div className="flex items-center gap-2"><ZoomIn size={12}/> Scroll to Zoom</div>
           <div className="flex items-center gap-2"><Maximize size={12}/> Click to Select</div>
           <div className="flex items-center gap-2"><Minimize size={12}/> Esc to Deselect</div>
        </div>
      </div>
    </div>
  );
}
