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
  assignment_count?: number;
  category: string | null;
  completion_count?: number;
  content_type: ContentType;
  content_url: string | null;
  created_at: Date;
  created_by: string | null;
  description: string | null;
  duration_minutes: number | null;
  id: string;
  is_active: boolean;
  is_required: boolean;
  tenant_id: string;
  title: string;
  updated_at: Date;
}

export interface CreateTrainingModuleInput {
  category?: string;
  contentType?: ContentType;
  contentUrl?: string;
  description?: string;
  durationMinutes?: number;
  isRequired?: boolean;
  title: string;
}

export interface UpdateTrainingModuleInput {
  category?: string;
  contentType?: ContentType;
  contentUrl?: string;
  description?: string;
  durationMinutes?: number;
  isActive?: boolean;
  isRequired?: boolean;
  title?: string;
}

export interface TrainingAssignment {
  assigned_at: Date;
  assigned_by: string | null;
  assigned_to_all: boolean;
  completion?: TrainingCompletion;
  created_at: Date;
  due_date: Date | null;
  employee_email?: string;
  employee_first_name?: string | null;
  employee_id: string | null;
  employee_last_name?: string | null;
  id: string;
  module?: TrainingModule;
  module_id: string;
  status: AssignmentStatus;
  tenant_id: string;
  updated_at: Date;
}

export interface CreateTrainingAssignmentInput {
  assignToAll?: boolean;
  dueDate?: string;
  employeeId?: string;
  moduleId: string;
}

export interface TrainingCompletion {
  assignment_id: string;
  completed_at: Date | null;
  created_at: Date;
  employee_id: string;
  id: string;
  module_id: string;
  notes: string | null;
  passed: boolean;
  score: number | null;
  started_at: Date | null;
  tenant_id: string;
  updated_at: Date;
}

export interface CompleteTrainingInput {
  assignmentId: string;
  notes?: string;
  passed?: boolean;
  score?: number;
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
