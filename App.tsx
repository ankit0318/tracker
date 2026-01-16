
import React, { useState, useEffect, useMemo } from 'react';
import { Task, SortOption } from './types';
import CircularProgress from './components/CircularProgress';
import TaskCard from './components/TaskCard';
import { Plus, LayoutGrid, Search, ArrowUpDown, Target, Sparkles, Filter } from 'lucide-react';

const INITIAL_TASKS: Task[] = [
  {
    id: '1',
    title: 'Design Progress App',
    description: 'Create high-fidelity mockups for the new progress tracking dashboard.',
    percentage: 65,
    isCompleted: false,
    subtasks: [
      { id: 's1', title: 'User research', isCompleted: true },
      { id: 's2', title: 'Wireframes', isCompleted: true },
      { id: 's3', title: 'Visual identity', isCompleted: false },
    ],
    createdAt: Date.now() - 86400000 * 2,
  },
  {
    id: '2',
    title: 'Learn Framer Motion',
    description: 'Go through the documentation and build 3 production-ready animations.',
    percentage: 33,
    isCompleted: false,
    subtasks: [
      { id: 's4', title: 'Basic transitions', isCompleted: true },
      { id: 's5', title: 'Gesture animations', isCompleted: false },
    ],
    createdAt: Date.now() - 86400000,
  }
];

const App: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>(() => {
    const saved = localStorage.getItem('ascend_tasks');
    return saved ? JSON.parse(saved) : INITIAL_TASKS;
  });
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTask, setNewTask] = useState({ title: '', description: '' });

  useEffect(() => {
    localStorage.setItem('ascend_tasks', JSON.stringify(tasks));
  }, [tasks]);

  const overallProgress = useMemo(() => {
    if (tasks.length === 0) return 0;
    const total = tasks.reduce((acc, task) => acc + task.percentage, 0);
    return total / tasks.length;
  }, [tasks]);

  const filteredAndSortedTasks = useMemo(() => {
    let result = tasks.filter(t => 
      t.title.toLowerCase().includes(search.toLowerCase()) || 
      t.description.toLowerCase().includes(search.toLowerCase())
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
    };

    setTasks([task, ...tasks]);
    setNewTask({ title: '', description: '' });
    setShowAddModal(false);
  };

  const updateTask = (updatedTask: Task) => {
    setTasks(tasks.map(t => t.id === updatedTask.id ? updatedTask : t));
  };

  const deleteTask = (id: string) => {
    if (confirm('Delete this task?')) {
      setTasks(tasks.filter(t => t.id !== id));
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-24">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 px-4 py-4 sm:px-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
              <Target size={24} />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Ascend</h1>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-widest">Progress Dashboard</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
              <input
                type="text"
                placeholder="Search tasks..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 pr-4 py-2 bg-slate-100 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none w-full sm:w-64 transition-all"
              />
            </div>
            <button 
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-indigo-700 active:scale-95 transition-all shadow-md shadow-indigo-100"
            >
              <Plus size={18} />
              <span>New Task</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Sidebar / Stats */}
          <aside className="lg:col-span-4 space-y-6">
            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col items-center text-center">
              <h2 className="text-lg font-bold text-slate-800 mb-6">Master Goal</h2>
              <CircularProgress percentage={overallProgress} size={220} strokeWidth={16} />
              <div className="mt-8 grid grid-cols-2 gap-4 w-full">
                <div className="bg-indigo-50 p-4 rounded-2xl">
                  <span className="block text-2xl font-bold text-indigo-700">{tasks.length}</span>
                  <span className="text-xs font-medium text-indigo-600 uppercase">Total Tasks</span>
                </div>
                <div className="bg-emerald-50 p-4 rounded-2xl">
                  <span className="block text-2xl font-bold text-emerald-700">
                    {tasks.filter(t => t.isCompleted).length}
                  </span>
                  <span className="text-xs font-medium text-emerald-600 uppercase">Completed</span>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-indigo-600 to-purple-700 p-6 rounded-3xl text-white shadow-xl shadow-indigo-100 overflow-hidden relative">
              <Sparkles className="absolute -top-4 -right-4 text-white/10 w-32 h-32" />
              <h3 className="text-lg font-bold mb-2">Smart Breakthrough</h3>
              <p className="text-sm text-indigo-100 mb-4 leading-relaxed">
                Use our AI Breakdown tool to instantly split your big goals into manageable subtasks.
              </p>
              <button 
                onClick={() => setShowAddModal(true)}
                className="bg-white/20 hover:bg-white/30 transition-colors text-white text-sm font-semibold px-4 py-2 rounded-lg"
              >
                Try AI Breakdown
              </button>
            </div>
          </aside>

          {/* Tasks Main View */}
          <div className="lg:col-span-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <LayoutGrid size={20} className="text-indigo-600" />
                <h2 className="text-lg font-bold text-slate-800">Tasks Pipeline</h2>
              </div>
              
              <div className="flex items-center gap-2">
                <Filter size={16} className="text-slate-400" />
                <select 
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  className="bg-transparent text-sm font-semibold text-slate-600 outline-none cursor-pointer focus:text-indigo-600"
                >
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                  <option value="progress">Best Progress</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredAndSortedTasks.length > 0 ? (
                filteredAndSortedTasks.map(task => (
                  <TaskCard 
                    key={task.id} 
                    task={task} 
                    onUpdate={updateTask}
                    onDelete={deleteTask}
                  />
                ))
              ) : (
                <div className="col-span-full py-20 flex flex-col items-center justify-center text-slate-400 bg-white rounded-3xl border-2 border-dashed border-slate-200">
                  <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                    <Target size={32} />
                  </div>
                  <p className="font-medium text-lg text-slate-600">No tasks found</p>
                  <p className="text-sm">Start your journey by adding a new task!</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Add Task Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-slate-800">New Task</h2>
                <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                  <Plus size={24} className="rotate-45" />
                </button>
              </div>
              <form onSubmit={addTask} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Title</label>
                  <input
                    autoFocus
                    required
                    type="text"
                    value={newTask.title}
                    onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    placeholder="e.g. Redesign Landing Page"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Description</label>
                  <textarea
                    rows={3}
                    value={newTask.description}
                    onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all resize-none"
                    placeholder="Provide some context..."
                  />
                </div>
                <div className="pt-4 flex gap-3">
                  <button 
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 py-3 text-slate-600 font-semibold hover:bg-slate-100 rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95"
                  >
                    Create Task
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Floating Action Button (Mobile Only) */}
      <button 
        onClick={() => setShowAddModal(true)}
        className="sm:hidden fixed bottom-6 right-6 w-14 h-14 bg-indigo-600 text-white rounded-full flex items-center justify-center shadow-xl shadow-indigo-200 active:scale-90 transition-transform z-40"
      >
        <Plus size={28} />
      </button>
    </div>
  );
};

export default App;
