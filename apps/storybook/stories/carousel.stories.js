Object.defineProperty(exports, "__esModule", { value: true });
exports.Size = exports.Default = void 0;
const carousel_1 = require("@repo/design-system/components/ui/carousel");
/**
 * A carousel with motion and swipe built using Embla.
 */
const meta = {
  title: "ui/Carousel",
  component: carousel_1.Carousel,
  tags: ["autodocs"],
  argTypes: {},
  args: {
    className: "w-full max-w-xs",
  },
  render: (args) => (
    <carousel_1.Carousel {...args}>
      <carousel_1.CarouselContent>
        {Array.from({ length: 5 }).map((_, index) => (
          <carousel_1.CarouselItem key={index}>
            <div className="flex aspect-square items-center justify-center rounded border bg-card p-6">
              <span className="font-semibold text-4xl">{index + 1}</span>
            </div>
          </carousel_1.CarouselItem>
        ))}
      </carousel_1.CarouselContent>
      <carousel_1.CarouselPrevious />
      <carousel_1.CarouselNext />
    </carousel_1.Carousel>
  ),
  parameters: {
    layout: "centered",
  },
};
exports.default = meta;
/**
 * The default form of the carousel.
 */
exports.Default = {};
/**
 * Use the `basis` utility class to change the size of the carousel.
 */
exports.Size = {
  render: (args) => (
    <carousel_1.Carousel {...args} className="mx-12 w-full max-w-xs">
      <carousel_1.CarouselContent>
        {Array.from({ length: 5 }).map((_, index) => (
          <carousel_1.CarouselItem className="basis-1/3" key={index}>
            <div className="flex aspect-square items-center justify-center rounded border bg-card p-6">
              <span className="font-semibold text-4xl">{index + 1}</span>
            </div>
          </carousel_1.CarouselItem>
        ))}
      </carousel_1.CarouselContent>
      <carousel_1.CarouselPrevious />
      <carousel_1.CarouselNext />
    </carousel_1.Carousel>
  ),
  args: {
    className: "mx-12 w-full max-w-xs",
  },
};
