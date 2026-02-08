"use client";

import { ModeToggle } from "@repo/design-system/components/mode-toggle";
import { Button } from "@repo/design-system/components/ui/button";
import type { Dictionary } from "@repo/internationalization";
import { Menu, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { env } from "@/env";
import { DesktopNav } from "./desktop-nav";
import { LanguageSwitcher } from "./language-switcher";
import { buildNavigationItems } from "./navigation-config";
import { MobileNav } from "./mobile-nav";

/**
 * Props for the Header component
 * @property dictionary - Internationalization dictionary containing translated strings
 */
interface HeaderProps {
  dictionary: Dictionary;
}

/**
 * Site header with responsive navigation
 *
 * Features:
 * - Desktop navigation with dropdown menus
 * - Mobile hamburger menu with expandable sections
 * - Language switcher
 * - Dark/light mode toggle
 * - Sign in/sign up buttons
 *
 * The header is sticky at the top of the viewport and uses a client component
 * to manage the mobile menu open/closed state.
 */
export const Header = ({ dictionary }: HeaderProps) => {
  const navigationItems = buildNavigationItems(
    dictionary,
    env.NEXT_PUBLIC_DOCS_URL,
  );

  const [isOpen, setOpen] = useState(false);
  return (
    <header className="sticky top-0 left-0 z-40 w-full border-b bg-background">
      <div className="container relative mx-auto flex min-h-20 flex-row items-center gap-4 lg:grid lg:grid-cols-3">
        <DesktopNav navigationItems={navigationItems} dictionary={dictionary} />
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
          <p className="whitespace-nowrap font-semibold">Capsule</p>
        </div>
        <div className="flex w-full justify-end gap-4">
          <Button asChild className="hidden md:inline" variant="ghost">
            <Link href="/contact">{dictionary.web.header.contact}</Link>
          </Button>
          <div className="hidden border-r md:inline" />
          <div className="hidden md:inline">
            <LanguageSwitcher />
          </div>
          <div className="hidden md:inline">
            <ModeToggle />
          </div>
          <Button asChild className="hidden md:inline" variant="outline">
            <Link href={`${env.NEXT_PUBLIC_APP_URL}/sign-in`}>
              {dictionary.web.header.signIn}
            </Link>
          </Button>
          <Button asChild>
            <Link href={`${env.NEXT_PUBLIC_APP_URL}/sign-up`}>
              {dictionary.web.header.signUp}
            </Link>
          </Button>
        </div>
        <div className="flex w-12 shrink items-end justify-end lg:hidden">
          <Button onClick={() => setOpen(!isOpen)} variant="ghost">
            {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
          <MobileNav
            navigationItems={navigationItems}
            isOpen={isOpen}
            setOpen={setOpen}
          />
        </div>
      </div>
    </header>
  );
};
