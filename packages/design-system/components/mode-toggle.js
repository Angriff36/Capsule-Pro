"use client";

Object.defineProperty(exports, "__esModule", { value: true });
exports.ModeToggle = void 0;
const react_icons_1 = require("@radix-ui/react-icons");
const next_themes_1 = require("next-themes");
const react_1 = require("react");
const button_1 = require("../components/ui/button");
const dropdown_menu_1 = require("../components/ui/dropdown-menu");
const themes = [
  { label: "Light", value: "light" },
  { label: "Dark", value: "dark" },
  { label: "System", value: "system" },
];
const ModeToggle = () => {
  const { setTheme } = (0, next_themes_1.useTheme)();
  const [mounted, setMounted] = (0, react_1.useState)(false);
  (0, react_1.useEffect)(() => {
    setMounted(true);
  }, []);
  if (!mounted) {
    return (
      <button_1.Button
        aria-hidden
        className="opacity-0 pointer-events-none shrink-0"
        size="icon"
        variant="ghost"
      />
    );
  }
  return (
    <dropdown_menu_1.DropdownMenu>
      <dropdown_menu_1.DropdownMenuTrigger asChild>
        <button_1.Button
          className="shrink-0 text-foreground"
          size="icon"
          variant="ghost"
        >
          <react_icons_1.SunIcon className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <react_icons_1.MoonIcon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </button_1.Button>
      </dropdown_menu_1.DropdownMenuTrigger>
      <dropdown_menu_1.DropdownMenuContent>
        {themes.map(({ label, value }) => (
          <dropdown_menu_1.DropdownMenuItem
            key={value}
            onClick={() => setTheme(value)}
          >
            {label}
          </dropdown_menu_1.DropdownMenuItem>
        ))}
      </dropdown_menu_1.DropdownMenuContent>
    </dropdown_menu_1.DropdownMenu>
  );
};
exports.ModeToggle = ModeToggle;
