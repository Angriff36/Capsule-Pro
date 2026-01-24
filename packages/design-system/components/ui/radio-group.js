"use client";
"use strict";
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
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.RadioGroup = RadioGroup;
exports.RadioGroupItem = RadioGroupItem;
const React = __importStar(require("react"));
const radix_ui_1 = require("radix-ui");
const lucide_react_1 = require("lucide-react");
const utils_1 = require("@repo/design-system/lib/utils");
function RadioGroup({ className, ...props }) {
    return (<radix_ui_1.RadioGroup.Root data-slot="radio-group" className={(0, utils_1.cn)("grid gap-3", className)} {...props}/>);
}
function RadioGroupItem({ className, ...props }) {
    return (<radix_ui_1.RadioGroup.Item data-slot="radio-group-item" className={(0, utils_1.cn)("border-input text-primary focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/30 aspect-square size-4 shrink-0 rounded-full border shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50", className)} {...props}>
      <radix_ui_1.RadioGroup.Indicator data-slot="radio-group-indicator" className="relative flex items-center justify-center">
        <lucide_react_1.CircleIcon className="fill-primary absolute top-1/2 left-1/2 size-2 -translate-x-1/2 -translate-y-1/2"/>
      </radix_ui_1.RadioGroup.Indicator>
    </radix_ui_1.RadioGroup.Item>);
}
