
import React, { useMemo } from 'react';
import { Task, ActivitySession } from '../types';
import { X, Calendar, Activity, Clock } from 'lucide-react';

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
  lane?: number; // Visual vertical lane index to prevent overlap
  isActivity?: boolean;
}

// Updated Task Colors: Professional, distinct, not overly vibrant
const COLORS = [
  'bg-indigo-500',
  'bg-rose-500',
  'bg-teal-600',
  'bg-orange-500',
  'bg-fuchsia-600',
  'bg-blue-600',
  'bg-red-500',
  'bg-cyan-600',
];

// Updated Wellness Colors: Soft, mindful palette
const ACTIVITY_COLORS: Record<string, string> = {
  food: 'bg-sky-400',      // Slightly more saturated for visibility against white text
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

  // Process data for the timeline and calculate layout lanes
  const { segmentsWithLanes, maxLanes, totalDurationMap } = useMemo(() => {
    const rawSegments: TimelineSegment[] = [];
    const taskColors: Record<string, string> = {};
    let colorIndex = 0;

    // 1. Convert Tasks to Segments
    tasks.forEach(task => {
      if (!taskColors[task.id]) {
        taskColors[task.id] = COLORS[colorIndex % COLORS.length];
        colorIndex++;
      }
      task.subtasks.forEach(subtask => {
        if (subtask.sessions) {
          subtask.sessions.forEach(session => {
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
        }
      });
    });

    // 2. Convert Activities to Segments
    activityHistory.forEach(activity => {
      if (activity.startTime >= startOfDay && activity.startTime < endOfDay) {
         rawSegments.push({
           taskTitle: activity.type.charAt(0).toUpperCase() + activity.type.slice(1),
           subtaskTitle: activity.type === 'drift' ? 'Unstructured Time' : 'Wellness Session',
           startTime: activity.startTime,
           endTime: activity.endTime,
           duration: activity.duration,
           color: ACTIVITY_COLORS[activity.type] || 'bg-slate-400',
           isActivity: true
         });
      }
    });

    // 3. Sort by start time
    rawSegments.sort((a, b) => a.startTime - b.startTime);

    // 4. Assign Lanes (Swimlane Algorithm)
    // We maintain an array 'lanes' where lanes[i] is the endTime of the last item in that lane.
    const lanes: number[] = [];
    
    const processedSegments = rawSegments.map(segment => {
      let laneIndex = -1;
      
      // Try to fit in an existing lane
      for (let i = 0; i < lanes.length; i++) {
        // Adding a small buffer (e.g., 2 mins) to visually separate close items
        if (segment.startTime >= lanes[i] + 120000) {
          laneIndex = i;
          break;
        }
      }

      // If no fit, create new lane
      if (laneIndex === -1) {
        laneIndex = lanes.length;
        lanes.push(0);
      }

      // Update the lane's end time
      lanes[laneIndex] = segment.endTime;

      return { ...segment, lane: laneIndex };
    });

    // 5. Aggregate Durations for Legend
    const totalDurationMap: Record<string, { title: string, duration: number, color: string }> = {};
    processedSegments.forEach(seg => {
       const key = seg.taskTitle; // Group by Task Title or Activity Type
       if (!totalDurationMap[key]) {
         totalDurationMap[key] = { title: key, duration: 0, color: seg.color };
       }
       totalDurationMap[key].duration += seg.duration;
    });

    return { 
      segmentsWithLanes: processedSegments, 
      maxLanes: lanes.length || 1,
      totalDurationMap: Object.values(totalDurationMap).sort((a, b) => b.duration - a.duration)
    };
  }, [tasks, activityHistory, startOfDay, endOfDay]);

  const formatTime = (ts: number) => {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  // Dimensions
  const laneHeight = 64; // Taller for better readability
  const laneGap = 20;    // Increased gap for visual breathing room
  const headerHeight = 40; // Space for X-axis labels
  const chartHeight = Math.max(200, maxLanes * (laneHeight + laneGap));

  // 2-Hour Intervals for Grid
  const hours = Array.from({ length: 13 }, (_, i) => i * 2);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md animate-in fade-in duration-300">
      <div 
        className={`w-full max-w-7xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-300 border ${
          darkMode ? 'bg-slate-950 text-slate-100 border-slate-800' : 'bg-white text-slate-900 border-slate-200'
        }`}
      >
        {/* Header */}
        <div className={`px-8 py-6 border-b flex items-center justify-between ${darkMode ? 'border-slate-800 bg-slate-900/50' : 'border-slate-100 bg-slate-50/80'}`}>
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <div className={`p-1.5 rounded-md ${darkMode ? 'bg-indigo-500/20 text-indigo-400' : 'bg-indigo-100 text-indigo-600'}`}>
                <Activity size={14} strokeWidth={2.5} />
              </div>
              <h2 className={`text-[11px] font-black uppercase tracking-[0.2em] ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                Focus & Wellness Analysis
              </h2>
            </div>
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold tracking-tight">Daily Timeline</h1>
              <div className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-2 border ${darkMode ? 'bg-slate-900 border-slate-700 text-slate-300' : 'bg-white border-slate-200 text-slate-600'}`}>
                <Calendar size={12} />
                {dateStr}
              </div>
            </div>
          </div>
          <button 
            onClick={onClose}
            className={`p-2.5 rounded-full transition-all duration-200 ${darkMode ? 'hover:bg-slate-800 text-slate-400 hover:text-white' : 'hover:bg-slate-100 text-slate-400 hover:text-slate-900'}`}
          >
            <X size={22} />
          </button>
        </div>

        {/* Content */}
        <div className="flex flex-col flex-1 overflow-hidden relative">
           <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
            
            {/* Timeline Chart Container */}
            <div className="mb-12 relative select-none">
              <div 
                className="relative w-full"
                style={{ height: chartHeight + headerHeight }} 
              >
                {/* Grid Lines & Labels */}
                <div className="absolute inset-0 flex justify-between pointer-events-none z-0">
                  {hours.map((hour) => (
                    <div key={hour} className="flex flex-col items-center h-full relative" style={{ width: '1px' }}>
                      <span className={`absolute -top-8 text-[11px] font-bold tabular-nums tracking-tight ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                        {hour.toString().padStart(2, '0')}:00
                      </span>
                      <div className={`w-px h-full ${hour === 0 || hour === 24 ? '' : 'border-l border-dashed'} ${darkMode ? 'border-slate-800' : 'border-slate-200'}`} />
                    </div>
                  ))}
                </div>

                {/* Segments (Swimlanes) */}
                <div className="absolute inset-0 right-0 left-0 z-10" style={{ top: 0 }}>
                  {segmentsWithLanes.map((segment, idx) => {
                    const daySeconds = 24 * 60 * 60;
                    const startOffset = (segment.startTime - startOfDay) / 1000;
                    const left = (startOffset / daySeconds) * 100;
                    const width = (segment.duration / daySeconds) * 100;
                    const top = (segment.lane || 0) * (laneHeight + laneGap);

                    // Check if wide enough for internal text
                    const isWide = width > 3; 
                    const isVeryWide = width > 8;
                    
                    // Determine text color based on background intensity
                    // Generally white text for our premium palette, mostly dark or vibrant backgrounds
                    const isYellow = segment.color.includes('amber');
                    const textColorClass = isYellow ? 'text-slate-900' : 'text-white';
                    const subTextColorClass = isYellow ? 'text-slate-700' : 'text-white/80';

                    return (
                      <div
                        key={idx}
                        className={`absolute rounded-xl shadow-lg border-t border-white/20 hover:scale-[1.01] hover:shadow-xl transition-all duration-300 cursor-default group/segment flex flex-col justify-center px-3 overflow-hidden`}
                        style={{ 
                          left: `${Math.max(0, Math.min(100, left))}%`, 
                          width: `${Math.max(0.2, Math.min(100, width))}%`,
                          top: top,
                          height: laneHeight,
                        }}
                      >
                         {/* Background & Gradient */}
                         <div className={`absolute inset-0 ${segment.color}`}></div>
                         <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent pointer-events-none"></div>
                         
                         {/* Content inside bar */}
                         <div className="relative z-10 flex flex-col min-w-0">
                            {isWide ? (
                              <>
                                <div className="flex items-center gap-2">
                                  <span className={`text-xs font-bold truncate drop-shadow-sm ${textColorClass}`}>
                                    {segment.taskTitle}
                                  </span>
                                  {isVeryWide && segment.isActivity && (
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full bg-black/10 backdrop-blur-sm ${textColorClass}`}>
                                      {formatDuration(segment.duration)}
                                    </span>
                                  )}
                                </div>
                                {isVeryWide && (
                                  <div className={`flex items-center gap-1.5 mt-0.5 text-[10px] font-medium truncate ${subTextColorClass}`}>
                                    <Clock size={10} strokeWidth={2.5} />
                                    <span>{formatTime(segment.startTime)} - {formatTime(segment.endTime)}</span>
                                  </div>
                                )}
                              </>
                            ) : (
                               // Minimal content for thin bars (just hover)
                               <div className="w-full h-full" />
                            )}
                         </div>

                        {/* Premium Tooltip */}
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 opacity-0 group-hover/segment:opacity-100 transition-all duration-200 z-50 pointer-events-none whitespace-nowrap scale-95 group-hover/segment:scale-100 origin-bottom">
                          <div className={`p-3 rounded-xl shadow-2xl border flex flex-col gap-1.5 min-w-[140px] ${darkMode ? 'bg-slate-900 text-slate-100 border-slate-700' : 'bg-white text-slate-900 border-slate-200'}`}>
                            <div className="flex items-center gap-2 border-b pb-1.5 border-slate-200 dark:border-slate-800">
                              <div className={`w-2 h-2 rounded-full ${segment.color}`} />
                              <span className="font-bold text-xs">{segment.taskTitle}</span>
                            </div>
                            
                            <div className="space-y-1">
                              {!segment.isActivity && (
                                <div className={`text-[10px] font-medium ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                  {segment.subtaskTitle}
                                </div>
                              )}
                              <div className="flex justify-between items-center text-[10px]">
                                <span className={`font-mono ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                  {formatTime(segment.startTime)} - {formatTime(segment.endTime)}
                                </span>
                                <span className={`font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                                  {formatDuration(segment.duration)}
                                </span>
                              </div>
                            </div>
                          </div>
                          {/* Triangle arrow */}
                          <div className={`w-3 h-3 rotate-45 mx-auto -mt-1.5 border-r border-b ${darkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`}></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Breakdown / Legend */}
            <div className={`border-t pt-8 mt-4 ${darkMode ? 'border-slate-800' : 'border-slate-200'}`}>
               <div className="flex items-center gap-3 mb-6">
                 <h3 className={`text-[11px] font-black uppercase tracking-[0.2em] ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                   Session Breakdown
                 </h3>
                 <div className={`h-px flex-1 ${darkMode ? 'bg-slate-800' : 'bg-slate-100'}`} />
               </div>
               
               {totalDurationMap.length > 0 ? (
                 <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                   {totalDurationMap.map((item, idx) => (
                     <div key={idx} className={`flex items-center p-4 rounded-2xl border transition-all duration-300 hover:shadow-md ${darkMode ? 'bg-slate-900/40 border-slate-800 hover:border-slate-700' : 'bg-white border-slate-100 hover:border-slate-200'}`}>
                        <div className={`w-10 h-10 rounded-xl mr-3 flex items-center justify-center shadow-inner ${item.color.replace('bg-', 'text-').replace('400', '100')} ${darkMode ? 'bg-white/5' : 'bg-slate-50'}`}>
                           <div className={`w-4 h-4 rounded-full ${item.color}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className={`text-sm font-bold truncate ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                            {item.title}
                          </div>
                          <div className={`text-[11px] font-medium opacity-60 mt-0.5 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                            {segmentsWithLanes.filter(s => s.taskTitle === item.title).length} sessions
                          </div>
                        </div>
                        <div className={`text-sm font-black tabular-nums ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>
                          {formatDuration(item.duration)}
                        </div>
                     </div>
                   ))}
                 </div>
               ) : (
                  <div className={`py-16 flex flex-col items-center justify-center rounded-2xl border border-dashed ${darkMode ? 'bg-slate-900/20 border-slate-800' : 'bg-slate-50/50 border-slate-200'}`}>
                    <Activity size={32} className={`mb-3 opacity-20 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`} />
                    <p className={`text-xs font-black uppercase tracking-widest ${darkMode ? 'text-slate-600' : 'text-slate-400'}`}>
                      No activity recorded today
                    </p>
                  </div>
               )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsModal;
