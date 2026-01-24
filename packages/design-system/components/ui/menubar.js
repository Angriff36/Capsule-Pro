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
exports.Menubar = Menubar;
exports.MenubarPortal = MenubarPortal;
exports.MenubarMenu = MenubarMenu;
exports.MenubarTrigger = MenubarTrigger;
exports.MenubarContent = MenubarContent;
exports.MenubarGroup = MenubarGroup;
exports.MenubarSeparator = MenubarSeparator;
exports.MenubarLabel = MenubarLabel;
exports.MenubarItem = MenubarItem;
exports.MenubarShortcut = MenubarShortcut;
exports.MenubarCheckboxItem = MenubarCheckboxItem;
exports.MenubarRadioGroup = MenubarRadioGroup;
exports.MenubarRadioItem = MenubarRadioItem;
exports.MenubarSub = MenubarSub;
exports.MenubarSubTrigger = MenubarSubTrigger;
exports.MenubarSubContent = MenubarSubContent;
const React = __importStar(require("react"));
const radix_ui_1 = require("radix-ui");
const lucide_react_1 = require("lucide-react");
const utils_1 = require("@repo/design-system/lib/utils");
function Menubar({ className, ...props }) {
    return (<radix_ui_1.Menubar.Root data-slot="menubar" className={(0, utils_1.cn)("bg-background flex h-9 items-center gap-1 rounded-md border p-1 shadow-xs", className)} {...props}/>);
}
function MenubarMenu({ ...props }) {
    return <radix_ui_1.Menubar.Menu data-slot="menubar-menu" {...props}/>;
}
function MenubarGroup({ ...props }) {
    return <radix_ui_1.Menubar.Group data-slot="menubar-group" {...props}/>;
}
function MenubarPortal({ ...props }) {
    return <radix_ui_1.Menubar.Portal data-slot="menubar-portal" {...props}/>;
}
function MenubarRadioGroup({ ...props }) {
    return (<radix_ui_1.Menubar.RadioGroup data-slot="menubar-radio-group" {...props}/>);
}
function MenubarTrigger({ className, ...props }) {
    return (<radix_ui_1.Menubar.Trigger data-slot="menubar-trigger" className={(0, utils_1.cn)("focus:bg-accent focus:text-accent-foreground data-[state=open]:bg-accent data-[state=open]:text-accent-foreground flex items-center rounded-sm px-2 py-1 text-sm font-medium outline-hidden select-none", className)} {...props}/>);
}
function MenubarContent({ className, align = "start", alignOffset = -4, sideOffset = 8, ...props }) {
    return (<MenubarPortal>
      <radix_ui_1.Menubar.Content data-slot="menubar-content" align={align} alignOffset={alignOffset} sideOffset={sideOffset} className={(0, utils_1.cn)("bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 min-w-[12rem] origin-(--radix-menubar-content-transform-origin) overflow-hidden rounded-md border p-1 shadow-md", className)} {...props}/>
    </MenubarPortal>);
}
function MenubarItem({ className, inset, variant = "default", ...props }) {
    return (<radix_ui_1.Menubar.Item data-slot="menubar-item" data-inset={inset} data-variant={variant} className={(0, utils_1.cn)("focus:bg-accent focus:text-accent-foreground data-[variant=destructive]:text-destructive data-[variant=destructive]:focus:bg-destructive/10 dark:data-[variant=destructive]:focus:bg-destructive/20 data-[variant=destructive]:focus:text-destructive data-[variant=destructive]:*:[svg]:!text-destructive [&_svg:not([class*='text-'])]:text-muted-foreground relative flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[inset]:pl-8 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4", className)} {...props}/>);
}
function MenubarCheckboxItem({ className, children, checked, ...props }) {
    return (<radix_ui_1.Menubar.CheckboxItem data-slot="menubar-checkbox-item" className={(0, utils_1.cn)("focus:bg-accent focus:text-accent-foreground relative flex cursor-default items-center gap-2 rounded-xs py-1.5 pr-2 pl-8 text-sm outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4", className)} checked={checked} {...props}>
      <span className="pointer-events-none absolute left-2 flex size-3.5 items-center justify-center">
        <radix_ui_1.Menubar.ItemIndicator>
          <lucide_react_1.CheckIcon className="size-4"/>
        </radix_ui_1.Menubar.ItemIndicator>
      </span>
      {children}
    </radix_ui_1.Menubar.CheckboxItem>);
}
function MenubarRadioItem({ className, children, ...props }) {
    return (<radix_ui_1.Menubar.RadioItem data-slot="menubar-radio-item" className={(0, utils_1.cn)("focus:bg-accent focus:text-accent-foreground relative flex cursor-default items-center gap-2 rounded-xs py-1.5 pr-2 pl-8 text-sm outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4", className)} {...props}>
      <span className="pointer-events-none absolute left-2 flex size-3.5 items-center justify-center">
        <radix_ui_1.Menubar.ItemIndicator>
          <lucide_react_1.CircleIcon className="size-2 fill-current"/>
        </radix_ui_1.Menubar.ItemIndicator>
      </span>
      {children}
    </radix_ui_1.Menubar.RadioItem>);
}
function MenubarLabel({ className, inset, ...props }) {
    return (<radix_ui_1.Menubar.Label data-slot="menubar-label" data-inset={inset} className={(0, utils_1.cn)("px-2 py-1.5 text-sm font-medium data-[inset]:pl-8", className)} {...props}/>);
}
function MenubarSeparator({ className, ...props }) {
    return (<radix_ui_1.Menubar.Separator data-slot="menubar-separator" className={(0, utils_1.cn)("bg-border -mx-1 my-1 h-px", className)} {...props}/>);
}
function MenubarShortcut({ className, ...props }) {
    return (<span data-slot="menubar-shortcut" className={(0, utils_1.cn)("text-muted-foreground ml-auto text-xs tracking-widest", className)} {...props}/>);
}
function MenubarSub({ ...props }) {
    return <radix_ui_1.Menubar.Sub data-slot="menubar-sub" {...props}/>;
}
function MenubarSubTrigger({ className, inset, children, ...props }) {
    return (<radix_ui_1.Menubar.SubTrigger data-slot="menubar-sub-trigger" data-inset={inset} className={(0, utils_1.cn)("focus:bg-accent focus:text-accent-foreground data-[state=open]:bg-accent data-[state=open]:text-accent-foreground flex cursor-default items-center rounded-sm px-2 py-1.5 text-sm outline-none select-none data-[inset]:pl-8", className)} {...props}>
      {children}
      <lucide_react_1.ChevronRightIcon className="ml-auto h-4 w-4"/>
    </radix_ui_1.Menubar.SubTrigger>);
}
function MenubarSubContent({ className, ...props }) {
    return (<radix_ui_1.Menubar.SubContent data-slot="menubar-sub-content" className={(0, utils_1.cn)("bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 min-w-[8rem] origin-(--radix-menubar-content-transform-origin) overflow-hidden rounded-md border p-1 shadow-lg", className)} {...props}/>);
}
