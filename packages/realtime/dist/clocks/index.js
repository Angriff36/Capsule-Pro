"use strict";
/**
 * Vector clock module exports.
 *
 * Vector clocks are used to track causality in distributed systems,
 * enabling partial ordering of events and conflict detection.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.VectorClock = void 0;
var vector_clock_1 = require("./vector-clock");
Object.defineProperty(exports, "VectorClock", { enumerable: true, get: function () { return vector_clock_1.VectorClock; } });
