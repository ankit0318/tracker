import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Check, X, Move } from 'lucide-react';
import { 
  isTauri, 
  getTimerSyncState, 
  updateTimerElapsed, 
  stopTimerSync, 
  hideTimerWidget, 
  TimerSyncState 
} from '../services/tauriService';
import { sendTimerCompletedNotification } from '../services/notificationService';

interface WidgetWindowViewProps {
  darkMode: boolean;
}

const WidgetWindowView: React.FC<WidgetWindowViewProps> = ({ darkMode }) => {
  const [timerState, setTimerState] = useState<TimerSyncState | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(1500); // 25 mins by default
  const [isActive, setIsActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [localElapsed, setLocalElapsed] = useState(0);
  
  const timerIntervalRef = useRef<number | null>(null);

  // Sync state periodically from Tauri central Rust mutex
  useEffect(() => {
    if (!isTauri()) return;

    const syncWithRustBackend = async () => {
      const state = await getTimerSyncState();
      if (state && state.taskId) {
        setTimerState(state);
        setIsPaused(state.isPaused);
        setIsActive(true);
        setLocalElapsed(state.elapsed);
        
        // standard pomodoro is 25m = 1500s
        const totalDuration = 25 * 60; 
        const remaining = Math.max(0, totalDuration - state.elapsed);
        setTimeLeft(remaining);
      } else {
        setTimerState(null);
        setIsActive(false);
      }
    };

    // Immediate sync and then poll every 600ms
    syncWithRustBackend();
    const pollInterval = setInterval(syncWithRustBackend, 600);
    return () => clearInterval(pollInterval);
  }, []);

  // Run local timer countdown matching the sync state
  useEffect(() => {
    if (isActive && !isPaused && timeLeft > 0) {
      timerIntervalRef.current = window.setInterval(() => {
        setTimeLeft((prev) => {
          const next = prev - 1;
          if (next <= 0) {
            sendTimerCompletedNotification(25);
            return 0;
          }
          return next;
        });
        setLocalElapsed((prev) => {
          const nextElapsed = prev + 1;
          updateTimerElapsed(nextElapsed); // sync back to Rust
          return nextElapsed;
        });
      }, 1000);
    } else {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [isActive, isPaused, timerState]);

  const handleTogglePause = () => {
    setIsPaused(!isPaused);
  };

  const handleComplete = async () => {
    if (isTauri()) {
      // Clear Rust state
      await stopTimerSync();
      // Hide widget
      await hideTimerWidget();
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div 
      data-tauri-drag-region
      className={`fixed inset-0 select-none flex items-center justify-between p-4 rounded-3xl border shadow-2xl transition-all h-full w-full overflow-hidden ${
        darkMode 
          ? 'bg-slate-900/90 border-slate-700/80 text-white' 
          : 'bg-white/95 border-slate-200/90 text-slate-900'
      } backdrop-blur-xl`}
    >
      {/* Draggable Icon handle */}
      <div 
        data-tauri-drag-region
        className="flex items-center gap-3 flex-1 cursor-grab active:cursor-grabbing h-full"
      >
        <div data-tauri-drag-region className="text-indigo-500 shrink-0">
          <Move size={18} className="animate-pulse" />
        </div>
        <div data-tauri-drag-region className="min-w-0 flex-1 pr-2">
          {isActive && timerState ? (
            <>
              <p data-tauri-drag-region className={`text-[9px] font-black uppercase tracking-[0.15em] opacity-60 truncate ${darkMode ? 'text-indigo-400' : 'text-indigo-600'}`}>
                Focus Window
              </p>
              <h4 data-tauri-drag-region className="text-sm font-semibold tracking-tight truncate leading-snug">
                {timerState.subtaskTitle || 'Focus Subtask'}
              </h4>
            </>
          ) : (
            <>
              <p data-tauri-drag-region className="text-[9px] font-black uppercase tracking-[0.15em] opacity-50">
                FocusFlow Desk
              </p>
              <h4 data-tauri-drag-region className="text-xs font-light tracking-wide truncate">
                Timer Idle - Drag Me
              </h4>
            </>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        {isActive && (
          <>
            <div className={`p-2 font-mono text-2xl font-light tracking-tighter tabular-nums rounded-xl px-3 ${darkMode ? 'bg-slate-950/60' : 'bg-slate-100'}`}>
              {formatTime(timeLeft)}
            </div>
            
            <button 
              onClick={handleTogglePause}
              className={`p-2.5 rounded-full transition-all hover:scale-105 active:scale-95 ${
                darkMode ? 'bg-slate-800 hover:bg-slate-700 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
              }`}
            >
              {isPaused ? <Play size={15} /> : <Pause size={15} />}
            </button>

            <button 
              onClick={handleComplete}
              className="p-2.5 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white transition-all hover:scale-105 active:scale-95"
              title="Complete Focus"
            >
              <Check size={15} />
            </button>
          </>
        )}
        
        {!isActive && (
          <button 
            onClick={() => hideTimerWidget()}
            className={`p-2.5 rounded-full transition-all ${
              darkMode ? 'bg-slate-800 hover:bg-red-500/20 hover:text-red-400 text-slate-400' : 'bg-slate-100 hover:bg-red-100 hover:text-red-600 text-slate-500'
            }`}
            title="Dismiss widget"
          >
            <X size={15} />
          </button>
        )}
      </div>
    </div>
  );
};

export default WidgetWindowView;
