"use client";

Object.defineProperty(exports, "__esModule", { value: true });
exports.LanguageSwitcher = void 0;
const button_1 = require("@repo/design-system/components/ui/button");
const dropdown_menu_1 = require("@repo/design-system/components/ui/dropdown-menu");
const lucide_react_1 = require("lucide-react");
const navigation_1 = require("next/navigation");
const languages = [
  { label: "🇬🇧 English", value: "en" },
  { label: "🇪🇸 Español", value: "es" },
  { label: "🇩🇪 Deutsch", value: "de" },
  { label: "🇨🇳 中文", value: "zh" },
  { label: "🇫🇷 Français", value: "fr" },
  { label: "🇵🇹 Português", value: "pt" },
];
const LanguageSwitcher = () => {
  const router = (0, navigation_1.useRouter)();
  const pathname = (0, navigation_1.usePathname)();
  const params = (0, navigation_1.useParams)();
  const switchLanguage = (locale) => {
    const defaultLocale = "en";
    let newPathname = pathname;
    // Case 1: If current locale is default and missing from the URL
    if (
      !pathname.startsWith(`/${params.locale}`) &&
      params.locale === defaultLocale
    ) {
      // Add the default locale to the beginning to normalize
      newPathname = `/${params.locale}${pathname}`;
    }
    // Replace current locale with the selected one
    newPathname = newPathname.replace(`/${params.locale}`, `/${locale}`);
    router.push(newPathname);
  };
  return (
    <dropdown_menu_1.DropdownMenu>
      <dropdown_menu_1.DropdownMenuTrigger asChild>
        <button_1.Button
          className="shrink-0 text-foreground"
          size="icon"
          variant="ghost"
        >
          <lucide_react_1.Languages className="h-[1.2rem] w-[1.2rem]" />
          <span className="sr-only">Switch language</span>
        </button_1.Button>
      </dropdown_menu_1.DropdownMenuTrigger>
      <dropdown_menu_1.DropdownMenuContent>
        {languages.map(({ label, value }) => (
          <dropdown_menu_1.DropdownMenuItem
            key={value}
            onClick={() => switchLanguage(value)}
          >
            {label}
          </dropdown_menu_1.DropdownMenuItem>
        ))}
      </dropdown_menu_1.DropdownMenuContent>
    </dropdown_menu_1.DropdownMenu>
  );
};
exports.LanguageSwitcher = LanguageSwitcher;
