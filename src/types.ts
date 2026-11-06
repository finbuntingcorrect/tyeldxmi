export type TaskFilter = 'all' | 'active' | 'done';

export type MascotMode = 'working' | 'sleeping' | 'success';

export type Occupation = 'team' | 'solo' | 'study' | 'other';

export type Purpose = 'work' | 'study' | 'personal' | 'habits' | 'mix';

export type CatLook = 'classic' | 'warm' | 'sage' | 'night';

export type CatRole = 'planner' | 'focus' | 'habits';

export type DayPart = 'morning' | 'afternoon' | 'evening' | 'anytime';

export type Priority = 'high' | 'normal' | 'low';

export type RepeatKind = 'daily' | 'weekdays' | 'weekly';

export type TaskEdit = {
  title: string;
  date: string;
  dayPart: DayPart;
  priority: Priority;
  repeatKind: RepeatKind | 'none';
  weekdays: number[];
};

export type Task = {
  id: string;
  title: string;
  completed: boolean;
  createdAt: string;
  completedAt: string | null;
  date: string;
  dayPart: DayPart;
  priority: Priority;
  inFocus: boolean;
  seriesId: string | null;
  originalDate: string | null;
  exception: boolean;
  repeatKind: RepeatKind | null;
  weekdays: number[];
};

export type Profile = {
  id: string;
  email: string;
  name: string;
  timezone: string;
  occupation: Occupation | null;
  purpose: Purpose | null;
  catName: string;
  catLook: CatLook;
  catRole: CatRole;
  onboardingDone: boolean;
};

export type LegacyStoredTask = {
  id: string;
  title: string;
  completed: boolean;
  createdAt: string;
  completedAt: string | null;
  date: string;
};
