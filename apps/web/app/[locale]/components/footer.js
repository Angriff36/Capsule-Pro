var __importDefault =
  (this && this.__importDefault) ||
  ((mod) => (mod && mod.__esModule ? mod : { default: mod }));
Object.defineProperty(exports, "__esModule", { value: true });
exports.Footer = void 0;
const cms_1 = require("@repo/cms");
const feed_1 = require("@repo/cms/components/feed");
const status_1 = require("@repo/observability/status");
const link_1 = __importDefault(require("next/link"));
const env_1 = require("@/env");
const Footer = () => (
  <feed_1.Feed queries={[cms_1.legal.postsQuery]}>
    {async ([data]) => {
      "use server";
      const navigationItems = [
        {
          title: "Home",
          href: "/",
          description: "",
        },
        {
          title: "Pages",
          description: "Managing a small business today is already tough.",
          items: [
            {
              title: "Blog",
              href: "/blog",
            },
          ],
        },
        {
          title: "Legal",
          description: "We stay on top of the latest legal requirements.",
          items: data._componentInstances.legalPagesItem.items.map((post) => ({
            title: post._title,
            href: `/legal/${post._slug}`,
          })),
        },
      ];
      if (env_1.env.NEXT_PUBLIC_DOCS_URL) {
        navigationItems.at(1)?.items?.push({
          title: "Docs",
          href: env_1.env.NEXT_PUBLIC_DOCS_URL,
        });
      }
      return (
        <section className="dark border-foreground/10 border-t">
          <div className="w-full bg-background py-20 text-foreground lg:py-40">
            <div className="container mx-auto">
              <div className="grid items-center gap-10 lg:grid-cols-2">
                <div className="flex flex-col items-start gap-8">
                  <div className="flex flex-col gap-2">
                    <h2 className="max-w-xl text-left font-regular text-3xl tracking-tighter md:text-5xl">
                      next-forge
                    </h2>
                    <p className="max-w-lg text-left text-foreground/75 text-lg leading-relaxed tracking-tight">
                      This is the start of something new.
                    </p>
                  </div>
                  <status_1.Status />
                </div>
                <div className="grid items-start gap-10 lg:grid-cols-3">
                  {navigationItems.map((item) => (
                    <div
                      className="flex flex-col items-start gap-1 text-base"
                      key={item.title}
                    >
                      <div className="flex flex-col gap-2">
                        {item.href ? (
                          <link_1.default
                            className="flex items-center justify-between"
                            href={item.href}
                            rel={
                              item.href.includes("http")
                                ? "noopener noreferrer"
                                : undefined
                            }
                            target={
                              item.href.includes("http") ? "_blank" : undefined
                            }
                          >
                            <span className="text-xl">{item.title}</span>
                          </link_1.default>
                        ) : (
                          <p className="text-xl">{item.title}</p>
                        )}
                        {item.items?.map((subItem) => (
                          <link_1.default
                            className="flex items-center justify-between"
                            href={subItem.href}
                            key={subItem.title}
                            rel={
                              subItem.href.includes("http")
                                ? "noopener noreferrer"
                                : undefined
                            }
                            target={
                              subItem.href.includes("http")
                                ? "_blank"
                                : undefined
                            }
                          >
                            <span className="text-foreground/75">
                              {subItem.title}
                            </span>
                          </link_1.default>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      );
    }}
  </feed_1.Feed>
);
exports.Footer = Footer;
