
export interface Subtask {
  id: string;
  title: string;
  isCompleted: boolean;
  timeSpent?: number; // Seconds spent on this subtask
}

export interface Task {
  id: string;
  title: string;
  description: string;
  percentage: number; // 0-100
  isCompleted: boolean;
  subtasks: Subtask[];
  createdAt: number;
  totalTimeSpent?: number; // Total seconds spent on this task
}

export type SortOption = 'newest' | 'oldest' | 'progress';
