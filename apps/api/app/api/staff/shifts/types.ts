/**
 * Shared types for shift management API
 */

export interface ShiftOverlap {
  id: string;
  shift_end: Date;
  shift_start: Date;
}
