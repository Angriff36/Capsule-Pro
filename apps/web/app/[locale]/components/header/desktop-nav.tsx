import { Button } from "@repo/design-system/components/ui/button";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@repo/design-system/components/ui/navigation-menu";
import type { Dictionary } from "@repo/internationalization";
import { MoveRight } from "lucide-react";
import Link from "next/link";
import type { NavigationItem } from "./navigation-config";

interface DesktopNavProps {
  navigationItems: NavigationItem[];
  dictionary: Dictionary;
}

export function DesktopNav({
  navigationItems,
  dictionary,
}: DesktopNavProps) {
  return (
    <div className="hidden flex-row items-center justify-start gap-4 lg:flex">
      <NavigationMenu className="flex items-start justify-start">
        <NavigationMenuList className="flex flex-row justify-start gap-4">
          {navigationItems.map((item) => (
            <NavigationMenuItem key={item.title}>
              {item.href ? (
                <NavigationMenuLink asChild>
                  <Button asChild variant="ghost">
                    <Link href={item.href}>{item.title}</Link>
                  </Button>
                </NavigationMenuLink>
              ) : (
                <>
                  <NavigationMenuTrigger className="font-medium text-sm">
                    {item.title}
                  </NavigationMenuTrigger>
                  <NavigationMenuContent className="!w-[450px] p-4">
                    <div className="flex grid-cols-2 flex-col gap-4 lg:grid">
                      <div className="flex h-full flex-col justify-between">
                        <div className="flex flex-col">
                          <p className="text-base">{item.title}</p>
                          <p className="text-muted-foreground text-sm">
                            {item.description}
                          </p>
                        </div>
                        <Button asChild className="mt-10" size="sm">
                          <Link href="/contact">
                            {dictionary.web.global.primaryCta}
                          </Link>
                        </Button>
                      </div>
                      <div className="flex h-full flex-col justify-end text-sm">
                        {item.items?.map((subItem) => (
                          <NavigationMenuLink
                            className="flex flex-row items-center justify-between rounded px-4 py-2 hover:bg-muted"
                            href={subItem.href}
                            key={subItem.title}
                          >
                            <span>{subItem.title}</span>
                            <MoveRight className="h-4 w-4 text-muted-foreground" />
                          </NavigationMenuLink>
                        ))}
                      </div>
                    </div>
                  </NavigationMenuContent>
                </>
              )}
            </NavigationMenuItem>
          ))}
        </NavigationMenuList>
      </NavigationMenu>
    </div>
  );
}
