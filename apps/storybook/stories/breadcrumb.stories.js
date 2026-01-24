Object.defineProperty(exports, "__esModule", { value: true });
exports.WithCustomSeparator = exports.Default = void 0;
const breadcrumb_1 = require("@repo/design-system/components/ui/breadcrumb");
const lucide_react_1 = require("lucide-react");
/**
 * Displays the path to the current resource using a hierarchy of links.
 */
const meta = {
  title: "ui/Breadcrumb",
  component: breadcrumb_1.Breadcrumb,
  tags: ["autodocs"],
  argTypes: {},
  args: {},
  render: (args) => (
    <breadcrumb_1.Breadcrumb {...args}>
      <breadcrumb_1.BreadcrumbList>
        <breadcrumb_1.BreadcrumbItem>
          <breadcrumb_1.BreadcrumbLink>Home</breadcrumb_1.BreadcrumbLink>
        </breadcrumb_1.BreadcrumbItem>
        <breadcrumb_1.BreadcrumbSeparator />
        <breadcrumb_1.BreadcrumbItem>
          <breadcrumb_1.BreadcrumbLink>Components</breadcrumb_1.BreadcrumbLink>
        </breadcrumb_1.BreadcrumbItem>
        <breadcrumb_1.BreadcrumbSeparator />
        <breadcrumb_1.BreadcrumbItem>
          <breadcrumb_1.BreadcrumbPage>Breadcrumb</breadcrumb_1.BreadcrumbPage>
        </breadcrumb_1.BreadcrumbItem>
      </breadcrumb_1.BreadcrumbList>
    </breadcrumb_1.Breadcrumb>
  ),
  parameters: {
    layout: "centered",
  },
};
exports.default = meta;
/**
 * Displays the path of links to the current resource.
 */
exports.Default = {};
/**
 * Displays the path with a custom icon for the separator.
 */
exports.WithCustomSeparator = {
  render: (args) => (
    <breadcrumb_1.Breadcrumb {...args}>
      <breadcrumb_1.BreadcrumbList>
        <breadcrumb_1.BreadcrumbItem>
          <breadcrumb_1.BreadcrumbLink>Home</breadcrumb_1.BreadcrumbLink>
        </breadcrumb_1.BreadcrumbItem>
        <breadcrumb_1.BreadcrumbSeparator>
          <lucide_react_1.ArrowRightSquare />
        </breadcrumb_1.BreadcrumbSeparator>
        <breadcrumb_1.BreadcrumbItem>
          <breadcrumb_1.BreadcrumbLink>Components</breadcrumb_1.BreadcrumbLink>
        </breadcrumb_1.BreadcrumbItem>
        <breadcrumb_1.BreadcrumbSeparator>
          <lucide_react_1.ArrowRightSquare />
        </breadcrumb_1.BreadcrumbSeparator>
        <breadcrumb_1.BreadcrumbItem>
          <breadcrumb_1.BreadcrumbPage>Breadcrumb</breadcrumb_1.BreadcrumbPage>
        </breadcrumb_1.BreadcrumbItem>
      </breadcrumb_1.BreadcrumbList>
    </breadcrumb_1.Breadcrumb>
  ),
};
