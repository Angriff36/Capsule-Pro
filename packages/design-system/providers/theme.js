Object.defineProperty(exports, "__esModule", { value: true });
exports.ThemeProvider = void 0;
const next_themes_1 = require("next-themes");
const ThemeProvider = ({ children, ...properties }) => (
  <next_themes_1.ThemeProvider
    attribute="class"
    defaultTheme="system"
    disableTransitionOnChange
    enableSystem
    {...properties}
  >
    {children}
  </next_themes_1.ThemeProvider>
);
exports.ThemeProvider = ThemeProvider;
