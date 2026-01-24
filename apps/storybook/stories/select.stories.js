Object.defineProperty(exports, "__esModule", { value: true });
exports.Default = void 0;
const select_1 = require("@repo/design-system/components/ui/select");
/**
 * Displays a list of options for the user to pick from—triggered by a button.
 */
const meta = {
  title: "ui/Select",
  component: select_1.Select,
  tags: ["autodocs"],
  argTypes: {},
  render: (args) => (
    <select_1.Select {...args}>
      <select_1.SelectTrigger className="w-96">
        <select_1.SelectValue placeholder="Select a fruit" />
      </select_1.SelectTrigger>
      <select_1.SelectContent>
        <select_1.SelectGroup>
          <select_1.SelectLabel>Fruits</select_1.SelectLabel>
          <select_1.SelectItem value="apple">Apple</select_1.SelectItem>
          <select_1.SelectItem value="banana">Banana</select_1.SelectItem>
          <select_1.SelectItem value="blueberry">Blueberry</select_1.SelectItem>
          <select_1.SelectItem value="grapes">Grapes</select_1.SelectItem>
          <select_1.SelectItem value="pineapple">Pineapple</select_1.SelectItem>
        </select_1.SelectGroup>
        <select_1.SelectSeparator />
        <select_1.SelectGroup>
          <select_1.SelectLabel>Vegetables</select_1.SelectLabel>
          <select_1.SelectItem value="aubergine">Aubergine</select_1.SelectItem>
          <select_1.SelectItem value="broccoli">Broccoli</select_1.SelectItem>
          <select_1.SelectItem disabled value="carrot">
            Carrot
          </select_1.SelectItem>
          <select_1.SelectItem value="courgette">Courgette</select_1.SelectItem>
          <select_1.SelectItem value="leek">Leek</select_1.SelectItem>
        </select_1.SelectGroup>
        <select_1.SelectSeparator />
        <select_1.SelectGroup>
          <select_1.SelectLabel>Meat</select_1.SelectLabel>
          <select_1.SelectItem value="beef">Beef</select_1.SelectItem>
          <select_1.SelectItem value="chicken">Chicken</select_1.SelectItem>
          <select_1.SelectItem value="lamb">Lamb</select_1.SelectItem>
          <select_1.SelectItem value="pork">Pork</select_1.SelectItem>
        </select_1.SelectGroup>
      </select_1.SelectContent>
    </select_1.Select>
  ),
  parameters: {
    layout: "centered",
  },
};
exports.default = meta;
/**
 * The default form of the select.
 */
exports.Default = {};
