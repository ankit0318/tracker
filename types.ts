
export interface Session {
  startTime: number;
  endTime: number;
  duration: number; // in seconds
}

export interface Subtask {
  id: string;
  title: string;
  isCompleted: boolean;
  percentage?: number; // 0-100 granular progress
  timeSpent?: number; // Seconds spent on this subtask
  sessions?: Session[];
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

export type ActivityType = 'food' | 'nap' | 'rest' | 'break' | 'drift';

export interface ActivitySession {
  id: string;
  type: ActivityType;
  startTime: number;
  endTime: number;
  duration: number;
}
