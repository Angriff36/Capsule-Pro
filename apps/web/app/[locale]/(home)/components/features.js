var __importDefault =
  (this && this.__importDefault) ||
  ((mod) => (mod && mod.__esModule ? mod : { default: mod }));
Object.defineProperty(exports, "__esModule", { value: true });
exports.Features = void 0;
const image_1 = __importDefault(require("next/image"));
const Features = ({ dictionary }) => {
  const featureImages = [
    "/marketing/KitchenOverview.png",
    "/marketing/ConsolidatedTasks.png",
    "/marketing/EnterpriseDashboard.png",
    "/marketing/RecipesMenus.png",
  ];
  return (
    <div className="w-full py-20 lg:py-40">
      <div className="container mx-auto">
        <div className="flex flex-col gap-10">
          <div className="flex flex-col items-start gap-4">
            <div className="flex flex-col gap-2">
              <h2 className="max-w-xl text-left font-regular text-3xl tracking-tighter md:text-5xl">
                {dictionary.web.home.features.title}
              </h2>
              <p className="max-w-xl text-left text-lg text-muted-foreground leading-relaxed tracking-tight lg:max-w-lg">
                {dictionary.web.home.features.description}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            <div className="flex h-full flex-col justify-between gap-6 rounded-2xl border bg-muted p-6 lg:col-span-2">
              <div className="relative aspect-[16/9] overflow-hidden rounded-xl">
                <image_1.default
                  alt="Unified operations overview"
                  fill
                  sizes="(min-width: 1024px) 40vw, 100vw"
                  src={featureImages[0]}
                  style={{ objectFit: "cover" }}
                />
              </div>
              <div className="flex flex-col">
                <h3 className="text-xl tracking-tight">
                  {dictionary.web.home.features.items[0].title}
                </h3>
                <p className="max-w-xs text-base text-muted-foreground">
                  {dictionary.web.home.features.items[0].description}
                </p>
              </div>
            </div>
            <div className="flex flex-col justify-between gap-6 rounded-2xl border bg-muted p-6">
              <div className="relative aspect-[4/3] overflow-hidden rounded-xl">
                <image_1.default
                  alt="Task coordination preview"
                  fill
                  sizes="(min-width: 1024px) 20vw, 100vw"
                  src={featureImages[1]}
                  style={{ objectFit: "cover" }}
                />
              </div>
              <div className="flex flex-col">
                <h3 className="text-xl tracking-tight">
                  {dictionary.web.home.features.items[1].title}
                </h3>
                <p className="max-w-xs text-base text-muted-foreground">
                  {dictionary.web.home.features.items[1].description}
                </p>
              </div>
            </div>

            <div className="flex flex-col justify-between gap-6 rounded-2xl border bg-muted p-6">
              <div className="relative aspect-[4/3] overflow-hidden rounded-xl">
                <image_1.default
                  alt="Realtime analytics preview"
                  fill
                  sizes="(min-width: 1024px) 20vw, 100vw"
                  src={featureImages[2]}
                  style={{ objectFit: "cover" }}
                />
              </div>
              <div className="flex flex-col">
                <h3 className="text-xl tracking-tight">
                  {dictionary.web.home.features.items[2].title}
                </h3>
                <p className="max-w-xs text-base text-muted-foreground">
                  {dictionary.web.home.features.items[2].description}
                </p>
              </div>
            </div>
            <div className="flex h-full flex-col justify-between gap-6 rounded-2xl border bg-muted p-6 lg:col-span-2">
              <div className="relative aspect-[16/9] overflow-hidden rounded-xl">
                <image_1.default
                  alt="Menu and recipe management"
                  fill
                  sizes="(min-width: 1024px) 40vw, 100vw"
                  src={featureImages[3]}
                  style={{ objectFit: "cover" }}
                />
              </div>
              <div className="flex flex-col">
                <h3 className="text-xl tracking-tight">
                  {dictionary.web.home.features.items[3].title}
                </h3>
                <p className="max-w-xs text-base text-muted-foreground">
                  {dictionary.web.home.features.items[3].description}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
exports.Features = Features;
