
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Play, Pause, Timer as TimerIcon, Bell, BellRing, Check } from 'lucide-react';
import { 
  isTauri, 
  startTimerSync, 
  stopTimerSync, 
  updateTimerElapsed, 
  showTimerWidget, 
  hideTimerWidget 
} from '../services/tauriService';
import {
  isNotificationSupported,
  getNotificationPermission,
  requestNotificationPermission,
  sendTimerCompletedNotification,
  stopTitleFlashing
} from '../services/notificationService';

interface TimerOverlayProps {
  taskId: string;
  subtaskTitle: string;
  onClose: () => void;
  onComplete: (elapsedSeconds: number) => void;
  darkMode: boolean;
}

const MOTIVATIONAL_QUOTES = [
  "Bit by Bit",
];

const TimerOverlay: React.FC<TimerOverlayProps> = ({ taskId, subtaskTitle, onClose, onComplete, darkMode }) => {
  const [duration, setDuration] = useState<number>(25); // minutes
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [isActive, setIsActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isStarted, setIsStarted] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [quoteIndex, setQuoteIndex] = useState(0);
  const [notificationPerm, setNotificationPerm] = useState<NotificationPermission | 'unsupported'>(() => getNotificationPermission());
  
  const timerRef = useRef<number | null>(null);
  const timeoutRef = useRef<number | null>(null);
  const endTimeRef = useRef<number | null>(null);
  const hasCompletedRef = useRef<boolean>(false);
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

  const handleTimerCompleted = useCallback(() => {
    if (hasCompletedRef.current) return;
    hasCompletedRef.current = true;

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    setIsActive(false);
    setTimeLeft(0);
    setElapsed(duration * 60);

    // Audio chime
    playRingSound();

    // Browser Notification visible on other tabs and outside browser
    sendTimerCompletedNotification(subtaskTitle);
  }, [duration, subtaskTitle]);

  const startTimer = async () => {
    const totalSeconds = duration * 60;
    setTimeLeft(totalSeconds);
    setElapsed(0);
    hasCompletedRef.current = false;

    // Prompt for notification permission during this user gesture if not already decided
    if (isNotificationSupported() && Notification.permission === 'default') {
      try {
        const perm = await requestNotificationPermission();
        setNotificationPerm(perm);
      } catch (e) {
        console.warn('Could not request notification permission:', e);
      }
    }

    const targetEndTime = Date.now() + totalSeconds * 1000;
    endTimeRef.current = targetEndTime;

    setIsStarted(true);
    setIsActive(true);
    setIsPaused(false);
    
    if (isTauri()) {
      startTimerSync(taskId, subtaskTitle);
      showTimerWidget();
    }
  };

  const togglePause = () => {
    if (!isPaused) {
      // Pause: clear timeout and interval, retain remaining timeLeft
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      endTimeRef.current = null;
      setIsPaused(true);
    } else {
      // Resume: reset endTimeRef based on current remaining timeLeft
      const targetEndTime = Date.now() + timeLeft * 1000;
      endTimeRef.current = targetEndTime;
      setIsPaused(false);
    }
  };

  const finishTimer = () => {
    stopTitleFlashing();
    if (timerRef.current) clearInterval(timerRef.current);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    onComplete(elapsed);
    if (isTauri()) {
      stopTimerSync();
      hideTimerWidget();
    }
    onClose();
  };

  const handleClose = () => {
    stopTitleFlashing();
    if (timerRef.current) clearInterval(timerRef.current);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (isTauri()) {
      stopTimerSync();
      hideTimerWidget();
    }
    onClose();
  };

  // Timer loop with background tab wall-clock accuracy
  useEffect(() => {
    if (!isActive || isPaused || !endTimeRef.current || hasCompletedRef.current) {
      if (timerRef.current) clearInterval(timerRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      return;
    }

    const checkTime = () => {
      if (!endTimeRef.current || hasCompletedRef.current) return;
      const now = Date.now();
      const remainingMs = endTimeRef.current - now;
      const remainingSecs = Math.max(0, Math.ceil(remainingMs / 1000));
      
      setTimeLeft(remainingSecs);

      const totalSecs = duration * 60;
      const currentElapsed = Math.max(0, totalSecs - remainingSecs);
      setElapsed(currentElapsed);
      
      if (isTauri()) {
        updateTimerElapsed(currentElapsed);
      }

      if (remainingMs <= 0) {
        handleTimerCompleted();
      }
    };

    // Immediate tick
    checkTime();

    // Standard 1s interval
    timerRef.current = window.setInterval(checkTime, 1000);

    // Explicit timeout directly targeted at remaining milliseconds to counter background throttling
    const remainingMs = Math.max(0, endTimeRef.current - Date.now());
    timeoutRef.current = window.setTimeout(() => {
      handleTimerCompleted();
    }, remainingMs);

    // Event listener for tab visibility change and window focus to resync instantly
    const handleVisibilityOrFocus = () => {
      checkTime();
    };

    document.addEventListener('visibilitychange', handleVisibilityOrFocus);
    window.addEventListener('focus', handleVisibilityOrFocus);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      window.removeEventListener('focus', handleVisibilityOrFocus);
    };
  }, [isActive, isPaused, duration, handleTimerCompleted]);


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
            <button onClick={handleClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
              <X size={20} />
            </button>
          </div>
          <p className="text-xs font-medium text-slate-400 mb-6 uppercase tracking-widest truncate">Target: {subtaskTitle}</p>
          
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

            {/* Notification Permission & Background Tab Alert Tile */}
            <div className={`w-full p-3.5 rounded-2xl border text-left transition-all ${
              darkMode ? 'bg-slate-800/60 border-slate-700/80' : 'bg-slate-50 border-slate-200/90'
            }`}>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={`p-2 rounded-xl shrink-0 ${
                    notificationPerm === 'granted'
                      ? (darkMode ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-600')
                      : notificationPerm === 'denied'
                      ? (darkMode ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-100 text-amber-600')
                      : (darkMode ? 'bg-indigo-500/20 text-indigo-400' : 'bg-indigo-100 text-indigo-600')
                  }`}>
                    {notificationPerm === 'granted' ? <BellRing size={16} /> : <Bell size={16} />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold tracking-tight truncate">
                      {notificationPerm === 'granted' 
                        ? 'Background Tab Alerts On' 
                        : notificationPerm === 'denied'
                        ? 'Notifications Blocked'
                        : 'Background Notifications'}
                    </p>
                    <p className="text-[11px] opacity-60 leading-tight">
                      {notificationPerm === 'granted'
                        ? 'Notifies you even if on another tab'
                        : notificationPerm === 'denied'
                        ? 'Allow in browser address bar'
                        : 'Alerts you when timer completes'}
                    </p>
                  </div>
                </div>

                {notificationPerm === 'default' && (
                  <button
                    type="button"
                    onClick={async () => {
                      const res = await requestNotificationPermission();
                      setNotificationPerm(res);
                      if (res === 'granted') {
                        sendTimerCompletedNotification('Notifications Activated!');
                      }
                    }}
                    className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-medium transition-all shadow-md active:scale-95 shrink-0"
                  >
                    Enable
                  </button>
                )}

                {notificationPerm === 'granted' && (
                  <button
                    type="button"
                    onClick={() => {
                      sendTimerCompletedNotification('Sample Task: Timer Completed!');
                    }}
                    className={`px-2.5 py-1 rounded-xl text-[10px] font-medium tracking-wide transition-all shrink-0 ${
                      darkMode ? 'bg-slate-700 hover:bg-slate-600 text-slate-200' : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                    }`}
                    title="Send a sample notification right now to see how it looks"
                  >
                    Test
                  </button>
                )}
              </div>
            </div>

            <button 
              onClick={startTimer}
              className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-medium uppercase tracking-widest shadow-xl shadow-indigo-500/20 transition-all flex items-center justify-center gap-2 active:scale-98"
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

      {/* Top right: Background notification indicator */}
      <div className="absolute top-10 right-10 flex items-center gap-2 px-3 py-1.5 rounded-full backdrop-blur-md border text-[11px] font-medium opacity-90 transition-all bg-white/10 border-white/20">
        <BellRing size={14} className={timeLeft === 0 ? 'animate-bounce text-emerald-300' : 'text-indigo-300'} />
        <span>
          {timeLeft === 0 
            ? 'Alert Dispatched' 
            : notificationPerm === 'granted' 
            ? 'Background Alert Active' 
            : 'Timer Running'}
        </span>
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
            <div className="absolute flex flex-col items-center gap-1 animate-in zoom-in-95 duration-500">
              <span className="text-2xl font-light uppercase tracking-[0.3em] text-emerald-400 font-semibold animate-pulse">
                Completed
              </span>
              <span className="text-xs opacity-75 font-normal tracking-wider">
                Notification sent to your screen
              </span>
            </div>
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
          disabled={timeLeft === 0}
          className={`w-16 h-16 rounded-full flex items-center justify-center transition-all border ${
            timeLeft === 0 
              ? 'opacity-30 cursor-not-allowed' 
              : darkMode ? 'bg-slate-900 border-slate-800 hover:bg-slate-800' : 'bg-white/10 border-white/20 hover:bg-white/20'
          }`}
          title={isPaused ? 'Resume' : 'Pause'}
        >
          {isPaused ? <Play size={28} /> : <Pause size={28} />}
        </button>
        <button 
          onClick={finishTimer}
          className={`px-10 h-16 rounded-full flex items-center justify-center shadow-2xl font-light text-sm uppercase tracking-[0.2em] hover:scale-105 active:scale-95 transition-all ${
            darkMode ? 'bg-indigo-600 text-white' : 'bg-white text-indigo-600'
          }`}
        >
          {timeLeft === 0 ? 'Done & Save' : 'Done'}
        </button>
      </div>

      <div className="absolute bottom-10 opacity-30 text-[10px] font-medium uppercase tracking-[0.5em]">
        Stay present. Keep tracking.
      </div>
    </div>
  );
};

export default TimerOverlay;