"use client";
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Collapsible = Collapsible;
exports.CollapsibleTrigger = CollapsibleTrigger;
exports.CollapsibleContent = CollapsibleContent;
const radix_ui_1 = require("radix-ui");
function Collapsible({ ...props }) {
    return <radix_ui_1.Collapsible.Root data-slot="collapsible" {...props}/>;
}
function CollapsibleTrigger({ ...props }) {
    return (<radix_ui_1.Collapsible.CollapsibleTrigger data-slot="collapsible-trigger" {...props}/>);
}
function CollapsibleContent({ ...props }) {
    return (<radix_ui_1.Collapsible.CollapsibleContent data-slot="collapsible-content" {...props}/>);
}
