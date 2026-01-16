
import React, { useState } from 'react';
import { Task, Subtask } from '../types';
import { CheckCircle2, ChevronDown, ChevronUp, Trash2, Plus, Sparkles, Loader2, Circle } from 'lucide-react';
import { generateSubtasks } from '../services/geminiService';

interface TaskCardProps {
  task: Task;
  onUpdate: (updatedTask: Task) => void;
  onDelete: (id: string) => void;
}

const TaskCard: React.FC<TaskCardProps> = ({ task, onUpdate, onDelete }) => {
  const [isExpanded, setIsExpanded] = useState(false);
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
      percentage: nextStatus ? 100 : task.percentage === 100 ? 0 : task.percentage
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

    onUpdate({
      ...task,
      subtasks: updatedSubtasks,
      percentage: autoPercent
    });
    setNewSubtaskTitle('');
  };

  const handleAiBreakdown = async () => {
    setIsAiLoading(true);
    const suggested = await generateSubtasks(task.title, task.description);
    if (suggested.length > 0) {
      const newSubtasks: Subtask[] = suggested.map((s: any) => ({
        id: crypto.randomUUID(),
        title: s.title,
        isCompleted: false
      }));
      onUpdate({
        ...task,
        subtasks: [...task.subtasks, ...newSubtasks]
      });
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

    onUpdate({
      ...task,
      subtasks: updatedSubtasks,
      percentage: autoPercent,
      isCompleted: autoPercent === 100
    });
  };

  const removeSubtask = (subId: string) => {
    const updatedSubtasks = task.subtasks.filter(s => s.id !== subId);
    let autoPercent = task.percentage;
    if (updatedSubtasks.length > 0) {
        const completedCount = updatedSubtasks.filter(s => s.isCompleted).length;
        autoPercent = Math.round((completedCount / updatedSubtasks.length) * 100);
    }

    onUpdate({
      ...task,
      subtasks: updatedSubtasks,
      percentage: autoPercent
    });
  };

  return (
    <div className={`bg-white rounded-2xl border border-slate-200 shadow-sm transition-all duration-300 hover:shadow-md ${task.isCompleted ? 'border-green-200' : ''}`}>
      <div className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4 flex-1">
            <button 
              onClick={toggleTaskCompletion}
              className={`mt-1 transition-colors ${task.isCompleted ? 'text-green-500' : 'text-slate-300 hover:text-indigo-400'}`}
            >
              <CheckCircle2 size={24} fill={task.isCompleted ? 'currentColor' : 'transparent'} />
            </button>
            <div className="flex-1">
              <h3 className={`text-lg font-semibold transition-all ${task.isCompleted ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                {task.title}
              </h3>
              <p className="text-sm text-slate-500 line-clamp-2 mt-1">{task.description}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={handleAiBreakdown}
              disabled={isAiLoading}
              title="AI Breakdown"
              className="p-2 text-indigo-500 hover:bg-indigo-50 rounded-lg transition-colors disabled:opacity-50"
            >
              {isAiLoading ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
            </button>
            <button 
              onClick={() => onDelete(task.id)}
              className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
            >
              <Trash2 size={18} />
            </button>
          </div>
        </div>

        {/* Individual Progress Visual */}
        <div className="mt-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-tighter">Progress Override</span>
            <span className="text-sm font-semibold text-indigo-600">{task.percentage}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={task.percentage}
            onChange={handlePercentageChange}
            className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-500"
          />
        </div>

        <div className="mt-6 pt-4 border-t border-slate-100 flex justify-between items-center">
          <button 
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-sm font-medium text-slate-600 flex items-center gap-1 hover:text-indigo-600 transition-colors"
          >
            {task.subtasks.length} Subtasks
            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-24 bg-slate-100 rounded-full overflow-hidden">
                <div 
                    className="h-full bg-gradient-to-r from-indigo-400 to-purple-400 transition-all duration-500" 
                    style={{ width: `${task.percentage}%` }}
                />
            </div>
          </div>
        </div>

        {isExpanded && (
          <div className="mt-4 space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
            {task.subtasks.map(sub => (
              <div key={sub.id} className="group flex items-center justify-between gap-3 pl-2 py-1">
                <div className="flex items-center gap-3 flex-1">
                  <button onClick={() => toggleSubtask(sub.id)}>
                    {sub.isCompleted ? (
                      <CheckCircle2 size={18} className="text-green-500" />
                    ) : (
                      <Circle size={18} className="text-slate-300 hover:text-indigo-400" />
                    )}
                  </button>
                  <span className={`text-sm ${sub.isCompleted ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
                    {sub.title}
                  </span>
                </div>
                <button 
                  onClick={() => removeSubtask(sub.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-300 hover:text-red-400"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            
            <div className="flex items-center gap-2 mt-2">
              <input
                type="text"
                placeholder="Add subtask..."
                value={newSubtaskTitle}
                onChange={(e) => setNewSubtaskTitle(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addSubtask(newSubtaskTitle)}
                className="flex-1 text-sm bg-slate-50 border-none rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-200 outline-none"
              />
              <button 
                onClick={() => addSubtask(newSubtaskTitle)}
                className="p-2 text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"
              >
                <Plus size={18} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TaskCard;
