export type Task = {
  id: string;
  title: string;
  completed: boolean;
  createdAt: string;
  completedAt: string | null;
  date: string;
};

export type TaskFilter = 'all' | 'active' | 'done';

export type MascotMode = 'working' | 'sleeping' | 'success';
