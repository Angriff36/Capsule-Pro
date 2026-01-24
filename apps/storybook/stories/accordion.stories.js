Object.defineProperty(exports, "__esModule", { value: true });
exports.Default = void 0;
const accordion_1 = require("@repo/design-system/components/ui/accordion");
/**
 * A vertically stacked set of interactive headings that each reveal a section
 * of content.
 */
const meta = {
  title: "ui/Accordion",
  component: accordion_1.Accordion,
  tags: ["autodocs"],
  argTypes: {
    type: {
      options: ["single", "multiple"],
      control: { type: "radio" },
    },
  },
  args: {
    type: "single",
    collapsible: true,
  },
  render: (args) => (
    <accordion_1.Accordion {...args}>
      <accordion_1.AccordionItem value="item-1">
        <accordion_1.AccordionTrigger>
          Is it accessible?
        </accordion_1.AccordionTrigger>
        <accordion_1.AccordionContent>
          Yes. It adheres to the WAI-ARIA design pattern.
        </accordion_1.AccordionContent>
      </accordion_1.AccordionItem>
      <accordion_1.AccordionItem value="item-2">
        <accordion_1.AccordionTrigger>
          Is it styled?
        </accordion_1.AccordionTrigger>
        <accordion_1.AccordionContent>
          Yes. It comes with default styles that matches the other components'
          aesthetic.
        </accordion_1.AccordionContent>
      </accordion_1.AccordionItem>
      <accordion_1.AccordionItem value="item-3">
        <accordion_1.AccordionTrigger>
          Is it animated?
        </accordion_1.AccordionTrigger>
        <accordion_1.AccordionContent>
          Yes. It's animated by default, but you can disable it if you prefer.
        </accordion_1.AccordionContent>
      </accordion_1.AccordionItem>
    </accordion_1.Accordion>
  ),
};
exports.default = meta;
/**
 * The default behavior of the accordion allows only one item to be open.
 */
exports.Default = {};
