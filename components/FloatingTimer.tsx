
import React, { useState, useEffect } from 'react';
import { Utensils, Moon, Coffee, Armchair, StopCircle } from 'lucide-react';
import { ActivityType } from '../types';

interface FloatingTimerProps {
  type: ActivityType;
  startTime: number;
  onDone: () => void;
  darkMode: boolean;
}

const FloatingTimer: React.FC<FloatingTimerProps> = ({ type, startTime, onDone, darkMode }) => {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [startTime]);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const getConfig = () => {
    switch (type) {
      case 'food': return { icon: Utensils, label: 'Refueling', color: 'text-sky-500', bg: 'bg-sky-500' };
      case 'nap': return { icon: Moon, label: 'Power Nap', color: 'text-amber-500', bg: 'bg-amber-500' };
      case 'rest': return { icon: Armchair, label: 'Resting', color: 'text-violet-500', bg: 'bg-violet-500' };
      case 'break': return { icon: Coffee, label: 'Break', color: 'text-emerald-500', bg: 'bg-emerald-500' };
      default: return { icon: Coffee, label: 'Break', color: 'text-slate-500', bg: 'bg-slate-500' };
    }
  };

  const config = getConfig();
  const Icon = config.icon;

  return (
    <div className={`fixed bottom-6 right-6 z-40 p-4 rounded-2xl shadow-2xl border backdrop-blur-md animate-in slide-in-from-bottom-10 fade-in duration-300 flex items-center gap-4 ${
      darkMode ? 'bg-slate-900/90 border-slate-700' : 'bg-white/90 border-slate-200'
    }`}>
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-lg ${config.bg} text-white`}>
        <Icon size={20} />
      </div>
      
      <div>
        <div className={`text-[10px] font-black uppercase tracking-widest opacity-60 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
          {config.label}
        </div>
        <div className={`text-xl font-light tabular-nums tracking-tight ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>
          {formatTime(elapsed)}
        </div>
      </div>

      <button 
        onClick={onDone}
        className={`ml-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all hover:scale-105 active:scale-95 ${
          darkMode 
            ? 'bg-slate-800 hover:bg-slate-700 text-white shadow-lg shadow-black/20' 
            : 'bg-slate-100 hover:bg-slate-200 text-slate-900 shadow-sm'
        }`}
      >
        Done
      </button>
    </div>
  );
};

export default FloatingTimer;
