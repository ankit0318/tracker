import { Task, ActivitySession } from '../types';

// Let's hold local state references to dynamic modules
let tauriCore: any = null;
let tauriWindow: any = null;

// Determine if we are running in the Tauri native runtime
export const isTauri = (): boolean => {
  return typeof window !== 'undefined' && (
    (window as any).__TAURI__ !== undefined || 
    (window as any).__TAURI_IPC__ !== undefined ||
    (window as any).__tauri !== undefined
  );
};

// Initialize modules lazily
if (isTauri()) {
  Promise.all([
    import('@tauri-apps/api/core'),
    import('@tauri-apps/api/window')
  ]).then(([coreMod, windowMod]) => {
    tauriCore = coreMod;
    tauriWindow = windowMod;
    console.log('Tauri desktop bridge initialized successfully');
  }).catch((err) => {
    console.error('Failed to import Tauri modules dynamically:', err);
  });
}

// Helper safely calling Tauri backend
const invokeTauri = async (command: string, args?: any): Promise<any> => {
  if (!tauriCore) {
    // If modules aren't loaded yet but we are in tauri, try standard require-style fallback or wait
    try {
      const core = await import('@tauri-apps/api/core');
      tauriCore = core;
      return await tauriCore.invoke(command, args);
    } catch (e) {
      throw new Error(`Tauri module not loaded yet for command: ${command}`);
    }
  }
  return await tauriCore.invoke(command, args);
};

// --- CRUD Database Persistent Wrappers ----

export const getTasks = async (fallback: Task[]): Promise<Task[]> => {
  if (isTauri()) {
    try {
      return await invokeTauri('db_get_tasks');
    } catch (e) {
      console.error('Error fetching tasks from SQLite, falling back to LocalStorage', e);
    }
  }
  const saved = localStorage.getItem('ascend_tasks_timer_v3');
  return saved ? JSON.parse(saved) : fallback;
};

export const saveTask = async (task: Task): Promise<void> => {
  if (isTauri()) {
    try {
      await invokeTauri('db_save_task', { task });
      return;
    } catch (e) {
      console.error('Error saving task to SQLite database:', e);
    }
  }
  // Fallback to LocalStorage
  const saved = localStorage.getItem('ascend_tasks_timer_v3');
  let tasks: Task[] = saved ? JSON.parse(saved) : [];
  const index = tasks.findIndex(t => t.id === task.id);
  if (index !== -1) {
    tasks[index] = task;
  } else {
    tasks.unshift(task);
  }
  localStorage.setItem('ascend_tasks_timer_v3', JSON.stringify(tasks));
};

export const saveAllTasks = async (tasks: Task[]): Promise<void> => {
  if (isTauri()) {
    try {
      for (const task of tasks) {
        await invokeTauri('db_save_task', { task });
      }
      return;
    } catch (e) {
      console.error('Error bulk saving tasks to SQLite:', e);
    }
  }
  localStorage.setItem('ascend_tasks_timer_v3', JSON.stringify(tasks));
};

export const deleteTaskFromDb = async (id: string, allTasks: Task[]): Promise<void> => {
  if (isTauri()) {
    try {
      await invokeTauri('db_delete_task', { id });
      return;
    } catch (e) {
      console.error('Error deleting task from SQLite:', e);
    }
  }
  const updated = allTasks.filter(t => t.id !== id);
  localStorage.setItem('ascend_tasks_timer_v3', JSON.stringify(updated));
};

export const getActivities = async (): Promise<ActivitySession[]> => {
  if (isTauri()) {
    try {
      return await invokeTauri('db_get_activities');
    } catch (e) {
      console.error('Error loading activities from SQLite:', e);
    }
  }
  const saved = localStorage.getItem('ascend_activities');
  return saved ? JSON.parse(saved) : [];
};

export const saveActivity = async (activity: ActivitySession, allActivities: ActivitySession[]): Promise<void> => {
  if (isTauri()) {
    try {
      await invokeTauri('db_add_activity', { activity });
      return;
    } catch (e) {
      console.error('Error adding activity to SQLite:', e);
    }
  }
  const updated = [activity, ...allActivities];
  localStorage.setItem('ascend_activities', JSON.stringify(updated));
};

export const saveAllActivities = async (activities: ActivitySession[]): Promise<void> => {
  if (isTauri()) {
    try {
      for (const act of activities) {
        await invokeTauri('db_add_activity', { activity: act });
      }
      return;
    } catch (e) {
      console.error('Error saving bulk activities to SQLite:', e);
    }
  }
  localStorage.setItem('ascend_activities', JSON.stringify(activities));
};

export const getSetting = async (key: string, defaultValue: string): Promise<string> => {
  if (isTauri()) {
    try {
      const val = await invokeTauri('db_get_setting', { key });
      if (val !== null && val !== undefined) {
        return val;
      }
    } catch (e) {
      console.error(`Error loading setting for key "${key}" from SQLite:`, e);
    }
  }
  const saved = localStorage.getItem(key);
  return saved !== null ? saved : defaultValue;
};

export const saveSetting = async (key: string, value: string): Promise<void> => {
  if (isTauri()) {
    try {
      await invokeTauri('db_save_setting', { key, value });
      return;
    } catch (e) {
      console.error(`Error saving setting for key "${key}" to SQLite:`, e);
    }
  }
  localStorage.setItem(key, value);
};

// --- Window Administration & Control APIs ---

export const showTimerWidget = async (): Promise<void> => {
  if (isTauri()) {
    try {
      await invokeTauri('open_timer_widget');
    } catch (e) {
      console.error('Failed to summon Tauri floaty timer widget:', e);
    }
  }
};

export const hideTimerWidget = async (): Promise<void> => {
  if (isTauri()) {
    try {
      await invokeTauri('close_timer_widget');
    } catch (e) {
      console.error('Failed to hide Tauri floaty timer widget:', e);
    }
  }
};

// --- Shared Central Rust Timer Hooks ---

export interface TimerSyncState {
  taskId: string | null;
  subtaskTitle: string | null;
  startTime: number | null;
  isPaused: boolean;
  elapsed: number;
}

export const startTimerSync = async (taskId: string, subtaskTitle: string): Promise<void> => {
  if (isTauri()) {
    try {
      await invokeTauri('start_timer_sync', { taskId, subtaskTitle });
    } catch (e) {
      console.error('Error starting state sync timer on Rust backend:', e);
    }
  }
};

export const stopTimerSync = async (): Promise<TimerSyncState | null> => {
  if (isTauri()) {
    try {
      return await invokeTauri('stop_timer_sync');
    } catch (e) {
      console.error('Error stopping state sync timer on Rust backend:', e);
    }
  }
  return null;
};

export const updateTimerElapsed = async (elapsed: number): Promise<void> => {
  if (isTauri()) {
    try {
      await invokeTauri('update_timer_elapsed', { elapsed });
    } catch (e) {
      console.error('Error updating elapsed timer sync ticks in Rust state:', e);
    }
  }
};

export const getTimerSyncState = async (): Promise<TimerSyncState | null> => {
  if (isTauri()) {
    try {
      return await invokeTauri('get_timer_sync_state');
    } catch (e) {
      console.error('Error retrieving timer state sync details:', e);
    }
  }
  return null;
};
