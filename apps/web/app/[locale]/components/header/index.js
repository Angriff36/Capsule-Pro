"use client";

var __importDefault =
  (this && this.__importDefault) ||
  ((mod) => (mod && mod.__esModule ? mod : { default: mod }));
Object.defineProperty(exports, "__esModule", { value: true });
exports.Header = void 0;
const mode_toggle_1 = require("@repo/design-system/components/mode-toggle");
const button_1 = require("@repo/design-system/components/ui/button");
const navigation_menu_1 = require("@repo/design-system/components/ui/navigation-menu");
const lucide_react_1 = require("lucide-react");
const link_1 = __importDefault(require("next/link"));
const react_1 = require("react");
const env_1 = require("@/env");
const language_switcher_1 = require("./language-switcher");
const Header = ({ dictionary }) => {
  const navigationItems = [
    {
      title: dictionary.web.header.home,
      href: "/",
      description: "",
    },
    {
      title: dictionary.web.header.product.title,
      description: dictionary.web.header.product.description,
      items: [
        {
          title: dictionary.web.header.product.pricing,
          href: "/pricing",
        },
      ],
    },
    {
      title: dictionary.web.header.blog,
      href: "/blog",
      description: "",
    },
  ];
  if (env_1.env.NEXT_PUBLIC_DOCS_URL) {
    navigationItems.push({
      title: dictionary.web.header.docs,
      href: env_1.env.NEXT_PUBLIC_DOCS_URL,
      description: "",
    });
  }
  const [isOpen, setOpen] = (0, react_1.useState)(false);
  return (
    <header className="sticky top-0 left-0 z-40 w-full border-b bg-background">
      <div className="container relative mx-auto flex min-h-20 flex-row items-center gap-4 lg:grid lg:grid-cols-3">
        <div className="hidden flex-row items-center justify-start gap-4 lg:flex">
          <navigation_menu_1.NavigationMenu className="flex items-start justify-start">
            <navigation_menu_1.NavigationMenuList className="flex flex-row justify-start gap-4">
              {navigationItems.map((item) => (
                <navigation_menu_1.NavigationMenuItem key={item.title}>
                  {item.href ? (
                    <navigation_menu_1.NavigationMenuLink asChild>
                      <button_1.Button asChild variant="ghost">
                        <link_1.default href={item.href}>
                          {item.title}
                        </link_1.default>
                      </button_1.Button>
                    </navigation_menu_1.NavigationMenuLink>
                  ) : (
                    <>
                      <navigation_menu_1.NavigationMenuTrigger className="font-medium text-sm">
                        {item.title}
                      </navigation_menu_1.NavigationMenuTrigger>
                      <navigation_menu_1.NavigationMenuContent className="!w-[450px] p-4">
                        <div className="flex grid-cols-2 flex-col gap-4 lg:grid">
                          <div className="flex h-full flex-col justify-between">
                            <div className="flex flex-col">
                              <p className="text-base">{item.title}</p>
                              <p className="text-muted-foreground text-sm">
                                {item.description}
                              </p>
                            </div>
                            <button_1.Button
                              asChild
                              className="mt-10"
                              size="sm"
                            >
                              <link_1.default href="/contact">
                                {dictionary.web.global.primaryCta}
                              </link_1.default>
                            </button_1.Button>
                          </div>
                          <div className="flex h-full flex-col justify-end text-sm">
                            {item.items?.map((subItem, idx) => (
                              <navigation_menu_1.NavigationMenuLink
                                className="flex flex-row items-center justify-between rounded px-4 py-2 hover:bg-muted"
                                href={subItem.href}
                                key={idx}
                              >
                                <span>{subItem.title}</span>
                                <lucide_react_1.MoveRight className="h-4 w-4 text-muted-foreground" />
                              </navigation_menu_1.NavigationMenuLink>
                            ))}
                          </div>
                        </div>
                      </navigation_menu_1.NavigationMenuContent>
                    </>
                  )}
                </navigation_menu_1.NavigationMenuItem>
              ))}
            </navigation_menu_1.NavigationMenuList>
          </navigation_menu_1.NavigationMenu>
        </div>
        <div className="flex items-center gap-2 lg:justify-center">
          <svg
            className="h-[18px] w-[18px] -translate-y-[0.5px] fill-current"
            fill="none"
            height="22"
            viewBox="0 0 235 203"
            xmlns="http://www.w3.org/2000/svg"
          >
            <title>Vercel</title>
            <path
              d="M117.082 0L234.164 202.794H0L117.082 0Z"
              fill="currentColor"
            />
          </svg>
          <p className="whitespace-nowrap font-semibold">next-forge</p>
        </div>
        <div className="flex w-full justify-end gap-4">
          <button_1.Button asChild className="hidden md:inline" variant="ghost">
            <link_1.default href="/contact">
              {dictionary.web.header.contact}
            </link_1.default>
          </button_1.Button>
          <div className="hidden border-r md:inline" />
          <div className="hidden md:inline">
            <language_switcher_1.LanguageSwitcher />
          </div>
          <div className="hidden md:inline">
            <mode_toggle_1.ModeToggle />
          </div>
          <button_1.Button
            asChild
            className="hidden md:inline"
            variant="outline"
          >
            <link_1.default href={`${env_1.env.NEXT_PUBLIC_APP_URL}/sign-in`}>
              {dictionary.web.header.signIn}
            </link_1.default>
          </button_1.Button>
          <button_1.Button asChild>
            <link_1.default href={`${env_1.env.NEXT_PUBLIC_APP_URL}/sign-up`}>
              {dictionary.web.header.signUp}
            </link_1.default>
          </button_1.Button>
        </div>
        <div className="flex w-12 shrink items-end justify-end lg:hidden">
          <button_1.Button onClick={() => setOpen(!isOpen)} variant="ghost">
            {isOpen ? (
              <lucide_react_1.X className="h-5 w-5" />
            ) : (
              <lucide_react_1.Menu className="h-5 w-5" />
            )}
          </button_1.Button>
          {isOpen && (
            <div className="container absolute top-20 right-0 flex w-full flex-col gap-8 border-t bg-background py-4 shadow-lg">
              {navigationItems.map((item) => (
                <div key={item.title}>
                  <div className="flex flex-col gap-2">
                    {item.href ? (
                      <link_1.default
                        className="flex items-center justify-between"
                        href={item.href}
                        rel={
                          item.href.startsWith("http")
                            ? "noopener noreferrer"
                            : undefined
                        }
                        target={
                          item.href.startsWith("http") ? "_blank" : undefined
                        }
                      >
                        <span className="text-lg">{item.title}</span>
                        <lucide_react_1.MoveRight className="h-4 w-4 stroke-1 text-muted-foreground" />
                      </link_1.default>
                    ) : (
                      <p className="text-lg">{item.title}</p>
                    )}
                    {item.items?.map((subItem) => (
                      <link_1.default
                        className="flex items-center justify-between"
                        href={subItem.href}
                        key={subItem.title}
                      >
                        <span className="text-muted-foreground">
                          {subItem.title}
                        </span>
                        <lucide_react_1.MoveRight className="h-4 w-4 stroke-1" />
                      </link_1.default>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
exports.Header = Header;
