"use client";

import { Button } from "@repo/design-system/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@repo/design-system/components/ui/dropdown-menu";
import { Languages } from "lucide-react";
import { useParams, usePathname, useRouter } from "next/navigation";

/**
 * Available languages for the application
 */
const languages = [
  { label: "🇬🇧 English", value: "en" },
  { label: "🇪🇸 Español", value: "es" },
  { label: "🇩🇪 Deutsch", value: "de" },
  { label: "🇨🇳 中文", value: "zh" },
  { label: "🇫🇷 Français", value: "fr" },
  { label: "🇵🇹 Português", value: "pt" },
];

/**
 * Language switcher dropdown component
 *
 * Allows users to change the application locale. When a language is selected:
 * 1. The current locale in the URL path is replaced with the selected locale
 * 2. The router navigates to the new localized path
 *
 * The component handles the case where the default locale (en) may not be
 * present in the URL by normalizing the path before replacing the locale.
 */
export const LanguageSwitcher = () => {
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();

  const switchLanguage = (locale: string) => {
    const defaultLocale = "en";
    const currentLocale = (params?.locale as string) ?? defaultLocale;
    let newPathname = pathname ?? "/";

    // Case 1: If current locale is default and missing from the URL
    if (
      !newPathname.startsWith(`/${currentLocale}`) &&
      currentLocale === defaultLocale
    ) {
      // Add the default locale to the beginning to normalize
      newPathname = `/${currentLocale}${newPathname}`;
    }

    // Replace current locale with the selected one
    newPathname = newPathname.replace(`/${currentLocale}`, `/${locale}`);

    router.push(newPathname);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          className="shrink-0 text-foreground"
          size="icon"
          variant="ghost"
        >
          <Languages className="h-[1.2rem] w-[1.2rem]" />
          <span className="sr-only">Switch language</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {languages.map(({ label, value }) => (
          <DropdownMenuItem key={value} onClick={() => switchLanguage(value)}>
            {label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
