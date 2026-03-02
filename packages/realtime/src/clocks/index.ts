/**
 * Vector clock module exports.
 *
 * Vector clocks are used to track causality in distributed systems,
 * enabling partial ordering of events and conflict detection.
 */

export type {
  VectorClockComparison,
  VectorClockData,
  VectorClockJSON,
  VectorClockOptions,
} from "./vector-clock.js";
export { VectorClock } from "./vector-clock.js";
