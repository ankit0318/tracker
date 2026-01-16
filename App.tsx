
import React, { useState, useEffect, useMemo } from 'react';
import { Task, SortOption } from './types';
import CircularProgress from './components/CircularProgress';
import TaskCard from './components/TaskCard';
import TimerOverlay from './components/TimerOverlay';
import { 
  Plus, 
  LayoutGrid, 
  Search, 
  Target, 
  Filter, 
  CheckCircle, 
  ListTodo, 
  Sun, 
  Moon,
  Clock,
  BarChart3,
  ChevronRight
} from 'lucide-react';

const INITIAL_TASKS: Task[] = [
  {
    id: '1',
    title: 'Dashboard Design',
    description: 'Personal tracker mockups.',
    percentage: 85,
    isCompleted: false,
    subtasks: [
      { id: 's1', title: 'User research', isCompleted: true, timeSpent: 1200 },
      { id: 's2', title: 'Wireframes', isCompleted: true, timeSpent: 1800 },
      { id: 's3', title: 'Visual identity', isCompleted: false, timeSpent: 600 },
    ],
    createdAt: Date.now() - 86400000 * 2,
    totalTimeSpent: 3600
  },
  {
    id: '2',
    title: 'React Animation',
    description: 'Build interactions.',
    percentage: 50,
    isCompleted: false,
    subtasks: [
      { id: 's4', title: 'Transitions', isCompleted: true, timeSpent: 1000 },
      { id: 's5', title: 'Hover states', isCompleted: false, timeSpent: 800 },
    ],
    createdAt: Date.now() - 86400000,
    totalTimeSpent: 1800
  }
];

const App: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>(() => {
    const saved = localStorage.getItem('ascend_tasks_timer_v2');
    return saved ? JSON.parse(saved) : INITIAL_TASKS;
  });
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('ascend_theme');
    return saved === 'dark';
  });
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTask, setNewTask] = useState({ title: '', description: '' });
  
  // Timer State
  const [activeTimer, setActiveTimer] = useState<{ taskId: string; subtaskTitle: string } | null>(null);

  useEffect(() => {
    localStorage.setItem('ascend_tasks_timer_v2', JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    localStorage.setItem('ascend_theme', darkMode ? 'dark' : 'light');
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const formatTimeFull = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  const stats = useMemo(() => {
    if (tasks.length === 0) return { overall: 0, total: 0, completed: 0, subtasks: 0, subtasksCompleted: 0, totalTime: 0 };
    const totalPercentage = tasks.reduce((acc, task) => acc + task.percentage, 0);
    const subtasks = tasks.flatMap(t => t.subtasks);
    const totalTime = tasks.reduce((acc, t) => acc + (t.totalTimeSpent || 0), 0);
    return {
      overall: totalPercentage / tasks.length,
      total: tasks.length,
      completed: tasks.filter(t => t.isCompleted).length,
      subtasks: subtasks.length,
      subtasksCompleted: subtasks.filter(s => s.isCompleted).length,
      totalTime
    };
  }, [tasks]);

  const filteredAndSortedTasks = useMemo(() => {
    let result = tasks.filter(t => 
      t.title.toLowerCase().includes(search.toLowerCase())
    );

    result.sort((a, b) => {
      if (sortBy === 'newest') return b.createdAt - a.createdAt;
      if (sortBy === 'oldest') return a.createdAt - b.createdAt;
      if (sortBy === 'progress') return b.percentage - a.percentage;
      return 0;
    });

    return result;
  }, [tasks, search, sortBy]);

  const addTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.title.trim()) return;
    const task: Task = {
      id: crypto.randomUUID(),
      title: newTask.title,
      description: newTask.description,
      percentage: 0,
      isCompleted: false,
      subtasks: [],
      createdAt: Date.now(),
      totalTimeSpent: 0
    };
    setTasks([task, ...tasks]);
    setNewTask({ title: '', description: '' });
    setShowAddModal(false);
  };

  const updateTask = (updatedTask: Task) => {
    setTasks(tasks.map(t => t.id === updatedTask.id ? updatedTask : t));
  };

  const deleteTask = (id: string) => {
    setTasks(tasks.filter(t => t.id !== id));
  };

  const recordTime = (elapsed: number) => {
    if (!activeTimer) return;
    setTasks(tasks.map(t => {
      if (t.id === activeTimer.taskId) {
        // Update subtask time if found
        const updatedSubtasks = t.subtasks.map(s => {
          if (s.title === activeTimer.subtaskTitle) {
            return { ...s, timeSpent: (s.timeSpent || 0) + elapsed };
          }
          return s;
        });
        return { 
          ...t, 
          subtasks: updatedSubtasks,
          totalTimeSpent: (t.totalTimeSpent || 0) + elapsed 
        };
      }
      return t;
    }));
    setActiveTimer(null);
  };

  return (
    <div className={`min-h-screen transition-colors duration-300 ${darkMode ? 'bg-slate-950 text-slate-100' : 'bg-[#fcfdfe] text-slate-900'} overflow-x-hidden`}>
      <header className={`border-b sticky top-0 z-30 px-6 py-2.5 transition-colors ${darkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-white/80 border-slate-200'} backdrop-blur-md`}>
        <div className="max-w-[1600px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center text-white shadow-sm">
              <Target size={16} strokeWidth={2.5} />
            </div>
            <h1 className="text-base font-black tracking-tight uppercase">Ascend</h1>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative group hidden sm:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={12} />
              <input
                type="text"
                placeholder="Search focus..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className={`pl-8 pr-3 py-1 border-none rounded-lg text-xs font-medium focus:ring-1 focus:ring-indigo-500 outline-none w-40 transition-all ${darkMode ? 'bg-slate-800 text-slate-200' : 'bg-slate-100 text-slate-700'}`}
              />
            </div>
            
            <button 
              onClick={() => setDarkMode(!darkMode)}
              className={`p-2 rounded-lg transition-colors ${darkMode ? 'bg-slate-800 text-yellow-400 hover:bg-slate-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {darkMode ? <Sun size={14} /> : <Moon size={14} />}
            </button>

            <button 
              onClick={() => setShowAddModal(true)}
              className="bg-indigo-600 text-white px-3.5 py-1.5 rounded-lg font-bold text-[11px] uppercase tracking-wider hover:bg-indigo-700 transition-all flex items-center gap-1 shadow-indigo-100 dark:shadow-none shadow-lg"
            >
              <Plus size={14} /> New
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Dashboard Analytics Bar */}
          <aside className="lg:col-span-3 space-y-4">
            {/* Progress Card */}
            <div className={`p-6 rounded-2xl border shadow-sm flex flex-col items-center transition-colors ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
              <h2 className={`text-[10px] font-black uppercase tracking-[0.2em] mb-4 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Focus Score</h2>
              <CircularProgress percentage={stats.overall} size={150} strokeWidth={12} darkMode={darkMode} />
              
              <div className="mt-8 grid grid-cols-1 gap-2 w-full">
                <div className={`flex justify-between items-center p-3 rounded-xl transition-colors ${darkMode ? 'bg-slate-800/50' : 'bg-slate-50'}`}>
                  <div className="flex items-center gap-2">
                    <ListTodo size={14} className={darkMode ? 'text-slate-500' : 'text-slate-400'} />
                    <span className={`text-[10px] font-black uppercase tracking-wider ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Active</span>
                  </div>
                  <span className={`text-sm font-black ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>{stats.total}</span>
                </div>
                <div className={`flex justify-between items-center p-3 rounded-xl transition-colors ${darkMode ? 'bg-emerald-950/30' : 'bg-emerald-50'}`}>
                  <div className="flex items-center gap-2">
                    <CheckCircle size={14} className="text-emerald-500" />
                    <span className={`text-[10px] font-black uppercase tracking-wider ${darkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>Completed</span>
                  </div>
                  <span className={`text-sm font-black ${darkMode ? 'text-emerald-400' : 'text-emerald-800'}`}>{stats.completed}</span>
                </div>
                <div className={`p-3 border rounded-xl transition-colors ${darkMode ? 'border-slate-800' : 'border-slate-100'}`}>
                  <div className="flex justify-between items-center mb-1.5">
                    <span className={`text-[9px] font-black uppercase tracking-wider ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Subtask Integrity</span>
                    <span className="text-[10px] font-bold text-indigo-400 dark:text-indigo-400">{stats.subtasksCompleted}/{stats.subtasks}</span>
                  </div>
                  <div className={`h-1 w-full rounded-full overflow-hidden ${darkMode ? 'bg-slate-800' : 'bg-slate-50'}`}>
                    <div 
                      className="h-full bg-indigo-500 transition-all duration-700"
                      style={{ width: `${stats.subtasks > 0 ? (stats.subtasksCompleted / stats.subtasks) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Time Analytics Card */}
            <div className={`p-5 rounded-2xl border shadow-sm transition-colors ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <BarChart3 size={14} className="text-indigo-500" />
                  <h2 className={`text-[10px] font-black uppercase tracking-[0.2em] ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>Time Analysis</h2>
                </div>
                <div className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${darkMode ? 'bg-indigo-500/10 text-indigo-400' : 'bg-indigo-50 text-indigo-600'}`}>Today</div>
              </div>

              <div className="mb-6">
                <div className="flex items-baseline gap-1.5 mb-1">
                  <span className={`text-3xl font-light tracking-tighter ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                    {formatTimeFull(stats.totalTime)}
                  </span>
                  <span className={`text-[10px] font-black uppercase tracking-widest ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Total Focus</span>
                </div>
                <div className={`h-1 w-full rounded-full overflow-hidden ${darkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
                  <div className="h-full bg-indigo-500 animate-pulse" style={{ width: '100%' }} />
                </div>
              </div>

              <div className="space-y-4">
                <h3 className={`text-[9px] font-black uppercase tracking-widest ${darkMode ? 'text-slate-600' : 'text-slate-400'}`}>Breakdown</h3>
                {tasks.filter(t => (t.totalTimeSpent || 0) > 0).length > 0 ? (
                  tasks.filter(t => (t.totalTimeSpent || 0) > 0).map(t => (
                    <div key={t.id} className="flex items-center justify-between group cursor-default">
                      <div className="flex flex-col min-w-0">
                        <span className={`text-[11px] font-medium truncate ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>{t.title}</span>
                        <div className="flex items-center gap-1">
                           <div className={`w-1.5 h-1.5 rounded-full ${t.isCompleted ? 'bg-emerald-500' : 'bg-indigo-500'}`} />
                           <span className={`text-[9px] font-bold ${darkMode ? 'text-slate-600' : 'text-slate-400'}`}>{t.percentage}% done</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`text-[11px] font-black tabular-nums ${darkMode ? 'text-slate-100' : 'text-slate-800'}`}>
                          {formatTimeFull(t.totalTimeSpent || 0)}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-2 text-center border border-dashed rounded-xl border-slate-200 dark:border-slate-800">
                    <p className={`text-[9px] font-black uppercase tracking-widest ${darkMode ? 'text-slate-700' : 'text-slate-500'}`}>No logs today</p>
                  </div>
                )}
              </div>

              <button className={`w-full mt-6 py-2.5 rounded-xl border border-dashed text-[9px] font-black uppercase tracking-widest transition-all ${
                darkMode ? 'border-slate-800 text-slate-500 hover:text-slate-400 hover:bg-slate-800/50' : 'border-slate-200 text-slate-400 hover:text-indigo-500 hover:bg-indigo-50'
              }`}>
                Export Insights
              </button>
            </div>
          </aside>

          {/* High-Density Grid */}
          <div className="lg:col-span-9">
            <div className="flex items-center justify-between mb-4 px-1">
              <div className="flex items-center gap-2">
                <LayoutGrid size={14} className="text-indigo-500" />
                <h2 className={`text-[11px] font-black uppercase tracking-[0.15em] ${darkMode ? 'text-slate-400' : 'text-slate-800'}`}>Pipeline</h2>
              </div>
              
              <div className="flex items-center gap-3">
                <div className={`flex items-center gap-1.5 px-2 py-1 border rounded-md shadow-sm transition-colors ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
                  <Filter size={11} className="text-slate-500" />
                  <select 
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as SortOption)}
                    className={`bg-transparent text-[10px] font-black uppercase tracking-tighter outline-none cursor-pointer ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}
                  >
                    <option value="newest" className={darkMode ? 'bg-slate-900' : ''}>Newest</option>
                    <option value="oldest" className={darkMode ? 'bg-slate-900' : ''}>Oldest</option>
                    <option value="progress" className={darkMode ? 'bg-slate-900' : ''}>Progress</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3 items-start">
              {filteredAndSortedTasks.length > 0 ? (
                filteredAndSortedTasks.map(task => (
                  <TaskCard 
                    key={task.id} 
                    task={task} 
                    onUpdate={updateTask}
                    onDelete={deleteTask}
                    onStartTimer={(taskId, subtaskTitle) => setActiveTimer({ taskId, subtaskTitle })}
                    darkMode={darkMode}
                  />
                ))
              ) : (
                <div className={`col-span-full py-20 flex flex-col items-center justify-center rounded-2xl border border-dashed shadow-sm transition-colors ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                  <Target size={24} strokeWidth={1} className={`mb-3 ${darkMode ? 'text-slate-800' : 'text-slate-200'}`} />
                  <p className={`text-[10px] font-black uppercase tracking-[0.2em] ${darkMode ? 'text-slate-600' : 'text-slate-400'}`}>Pipeline Empty</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Timer Overlay */}
      {activeTimer && (
        <TimerOverlay 
          subtaskTitle={activeTimer.subtaskTitle}
          darkMode={darkMode}
          onClose={() => setActiveTimer(null)}
          onComplete={recordTime}
        />
      )}

      {/* Compact Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/20 dark:bg-black/40 backdrop-blur-[2px] animate-in fade-in duration-200">
          <div className={`w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border transition-colors ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
            <div className="p-6">
              <h2 className={`text-sm font-black uppercase tracking-wider mb-5 ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>Create Task</h2>
              <form onSubmit={addTask} className="space-y-4">
                <div className="space-y-1">
                  <label className={`text-[10px] font-black uppercase tracking-widest ml-1 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Title</label>
                  <input
                    autoFocus required type="text"
                    value={newTask.title}
                    onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-xl text-xs font-semibold outline-none focus:ring-1 focus:ring-indigo-500 transition-colors ${darkMode ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-slate-50 border-slate-100 text-slate-900'}`}
                    placeholder="Enter goal name..."
                  />
                </div>
                <div className="flex gap-2 pt-3">
                  <button type="button" onClick={() => setShowAddModal(false)} className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest ${darkMode ? 'text-slate-50 hover:text-slate-400' : 'text-slate-400 hover:text-slate-500'}`}>Cancel</button>
                  <button type="submit" className="flex-1 py-2 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-100 dark:shadow-none">Create</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
