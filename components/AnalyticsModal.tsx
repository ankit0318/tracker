
import React, { useMemo } from 'react';
import { Task, ActivitySession } from '../types';
import { X, Calendar, Activity } from 'lucide-react';

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
  food: 'bg-sky-300',      // Soft Blue
  nap: 'bg-amber-200',     // Soft Yellow
  rest: 'bg-violet-300',   // Soft Purple
  break: 'bg-emerald-300', // Soft Green
  drift: 'bg-gray-400'    // Soft Neutral Gray-Blue
};

const AnalyticsModal: React.FC<AnalyticsModalProps> = ({ isOpen, onClose, tasks, activityHistory = [], darkMode }) => {
  if (!isOpen) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const startOfDay = today.getTime();
  const endOfDay = startOfDay + 24 * 60 * 60 * 1000;
  
  const dateStr = today.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

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
           subtaskTitle: activity.type === 'drift' ? 'Unstructured' : 'Wellness',
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
        // Adding a small buffer (e.g., 60s) to visually separate close items
        if (segment.startTime >= lanes[i]) {
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
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  // Dimensions
  const laneHeight = 48; // Spacious look
  const laneGap = 12;
  const chartHeight = Math.max(160, maxLanes * (laneHeight + laneGap));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className={`w-full max-w-6xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-300 ${
          darkMode ? 'bg-slate-950 text-slate-100 border border-slate-800' : 'bg-white text-slate-900 border border-slate-200'
        }`}
      >
        {/* Header */}
        <div className={`p-6 border-b flex items-center justify-between ${darkMode ? 'border-slate-800' : 'border-slate-100'}`}>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Activity size={16} className="text-indigo-500" />
              <h2 className={`text-xs font-black uppercase tracking-widest ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                Focus & Wellness Analysis
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
        <div className="flex flex-col flex-1 overflow-hidden">
           <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
            
            {/* Timeline Chart Container */}
            <div className="mb-12 relative">
              <div 
                className="relative w-full select-none"
                style={{ height: chartHeight + 40 }} // Extra space for x-axis
              >
                {/* Grid Lines & Labels */}
                <div className="absolute inset-0 flex justify-between pointer-events-none z-0">
                  {[0, 4, 8, 12, 16, 20, 24].map((hour) => (
                    <div key={hour} className="flex flex-col items-center h-full" style={{ width: '1px' }}>
                      <div className={`flex-1 w-px border-l border-dashed opacity-10 ${darkMode ? 'border-slate-100' : 'border-slate-900'}`} />
                      <span className={`text-[10px] font-bold mt-2 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                        {hour.toString().padStart(2, '0')}:00
                      </span>
                    </div>
                  ))}
                </div>

                {/* Segments (Swimlanes) */}
                <div className="absolute inset-0 top-0 right-0 left-0 z-10">
                  {segmentsWithLanes.map((segment, idx) => {
                    const daySeconds = 24 * 60 * 60;
                    const startOffset = (segment.startTime - startOfDay) / 1000;
                    const left = (startOffset / daySeconds) * 100;
                    const width = (segment.duration / daySeconds) * 100;
                    const top = (segment.lane || 0) * (laneHeight + laneGap);

                    // Check if wide enough for internal text
                    const isWide = width > 5; 
                    
                    // Determine text color based on background intensity
                    // Soft pastel backgrounds (Activities) generally need dark text in light mode, but white text usually works well with decent opacity.
                    // However, yellow (amber-200) might need dark text.
                    const isYellow = segment.color.includes('amber-200');
                    const textColorClass = isYellow ? 'text-slate-800' : 'text-white';

                    return (
                      <div
                        key={idx}
                        className={`absolute rounded-lg shadow-sm overflow-hidden hover:brightness-105 hover:shadow-md transition-all cursor-default group/segment flex flex-col justify-center px-2 border border-black/5 dark:border-white/5`}
                        style={{ 
                          left: `${Math.max(0, Math.min(100, left))}%`, 
                          width: `${Math.max(0.2, Math.min(100, width))}%`,
                          top: top,
                          height: laneHeight,
                          // Background color applied directly via className below
                        }}
                      >
                         {/* Color Layer */}
                         <div className={`absolute inset-0 ${segment.color} opacity-90`}></div>
                         
                         {/* Content inside bar */}
                         <div className="relative z-10 flex flex-col">
                            {isWide ? (
                              <>
                                <span className={`text-[10px] font-bold truncate drop-shadow-sm leading-tight ${textColorClass}`}>
                                  {segment.taskTitle}
                                </span>
                                <span className={`text-[9px] font-medium truncate drop-shadow-sm opacity-90 ${textColorClass}`}>
                                  {formatTime(segment.startTime)} - {formatTime(segment.endTime)}
                                </span>
                              </>
                            ) : (
                               // Minimal content for thin bars
                               <div className="w-full h-full" />
                            )}
                         </div>

                        {/* Tooltip (Always available for details) */}
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover/segment:opacity-100 transition-opacity z-20 pointer-events-none whitespace-nowrap">
                          <div className={`px-3 py-2 rounded-lg shadow-xl text-xs flex flex-col items-center ${darkMode ? 'bg-slate-800 text-slate-200 border border-slate-700' : 'bg-white text-slate-800 border border-slate-100'}`}>
                            <span className="font-bold text-sm mb-0.5">{segment.taskTitle}</span>
                            {!segment.isActivity && <span className="opacity-70 text-[10px]">{segment.subtaskTitle}</span>}
                            <span className={`mt-1 font-mono text-[9px] uppercase tracking-wider ${darkMode ? 'text-indigo-400' : 'text-indigo-600'}`}>
                              {formatTime(segment.startTime)} - {formatTime(segment.endTime)}
                            </span>
                            <span className="text-[9px] opacity-60 mt-0.5">Duration: {formatDuration(segment.duration)}</span>
                          </div>
                          <div className={`w-2 h-2 rotate-45 mx-auto -mt-1 ${darkMode ? 'bg-slate-800 border-r border-b border-slate-700' : 'bg-white border-r border-b border-slate-100'}`}></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Breakdown / Legend */}
            <div className="border-t pt-8 mt-4 border-slate-200 dark:border-slate-800">
               <h3 className={`text-[10px] font-black uppercase tracking-[0.2em] mb-6 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                 Total Duration Breakdown
               </h3>
               
               {totalDurationMap.length > 0 ? (
                 <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                   {totalDurationMap.map((item, idx) => (
                     <div key={idx} className={`flex items-center p-3 rounded-xl border transition-colors ${darkMode ? 'bg-slate-900/50 border-slate-800' : 'bg-slate-50 border-slate-100'}`}>
                        <div className={`w-3 h-3 rounded-full mr-3 ${item.color}`} />
                        <div className="flex-1 min-w-0">
                          <div className={`text-xs font-bold truncate ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                            {item.title}
                          </div>
                          <div className={`text-[10px] font-medium opacity-60 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                            {segmentsWithLanes.filter(s => s.taskTitle === item.title).length} sessions
                          </div>
                        </div>
                        <div className={`text-xs font-black tabular-nums ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>
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
    </div>
  );
};

export default AnalyticsModal;
