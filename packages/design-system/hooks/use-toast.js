"use client";
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useToast = useToast;
const sonner_1 = require("sonner");
function useToast() {
    return { toast: sonner_1.toast };
}
