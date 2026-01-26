import type { ComponentType } from "react"
import { registerComponent } from "@plasmicapp/react-web/lib/host"
import * as Accordion from "@repo/design-system/components/ui/accordion"
import * as AlertDialog from "@repo/design-system/components/ui/alert-dialog"
import * as Alert from "@repo/design-system/components/ui/alert"
import * as AspectRatio from "@repo/design-system/components/ui/aspect-ratio"
import * as Avatar from "@repo/design-system/components/ui/avatar"
import * as Badge from "@repo/design-system/components/ui/badge"
import * as Breadcrumb from "@repo/design-system/components/ui/breadcrumb"
import * as ButtonGroup from "@repo/design-system/components/ui/button-group"
import * as Button from "@repo/design-system/components/ui/button"
import * as Calendar from "@repo/design-system/components/ui/calendar"
import * as Card from "@repo/design-system/components/ui/card"
import * as Carousel from "@repo/design-system/components/ui/carousel"
import * as Chart from "@repo/design-system/components/ui/chart"
import * as Checkbox from "@repo/design-system/components/ui/checkbox"
import * as Collapsible from "@repo/design-system/components/ui/collapsible"
import * as Command from "@repo/design-system/components/ui/command"
import * as ContextMenu from "@repo/design-system/components/ui/context-menu"
import * as Dialog from "@repo/design-system/components/ui/dialog"
import * as Drawer from "@repo/design-system/components/ui/drawer"
import * as DropdownMenu from "@repo/design-system/components/ui/dropdown-menu"
import * as Empty from "@repo/design-system/components/ui/empty"
import * as Field from "@repo/design-system/components/ui/field"
import * as Form from "@repo/design-system/components/ui/form"
import * as GridBackground from "@repo/design-system/components/ui/grid-background"
import * as HoverCard from "@repo/design-system/components/ui/hover-card"
import * as InputGroup from "@repo/design-system/components/ui/input-group"
import * as InputOTP from "@repo/design-system/components/ui/input-otp"
import * as Input from "@repo/design-system/components/ui/input"
import * as Item from "@repo/design-system/components/ui/item"
import * as Kbd from "@repo/design-system/components/ui/kbd"
import * as Label from "@repo/design-system/components/ui/label"
import * as Menubar from "@repo/design-system/components/ui/menubar"
import * as NavigationMenu from "@repo/design-system/components/ui/navigation-menu"
import * as Pagination from "@repo/design-system/components/ui/pagination"
import * as Popover from "@repo/design-system/components/ui/popover"
import * as Progress from "@repo/design-system/components/ui/progress"
import * as RadioGroup from "@repo/design-system/components/ui/radio-group"
import * as Resizable from "@repo/design-system/components/ui/resizable"
import * as ScrollArea from "@repo/design-system/components/ui/scroll-area"
import * as Select from "@repo/design-system/components/ui/select"
import * as Separator from "@repo/design-system/components/ui/separator"
import * as Sheet from "@repo/design-system/components/ui/sheet"
import * as Sidebar from "@repo/design-system/components/ui/sidebar"
import * as Skeleton from "@repo/design-system/components/ui/skeleton"
import * as Slider from "@repo/design-system/components/ui/slider"
import * as Sonner from "@repo/design-system/components/ui/sonner"
import * as Spinner from "@repo/design-system/components/ui/spinner"
import * as Switch from "@repo/design-system/components/ui/switch"
import * as Table from "@repo/design-system/components/ui/table"
import * as Tabs from "@repo/design-system/components/ui/tabs"
import * as Textarea from "@repo/design-system/components/ui/textarea"
import * as ToggleGroup from "@repo/design-system/components/ui/toggle-group"
import * as Toggle from "@repo/design-system/components/ui/toggle"
import * as Tooltip from "@repo/design-system/components/ui/tooltip"

type RegisterMeta = {
  name: string
  importPath: string
  importName: string
  props?: Record<string, unknown>
  withChildren?: boolean
}

type RegisterFn = (
  component: ComponentType,
  meta: {
    name: string
    importPath: string
    importName: string
    props?: Record<string, unknown>
  }
) => void

const registeredTargets = new Set<string>()

const register = (
  registerFn: RegisterFn,
  component: unknown,
  { name, importPath, importName, props, withChildren = true }: RegisterMeta
) => {
  if (!component) {
    return
  }

  const finalProps = withChildren ? { children: "slot", ...(props ?? {}) } : props

  registerFn(component as ComponentType, {
    name,
    importPath,
    importName,
    props: finalProps,
  })
}

const registerFrom = (
  registerFn: RegisterFn,
  module: Record<string, unknown>,
  importPath: string,
  names: string[],
  overrides: Record<string, Partial<RegisterMeta>> = {}
) => {
  for (const name of names) {
    const override = overrides[name] ?? {}
    register(registerFn, module[name], {
      name,
      importPath,
      importName: name,
      ...override,
    })
  }
}

export const registerPlasmicComponents = (
  registerFn: RegisterFn = registerComponent,
  target = "host"
) => {
  if (registeredTargets.has(target)) {
    return
  }

  if (target === "host" && typeof window === "undefined") {
    return
  }

  registeredTargets.add(target)

  registerFrom(registerFn, Accordion, "@repo/design-system/components/ui/accordion", [
    "Accordion",
    "AccordionItem",
    "AccordionTrigger",
    "AccordionContent",
  ])

  registerFrom(registerFn, AlertDialog, "@repo/design-system/components/ui/alert-dialog", [
    "AlertDialog",
    "AlertDialogPortal",
    "AlertDialogOverlay",
    "AlertDialogTrigger",
    "AlertDialogContent",
    "AlertDialogHeader",
    "AlertDialogFooter",
    "AlertDialogTitle",
    "AlertDialogDescription",
    "AlertDialogAction",
    "AlertDialogCancel",
  ])

  registerFrom(registerFn, Alert, "@repo/design-system/components/ui/alert", [
    "Alert",
    "AlertTitle",
    "AlertDescription",
  ])

  registerFrom(
    registerFn,
    AspectRatio,
    "@repo/design-system/components/ui/aspect-ratio",
    ["AspectRatio"]
  )

  registerFrom(registerFn, Avatar, "@repo/design-system/components/ui/avatar", [
    "Avatar",
    "AvatarImage",
    "AvatarFallback",
  ], {
    AvatarImage: { withChildren: false },
  })

  registerFrom(registerFn, Badge, "@repo/design-system/components/ui/badge", ["Badge"], {
    Badge: {
      props: {
        variant: {
          type: "choice",
          options: ["default", "secondary", "destructive", "outline"],
          defaultValue: "default",
        },
      },
    },
  })

  registerFrom(registerFn, Breadcrumb, "@repo/design-system/components/ui/breadcrumb", [
    "Breadcrumb",
    "BreadcrumbList",
    "BreadcrumbItem",
    "BreadcrumbLink",
    "BreadcrumbPage",
    "BreadcrumbSeparator",
    "BreadcrumbEllipsis",
  ])

  registerFrom(
    registerFn,
    ButtonGroup,
    "@repo/design-system/components/ui/button-group",
    ["ButtonGroup", "ButtonGroupSeparator", "ButtonGroupText"]
  )

  registerFrom(registerFn, Button, "@repo/design-system/components/ui/button", ["Button"], {
    Button: {
      props: {
        variant: {
          type: "choice",
          options: [
            "default",
            "destructive",
            "outline",
            "secondary",
            "ghost",
            "link",
          ],
          defaultValue: "default",
        },
        size: {
          type: "choice",
          options: ["default", "sm", "lg", "icon", "icon-sm", "icon-lg"],
          defaultValue: "default",
        },
        disabled: "boolean",
        type: {
          type: "choice",
          options: ["button", "submit", "reset"],
          defaultValue: "button",
        },
      },
    },
  })

  registerFrom(registerFn, Calendar, "@repo/design-system/components/ui/calendar", [
    "Calendar",
    "CalendarDayButton",
  ])

  registerFrom(registerFn, Card, "@repo/design-system/components/ui/card", [
    "Card",
    "CardHeader",
    "CardFooter",
    "CardTitle",
    "CardAction",
    "CardDescription",
    "CardContent",
  ])

  registerFrom(registerFn, Carousel, "@repo/design-system/components/ui/carousel", [
    "Carousel",
    "CarouselContent",
    "CarouselItem",
    "CarouselPrevious",
    "CarouselNext",
  ])

  registerFrom(registerFn, Chart, "@repo/design-system/components/ui/chart", [
    "ChartContainer",
    "ChartTooltip",
    "ChartTooltipContent",
    "ChartLegend",
    "ChartLegendContent",
    "ChartStyle",
  ], {
    ChartStyle: { withChildren: false },
  })

  registerFrom(registerFn, Checkbox, "@repo/design-system/components/ui/checkbox", [
    "Checkbox",
  ], {
    Checkbox: {
      withChildren: false,
      props: {
        defaultChecked: "boolean",
        disabled: "boolean",
      },
    },
  })

  registerFrom(registerFn, Collapsible, "@repo/design-system/components/ui/collapsible", [
    "Collapsible",
    "CollapsibleTrigger",
    "CollapsibleContent",
  ])

  registerFrom(registerFn, Command, "@repo/design-system/components/ui/command", [
    "Command",
    "CommandDialog",
    "CommandInput",
    "CommandList",
    "CommandEmpty",
    "CommandGroup",
    "CommandItem",
    "CommandShortcut",
    "CommandSeparator",
  ])

  registerFrom(registerFn, ContextMenu, "@repo/design-system/components/ui/context-menu", [
    "ContextMenu",
    "ContextMenuTrigger",
    "ContextMenuContent",
    "ContextMenuItem",
    "ContextMenuCheckboxItem",
    "ContextMenuRadioItem",
    "ContextMenuLabel",
    "ContextMenuSeparator",
    "ContextMenuShortcut",
    "ContextMenuGroup",
    "ContextMenuPortal",
    "ContextMenuSub",
    "ContextMenuSubContent",
    "ContextMenuSubTrigger",
    "ContextMenuRadioGroup",
  ])

  registerFrom(registerFn, Dialog, "@repo/design-system/components/ui/dialog", [
    "Dialog",
    "DialogClose",
    "DialogContent",
    "DialogDescription",
    "DialogFooter",
    "DialogHeader",
    "DialogOverlay",
    "DialogPortal",
    "DialogTitle",
    "DialogTrigger",
  ])

  registerFrom(registerFn, Drawer, "@repo/design-system/components/ui/drawer", [
    "Drawer",
    "DrawerPortal",
    "DrawerOverlay",
    "DrawerTrigger",
    "DrawerClose",
    "DrawerContent",
    "DrawerHeader",
    "DrawerFooter",
    "DrawerTitle",
    "DrawerDescription",
  ])

  registerFrom(registerFn, DropdownMenu, "@repo/design-system/components/ui/dropdown-menu", [
    "DropdownMenu",
    "DropdownMenuPortal",
    "DropdownMenuTrigger",
    "DropdownMenuContent",
    "DropdownMenuGroup",
    "DropdownMenuLabel",
    "DropdownMenuItem",
    "DropdownMenuCheckboxItem",
    "DropdownMenuRadioGroup",
    "DropdownMenuRadioItem",
    "DropdownMenuSeparator",
    "DropdownMenuShortcut",
    "DropdownMenuSub",
    "DropdownMenuSubTrigger",
    "DropdownMenuSubContent",
  ])

  registerFrom(registerFn, Empty, "@repo/design-system/components/ui/empty", [
    "Empty",
    "EmptyHeader",
    "EmptyTitle",
    "EmptyDescription",
    "EmptyContent",
    "EmptyMedia",
  ])

  registerFrom(registerFn, Field, "@repo/design-system/components/ui/field", [
    "Field",
    "FieldLabel",
    "FieldDescription",
    "FieldError",
    "FieldGroup",
    "FieldLegend",
    "FieldSeparator",
    "FieldSet",
    "FieldContent",
    "FieldTitle",
  ])

  registerFrom(registerFn, Form, "@repo/design-system/components/ui/form", [
    "Form",
    "FormItem",
    "FormLabel",
    "FormControl",
    "FormDescription",
    "FormMessage",
    "FormField",
  ])

  registerFrom(
    registerFn,
    GridBackground,
    "@repo/design-system/components/ui/grid-background",
    ["GridBackground"]
  )

  registerFrom(registerFn, HoverCard, "@repo/design-system/components/ui/hover-card", [
    "HoverCard",
    "HoverCardTrigger",
    "HoverCardContent",
  ])

  registerFrom(registerFn, InputGroup, "@repo/design-system/components/ui/input-group", [
    "InputGroup",
    "InputGroupAddon",
    "InputGroupButton",
    "InputGroupText",
    "InputGroupInput",
    "InputGroupTextarea",
  ], {
    InputGroupInput: { withChildren: false },
    InputGroupTextarea: { withChildren: false },
  })

  registerFrom(registerFn, InputOTP, "@repo/design-system/components/ui/input-otp", [
    "InputOTP",
    "InputOTPGroup",
    "InputOTPSlot",
    "InputOTPSeparator",
  ])

  registerFrom(registerFn, Input, "@repo/design-system/components/ui/input", ["Input"], {
    Input: {
      withChildren: false,
      props: {
        placeholder: "string",
        type: {
          type: "choice",
          options: [
            "text",
            "email",
            "password",
            "search",
            "tel",
            "url",
            "number",
          ],
          defaultValue: "text",
        },
        disabled: "boolean",
        required: "boolean",
        name: "string",
      },
    },
  })

  registerFrom(registerFn, Item, "@repo/design-system/components/ui/item", [
    "Item",
    "ItemMedia",
    "ItemContent",
    "ItemActions",
    "ItemGroup",
    "ItemSeparator",
    "ItemTitle",
    "ItemDescription",
    "ItemHeader",
    "ItemFooter",
  ])

  registerFrom(registerFn, Kbd, "@repo/design-system/components/ui/kbd", [
    "Kbd",
    "KbdGroup",
  ])

  registerFrom(registerFn, Label, "@repo/design-system/components/ui/label", ["Label"])

  registerFrom(registerFn, Menubar, "@repo/design-system/components/ui/menubar", [
    "Menubar",
    "MenubarPortal",
    "MenubarMenu",
    "MenubarTrigger",
    "MenubarContent",
    "MenubarGroup",
    "MenubarSeparator",
    "MenubarLabel",
    "MenubarItem",
    "MenubarShortcut",
    "MenubarCheckboxItem",
    "MenubarRadioGroup",
    "MenubarRadioItem",
    "MenubarSub",
    "MenubarSubTrigger",
    "MenubarSubContent",
  ])

  registerFrom(
    registerFn,
    NavigationMenu,
    "@repo/design-system/components/ui/navigation-menu",
    [
      "NavigationMenu",
      "NavigationMenuList",
      "NavigationMenuItem",
      "NavigationMenuContent",
      "NavigationMenuTrigger",
      "NavigationMenuLink",
      "NavigationMenuIndicator",
      "NavigationMenuViewport",
    ]
  )

  registerFrom(registerFn, Pagination, "@repo/design-system/components/ui/pagination", [
    "Pagination",
    "PaginationContent",
    "PaginationLink",
    "PaginationItem",
    "PaginationPrevious",
    "PaginationNext",
    "PaginationEllipsis",
  ])

  registerFrom(registerFn, Popover, "@repo/design-system/components/ui/popover", [
    "Popover",
    "PopoverTrigger",
    "PopoverContent",
    "PopoverAnchor",
  ])

  registerFrom(registerFn, Progress, "@repo/design-system/components/ui/progress", [
    "Progress",
  ], {
    Progress: { withChildren: false, props: { value: "number" } },
  })

  registerFrom(registerFn, RadioGroup, "@repo/design-system/components/ui/radio-group", [
    "RadioGroup",
    "RadioGroupItem",
  ])

  registerFrom(registerFn, Resizable, "@repo/design-system/components/ui/resizable", [
    "ResizablePanelGroup",
    "ResizablePanel",
    "ResizableHandle",
  ])

  registerFrom(registerFn, ScrollArea, "@repo/design-system/components/ui/scroll-area", [
    "ScrollArea",
    "ScrollBar",
  ], {
    ScrollBar: { withChildren: false },
  })

  registerFrom(registerFn, Select, "@repo/design-system/components/ui/select", [
    "Select",
    "SelectContent",
    "SelectGroup",
    "SelectItem",
    "SelectLabel",
    "SelectScrollDownButton",
    "SelectScrollUpButton",
    "SelectSeparator",
    "SelectTrigger",
    "SelectValue",
  ], {
    SelectValue: { withChildren: false },
    SelectTrigger: {
      props: {
        size: {
          type: "choice",
          options: ["sm", "default"],
          defaultValue: "default",
        },
      },
    },
  })

  registerFrom(registerFn, Separator, "@repo/design-system/components/ui/separator", [
    "Separator",
  ], {
    Separator: {
      withChildren: false,
      props: {
        orientation: {
          type: "choice",
          options: ["horizontal", "vertical"],
          defaultValue: "horizontal",
        },
        decorative: "boolean",
      },
    },
  })

  registerFrom(registerFn, Sheet, "@repo/design-system/components/ui/sheet", [
    "Sheet",
    "SheetTrigger",
    "SheetClose",
    "SheetContent",
    "SheetHeader",
    "SheetFooter",
    "SheetTitle",
    "SheetDescription",
  ])

  registerFrom(registerFn, Sidebar, "@repo/design-system/components/ui/sidebar", [
    "Sidebar",
    "SidebarContent",
    "SidebarFooter",
    "SidebarGroup",
    "SidebarGroupAction",
    "SidebarGroupContent",
    "SidebarGroupLabel",
    "SidebarHeader",
    "SidebarInput",
    "SidebarInset",
    "SidebarMenu",
    "SidebarMenuAction",
    "SidebarMenuBadge",
    "SidebarMenuButton",
    "SidebarMenuItem",
    "SidebarMenuSkeleton",
    "SidebarMenuSub",
    "SidebarMenuSubButton",
    "SidebarMenuSubItem",
    "SidebarProvider",
    "SidebarRail",
    "SidebarSeparator",
    "SidebarTrigger",
  ])

  registerFrom(registerFn, Skeleton, "@repo/design-system/components/ui/skeleton", [
    "Skeleton",
  ])

  registerFrom(registerFn, Slider, "@repo/design-system/components/ui/slider", ["Slider"], {
    Slider: {
      withChildren: false,
      props: {
        min: "number",
        max: "number",
      },
    },
  })

  registerFrom(registerFn, Sonner, "@repo/design-system/components/ui/sonner", ["Toaster"], {
    Toaster: { withChildren: false },
  })

  registerFrom(registerFn, Spinner, "@repo/design-system/components/ui/spinner", ["Spinner"], {
    Spinner: { withChildren: false },
  })

  registerFrom(registerFn, Switch, "@repo/design-system/components/ui/switch", ["Switch"], {
    Switch: {
      withChildren: false,
      props: {
        defaultChecked: "boolean",
        disabled: "boolean",
      },
    },
  })

  registerFrom(registerFn, Table, "@repo/design-system/components/ui/table", [
    "Table",
    "TableHeader",
    "TableBody",
    "TableFooter",
    "TableHead",
    "TableRow",
    "TableCell",
    "TableCaption",
  ])

  registerFrom(registerFn, Tabs, "@repo/design-system/components/ui/tabs", [
    "Tabs",
    "TabsList",
    "TabsTrigger",
    "TabsContent",
  ])

  registerFrom(registerFn, Textarea, "@repo/design-system/components/ui/textarea", [
    "Textarea",
  ], {
    Textarea: {
      withChildren: false,
      props: {
        placeholder: "string",
        disabled: "boolean",
        required: "boolean",
        name: "string",
        rows: "number",
      },
    },
  })

  registerFrom(registerFn, ToggleGroup, "@repo/design-system/components/ui/toggle-group", [
    "ToggleGroup",
    "ToggleGroupItem",
  ], {
    ToggleGroup: {
      props: {
        spacing: "number",
        variant: {
          type: "choice",
          options: ["default", "outline"],
          defaultValue: "default",
        },
        size: {
          type: "choice",
          options: ["default", "sm", "lg"],
          defaultValue: "default",
        },
      },
    },
  })

  registerFrom(registerFn, Toggle, "@repo/design-system/components/ui/toggle", ["Toggle"], {
    Toggle: {
      props: {
        variant: {
          type: "choice",
          options: ["default", "outline"],
          defaultValue: "default",
        },
        size: {
          type: "choice",
          options: ["default", "sm", "lg"],
          defaultValue: "default",
        },
      },
    },
  })

  registerFrom(registerFn, Tooltip, "@repo/design-system/components/ui/tooltip", [
    "Tooltip",
    "TooltipTrigger",
    "TooltipContent",
    "TooltipProvider",
  ])
}

registerPlasmicComponents()
