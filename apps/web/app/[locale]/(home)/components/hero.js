var __importDefault =
  (this && this.__importDefault) ||
  ((mod) => (mod && mod.__esModule ? mod : { default: mod }));
Object.defineProperty(exports, "__esModule", { value: true });
exports.Hero = void 0;
const button_1 = require("@repo/design-system/components/ui/button");
const lucide_react_1 = require("lucide-react");
const image_1 = __importDefault(require("next/image"));
const link_1 = __importDefault(require("next/link"));
const env_1 = require("@/env");
const Hero = async ({ dictionary }) => (
  <div className="w-full">
    <div className="container mx-auto">
      <div className="flex flex-col items-center justify-center gap-8 py-20 lg:py-32">
        <div>
          <button_1.Button
            asChild
            className="gap-4"
            size="sm"
            variant="secondary"
          >
            <link_1.default href="/blog">
              {dictionary.web.home.hero.announcement}{" "}
              <lucide_react_1.MoveRight className="h-4 w-4" />
            </link_1.default>
          </button_1.Button>
        </div>
        <div className="flex flex-col gap-4">
          <h1 className="max-w-2xl text-center font-regular text-5xl tracking-tighter md:text-7xl">
            {dictionary.web.home.meta.title}
          </h1>
          <p className="max-w-2xl text-center text-lg text-muted-foreground leading-relaxed tracking-tight md:text-xl">
            {dictionary.web.home.meta.description}
          </p>
        </div>
        <div className="flex flex-row gap-3">
          <button_1.Button
            asChild
            className="gap-4"
            size="lg"
            variant="outline"
          >
            <link_1.default href="/contact">
              Get in touch <lucide_react_1.PhoneCall className="h-4 w-4" />
            </link_1.default>
          </button_1.Button>
          <button_1.Button asChild className="gap-4" size="lg">
            <link_1.default href={env_1.env.NEXT_PUBLIC_APP_URL}>
              Sign up <lucide_react_1.MoveRight className="h-4 w-4" />
            </link_1.default>
          </button_1.Button>
        </div>
        <div className="w-full max-w-5xl">
          <div className="relative aspect-[16/9] overflow-hidden rounded-3xl border bg-muted shadow-2xl">
            <image_1.default
              alt="Operations dashboard preview"
              fill
              priority
              sizes="(min-width: 1024px) 1024px, 100vw"
              src="/marketing/PolishedDashboard.png"
              style={{ objectFit: "cover" }}
            />
          </div>
        </div>
      </div>
    </div>
  </div>
);
exports.Hero = Hero;
