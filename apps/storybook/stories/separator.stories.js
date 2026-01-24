Object.defineProperty(exports, "__esModule", { value: true });
exports.Vertical = exports.Horizontal = void 0;
const separator_1 = require("@repo/design-system/components/ui/separator");
/**
 * Visually or semantically separates content.
 */
const meta = {
  title: "ui/Separator",
  component: separator_1.Separator,
  tags: ["autodocs"],
  argTypes: {},
};
exports.default = meta;
/**
 * The default form of the separator.
 */
exports.Horizontal = {
  render: () => (
    <div className="flex gap-2">
      <div>Left</div>
      <separator_1.Separator className="h-auto" orientation="vertical" />
      <div>Right</div>
    </div>
  ),
};
/**
 * A vertical separator.
 */
exports.Vertical = {
  render: () => (
    <div className="grid gap-2">
      <div>Top</div>
      <separator_1.Separator orientation="horizontal" />
      <div>Bottom</div>
    </div>
  ),
};
