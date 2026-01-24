"use client";

var __importDefault =
  (this && this.__importDefault) ||
  ((mod) => (mod && mod.__esModule ? mod : { default: mod }));
Object.defineProperty(exports, "__esModule", { value: true });
exports.Cases = void 0;
const carousel_1 = require("@repo/design-system/components/ui/carousel");
const image_1 = __importDefault(require("next/image"));
const react_1 = require("react");
const Cases = ({ dictionary }) => {
  const [api, setApi] = (0, react_1.useState)();
  const [current, setCurrent] = (0, react_1.useState)(0);
  const caseImages = [
    "/marketing/EnterpriseDashboard.png",
    "/marketing/OperationsDashboard.png",
    "/marketing/LeadershipKanban.png",
    "/marketing/RecipesMenus.png",
    "/marketing/KitchenOverview.png",
    "/marketing/Dishes.png",
    "/marketing/KitchenOpsDashboard.png",
    "/marketing/ConsolidatedTasks.png",
    "/marketing/EventChat.png",
  ];
  (0, react_1.useEffect)(() => {
    if (!api) {
      return;
    }
    setTimeout(() => {
      if (api.selectedScrollSnap() + 1 === api.scrollSnapList().length) {
        setCurrent(0);
        api.scrollTo(0);
      } else {
        api.scrollNext();
        setCurrent(current + 1);
      }
    }, 1000);
  }, [api, current]);
  return (
    <div className="w-full py-20 lg:py-40">
      <div className="container mx-auto">
        <div className="flex flex-col gap-10">
          <h2 className="text-left font-regular text-xl tracking-tighter md:text-5xl lg:max-w-xl">
            {dictionary.web.home.cases.title}
          </h2>
          <carousel_1.Carousel className="w-full" setApi={setApi}>
            <carousel_1.CarouselContent>
              {Array.from({ length: 12 }).map((_, index) => {
                const src = caseImages[index % caseImages.length];
                return (
                  <carousel_1.CarouselItem
                    className="basis-1/2 lg:basis-1/4"
                    key={index}
                  >
                    <div className="relative aspect-[4/3] overflow-hidden rounded-xl border bg-muted">
                      <image_1.default
                        alt="Operations preview"
                        fill
                        sizes="(min-width: 1024px) 25vw, 50vw"
                        src={src}
                        style={{ objectFit: "cover" }}
                      />
                    </div>
                  </carousel_1.CarouselItem>
                );
              })}
            </carousel_1.CarouselContent>
          </carousel_1.Carousel>
        </div>
      </div>
    </div>
  );
};
exports.Cases = Cases;
