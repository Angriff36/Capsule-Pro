"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Spinner = Spinner;
const lucide_react_1 = require("lucide-react");
const utils_1 = require("@repo/design-system/lib/utils");
function Spinner({ className, ...props }) {
    return (<lucide_react_1.Loader2Icon role="status" aria-label="Loading" className={(0, utils_1.cn)("size-4 animate-spin", className)} {...props}/>);
}
