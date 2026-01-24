Object.defineProperty(exports, "__esModule", { value: true });
exports.default = RootLayout;
const next_1 = require("fumadocs-ui/provider/next");
require("./globals.css");
function RootLayout(props) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground">
        <next_1.RootProvider>{props.children}</next_1.RootProvider>
      </body>
    </html>
  );
}
