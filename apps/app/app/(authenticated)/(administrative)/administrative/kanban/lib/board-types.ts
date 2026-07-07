export interface BoardColumn {
  status: string;
  title: string;
  color: string;
  wipLimit: number;
}

export interface BoardSettings {
  devModeEnabled?: boolean;
  devColumns?: BoardColumn[];
  collapseDone?: boolean;
  defaultSort?: "position" | "dueDate" | "priority" | "createdAt";
}

export interface BoardConfigData {
  id: string;
  name: string;
  columns: BoardColumn[];
  settings: BoardSettings;
}

export type TaskPriority = "low" | "medium" | "high" | "urgent";
export type TaskStatus = string;

export interface KanbanTask {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: TaskPriority;
  category: string | null;
  position: number;
  labels: string[];
  estimatedHours: number | null;
  dueDate: string | null;
  assignedTo: string | null;
  createdBy: string | null;
  sourceType: string | null;
  sourceId: string | null;
  ownerName: string;
}

export interface TaskComment {
  id: string;
  taskId: string;
  authorId: string | null;
  authorName: string;
  text: string;
  createdAt: string;
}

export interface TaskAttachment {
  id: string;
  taskId: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  uploadedBy: string | null;
  createdAt: string;
}

export interface TaskFileRef {
  id: string;
  taskId: string;
  refType: string;
  refId: string;
  refLabel: string;
  linkedBy: string | null;
  createdAt: string;
}

export interface TaskActivity {
  id: string;
  taskId: string;
  actorId: string | null;
  actorName: string;
  action: string;
  details: Record<string, unknown>;
  createdAt: string;
}

export interface DevBugMeta {
  id: string;
  taskId: string;
  severity: string;
  environment: string | null;
  stepsToRepro: string | null;
  expectedResult: string | null;
  actualResult: string | null;
}

export interface Employee {
  id: string;
  firstName: string;
  lastName: string;
}
