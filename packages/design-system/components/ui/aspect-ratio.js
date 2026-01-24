"use client";
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AspectRatio = AspectRatio;
const radix_ui_1 = require("radix-ui");
function AspectRatio({ ...props }) {
    return <radix_ui_1.AspectRatio.Root data-slot="aspect-ratio" {...props}/>;
}
