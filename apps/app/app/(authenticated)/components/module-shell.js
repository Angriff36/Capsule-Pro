"use client";

var __importDefault =
  (this && this.__importDefault) ||
  ((mod) => (mod && mod.__esModule ? mod : { default: mod }));
Object.defineProperty(exports, "__esModule", { value: true });
exports.ModuleShell = void 0;
const utils_1 = require("@repo/design-system/lib/utils");
const link_1 = __importDefault(require("next/link"));
const navigation_1 = require("next/navigation");
const ModuleShell = ({ title, navItems, children }) => {
  const pathname = (0, navigation_1.usePathname)();
  return (
    <div className="flex min-h-[calc(100vh-6rem)] gap-6 px-6 py-6">
      <aside className="hidden w-64 shrink-0 rounded-2xl border border-border/60 bg-muted/30 p-4 md:block">
        <div className="pb-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide">
          {title}
        </div>
        <nav className="space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <link_1.default
                className={(0, utils_1.cn)(
                  "block rounded-lg px-3 py-2 text-sm transition",
                  isActive
                    ? "bg-accent/60 text-foreground"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                )}
                href={item.href}
                key={item.href}
              >
                {item.title}
              </link_1.default>
            );
          })}
        </nav>
      </aside>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
};
exports.ModuleShell = ModuleShell;
