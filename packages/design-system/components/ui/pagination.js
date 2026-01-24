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
exports.Pagination = Pagination;
exports.PaginationContent = PaginationContent;
exports.PaginationLink = PaginationLink;
exports.PaginationItem = PaginationItem;
exports.PaginationPrevious = PaginationPrevious;
exports.PaginationNext = PaginationNext;
exports.PaginationEllipsis = PaginationEllipsis;
const React = __importStar(require("react"));
const lucide_react_1 = require("lucide-react");
const utils_1 = require("@repo/design-system/lib/utils");
const button_1 = require("@repo/design-system/components/ui/button");
function Pagination({ className, ...props }) {
    return (<nav role="navigation" aria-label="pagination" data-slot="pagination" className={(0, utils_1.cn)("mx-auto flex w-full justify-center", className)} {...props}/>);
}
function PaginationContent({ className, ...props }) {
    return (<ul data-slot="pagination-content" className={(0, utils_1.cn)("flex flex-row items-center gap-1", className)} {...props}/>);
}
function PaginationItem({ ...props }) {
    return <li data-slot="pagination-item" {...props}/>;
}
function PaginationLink({ className, isActive, size = "icon", ...props }) {
    return (<a aria-current={isActive ? "page" : undefined} data-slot="pagination-link" data-active={isActive} className={(0, utils_1.cn)((0, button_1.buttonVariants)({
            variant: isActive ? "outline" : "ghost",
            size,
        }), className)} {...props}/>);
}
function PaginationPrevious({ className, ...props }) {
    return (<PaginationLink aria-label="Go to previous page" size="default" className={(0, utils_1.cn)("gap-1 px-2.5 sm:pl-2.5", className)} {...props}>
      <lucide_react_1.ChevronLeftIcon />
      <span className="hidden sm:block">Previous</span>
    </PaginationLink>);
}
function PaginationNext({ className, ...props }) {
    return (<PaginationLink aria-label="Go to next page" size="default" className={(0, utils_1.cn)("gap-1 px-2.5 sm:pr-2.5", className)} {...props}>
      <span className="hidden sm:block">Next</span>
      <lucide_react_1.ChevronRightIcon />
    </PaginationLink>);
}
function PaginationEllipsis({ className, ...props }) {
    return (<span aria-hidden data-slot="pagination-ellipsis" className={(0, utils_1.cn)("flex size-9 items-center justify-center", className)} {...props}>
      <lucide_react_1.MoreHorizontalIcon className="size-4"/>
      <span className="sr-only">More pages</span>
    </span>);
}
