
import React, { useState } from 'react';
import { Task, Subtask } from '../types';
import { 
  CheckCircle2, 
  ChevronDown, 
  ChevronUp, 
  Trash2, 
  Plus, 
  Sparkles, 
  Loader2, 
  Circle, 
  Square, 
  CheckSquare 
} from 'lucide-react';
import { generateSubtasks } from '../services/geminiService';

interface TaskCardProps {
  task: Task;
  onUpdate: (updatedTask: Task) => void;
  onDelete: (id: string) => void;
  darkMode?: boolean;
}

const TaskCard: React.FC<TaskCardProps> = ({ task, onUpdate, onDelete, darkMode = false }) => {
  // Subtasks are opened by default
  const [isExpanded, setIsExpanded] = useState(true);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');

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
    onUpdate({
      ...task,
      isCompleted: nextStatus,
      percentage: nextStatus ? 100 : (task.percentage === 100 ? 0 : task.percentage)
    });
  };

  const addSubtask = (title: string) => {
    if (!title.trim()) return;
    const newSub: Subtask = {
      id: crypto.randomUUID(),
      title: title.trim(),
      isCompleted: false
    };
    const updatedSubtasks = [...task.subtasks, newSub];
    const completedCount = updatedSubtasks.filter(s => s.isCompleted).length;
    const autoPercent = Math.round((completedCount / updatedSubtasks.length) * 100);

    onUpdate({ ...task, subtasks: updatedSubtasks, percentage: autoPercent });
    setNewSubtaskTitle('');
  };

  const handleAiBreakdown = async () => {
    setIsAiLoading(true);
    const suggested = await generateSubtasks(task.title, task.description);
    if (suggested.length > 0) {
      const newSubs: Subtask[] = suggested.map((s: any) => ({
        id: crypto.randomUUID(),
        title: s.title,
        isCompleted: false
      }));
      onUpdate({ ...task, subtasks: [...task.subtasks, ...newSubs] });
      setIsExpanded(true);
    }
    setIsAiLoading(false);
  };

  const toggleSubtask = (subId: string) => {
    const updatedSubtasks = task.subtasks.map(s => 
      s.id === subId ? { ...s, isCompleted: !s.isCompleted } : s
    );
    const completedCount = updatedSubtasks.filter(s => s.isCompleted).length;
    const autoPercent = Math.round((completedCount / updatedSubtasks.length) * 100);
    onUpdate({ ...task, subtasks: updatedSubtasks, percentage: autoPercent, isCompleted: autoPercent === 100 });
  };

  return (
    <div className={`group rounded-lg border transition-all shadow-sm hover:shadow-md overflow-hidden ${
      darkMode 
        ? `bg-slate-900 border-slate-800 hover:border-indigo-500/50 ${task.isCompleted ? 'bg-slate-800/40 opacity-80' : ''}` 
        : `bg-white border-slate-200 hover:border-indigo-300 ${task.isCompleted ? 'bg-slate-50/50' : ''}`
    }`}>
      {/* Header section with Bold White Task Name */}
      <div className={`flex items-center gap-2 p-2.5 transition-colors ${
        task.isCompleted 
          ? 'bg-slate-100 dark:bg-slate-800/60' 
          : 'bg-indigo-600 dark:bg-slate-800'
      }`}>
        <button 
          onClick={toggleTaskCompletion}
          className={`flex-shrink-0 transition-all duration-300 ${task.isCompleted ? 'text-emerald-500 scale-110' : 'text-white/60 hover:text-white'}`}
        >
          <CheckCircle2 size={18} fill={task.isCompleted ? 'currentColor' : 'transparent'} />
        </button>
        
        <div className="min-w-0 flex-1">
          <h3 className={`text-[13px] font-bold truncate transition-colors ${
            task.isCompleted 
              ? 'text-slate-400 dark:text-slate-500 line-through' 
              : 'text-white'
          }`}>
            {task.title}
          </h3>
        </div>

        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={handleAiBreakdown} disabled={isAiLoading} title="AI Breakdown" className="p-1 text-white/60 hover:text-white hover:bg-white/10 rounded">
            {isAiLoading ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
          </button>
          <button onClick={() => onDelete(task.id)} title="Delete" className="p-1 text-white/60 hover:text-red-300 hover:bg-white/10 rounded">
            <Trash2 size={13} />
          </button>
          <button onClick={() => setIsExpanded(!isExpanded)} title="Expand" className="p-1 text-white/60 hover:text-white hover:bg-white/10 rounded">
            {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>
        </div>
      </div>

      <div className="p-2.5 pt-2">
        {/* Extreme Compact Progress Control */}
        <div className="relative group/progress">
          <div className="flex justify-between items-center mb-1">
             <div className={`h-1 flex-1 rounded-full overflow-hidden mr-2 transition-colors ${darkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
               <div 
                  className={`h-full transition-all duration-500 ${task.isCompleted ? 'bg-emerald-400' : 'bg-indigo-500'}`}
                  style={{ width: `${task.percentage}%` }}
                />
             </div>
             <span className="text-[10px] font-black text-indigo-500 dark:text-indigo-400 w-6 text-right">{task.percentage}%</span>
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
          <div className={`mt-2 pt-2 border-t space-y-2 animate-in fade-in slide-in-from-top-1 duration-200 ${darkMode ? 'border-slate-800' : 'border-slate-50'}`}>
            {task.subtasks.map(sub => (
              <div key={sub.id} className="flex items-center gap-2 py-0.5 group/sub">
                <button 
                  onClick={() => toggleSubtask(sub.id)} 
                  className={`flex-shrink-0 transition-all duration-200 ${sub.isCompleted ? 'text-emerald-500' : 'text-slate-400 dark:text-slate-600 hover:text-indigo-400'}`}
                >
                  {sub.isCompleted ? (
                    <CheckSquare size={13} fill="currentColor" className={`${darkMode ? 'bg-slate-900' : 'bg-white'} rounded-[2px]`} />
                  ) : (
                    <Square size={13} />
                  )}
                </button>
                <span className={`text-[11px] leading-tight flex-1 truncate transition-colors duration-200 ${
                  sub.isCompleted 
                    ? 'text-slate-400 dark:text-slate-600 line-through' 
                    : 'text-slate-600 dark:text-slate-400 font-medium'
                }`}>
                  {sub.title}
                </span>
              </div>
            ))}
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
          </div>
        )}
      </div>
    </div>
  );
};

export default TaskCard;
