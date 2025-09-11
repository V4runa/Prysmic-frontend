export enum TaskPriority {
  LOW = 1,
  MEDIUM = 2,
  HIGH = 3,
}

export interface Task {
  id: number;
  userId: number;
  title: string;
  description?: string | null;
  isComplete: boolean;
  isArchived: boolean;
  priority: TaskPriority;
  dueDate?: string | null; // ISO string
  completedAt?: string | null;
  archivedAt?: string | null;
  tags?: { id: number; name: string; color?: string }[];
  createdAt: string;
  updatedAt: string;
}
