"use strict";
/**
 * Event Replay System
 *
 * Enables users joining a command board to see recent events that occurred
 * before they joined. This provides context for board state changes.
 *
 * Features:
 * - Fetch recent board events from outbox
 * - Replay events at accelerated speed
 * - Integrates with Liveblocks for seamless transition to live mode
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReplayBuffer = void 0;
var replay_buffer_1 = require("./replay-buffer");
Object.defineProperty(exports, "ReplayBuffer", { enumerable: true, get: function () { return replay_buffer_1.ReplayBuffer; } });
__exportStar(require("./types"), exports);
