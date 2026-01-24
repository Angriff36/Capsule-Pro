Object.defineProperty(exports, "__esModule", { value: true });
exports.Default = void 0;
const skeleton_1 = require("@repo/design-system/components/ui/skeleton");
/**
 * Use to show a placeholder while content is loading.
 */
const meta = {
  title: "ui/Skeleton",
  component: skeleton_1.Skeleton,
  tags: ["autodocs"],
  argTypes: {},
  parameters: {
    layout: "centered",
  },
};
exports.default = meta;
/**
 * The default form of the skeleton.
 */
exports.Default = {
  render: (args) => (
    <div className="flex items-center space-x-4">
      <skeleton_1.Skeleton {...args} className="h-12 w-12 rounded-full" />
      <div className="space-y-2">
        <skeleton_1.Skeleton {...args} className="h-4 w-[250px]" />
        <skeleton_1.Skeleton {...args} className="h-4 w-[200px]" />
      </div>
    </div>
  ),
};
