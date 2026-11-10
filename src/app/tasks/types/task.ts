import type { Tag } from "../../lib/tag";

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
  dueDate?: string | null; // date-only YYYY-MM-DD, or ISO timestamp (date-only persists as UTC midnight)
  completedAt?: string | null;
  archivedAt?: string | null;
  tags?: Tag[];
  createdAt: string;
  updatedAt: string;
}
