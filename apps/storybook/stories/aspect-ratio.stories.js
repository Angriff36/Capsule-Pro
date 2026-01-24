var __importDefault =
  (this && this.__importDefault) ||
  ((mod) => (mod && mod.__esModule ? mod : { default: mod }));
Object.defineProperty(exports, "__esModule", { value: true });
exports.Cinemascope =
  exports.Landscape =
  exports.Square =
  exports.Default =
    void 0;
const aspect_ratio_1 = require("@repo/design-system/components/ui/aspect-ratio");
const image_1 = __importDefault(require("next/image"));
/**
 * Displays content within a desired ratio.
 */
const meta = {
  title: "ui/AspectRatio",
  component: aspect_ratio_1.AspectRatio,
  tags: ["autodocs"],
  argTypes: {},
  render: (args) => (
    <aspect_ratio_1.AspectRatio
      {...args}
      className="bg-slate-50 dark:bg-slate-800"
    >
      <image_1.default
        alt="Photo by Alvaro Pinot"
        className="rounded-md object-cover"
        fill
        src="https://images.unsplash.com/photo-1576075796033-848c2a5f3696?w=800&dpr=2&q=80"
      />
    </aspect_ratio_1.AspectRatio>
  ),
  decorators: [
    (Story) => (
      <div className="w-1/2">
        <Story />
      </div>
    ),
  ],
};
exports.default = meta;
/**
 * The default form of the aspect ratio.
 */
exports.Default = {
  args: {
    ratio: 16 / 9,
  },
};
/**
 * Use the `1:1` aspect ratio to display a square image.
 */
exports.Square = {
  args: {
    ratio: 1,
  },
};
/**
 * Use the `4:3` aspect ratio to display a landscape image.
 */
exports.Landscape = {
  args: {
    ratio: 4 / 3,
  },
};
/**
 * Use the `2.35:1` aspect ratio to display a cinemascope image.
 */
exports.Cinemascope = {
  args: {
    ratio: 2.35 / 1,
  },
};
