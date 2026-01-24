Object.defineProperty(exports, "__esModule", { value: true });
exports.Default = void 0;
const resizable_1 = require("@repo/design-system/components/ui/resizable");
/**
 * Accessible resizable panel groups and layouts with keyboard support.
 */
const meta = {
  title: "ui/ResizablePanelGroup",
  component: resizable_1.ResizablePanelGroup,
  tags: ["autodocs"],
  argTypes: {
    onLayout: {
      control: false,
    },
  },
  args: {
    className: "max-w-96 rounded-lg border",
    direction: "horizontal",
  },
  render: (args) => (
    <resizable_1.ResizablePanelGroup {...args}>
      <resizable_1.ResizablePanel defaultSize={50}>
        <div className="flex h-[200px] items-center justify-center p-6">
          <span className="font-semibold">One</span>
        </div>
      </resizable_1.ResizablePanel>
      <resizable_1.ResizableHandle />
      <resizable_1.ResizablePanel defaultSize={50}>
        <resizable_1.ResizablePanelGroup direction="vertical">
          <resizable_1.ResizablePanel defaultSize={25}>
            <div className="flex h-full items-center justify-center p-6">
              <span className="font-semibold">Two</span>
            </div>
          </resizable_1.ResizablePanel>
          <resizable_1.ResizableHandle />
          <resizable_1.ResizablePanel defaultSize={75}>
            <div className="flex h-full items-center justify-center p-6">
              <span className="font-semibold">Three</span>
            </div>
          </resizable_1.ResizablePanel>
        </resizable_1.ResizablePanelGroup>
      </resizable_1.ResizablePanel>
    </resizable_1.ResizablePanelGroup>
  ),
};
exports.default = meta;
/**
 * The default form of the resizable panel group.
 */
exports.Default = {};
