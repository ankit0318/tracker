
export interface Subtask {
  id: string;
  title: string;
  isCompleted: boolean;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  percentage: number; // 0-100
  isCompleted: boolean;
  subtasks: Subtask[];
  createdAt: number;
}

export type SortOption = 'newest' | 'oldest' | 'progress';
