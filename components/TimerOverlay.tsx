
import React, { useState, useEffect, useRef } from 'react';
import { X, Play, Pause, Timer as TimerIcon } from 'lucide-react';

interface TimerOverlayProps {
  subtaskTitle: string;
  onClose: () => void;
  onComplete: (elapsedSeconds: number) => void;
  darkMode: boolean;
}

const MOTIVATIONAL_QUOTES = [
  "Focus on the step, not the mountain.",
  "Consistency is the companion of success.",
  "Your future self will thank you.",
  "One thing at a time.",
  "Deep work, great results.",
  "Progress over perfection.",
  "Quiet the mind and the soul will speak.",
  "The secret of getting ahead is getting started."
];

const TimerOverlay: React.FC<TimerOverlayProps> = ({ subtaskTitle, onClose, onComplete, darkMode }) => {
  const [duration, setDuration] = useState<number>(25); // minutes
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [isActive, setIsActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isStarted, setIsStarted] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [quoteIndex, setQuoteIndex] = useState(0);
  
  const timerRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Constants for circular ring
  const size = 320;
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;

  const playRingSound = () => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime); // A5 note
      osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.5); // Slide down to A4
      
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.2, ctx.currentTime + 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.5);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 1.5);
    } catch (e) {
      console.warn("Audio feedback failed:", e);
    }
  };

  const startTimer = () => {
    const totalSeconds = duration * 60;
    setTimeLeft(totalSeconds);
    setIsStarted(true);
    setIsActive(true);
    setIsPaused(false);
  };

  const togglePause = () => {
    setIsPaused(!isPaused);
  };

  const finishTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    onComplete(elapsed);
    onClose();
  };

  // Quote cycling effect
  useEffect(() => {
    if (!isStarted) return;
    const interval = setInterval(() => {
      setQuoteIndex((prev) => (prev + 1) % MOTIVATIONAL_QUOTES.length);
    }, 20000); // Change quote every 20 seconds
    return () => clearInterval(interval);
  }, [isStarted]);

  useEffect(() => {
    if (isActive && !isPaused && timeLeft > 0) {
      timerRef.current = window.setInterval(() => {
        setTimeLeft((prev) => prev - 1);
        setElapsed((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    if (timeLeft === 0 && isStarted && isActive) {
      setIsActive(false);
      playRingSound();
      // Brief delay before closing automatically if desired, 
      // but let's just trigger complete and let the user click Done to see the status.
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isActive, isPaused, timeLeft]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const progressOffset = isStarted 
    ? circumference - (timeLeft / (duration * 60)) * circumference 
    : circumference;

  if (!isStarted) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-300">
        <div className={`w-full max-w-sm rounded-3xl p-8 shadow-2xl ${darkMode ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}`}>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-light uppercase tracking-widest">Set Focus Timer</h2>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full">
              <X size={20} />
            </button>
          </div>
          <p className="text-xs font-medium text-slate-400 mb-8 uppercase tracking-widest">Target: {subtaskTitle}</p>
          
          <div className="flex flex-col items-center gap-6">
            <div className="text-6xl font-light tracking-tighter text-indigo-500">
              {duration}m
            </div>
            <input 
              type="range" 
              min="1" 
              max="120" 
              value={duration} 
              onChange={(e) => setDuration(parseInt(e.target.value))}
              className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
            />
            <button 
              onClick={startTimer}
              className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-medium uppercase tracking-widest shadow-xl shadow-indigo-500/20 transition-all flex items-center justify-center gap-2"
            >
              <Play size={18} /> Start Focus
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`fixed inset-0 z-[100] flex flex-col items-center justify-center transition-colors duration-700 ${darkMode ? 'bg-slate-950 text-white' : 'bg-indigo-600 text-white'} animate-in zoom-in-110 duration-500`}>
      <div className="absolute top-10 left-10 flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${darkMode ? 'bg-indigo-500/20' : 'bg-white/20'}`}>
          <TimerIcon size={24} />
        </div>
        <div>
          <p className="text-[10px] font-medium uppercase tracking-[0.2em] opacity-60">Focusing On</p>
          <h2 className="text-lg font-light tracking-wide">{subtaskTitle}</h2>
        </div>
      </div>

      <div className="relative flex items-center justify-center mb-8">
        <svg width={size} height={size} className="transform -rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            fill="transparent"
            className="opacity-10"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={darkMode ? '#6366f1' : '#ffffff'}
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeDasharray={circumference}
            style={{ 
              strokeDashoffset: progressOffset,
              transition: 'stroke-dashoffset 1s linear'
            }}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute flex flex-col items-center">
          <span className={`text-8xl font-light tracking-tighter tabular-nums transition-opacity duration-300 ${timeLeft === 0 ? 'opacity-20' : 'opacity-100'}`}>
            {formatTime(timeLeft)}
          </span>
          {timeLeft === 0 && (
            <span className="absolute text-2xl font-light uppercase tracking-[0.3em] animate-pulse">
              Completed
            </span>
          )}
        </div>
      </div>

      {/* Motivational Quote Display */}
      <div className="h-12 mb-8 flex items-center justify-center px-6">
        <p key={quoteIndex} className="text-sm font-light italic opacity-60 text-center tracking-wide animate-in fade-in slide-in-from-bottom-2 duration-1000">
          "{MOTIVATIONAL_QUOTES[quoteIndex]}"
        </p>
      </div>

      <div className="flex items-center gap-8">
        <button 
          onClick={togglePause}
          className={`w-16 h-16 rounded-full flex items-center justify-center transition-all border ${
            darkMode ? 'bg-slate-900 border-slate-800 hover:bg-slate-800' : 'bg-white/10 border-white/20 hover:bg-white/20'
          }`}
        >
          {isPaused ? <Play size={28} /> : <Pause size={28} />}
        </button>
        <button 
          onClick={finishTimer}
          className={`px-10 h-16 rounded-full flex items-center justify-center shadow-2xl font-light text-sm uppercase tracking-[0.2em] hover:scale-105 active:scale-95 transition-all ${
            darkMode ? 'bg-indigo-600 text-white' : 'bg-white text-indigo-600'
          }`}
        >
          Done
        </button>
      </div>

      <div className="absolute bottom-10 opacity-30 text-[10px] font-medium uppercase tracking-[0.5em]">
        Stay present. Keep ascending.
      </div>
    </div>
  );
};

export default TimerOverlay;
