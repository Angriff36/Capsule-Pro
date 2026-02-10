/**
 * Types for AI Bulk Task Generation API
 */

export interface BulkGenerateRequest {
  eventId: string;
  options?: {
    includeKitchenTasks?: boolean;
    applyDietaryRestrictions?: string[];
    batchMultiplier?: number;
    priorityStrategy?: "due_date" | "urgency" | "manual";
    basePriority?: number;
  };
}

export interface GeneratedPrepTask {
  name: string;
  dishId: string | null;
  recipeVersionId: string | null;
  taskType: string;
  quantityTotal: number;
  quantityUnitId: number | null;
  servingsTotal: number | null;
  startByDate: Date;
  dueByDate: Date;
  dueByTime: Date | null;
  isEventFinish: boolean;
  priority: number;
  estimatedMinutes: number | null;
  notes: string | null;
  station: string | null;
}

export interface BulkGenerateResponse {
  batchId: string;
  status: "processing" | "completed" | "partial" | "failed";
  generatedCount: number;
  totalExpected: number;
  tasks: GeneratedPrepTask[];
  errors: string[];
  warnings: string[];
  summary: string;
}

export interface GenerationContext {
  eventId: string;
  eventName: string;
  eventDate: Date;
  guestCount: number;
  venue: string | null;
  dishes: Array<{
    id: string;
    name: string;
    servings: number;
    course: string | null;
    allergens: string[];
    dietaryTags: string[];
  }>;
  existingPrepTasks: Array<{
    id: string;
    name: string;
    dishId: string | null;
    status: string;
    dueByDate: Date;
  }>;
}

export interface AIGeneratedTasks {
  tasks: Array<{
    name: string;
    dishId: string | null;
    taskType: string;
    quantityTotal: number;
    servingsTotal: number | null;
    startByDate: string;
    dueByDate: string;
    priority: number;
    estimatedMinutes: number | null;
    notes: string | null;
    station: string | null;
    isEventFinish: boolean;
    dependencies: string[];
  }>;
  warnings: string[];
}
