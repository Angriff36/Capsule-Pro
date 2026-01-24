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
exports.GridBackground = GridBackground;
const React = __importStar(require("react"));
const utils_1 = require("@repo/design-system/lib/utils");
function GridBackground({ className, gridSize = 24, gridColor = "var(--border)", gridOpacity = 0.5, fade = false, variant = "lines", style, children, ...props }) {
    const backgroundImage = React.useMemo(() => {
        if (variant === "dots") {
            return `radial-gradient(circle, ${gridColor} 1px, transparent 1px)`;
        }
        return `linear-gradient(${gridColor} 1px, transparent 1px), linear-gradient(to right, ${gridColor} 1px, transparent 1px)`;
    }, [variant, gridColor]);
    const backgroundSize = React.useMemo(() => {
        if (variant === "dots") {
            return `${gridSize}px ${gridSize}px`;
        }
        return `${gridSize}px ${gridSize}px`;
    }, [variant, gridSize]);
    return (<div data-slot="grid-background" className={(0, utils_1.cn)("relative size-full", className)} {...props}>
      <div aria-hidden="true" className="pointer-events-none absolute inset-0" style={{
            backgroundImage,
            backgroundSize,
            opacity: gridOpacity,
            maskImage: fade
                ? "radial-gradient(ellipse at center, black 0%, transparent 70%)"
                : undefined,
            WebkitMaskImage: fade
                ? "radial-gradient(ellipse at center, black 0%, transparent 70%)"
                : undefined,
            ...style,
        }}/>
      {children && (<div className="relative z-10 size-full">{children}</div>)}
    </div>);
}
