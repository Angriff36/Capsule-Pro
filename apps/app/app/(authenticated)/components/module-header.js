"use client";

var __importDefault =
  (this && this.__importDefault) ||
  ((mod) => (mod && mod.__esModule ? mod : { default: mod }));
Object.defineProperty(exports, "__esModule", { value: true });
exports.ModuleHeader = void 0;
const utils_1 = require("@repo/design-system/lib/utils");
const link_1 = __importDefault(require("next/link"));
const navigation_1 = require("next/navigation");
const module_nav_1 = require("./module-nav");
const ModuleHeader = () => {
  const pathname = (0, navigation_1.usePathname)();
  const activeModuleKey = (0, module_nav_1.getModuleKeyFromPathname)(pathname);
  return (
    <div className="border-border border-b bg-background/95 px-6 py-3">
      <div className="flex flex-wrap items-center gap-2">
        {module_nav_1.modules.map((module) => {
          const isActive = module.key === activeModuleKey;
          return (
            <link_1.default
              className={(0, utils_1.cn)(
                "rounded-full px-4 py-1.5 font-medium text-sm transition",
                isActive
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
              href={module.href}
              key={module.key}
            >
              {module.label}
            </link_1.default>
          );
        })}
      </div>
    </div>
  );
};
exports.ModuleHeader = ModuleHeader;
