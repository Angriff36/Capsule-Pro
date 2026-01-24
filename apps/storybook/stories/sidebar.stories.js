Object.defineProperty(exports, "__esModule", { value: true });
exports.Base = void 0;
const avatar_1 = require("@repo/design-system/components/ui/avatar");
const breadcrumb_1 = require("@repo/design-system/components/ui/breadcrumb");
const collapsible_1 = require("@repo/design-system/components/ui/collapsible");
const dropdown_menu_1 = require("@repo/design-system/components/ui/dropdown-menu");
const separator_1 = require("@repo/design-system/components/ui/separator");
const sidebar_1 = require("@repo/design-system/components/ui/sidebar");
const lucide_react_1 = require("lucide-react");
const react_1 = require("react");
const meta = {
  title: "ui/Sidebar",
  component: sidebar_1.Sidebar,
  tags: ["autodocs"],
  argTypes: {},
};
exports.default = meta;
const data = {
  user: {
    name: "shadcn",
    email: "m@example.com",
    avatar: "/avatars/shadcn.jpg",
  },
  teams: [
    {
      name: "Acme Inc",
      logo: lucide_react_1.GalleryVerticalEnd,
      plan: "Enterprise",
    },
    {
      name: "Acme Corp.",
      logo: lucide_react_1.AudioWaveform,
      plan: "Startup",
    },
    {
      name: "Evil Corp.",
      logo: lucide_react_1.Command,
      plan: "Free",
    },
  ],
  navMain: [
    {
      title: "Playground",
      url: "#",
      icon: lucide_react_1.SquareTerminal,
      isActive: true,
      items: [
        {
          title: "History",
          url: "#",
        },
        {
          title: "Starred",
          url: "#",
        },
        {
          title: "Settings",
          url: "#",
        },
      ],
    },
    {
      title: "Models",
      url: "#",
      icon: lucide_react_1.Bot,
      items: [
        {
          title: "Genesis",
          url: "#",
        },
        {
          title: "Explorer",
          url: "#",
        },
        {
          title: "Quantum",
          url: "#",
        },
      ],
    },
    {
      title: "Documentation",
      url: "#",
      icon: lucide_react_1.BookOpen,
      items: [
        {
          title: "Introduction",
          url: "#",
        },
        {
          title: "Get Started",
          url: "#",
        },
        {
          title: "Tutorials",
          url: "#",
        },
        {
          title: "Changelog",
          url: "#",
        },
      ],
    },
    {
      title: "Settings",
      url: "#",
      icon: lucide_react_1.Settings2,
      items: [
        {
          title: "General",
          url: "#",
        },
        {
          title: "Team",
          url: "#",
        },
        {
          title: "Billing",
          url: "#",
        },
        {
          title: "Limits",
          url: "#",
        },
      ],
    },
  ],
  projects: [
    {
      name: "Design Engineering",
      url: "#",
      icon: lucide_react_1.Frame,
    },
    {
      name: "Sales & Marketing",
      url: "#",
      icon: lucide_react_1.PieChart,
    },
    {
      name: "Travel",
      url: "#",
      icon: lucide_react_1.Map,
    },
  ],
};
exports.Base = {
  render: () => {
    const [activeTeam, setActiveTeam] = (0, react_1.useState)(data.teams[0]);
    return (
      <sidebar_1.SidebarProvider>
        <sidebar_1.Sidebar collapsible="icon">
          <sidebar_1.SidebarHeader>
            <sidebar_1.SidebarMenu>
              <sidebar_1.SidebarMenuItem>
                <dropdown_menu_1.DropdownMenu>
                  <dropdown_menu_1.DropdownMenuTrigger asChild>
                    <sidebar_1.SidebarMenuButton
                      className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                      size="lg"
                    >
                      <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                        <activeTeam.logo className="size-4" />
                      </div>
                      <div className="grid flex-1 text-left text-sm leading-tight">
                        <span className="truncate font-semibold">
                          {activeTeam.name}
                        </span>
                        <span className="truncate text-xs">
                          {activeTeam.plan}
                        </span>
                      </div>
                      <lucide_react_1.ChevronsUpDown className="ml-auto" />
                    </sidebar_1.SidebarMenuButton>
                  </dropdown_menu_1.DropdownMenuTrigger>
                  <dropdown_menu_1.DropdownMenuContent
                    align="start"
                    className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                    side="bottom"
                    sideOffset={4}
                  >
                    <dropdown_menu_1.DropdownMenuLabel className="text-muted-foreground text-xs">
                      Teams
                    </dropdown_menu_1.DropdownMenuLabel>
                    {data.teams.map((team, index) => (
                      <dropdown_menu_1.DropdownMenuItem
                        className="gap-2 p-2"
                        key={team.name}
                        onClick={() => setActiveTeam(team)}
                      >
                        <div className="flex size-6 items-center justify-center rounded-sm border">
                          <team.logo className="size-4 shrink-0" />
                        </div>
                        {team.name}
                        <dropdown_menu_1.DropdownMenuShortcut>
                          ⌘{index + 1}
                        </dropdown_menu_1.DropdownMenuShortcut>
                      </dropdown_menu_1.DropdownMenuItem>
                    ))}
                    <dropdown_menu_1.DropdownMenuSeparator />
                    <dropdown_menu_1.DropdownMenuItem className="gap-2 p-2">
                      <div className="flex size-6 items-center justify-center rounded-md border bg-background">
                        <lucide_react_1.Plus className="size-4" />
                      </div>
                      <div className="font-medium text-muted-foreground">
                        Add team
                      </div>
                    </dropdown_menu_1.DropdownMenuItem>
                  </dropdown_menu_1.DropdownMenuContent>
                </dropdown_menu_1.DropdownMenu>
              </sidebar_1.SidebarMenuItem>
            </sidebar_1.SidebarMenu>
          </sidebar_1.SidebarHeader>
          <sidebar_1.SidebarContent>
            <sidebar_1.SidebarGroup>
              <sidebar_1.SidebarGroupLabel>
                Platform
              </sidebar_1.SidebarGroupLabel>
              <sidebar_1.SidebarMenu>
                {data.navMain.map((item) => (
                  <collapsible_1.Collapsible
                    asChild
                    className="group/collapsible"
                    defaultOpen={item.isActive}
                    key={item.title}
                  >
                    <sidebar_1.SidebarMenuItem>
                      <collapsible_1.CollapsibleTrigger asChild>
                        <sidebar_1.SidebarMenuButton tooltip={item.title}>
                          {item.icon && <item.icon />}
                          <span>{item.title}</span>
                          <lucide_react_1.ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                        </sidebar_1.SidebarMenuButton>
                      </collapsible_1.CollapsibleTrigger>
                      <collapsible_1.CollapsibleContent>
                        <sidebar_1.SidebarMenuSub>
                          {item.items?.map((subItem) => (
                            <sidebar_1.SidebarMenuSubItem key={subItem.title}>
                              <sidebar_1.SidebarMenuSubButton asChild>
                                <a href={subItem.url}>
                                  <span>{subItem.title}</span>
                                </a>
                              </sidebar_1.SidebarMenuSubButton>
                            </sidebar_1.SidebarMenuSubItem>
                          ))}
                        </sidebar_1.SidebarMenuSub>
                      </collapsible_1.CollapsibleContent>
                    </sidebar_1.SidebarMenuItem>
                  </collapsible_1.Collapsible>
                ))}
              </sidebar_1.SidebarMenu>
            </sidebar_1.SidebarGroup>
            <sidebar_1.SidebarGroup className="group-data-[collapsible=icon]:hidden">
              <sidebar_1.SidebarGroupLabel>
                Projects
              </sidebar_1.SidebarGroupLabel>
              <sidebar_1.SidebarMenu>
                {data.projects.map((item) => (
                  <sidebar_1.SidebarMenuItem key={item.name}>
                    <sidebar_1.SidebarMenuButton asChild>
                      <a href={item.url}>
                        <item.icon />
                        <span>{item.name}</span>
                      </a>
                    </sidebar_1.SidebarMenuButton>
                    <dropdown_menu_1.DropdownMenu>
                      <dropdown_menu_1.DropdownMenuTrigger asChild>
                        <sidebar_1.SidebarMenuAction showOnHover>
                          <lucide_react_1.MoreHorizontal />
                          <span className="sr-only">More</span>
                        </sidebar_1.SidebarMenuAction>
                      </dropdown_menu_1.DropdownMenuTrigger>
                      <dropdown_menu_1.DropdownMenuContent
                        align="end"
                        className="w-48 rounded-lg"
                        side="bottom"
                      >
                        <dropdown_menu_1.DropdownMenuItem>
                          <lucide_react_1.Folder className="text-muted-foreground" />
                          <span>View Project</span>
                        </dropdown_menu_1.DropdownMenuItem>
                        <dropdown_menu_1.DropdownMenuItem>
                          <lucide_react_1.Forward className="text-muted-foreground" />
                          <span>Share Project</span>
                        </dropdown_menu_1.DropdownMenuItem>
                        <dropdown_menu_1.DropdownMenuSeparator />
                        <dropdown_menu_1.DropdownMenuItem>
                          <lucide_react_1.Trash2 className="text-muted-foreground" />
                          <span>Delete Project</span>
                        </dropdown_menu_1.DropdownMenuItem>
                      </dropdown_menu_1.DropdownMenuContent>
                    </dropdown_menu_1.DropdownMenu>
                  </sidebar_1.SidebarMenuItem>
                ))}
                <sidebar_1.SidebarMenuItem>
                  <sidebar_1.SidebarMenuButton className="text-sidebar-foreground/70">
                    <lucide_react_1.MoreHorizontal className="text-sidebar-foreground/70" />
                    <span>More</span>
                  </sidebar_1.SidebarMenuButton>
                </sidebar_1.SidebarMenuItem>
              </sidebar_1.SidebarMenu>
            </sidebar_1.SidebarGroup>
          </sidebar_1.SidebarContent>
          <sidebar_1.SidebarFooter>
            <sidebar_1.SidebarMenu>
              <sidebar_1.SidebarMenuItem>
                <dropdown_menu_1.DropdownMenu>
                  <dropdown_menu_1.DropdownMenuTrigger asChild>
                    <sidebar_1.SidebarMenuButton
                      className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                      size="lg"
                    >
                      <avatar_1.Avatar className="h-8 w-8 rounded-lg">
                        <avatar_1.AvatarImage
                          alt={data.user.name}
                          src={data.user.avatar}
                        />
                        <avatar_1.AvatarFallback className="rounded-lg">
                          CN
                        </avatar_1.AvatarFallback>
                      </avatar_1.Avatar>
                      <div className="grid flex-1 text-left text-sm leading-tight">
                        <span className="truncate font-semibold">
                          {data.user.name}
                        </span>
                        <span className="truncate text-xs">
                          {data.user.email}
                        </span>
                      </div>
                      <lucide_react_1.ChevronsUpDown className="ml-auto size-4" />
                    </sidebar_1.SidebarMenuButton>
                  </dropdown_menu_1.DropdownMenuTrigger>
                  <dropdown_menu_1.DropdownMenuContent
                    align="end"
                    className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                    side="bottom"
                    sideOffset={4}
                  >
                    <dropdown_menu_1.DropdownMenuLabel className="p-0 font-normal">
                      <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                        <avatar_1.Avatar className="h-8 w-8 rounded-lg">
                          <avatar_1.AvatarImage
                            alt={data.user.name}
                            src={data.user.avatar}
                          />
                          <avatar_1.AvatarFallback className="rounded-lg">
                            CN
                          </avatar_1.AvatarFallback>
                        </avatar_1.Avatar>
                        <div className="grid flex-1 text-left text-sm leading-tight">
                          <span className="truncate font-semibold">
                            {data.user.name}
                          </span>
                          <span className="truncate text-xs">
                            {data.user.email}
                          </span>
                        </div>
                      </div>
                    </dropdown_menu_1.DropdownMenuLabel>
                    <dropdown_menu_1.DropdownMenuSeparator />
                    <dropdown_menu_1.DropdownMenuGroup>
                      <dropdown_menu_1.DropdownMenuItem>
                        <lucide_react_1.Sparkles />
                        Upgrade to Pro
                      </dropdown_menu_1.DropdownMenuItem>
                    </dropdown_menu_1.DropdownMenuGroup>
                    <dropdown_menu_1.DropdownMenuSeparator />
                    <dropdown_menu_1.DropdownMenuGroup>
                      <dropdown_menu_1.DropdownMenuItem>
                        <lucide_react_1.BadgeCheck />
                        Account
                      </dropdown_menu_1.DropdownMenuItem>
                      <dropdown_menu_1.DropdownMenuItem>
                        <lucide_react_1.CreditCard />
                        Billing
                      </dropdown_menu_1.DropdownMenuItem>
                      <dropdown_menu_1.DropdownMenuItem>
                        <lucide_react_1.Bell />
                        Notifications
                      </dropdown_menu_1.DropdownMenuItem>
                    </dropdown_menu_1.DropdownMenuGroup>
                    <dropdown_menu_1.DropdownMenuSeparator />
                    <dropdown_menu_1.DropdownMenuItem>
                      <lucide_react_1.LogOut />
                      Log out
                    </dropdown_menu_1.DropdownMenuItem>
                  </dropdown_menu_1.DropdownMenuContent>
                </dropdown_menu_1.DropdownMenu>
              </sidebar_1.SidebarMenuItem>
            </sidebar_1.SidebarMenu>
          </sidebar_1.SidebarFooter>
          <sidebar_1.SidebarRail />
        </sidebar_1.Sidebar>
        <sidebar_1.SidebarInset>
          <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
            <div className="flex items-center gap-2 px-4">
              <sidebar_1.SidebarTrigger className="-ml-1" />
              <separator_1.Separator
                className="mr-2 h-4"
                orientation="vertical"
              />
              <breadcrumb_1.Breadcrumb>
                <breadcrumb_1.BreadcrumbList>
                  <breadcrumb_1.BreadcrumbItem className="hidden md:block">
                    <breadcrumb_1.BreadcrumbLink href="#">
                      Building Your Application
                    </breadcrumb_1.BreadcrumbLink>
                  </breadcrumb_1.BreadcrumbItem>
                  <breadcrumb_1.BreadcrumbSeparator className="hidden md:block" />
                  <breadcrumb_1.BreadcrumbItem>
                    <breadcrumb_1.BreadcrumbPage>
                      Data Fetching
                    </breadcrumb_1.BreadcrumbPage>
                  </breadcrumb_1.BreadcrumbItem>
                </breadcrumb_1.BreadcrumbList>
              </breadcrumb_1.Breadcrumb>
            </div>
          </header>
          <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
            <div className="grid auto-rows-min gap-4 md:grid-cols-3">
              <div className="aspect-video rounded-xl bg-muted/50" />
              <div className="aspect-video rounded-xl bg-muted/50" />
              <div className="aspect-video rounded-xl bg-muted/50" />
            </div>
            <div className="min-h-[100vh] flex-1 rounded-xl bg-muted/50 md:min-h-min" />
          </div>
        </sidebar_1.SidebarInset>
      </sidebar_1.SidebarProvider>
    );
  },
  args: {},
};
