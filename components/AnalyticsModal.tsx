
import React, { useMemo } from 'react';
import { Task } from '../types';
import { X, Calendar, Activity } from 'lucide-react';

interface AnalyticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: Task[];
  darkMode: boolean;
}

interface TimelineSegment {
  taskTitle: string;
  subtaskTitle: string;
  startTime: number;
  endTime: number;
  duration: number;
  color: string;
}

const COLORS = [
  'bg-indigo-500',
  'bg-emerald-500',
  'bg-violet-500',
  'bg-blue-500',
  'bg-rose-500',
  'bg-amber-500',
  'bg-cyan-500',
  'bg-fuchsia-500',
  'bg-lime-500',
  'bg-pink-500'
];

const AnalyticsModal: React.FC<AnalyticsModalProps> = ({ isOpen, onClose, tasks, darkMode }) => {
  if (!isOpen) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const startOfDay = today.getTime();
  const endOfDay = startOfDay + 24 * 60 * 60 * 1000;
  
  // Format current date
  const dateStr = today.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

  // Process data for the timeline
  const timelineData = useMemo(() => {
    const segments: TimelineSegment[] = [];
    const taskColors: Record<string, string> = {};
    let colorIndex = 0;

    tasks.forEach(task => {
      // Assign color to task if not already
      if (!taskColors[task.id]) {
        taskColors[task.id] = COLORS[colorIndex % COLORS.length];
        colorIndex++;
      }

      task.subtasks.forEach(subtask => {
        if (subtask.sessions) {
          subtask.sessions.forEach(session => {
            // Filter for sessions that overlap with "Today"
            if (session.startTime >= startOfDay && session.startTime < endOfDay) {
              segments.push({
                taskTitle: task.title,
                subtaskTitle: subtask.title,
                startTime: session.startTime,
                endTime: session.endTime,
                duration: session.duration,
                color: taskColors[task.id]
              });
            }
          });
        }
      });
    });

    return { segments, taskColors };
  }, [tasks, startOfDay, endOfDay]);

  // Aggregated durations for the legend
  const taskAggregates = useMemo(() => {
    const agg: Record<string, { title: string, duration: number, color: string }> = {};
    timelineData.segments.forEach(seg => {
      if (!agg[seg.taskTitle]) {
        agg[seg.taskTitle] = { title: seg.taskTitle, duration: 0, color: seg.color };
      }
      agg[seg.taskTitle].duration += seg.duration;
    });
    return Object.values(agg).sort((a, b) => b.duration - a.duration);
  }, [timelineData]);

  const formatTime = (ts: number) => {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className={`w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-300 ${
          darkMode ? 'bg-slate-950 text-slate-100 border border-slate-800' : 'bg-white text-slate-900 border border-slate-200'
        }`}
      >
        {/* Header */}
        <div className={`p-6 border-b flex items-center justify-between ${darkMode ? 'border-slate-800' : 'border-slate-100'}`}>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Activity size={16} className="text-indigo-500" />
              <h2 className={`text-xs font-black uppercase tracking-widest ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                Focus Analysis
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight">24-Hour Timeline</h1>
              <div className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide flex items-center gap-1.5 ${darkMode ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
                <Calendar size={10} />
                {dateStr}
              </div>
            </div>
          </div>
          <button 
            onClick={onClose}
            className={`p-2 rounded-full transition-colors ${darkMode ? 'hover:bg-slate-800 text-slate-400 hover:text-white' : 'hover:bg-slate-100 text-slate-400 hover:text-slate-900'}`}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-8 overflow-y-auto custom-scrollbar flex-1">
          {/* Timeline Chart Container */}
          <div className="mb-12">
            <div className="relative h-24 w-full select-none">
              {/* Grid Lines & Labels */}
              <div className="absolute inset-0 flex justify-between items-end pb-8 pointer-events-none">
                {[0, 4, 8, 12, 16, 20, 24].map((hour) => (
                  <div key={hour} className="flex flex-col items-center h-full justify-end" style={{ width: '1px' }}>
                     <div className={`h-full w-px border-l border-dashed opacity-10 ${darkMode ? 'border-slate-100' : 'border-slate-900'}`} />
                     <span className={`text-[9px] font-bold mt-2 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                       {hour.toString().padStart(2, '0')}:00
                     </span>
                  </div>
                ))}
              </div>

              {/* Main Track */}
              <div className={`absolute left-0 right-0 top-1/2 -translate-y-1/2 h-8 rounded-lg overflow-hidden ${darkMode ? 'bg-slate-900' : 'bg-slate-100'}`}>
                {timelineData.segments.map((segment, idx) => {
                  const daySeconds = 24 * 60 * 60;
                  // Calculate position based on start time relative to start of day
                  const startOffset = (segment.startTime - startOfDay) / 1000;
                  const left = (startOffset / daySeconds) * 100;
                  const width = (segment.duration / daySeconds) * 100;

                  return (
                    <div
                      key={idx}
                      className={`absolute top-0 bottom-0 ${segment.color} hover:brightness-110 transition-all cursor-pointer group/segment min-w-[2px]`}
                      style={{ 
                        left: `${Math.max(0, Math.min(100, left))}%`, 
                        width: `${Math.max(0.2, Math.min(100, width))}%`
                      }}
                    >
                      {/* Tooltip */}
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover/segment:opacity-100 transition-opacity z-10 pointer-events-none whitespace-nowrap">
                        <div className={`px-3 py-2 rounded-lg shadow-xl text-xs flex flex-col items-center ${darkMode ? 'bg-slate-800 text-slate-200' : 'bg-white text-slate-800 border border-slate-100'}`}>
                          <span className="font-bold">{segment.taskTitle}</span>
                          <span className="opacity-70 text-[10px]">{segment.subtaskTitle}</span>
                          <span className={`mt-1 font-mono text-[9px] uppercase tracking-wider ${darkMode ? 'text-indigo-400' : 'text-indigo-600'}`}>
                            {formatTime(segment.startTime)} - {formatTime(segment.endTime)}
                          </span>
                        </div>
                        {/* Arrow */}
                        <div className={`w-2 h-2 rotate-45 mx-auto -mt-1 ${darkMode ? 'bg-slate-800' : 'bg-white border-r border-b border-slate-100'}`}></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            
            <div className={`text-center text-[10px] font-medium uppercase tracking-widest mt-2 ${darkMode ? 'text-slate-600' : 'text-slate-400'}`}>
              Time (24h)
            </div>
          </div>

          {/* Breakdown / Legend */}
          <div>
             <h3 className={`text-[10px] font-black uppercase tracking-[0.2em] mb-6 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
               Activity Breakdown
             </h3>
             
             {taskAggregates.length > 0 ? (
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 {taskAggregates.map((item, idx) => (
                   <div key={idx} className={`flex items-center p-4 rounded-xl border transition-colors ${darkMode ? 'bg-slate-900/50 border-slate-800' : 'bg-slate-50 border-slate-100'}`}>
                      <div className={`w-3 h-3 rounded-full mr-3 ${item.color}`} />
                      <div className="flex-1 min-w-0">
                        <div className={`text-xs font-bold truncate ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                          {item.title}
                        </div>
                        <div className={`text-[10px] font-medium ${darkMode ? 'text-slate-500' : 'text-slate-500'}`}>
                          {timelineData.segments.filter(s => s.taskTitle === item.title).length} sessions
                        </div>
                      </div>
                      <div className={`text-sm font-black tabular-nums ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>
                        {formatDuration(item.duration)}
                      </div>
                   </div>
                 ))}
               </div>
             ) : (
                <div className={`py-12 flex flex-col items-center justify-center rounded-2xl border border-dashed ${darkMode ? 'bg-slate-900/30 border-slate-800' : 'bg-slate-50/50 border-slate-200'}`}>
                  <Activity size={24} className={`mb-2 opacity-20 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`} />
                  <p className={`text-[10px] font-black uppercase tracking-widest ${darkMode ? 'text-slate-600' : 'text-slate-400'}`}>
                    No activity recorded today
                  </p>
                </div>
             )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsModal;