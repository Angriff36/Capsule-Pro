/**
 * Training module types
 */

export type ContentType = "document" | "video" | "quiz" | "interactive";

export type AssignmentStatus =
  | "assigned"
  | "in_progress"
  | "completed"
  | "overdue";

export interface TrainingModule {
  id: string;
  tenant_id: string;
  title: string;
  description: string | null;
  content_url: string | null;
  content_type: ContentType;
  duration_minutes: number | null;
  category: string | null;
  is_required: boolean;
  is_active: boolean;
  created_by: string | null;
  created_at: Date;
  updated_at: Date;
  assignment_count?: number;
  completion_count?: number;
}

export interface CreateTrainingModuleInput {
  title: string;
  description?: string;
  contentUrl?: string;
  contentType?: ContentType;
  durationMinutes?: number;
  category?: string;
  isRequired?: boolean;
}

export interface UpdateTrainingModuleInput {
  title?: string;
  description?: string;
  contentUrl?: string;
  contentType?: ContentType;
  durationMinutes?: number;
  category?: string;
  isRequired?: boolean;
  isActive?: boolean;
}

export interface TrainingAssignment {
  id: string;
  tenant_id: string;
  module_id: string;
  employee_id: string | null;
  assigned_to_all: boolean;
  assigned_by: string;
  due_date: Date | null;
  status: AssignmentStatus;
  assigned_at: Date;
  created_at: Date;
  updated_at: Date;
  module?: TrainingModule;
  employee_first_name?: string | null;
  employee_last_name?: string | null;
  employee_email?: string;
  completion?: TrainingCompletion;
}

export interface CreateTrainingAssignmentInput {
  moduleId: string;
  employeeId?: string;
  assignToAll?: boolean;
  dueDate?: string;
}

export interface TrainingCompletion {
  id: string;
  tenant_id: string;
  assignment_id: string;
  employee_id: string;
  module_id: string;
  started_at: Date | null;
  completed_at: Date | null;
  score: number | null;
  passed: boolean;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface CompleteTrainingInput {
  assignmentId: string;
  score?: number;
  passed?: boolean;
  notes?: string;
}

export interface StartTrainingInput {
  assignmentId: string;
}

export interface TrainingModulesListResponse {
  modules: TrainingModule[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface TrainingAssignmentsListResponse {
  assignments: TrainingAssignment[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
