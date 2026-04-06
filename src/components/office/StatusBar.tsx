import { useEffect, useState, useRef } from 'react';
import { OFFICE_STATE_LABELS, type OfficeVisualState } from './runtime/officeSceneConfig';

interface StatusBarProps {
  roomName: string;
  officeState: OfficeVisualState;
  detail?: string;
}

const TYPEWRITER_DELAY = 50;

export function StatusBar({ roomName, officeState, detail }: StatusBarProps) {
  const [displayText, setDisplayText] = useState('');
  const targetRef = useRef('');
  const indexRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const label = OFFICE_STATE_LABELS[officeState] || officeState;
    const newTarget = `[${label}] ${detail || '...'}`;

    if (newTarget === targetRef.current) return;

    targetRef.current = newTarget;
    indexRef.current = 0;
    setDisplayText('');

    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      indexRef.current++;
      if (indexRef.current >= targetRef.current.length) {
        setDisplayText(targetRef.current);
        if (timerRef.current) clearInterval(timerRef.current);
      } else {
        setDisplayText(targetRef.current.slice(0, indexRef.current));
      }
    }, TYPEWRITER_DELAY);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [officeState, detail]);

  return (
    <div className="flex items-center justify-center gap-3 rounded-2xl border border-white/10 bg-[#241f4f]/80 px-5 py-2.5 shadow-lg">
      <span className="text-base text-yellow-200">⭐</span>
      <span className="font-['ArkPixel',monospace] text-sm font-bold text-[#ffd700]">
        {roomName}
      </span>
      <span className="h-4 w-px bg-white/20" />
      <span className="font-['ArkPixel',monospace] text-xs text-slate-300 tracking-wider">
        {displayText}
        <span className="animate-pulse text-cyan-300">▌</span>
      </span>
    </div>
  );
}
