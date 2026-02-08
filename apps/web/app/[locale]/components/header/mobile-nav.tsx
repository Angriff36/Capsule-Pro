import type { Dictionary } from "@repo/internationalization";
import { MoveRight } from "lucide-react";
import Link from "next/link";
import type { NavigationItem } from "./navigation-config";

interface MobileNavProps {
  navigationItems: NavigationItem[];
  isOpen: boolean;
  setOpen: (open: boolean) => void;
}

export function MobileNav({
  navigationItems,
  isOpen,
  setOpen,
}: MobileNavProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="container absolute top-20 right-0 flex w-full flex-col gap-8 border-t bg-background py-4 shadow-lg">
      {navigationItems.map((item) => (
        <div key={item.title}>
          <div className="flex flex-col gap-2">
            {item.href ? (
              <Link
                className="flex items-center justify-between"
                href={item.href}
                onClick={() => setOpen(false)}
                rel={
                  item.href.startsWith("http")
                    ? "noopener noreferrer"
                    : undefined
                }
                target={item.href.startsWith("http") ? "_blank" : undefined}
              >
                <span className="text-lg">{item.title}</span>
                <MoveRight className="h-4 w-4 stroke-1 text-muted-foreground" />
              </Link>
            ) : (
              <p className="text-lg">{item.title}</p>
            )}
            {item.items?.map((subItem) => (
              <Link
                className="flex items-center justify-between"
                href={subItem.href}
                key={subItem.title}
                onClick={() => setOpen(false)}
              >
                <span className="text-muted-foreground">{subItem.title}</span>
                <MoveRight className="h-4 w-4 stroke-1" />
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
