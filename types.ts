
export interface Class {
  id: string;
  name: string;
  color: string;
  instructor?: string;
}

export interface Assignment {
  id: string;
  name: string;
  classId: string;
  dueDate: string;
  completed: boolean;
  notes?: string;
  priority: 'low' | 'medium' | 'high';
}

export type ViewType = 'dashboard' | 'assignments' | 'classes' | 'completed' | 'ai-buddy';

export interface AppState {
  classes: Class[];
  assignments: Assignment[];
  isDarkMode: boolean;
}
