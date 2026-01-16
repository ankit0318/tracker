
import React, { useState, useEffect } from 'react';
import { Task, Subtask } from '../types';
import { 
  CheckCircle2, 
  ChevronDown, 
  ChevronUp, 
  Trash2, 
  Plus, 
  Square, 
  CheckSquare,
  Clock,
  CircleDashed
} from 'lucide-react';

interface TaskCardProps {
  task: Task;
  onUpdate: (updatedTask: Task) => void;
  onDelete: (id: string) => void;
  onStartTimer: (taskId: string, subtaskTitle: string) => void;
  darkMode?: boolean;
}

const TaskCard: React.FC<TaskCardProps> = ({ task, onUpdate, onDelete, onStartTimer, darkMode = false }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [editingSubtaskProgress, setEditingSubtaskProgress] = useState<string | null>(null);
  
  const [lastCompletedId, setLastCompletedId] = useState<string | null>(null);
  const [justFinishedTask, setJustFinishedTask] = useState(false);

  useEffect(() => {
    if (task.percentage === 100 && !justFinishedTask) {
      setJustFinishedTask(true);
      const timer = setTimeout(() => setJustFinishedTask(false), 1500);
      return () => clearTimeout(timer);
    }
  }, [task.percentage]);

  const formatElapsedTime = (seconds?: number) => {
    if (!seconds || seconds === 0) return '0m';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  const calculateAutoPercentage = (subs: Subtask[]) => {
    if (subs.length === 0) return 0;
    const total = subs.reduce((acc, s) => acc + (s.percentage || (s.isCompleted ? 100 : 0)), 0);
    return Math.round(total / subs.length);
  };

  const handlePercentageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value);
    onUpdate({ 
      ...task, 
      percentage: val,
      isCompleted: val === 100
    });
  };

  const toggleTaskCompletion = () => {
    const nextStatus = !task.isCompleted;
    if (nextStatus) {
      setLastCompletedId(task.id);
      setTimeout(() => setLastCompletedId(null), 500);
    }
    
    const updatedSubs = task.subtasks.map(s => ({ ...s, isCompleted: nextStatus, percentage: nextStatus ? 100 : 0 }));

    onUpdate({
      ...task,
      isCompleted: nextStatus,
      percentage: nextStatus ? 100 : 0,
      subtasks: updatedSubs
    });
  };

  const addSubtask = (title: string) => {
    if (!title.trim()) return;
    const newSub: Subtask = {
      id: crypto.randomUUID(),
      title: title.trim(),
      isCompleted: false,
      percentage: 0,
      timeSpent: 0
    };
    const updatedSubtasks = [...task.subtasks, newSub];
    const autoPercent = calculateAutoPercentage(updatedSubtasks);

    onUpdate({ ...task, subtasks: updatedSubtasks, percentage: autoPercent, isCompleted: autoPercent === 100 });
    setNewSubtaskTitle('');
  };

  const toggleSubtask = (subId: string) => {
    const subtask = task.subtasks.find(s => s.id === subId);
    if (!subtask) return;
    
    const nextCompleted = !subtask.isCompleted;
    if (nextCompleted) {
      setLastCompletedId(subId);
      setTimeout(() => setLastCompletedId(null), 500);
    }
    
    const updatedSubtasks = task.subtasks.map(s => 
      s.id === subId ? { ...s, isCompleted: nextCompleted, percentage: nextCompleted ? 100 : 0 } : s
    );
    const autoPercent = calculateAutoPercentage(updatedSubtasks);
    onUpdate({ ...task, subtasks: updatedSubtasks, percentage: autoPercent, isCompleted: autoPercent === 100 });
  };

  const updateSubtaskPercentage = (subId: string, value: number) => {
    const updatedSubtasks = task.subtasks.map(s => 
      s.id === subId ? { ...s, percentage: value, isCompleted: value === 100 } : s
    );
    const autoPercent = calculateAutoPercentage(updatedSubtasks);
    onUpdate({ ...task, subtasks: updatedSubtasks, percentage: autoPercent, isCompleted: autoPercent === 100 });
  };

  return (
    <div className={`group rounded-lg border transition-all duration-300 shadow-sm hover:shadow-md overflow-hidden ${
      justFinishedTask ? 'task-completed-glow' : ''
    } ${
      darkMode 
        ? `bg-slate-900 border-slate-800 hover:border-indigo-500/50 ${task.isCompleted ? 'bg-slate-800/40 opacity-95' : ''}` 
        : `bg-white border-slate-200 hover:border-indigo-300 ${task.isCompleted ? 'bg-slate-50/50' : ''}`
    }`}>
      <div className={`flex items-center gap-2 p-2.5 transition-all duration-500 ${
        task.isCompleted 
          ? 'bg-emerald-500/10 dark:bg-emerald-950/40' 
          : 'bg-indigo-600'
      }`}>
        <button 
          onClick={toggleTaskCompletion}
          className={`flex-shrink-0 transition-all duration-300 transform ${
            task.isCompleted ? 'text-emerald-500 scale-110' : 'text-white/60 hover:text-white'
          } ${lastCompletedId === task.id ? 'animate-pop' : ''}`}
        >
          <CheckCircle2 size={18} fill={task.isCompleted ? 'currentColor' : 'transparent'} />
        </button>
        
        <div className="min-w-0 flex-1">
          <h3 className={`text-[13px] font-bold truncate transition-all duration-500 ${
            task.isCompleted 
              ? 'text-emerald-600 dark:text-emerald-400 opacity-80' 
              : 'text-white'
          } ${task.isCompleted ? 'strikethrough-animate strikethrough-active' : 'strikethrough-animate'}`}>
            {task.title}
          </h3>
        </div>

        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => onDelete(task.id)} title="Delete" className={`p-1 transition-colors rounded ${task.isCompleted ? 'text-slate-400 hover:text-red-500 hover:bg-red-500/10' : 'text-white/60 hover:text-red-300 hover:bg-white/10'}`}>
            <Trash2 size={13} />
          </button>
          <button onClick={() => setIsExpanded(!isExpanded)} title="Expand" className={`p-1 transition-colors rounded ${task.isCompleted ? 'text-slate-400 hover:text-slate-600' : 'text-white/60 hover:text-white hover:bg-white/10'}`}>
            {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>
        </div>
      </div>

      <div className="p-2.5 pt-2">
        <div className="flex items-center gap-1.5 mb-2.5 opacity-60">
           <Clock size={10} className={task.isCompleted ? 'text-emerald-500' : 'text-indigo-500'} />
           <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
             Effort: {formatElapsedTime(task.totalTimeSpent)}
           </span>
        </div>

        <div className="relative group/progress">
          <div className="flex justify-between items-center mb-1">
             <div className={`h-1 flex-1 rounded-full overflow-hidden mr-2 transition-colors ${darkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
               <div 
                  className={`h-full transition-all duration-700 ease-out ${task.isCompleted ? 'bg-emerald-400' : 'bg-indigo-500'}`}
                  style={{ width: `${task.percentage}%` }}
                />
             </div>
             <span className={`text-[10px] font-black w-6 text-right transition-colors duration-500 ${task.isCompleted ? 'text-emerald-500' : 'text-indigo-500 dark:text-indigo-400'}`}>
               {task.percentage}%
             </span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={task.percentage}
            onChange={handlePercentageChange}
            className="absolute -top-1 left-0 w-[calc(100%-1.75rem)] h-3 opacity-0 cursor-pointer z-10"
          />
        </div>

        {isExpanded && (
          <div className={`mt-3 pt-3 border-t space-y-3 animate-in fade-in slide-in-from-top-1 duration-200 ${darkMode ? 'border-slate-800' : 'border-slate-50'}`}>
            {task.subtasks.map(sub => (
              <div key={sub.id} className="flex flex-col group/sub">
                <div className="flex items-center gap-2 py-0.5">
                  <button 
                    onClick={() => toggleSubtask(sub.id)} 
                    className={`flex-shrink-0 transition-all duration-300 transform ${
                      sub.isCompleted ? 'text-emerald-500 scale-110' : 'text-slate-400 dark:text-slate-600 hover:text-indigo-400'
                    } ${lastCompletedId === sub.id ? 'animate-pop' : ''}`}
                  >
                    {sub.isCompleted ? (
                      <CheckSquare size={13} fill="currentColor" className={`${darkMode ? 'bg-slate-900' : 'bg-white'} rounded-[2px]`} />
                    ) : (
                      <Square size={13} />
                    )}
                  </button>
                  <span className={`text-[11px] leading-tight flex-1 truncate transition-all duration-500 ${
                    sub.isCompleted 
                      ? 'text-emerald-600/60 dark:text-emerald-400/40' 
                      : 'text-slate-600 dark:text-slate-400 font-medium'
                  } ${sub.isCompleted ? 'strikethrough-animate strikethrough-active' : 'strikethrough-animate'}`}>
                    {sub.title}
                  </span>
                  
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={() => setEditingSubtaskProgress(editingSubtaskProgress === sub.id ? null : sub.id)}
                      className={`p-1 transition-all rounded-md flex items-center gap-1 ${
                        sub.percentage && sub.percentage > 0 && !sub.isCompleted 
                        ? 'text-indigo-500 bg-indigo-500/10' 
                        : 'text-slate-400 hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                      title="Set Progress"
                    >
                      <CircleDashed size={11} />
                      {(sub.percentage ?? 0) > 0 && sub.percentage! < 100 && (
                        <span className="text-[9px] font-bold">{sub.percentage}%</span>
                      )}
                    </button>

                    {!sub.isCompleted && (
                      <button 
                        onClick={() => onStartTimer(task.id, sub.title)}
                        className="p-1 opacity-0 group-hover/sub:opacity-100 transition-opacity hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md text-indigo-500"
                        title="Focus Timer"
                      >
                        <Clock size={11} />
                      </button>
                    )}
                  </div>
                </div>

                {editingSubtaskProgress === sub.id && (
                  <div className="pl-5 pb-2 pt-1 animate-in slide-in-from-top-2 duration-200">
                    <div className="flex items-center gap-3">
                      <input 
                        type="range"
                        min="0"
                        max="100"
                        step="5"
                        value={sub.percentage || 0}
                        onChange={(e) => updateSubtaskPercentage(sub.id, parseInt(e.target.value))}
                        className={`flex-1 h-1 rounded-lg appearance-none cursor-pointer accent-indigo-500 ${darkMode ? 'bg-slate-800' : 'bg-slate-100'}`}
                      />
                      <span className="text-[10px] font-black text-indigo-500 w-8">{sub.percentage || 0}%</span>
                    </div>
                  </div>
                )}

                {(sub.timeSpent ?? 0) > 0 && (
                  <div className="pl-5 flex items-center gap-1 opacity-40">
                    <span className="text-[8px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">Logged: {formatElapsedTime(sub.timeSpent)}</span>
                  </div>
                )}
              </div>
            ))}
            {!task.isCompleted && (
              <div className="flex items-center gap-1 mt-1">
                <input
                  type="text"
                  placeholder="Add item..."
                  value={newSubtaskTitle}
                  onChange={(e) => setNewSubtaskTitle(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addSubtask(newSubtaskTitle)}
                  className={`flex-1 text-[10px] px-1.5 py-0.5 rounded border-none outline-none transition-colors ${
                    darkMode 
                      ? 'bg-slate-800 text-slate-200 focus:ring-1 focus:ring-indigo-500 placeholder:text-slate-600' 
                      : 'bg-slate-50 text-slate-800 focus:ring-1 focus:ring-indigo-300 placeholder:text-slate-300'
                  }`}
                />
                <button onClick={() => addSubtask(newSubtaskTitle)} className="p-0.5 text-indigo-500 hover:scale-110 transition-transform">
                  <Plus size={12} />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default TaskCard;
