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
  lane?: number;
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
    const lanes: number[] = [];
    
    const processedSegments = rawSegments.map(segment => {
      let laneIndex = -1;
      
      // Try to fit in an existing lane
      for (let i = 0; i < lanes.length; i++) {
        // Adding a buffer to visually separate close items
        if (segment.startTime >= lanes[i] + 300000) { // 5 min buffer for cleaner look
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
       const key = seg.taskTitle;
       if (!totalDurationMap[key]) {
         totalDurationMap[key] = { title: key, duration: 0, color: seg.color };
       }
       totalDurationMap[key].duration += seg.duration;
    });

    return { 
      segmentsWithLanes: processedSegments, 
      maxLanes: Math.max(1, lanes.length),
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

  // Dimensions - REDUCED
  const laneHeight = 60;  // Reduced block height
  const laneGap = 20;     // Smaller gap between lanes
  const headerHeight = 40; 
  const minChartHeight = 180; // Much smaller minimum height
  const computedHeight = maxLanes * (laneHeight + laneGap);
  const chartHeight = Math.max(minChartHeight, computedHeight);

  // 2-Hour Intervals for Grid
  const hours = Array.from({ length: 13 }, (_, i) => i * 2);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-300">
      <div 
        className={`w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-300 border ${
          darkMode ? 'bg-[#0B0F19] text-slate-100 border-slate-800' : 'bg-white text-slate-900 border-slate-200'
        }`}
      >
        {/* Header */}
        <div className={`px-6 py-4 border-b flex items-center justify-between ${darkMode ? 'border-slate-800 bg-[#0F1422]' : 'border-slate-100 bg-slate-50'}`}>
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className={`p-1.5 rounded-lg ${darkMode ? 'bg-indigo-500/10 text-indigo-400' : 'bg-indigo-100 text-indigo-600'}`}>
                <Activity size={16} strokeWidth={2.5} />
              </div>
              <h2 className={`text-xs font-black uppercase tracking-[0.2em] ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                Focus & Wellness Analysis
              </h2>
            </div>
            <div className="flex items-center gap-6">
              <h1 className="text-3xl font-bold tracking-tight">Daily Timeline</h1>
              <div className={`px-4 py-1.5 rounded-full text-xs font-bold flex items-center gap-2 border ${darkMode ? 'bg-slate-900 border-slate-700 text-slate-300' : 'bg-white border-slate-200 text-slate-600'}`}>
                <Calendar size={14} />
                {dateStr}
              </div>
            </div>
          </div>
          <button 
            onClick={onClose}
            className={`p-3 rounded-full transition-all duration-200 ${darkMode ? 'hover:bg-slate-800 text-slate-400 hover:text-white' : 'hover:bg-slate-100 text-slate-400 hover:text-slate-900'}`}
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex flex-col flex-1 overflow-hidden relative">
           <div className="flex-1 overflow-y-auto custom-scrollbar px-6 py-6">
            
            {/* Timeline Chart Container */}
            <div className="mb-6 relative select-none">
              <div 
                className="relative w-full"
                style={{ height: chartHeight + headerHeight }} 
              >
                {/* Grid Lines & Labels */}
                <div className="absolute inset-0 flex justify-between pointer-events-none z-0">
                  {hours.map((hour) => (
                    <div key={hour} className="flex flex-col items-center h-full relative" style={{ width: '1px' }}>
                      <span className={`absolute -top-10 text-xs font-bold tabular-nums tracking-wide ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
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
                    const isVeryNarrow = width < 1.5;
                    const isWideEnoughForLabel = width > 4; 
                    
                    const isYellow = segment.color.includes('amber');
                    const textColorClass = isYellow ? 'text-slate-900' : 'text-white';
                    const labelColorClass = darkMode ? 'text-slate-300' : 'text-slate-600';

                    return (
                      <div
                        key={idx}
                        className="absolute flex flex-col group/segment hover:z-20 transition-all duration-300"
                        style={{ 
                          left: `${Math.max(0, Math.min(100, left))}%`, 
                          width: `${Math.max(0.2, Math.min(100, width))}%`,
                          top: top,
                          height: laneHeight,
                        }}
                      >
                         {/* Floating Label (Badge Style) */}
                         <div className={`absolute -top-7 left-0 flex items-center gap-2 whitespace-nowrap transition-transform duration-300 origin-bottom-left group-hover/segment:scale-105 ${isVeryNarrow ? 'opacity-0 group-hover/segment:opacity-100' : 'opacity-100'}`}>
                            <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-md ${darkMode ? 'bg-slate-800/80 border-slate-700' : 'bg-white/80 border-slate-200'} border backdrop-blur-sm shadow-sm`}>
                              <div className={`w-1.5 h-1.5 rounded-full ${segment.color}`} />
                              <span className={`text-[10px] font-bold ${labelColorClass} truncate max-w-[120px]`}>
                                {segment.taskTitle}
                              </span>
                              <span className={`text-[9px] font-mono opacity-60 ${labelColorClass}`}>
                                {formatTime(segment.startTime)}
                              </span>
                            </div>
                         </div>

                         {/* The Block */}
                         <div className={`relative w-full h-full rounded-2xl shadow-lg hover:shadow-2xl hover:scale-[1.02] hover:-translate-y-1 transition-all duration-300 border-t border-white/20 overflow-hidden cursor-default`}>
                            <div className={`absolute inset-0 ${segment.color} opacity-90`}></div>
                            <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-black/10 pointer-events-none"></div>
                            
                            {/* Inner Content (if wide enough) */}
                            {isWideEnoughForLabel && (
                              <div className={`relative z-10 p-3 h-full flex flex-col justify-end ${textColorClass}`}>
                                 <span className="text-[10px] font-bold opacity-50 uppercase tracking-widest mb-0.5">
                                   Duration
                                 </span>
                                 <span className="text-xl font-bold tracking-tight leading-none">
                                   {Math.ceil(segment.duration / 60)}m
                                 </span>
                              </div>
                            )}
                         </div>

                        {/* Detailed Tooltip */}
                        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-3 opacity-0 group-hover/segment:opacity-100 transition-all duration-200 z-50 pointer-events-none whitespace-nowrap scale-95 group-hover/segment:scale-100 origin-top">
                          <div className={`p-4 rounded-xl shadow-2xl border flex flex-col gap-2 min-w-[180px] ${darkMode ? 'bg-slate-900 text-slate-100 border-slate-700' : 'bg-white text-slate-900 border-slate-200'}`}>
                            <div className="flex items-center gap-2 border-b pb-2 border-slate-200 dark:border-slate-800">
                              <div className={`w-3 h-3 rounded-full ${segment.color}`} />
                              <span className="font-bold text-sm">{segment.taskTitle}</span>
                            </div>
                            
                            <div className="space-y-1.5">
                              {!segment.isActivity && (
                                <div className={`flex items-center gap-1.5 text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                  <AlignLeft size={10} />
                                  <span>{segment.subtaskTitle}</span>
                                </div>
                              )}
                              <div className="flex justify-between items-center text-xs bg-slate-100 dark:bg-slate-800 rounded-lg p-2 mt-1">
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
                          <div className={`w-4 h-4 rotate-45 mx-auto -mt-2 border-l border-t ${darkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`}></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Breakdown / Legend */}
            <div className={`border-t pt-6 mt-4 ${darkMode ? 'border-slate-800' : 'border-slate-200'}`}>
               <div className="flex items-center gap-4 mb-6">
                 <h3 className={`text-xs font-black uppercase tracking-[0.2em] ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                   Session Breakdown
                 </h3>
                 <div className={`h-px flex-1 ${darkMode ? 'bg-slate-800' : 'bg-slate-100'}`} />
               </div>
               
               {totalDurationMap.length > 0 ? (
                 <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                   {totalDurationMap.map((item, idx) => (
                     <div key={idx} className={`flex items-center p-4 rounded-2xl border transition-all duration-300 hover:shadow-lg hover:scale-[1.02] ${darkMode ? 'bg-slate-900/40 border-slate-800 hover:border-slate-700' : 'bg-white border-slate-100 hover:border-slate-200'}`}>
                        <div className={`w-10 h-10 rounded-2xl mr-3 flex items-center justify-center shadow-inner ${item.color.replace('bg-', 'text-').replace('400', '100')} ${darkMode ? 'bg-white/5' : 'bg-slate-50'}`}>
                           <div className={`w-4 h-4 rounded-full ${item.color}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className={`text-sm font-bold truncate ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                            {item.title}
                          </div>
                          <div className={`text-xs font-medium opacity-60 mt-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                            {segmentsWithLanes.filter(s => s.taskTitle === item.title).length} sessions
                          </div>
                        </div>
                        <div className={`text-base font-black tabular-nums ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>
                          {formatDuration(item.duration)}
                        </div>
                     </div>
                   ))}
                 </div>
               ) : (
                  <div className={`py-16 flex flex-col items-center justify-center rounded-3xl border border-dashed ${darkMode ? 'bg-slate-900/20 border-slate-800' : 'bg-slate-50/50 border-slate-200'}`}>
                    <Activity size={40} className={`mb-4 opacity-20 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`} />
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