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
exports.ToggleGroup = ToggleGroup;
exports.ToggleGroupItem = ToggleGroupItem;
const React = __importStar(require("react"));
const radix_ui_1 = require("radix-ui");
const utils_1 = require("@repo/design-system/lib/utils");
const toggle_1 = require("@repo/design-system/components/ui/toggle");
const ToggleGroupContext = React.createContext({
    size: "default",
    variant: "default",
    spacing: 0,
});
function ToggleGroup({ className, variant, size, spacing = 0, children, ...props }) {
    return (<radix_ui_1.ToggleGroup.Root data-slot="toggle-group" data-variant={variant} data-size={size} data-spacing={spacing} style={{ "--gap": spacing }} className={(0, utils_1.cn)("group/toggle-group flex w-fit items-center gap-[--spacing(var(--gap))] rounded-md data-[spacing=default]:data-[variant=outline]:shadow-xs", className)} {...props}>
      <ToggleGroupContext.Provider value={{ variant, size, spacing }}>
        {children}
      </ToggleGroupContext.Provider>
    </radix_ui_1.ToggleGroup.Root>);
}
function ToggleGroupItem({ className, children, variant, size, ...props }) {
    const context = React.useContext(ToggleGroupContext);
    return (<radix_ui_1.ToggleGroup.Item data-slot="toggle-group-item" data-variant={context.variant || variant} data-size={context.size || size} data-spacing={context.spacing} className={(0, utils_1.cn)((0, toggle_1.toggleVariants)({
            variant: context.variant || variant,
            size: context.size || size,
        }), "w-auto min-w-0 shrink-0 px-3 focus:z-10 focus-visible:z-10", "data-[spacing=0]:rounded-none data-[spacing=0]:shadow-none data-[spacing=0]:first:rounded-l-md data-[spacing=0]:last:rounded-r-md data-[spacing=0]:data-[variant=outline]:border-l-0 data-[spacing=0]:data-[variant=outline]:first:border-l", className)} {...props}>
      {children}
    </radix_ui_1.ToggleGroup.Item>);
}
