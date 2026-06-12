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
  dishId: string | null;
  dueByDate: Date;
  dueByTime: Date | null;
  estimatedMinutes: number | null;
  isEventFinish: boolean;
  name: string;
  notes: string | null;
  priority: number;
  quantityTotal: number;
  quantityUnitId: number | null;
  recipeVersionId: string | null;
  servingsTotal: number | null;
  startByDate: Date;
  station: string | null;
  taskType: string;
}

export interface BulkGenerateResponse {
  batchId: string;
  errors: string[];
  generatedCount: number;
  status: "processing" | "completed" | "partial" | "failed";
  summary: string;
  tasks: GeneratedPrepTask[];
  totalExpected: number;
  warnings: string[];
}

export interface GenerationContext {
  dishes: Array<{
    id: string;
    name: string;
    servings: number;
    course: string | null;
    allergens: string[];
    dietaryTags: string[];
  }>;
  eventDate: Date;
  eventId: string;
  eventName: string;
  existingPrepTasks: Array<{
    id: string;
    name: string;
    dishId: string | null;
    status: string;
    dueByDate: Date;
  }>;
  guestCount: number;
  venue: string | null;
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
