"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Skeleton = Skeleton;
const utils_1 = require("@repo/design-system/lib/utils");
function Skeleton({ className, ...props }) {
    return (<div data-slot="skeleton" className={(0, utils_1.cn)("bg-accent animate-pulse rounded-md", className)} {...props}/>);
}
