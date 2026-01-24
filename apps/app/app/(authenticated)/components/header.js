Object.defineProperty(exports, "__esModule", { value: true });
exports.Header = void 0;
const breadcrumb_1 = require("@repo/design-system/components/ui/breadcrumb");
const separator_1 = require("@repo/design-system/components/ui/separator");
const sidebar_1 = require("@repo/design-system/components/ui/sidebar");
const react_1 = require("react");
const Header = ({ pages, page, children }) => (
  <header className="flex h-16 shrink-0 items-center justify-between gap-2">
    <div className="flex items-center gap-2 px-4">
      <sidebar_1.SidebarTrigger className="-ml-1" />
      <separator_1.Separator className="mr-2 h-4" orientation="vertical" />
      <breadcrumb_1.Breadcrumb>
        <breadcrumb_1.BreadcrumbList className="text-muted-foreground/70 text-sm">
          {pages.map((page, index) => (
            <react_1.Fragment key={page}>
              {index > 0 && (
                <breadcrumb_1.BreadcrumbSeparator className="hidden md:block" />
              )}
              <breadcrumb_1.BreadcrumbItem className="hidden md:block">
                <breadcrumb_1.BreadcrumbLink href="#">
                  {page}
                </breadcrumb_1.BreadcrumbLink>
              </breadcrumb_1.BreadcrumbItem>
            </react_1.Fragment>
          ))}
          <breadcrumb_1.BreadcrumbSeparator className="hidden md:block" />
          <breadcrumb_1.BreadcrumbItem>
            <breadcrumb_1.BreadcrumbPage>{page}</breadcrumb_1.BreadcrumbPage>
          </breadcrumb_1.BreadcrumbItem>
        </breadcrumb_1.BreadcrumbList>
      </breadcrumb_1.Breadcrumb>
    </div>
    {children}
  </header>
);
exports.Header = Header;
