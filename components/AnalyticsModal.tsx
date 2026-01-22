import React, { useMemo } from 'react';
import { Task, ActivitySession } from '../types';
import { X, Calendar, Activity, Clock, AlignLeft } from 'lucide-react';

interface AnalyticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: Task[];
  activityHistory?: ActivitySession[];
  darkMode: boolean;
}

interface TimelineSegment {
  taskTitle: string;
  subtaskTitle: string;
  startTime: number;
  endTime: number;
  duration: number;
  color: string;
  isActivity?: boolean;
}

const COLORS = [
  'bg-indigo-500',
  'bg-rose-500',
  'bg-teal-600',
  'bg-orange-500',
  'bg-fuchsia-500',
  'bg-blue-600',
];

const ACTIVITY_COLORS: Record<string, string> = {
  food: 'bg-sky-400',
  nap: 'bg-amber-300', 
  rest: 'bg-violet-400',   
  break: 'bg-emerald-400', 
  drift: 'bg-slate-400'    
};

const AnalyticsModal: React.FC<AnalyticsModalProps> = ({ isOpen, onClose, tasks, activityHistory = [], darkMode }) => {
  if (!isOpen) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const startOfDay = today.getTime();
  const endOfDay = startOfDay + 24 * 60 * 60 * 1000;
  
  const dateStr = today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  const { segments, totalDurationMap } = useMemo(() => {
    const rawSegments: TimelineSegment[] = [];
    const taskColors: Record<string, string> = {};
    let colorIndex = 0;

    tasks.forEach(task => {
      if (!taskColors[task.id]) {
        taskColors[task.id] = COLORS[colorIndex % COLORS.length];
        colorIndex++;
      }
      task.subtasks.forEach(subtask => {
        subtask.sessions?.forEach(session => {
          if (session.startTime >= startOfDay && session.startTime < endOfDay) {
            rawSegments.push({
              taskTitle: task.title,
              subtaskTitle: subtask.title,
              startTime: session.startTime,
              endTime: session.endTime,
              duration: session.duration,
              color: taskColors[task.id],
              isActivity: false
            });
          }
        });
      });
    });

    activityHistory.forEach(activity => {
      if (activity.startTime >= startOfDay && activity.startTime < endOfDay) {
         rawSegments.push({
           taskTitle: activity.type.charAt(0).toUpperCase() + activity.type.slice(1),
           subtaskTitle: activity.type === 'drift' ? 'Unstructured' : 'Wellness',
           startTime: activity.startTime,
           endTime: activity.endTime,
           duration: activity.duration,
           color: ACTIVITY_COLORS[activity.type] || 'bg-slate-400',
           isActivity: true
         });
      }
    });

    const sortedSegments = rawSegments.sort((a, b) => a.startTime - b.startTime);

    const durationMap: Record<string, { title: string, duration: number, color: string, sessionCount: number }> = {};
    sortedSegments.forEach(seg => {
        if (!durationMap[seg.taskTitle]) {
          durationMap[seg.taskTitle] = { title: seg.taskTitle, duration: 0, color: seg.color, sessionCount: 0 };
        }
        durationMap[seg.taskTitle].duration += seg.duration;
        durationMap[seg.taskTitle].sessionCount += 1;
    });

    return { 
      segments: sortedSegments, 
      totalDurationMap: Object.values(durationMap).sort((a, b) => b.duration - a.duration)
    };
  }, [tasks, activityHistory, startOfDay, endOfDay]);

  const formatTime = (ts: number) => new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  const formatDuration = (s: number) => s >= 3600 ? `${Math.floor(s/3600)}h ${Math.floor((s%3600)/60)}m` : `${Math.floor(s/60)}m`;

  // UI Constants for the "Second Timeline" look
  const rowHeight = 120; // Fixed height for consistent look
  const blockHeight = 80; // Height of the colored blocks
  const hours = Array.from({ length: 25 }, (_, i) => i); // Hourly grid lines

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xl">
      <div className={`w-full max-w-5xl rounded-[2rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border ${darkMode ? 'bg-[#0B0F19] text-slate-100 border-slate-800' : 'bg-white text-slate-900 border-slate-200'}`}>
        
        {/* Header */}
        <div className="px-8 py-6 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Activity size={14} className="text-indigo-500" />
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Focus & Wellness Analysis</span>
            </div>
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold">24-Hour Timeline</h1>
              <div className={`px-3 py-1 rounded-lg text-[10px] font-bold border ${darkMode ? 'bg-slate-900 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
                {dateStr.toUpperCase()}
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full text-slate-500 transition-colors"><X size={20} /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-8 py-4">
          {/* Timeline Chart */}
          <div className="relative mb-12" style={{ height: rowHeight + 40 }}>
            {/* Vertical Grid Lines */}
            <div className="absolute inset-0 flex justify-between pointer-events-none">
              {hours.map((hour) => (
                <div key={hour} className="flex flex-col items-center h-full relative" style={{ width: '1px' }}>
                  <div className={`w-px h-full ${darkMode ? 'border-l border-slate-800/50' : 'border-l border-slate-100'} ${hour % 4 === 0 ? 'opacity-100' : 'opacity-30'} border-dashed`} />
                  {hour % 4 === 0 && (
                    <span className="absolute -bottom-6 text-[10px] font-mono font-bold text-slate-500">
                      {hour.toString().padStart(2, '0')}:00
                    </span>
                  )}
                </div>
              ))}
            </div>

            {/* Segments Container */}
            <div className="absolute inset-0 top-10">
              {segments.map((segment, idx) => {
                const daySeconds = 24 * 60 * 60;
                const left = ((segment.startTime - startOfDay) / 1000 / daySeconds) * 100;
                const width = (segment.duration / daySeconds) * 100;

                return (
                  <div
                    key={idx}
                    className="absolute group transition-all duration-300"
                    style={{ left: `${left}%`, width: `${width}%`, height: blockHeight }}
                  >
                  

                    {/* The Visual Block */}
                    <div className={`w-full h-full rounded-xl ${segment.color} opacity-90 group-hover:opacity-100 group-hover:scale-[1.02] transition-all shadow-lg border-t border-white/20`} />
                    
                    {/* Tooltip on Hover */}
                    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 opacity-0 group-hover:opacity-100 pointer-events-none z-30 transition-all">
                      <div className={`p-3 rounded-xl border shadow-xl min-w-[140px] ${darkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`}>
                        <div className="text-[10px] font-bold text-slate-500 uppercase mb-1">{segment.subtaskTitle}</div>
                        <div className="text-xs font-bold">{formatDuration(segment.duration)}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <hr className={`my-8 ${darkMode ? 'border-slate-800' : 'border-slate-100'}`} />

         {/* Breakdown Section */}
<div className="mt-8">
  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-4">
    Total Duration Breakdown
  </h3>
  
  <div className="flex flex-wrap gap-3">
    {totalDurationMap.map((item, idx) => (
      <div 
        key={idx} 
        className={`px-4 py-2.5 rounded-xl border flex items-center gap-4 transition-all hover:scale-[1.02] ${
          darkMode 
            ? 'bg-slate-900/40 border-slate-800 hover:border-slate-700' 
            : 'bg-slate-50 border-slate-200 hover:border-slate-300'
        }`}
      >
        {/* Left Side: Color & Title Info */}
        <div className="flex items-center gap-2.5">
          <div className={`w-2.5 h-2.5 rounded-full shadow-sm ${item.color}`} />
          <div className="flex flex-col">
            <span className={`text-xs font-bold leading-none ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>
              {item.title}
            </span>
            <span className="text-[9px] font-medium text-slate-500 mt-1">
              {item.sessionCount} sessions
            </span>
          </div>
        </div>

        {/* Right Side: Duration (Separated by a subtle line) */}
        <div className={`pl-4 border-l h-6 flex items-center ${darkMode ? 'border-slate-800' : 'border-slate-200'}`}>
          <span className={`text-sm font-black tabular-nums ${darkMode ? 'text-indigo-400' : 'text-indigo-600'}`}>
            {formatDuration(item.duration)}
          </span>
        </div>
      </div>
    ))}
  </div>
</div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsModal;