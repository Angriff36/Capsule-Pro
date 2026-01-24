"use client";

Object.defineProperty(exports, "__esModule", { value: true });
exports.Testimonials = void 0;
const avatar_1 = require("@repo/design-system/components/ui/avatar");
const carousel_1 = require("@repo/design-system/components/ui/carousel");
const lucide_react_1 = require("lucide-react");
const react_1 = require("react");
const Testimonials = ({ dictionary }) => {
  const [api, setApi] = (0, react_1.useState)();
  const [current, setCurrent] = (0, react_1.useState)(0);
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
    }, 4000);
  }, [api, current]);
  return (
    <div className="w-full py-20 lg:py-40">
      <div className="container mx-auto">
        <div className="flex flex-col gap-10">
          <h2 className="text-left font-regular text-3xl tracking-tighter md:text-5xl lg:max-w-xl">
            {dictionary.web.home.testimonials.title}
          </h2>
          <carousel_1.Carousel className="w-full" setApi={setApi}>
            <carousel_1.CarouselContent>
              {dictionary.web.home.testimonials.items.map((item, index) => (
                <carousel_1.CarouselItem className="lg:basis-1/2" key={index}>
                  <div className="flex aspect-video h-full flex-col justify-between rounded-md bg-muted p-6 lg:col-span-2">
                    <lucide_react_1.User className="h-8 w-8 stroke-1" />
                    <div className="flex flex-col gap-4">
                      <div className="flex flex-col">
                        <h3 className="text-xl tracking-tight">{item.title}</h3>
                        <p className="max-w-xs text-base text-muted-foreground">
                          {item.description}
                        </p>
                      </div>
                      <p className="flex flex-row items-center gap-2 text-sm">
                        <span className="text-muted-foreground">By</span>
                        <avatar_1.Avatar className="h-6 w-6">
                          <avatar_1.AvatarImage src={item.author.image} />
                          <avatar_1.AvatarFallback>??</avatar_1.AvatarFallback>
                        </avatar_1.Avatar>
                        <span>{item.author.name}</span>
                      </p>
                    </div>
                  </div>
                </carousel_1.CarouselItem>
              ))}
            </carousel_1.CarouselContent>
          </carousel_1.Carousel>
        </div>
      </div>
    </div>
  );
};
exports.Testimonials = Testimonials;
