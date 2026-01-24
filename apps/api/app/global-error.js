"use client";

Object.defineProperty(exports, "__esModule", { value: true });
const button_1 = require("@repo/design-system/components/ui/button");
const fonts_1 = require("@repo/design-system/lib/fonts");
const nextjs_1 = require("@sentry/nextjs");
const react_1 = require("react");
const GlobalError = ({ error, reset }) => {
  (0, react_1.useEffect)(() => {
    (0, nextjs_1.captureException)(error);
  }, [error]);
  return (
    <html className={fonts_1.fonts} lang="en">
      <body>
        <h1>Oops, something went wrong</h1>
        <button_1.Button onClick={() => reset()}>Try again</button_1.Button>
      </body>
    </html>
  );
};
exports.default = GlobalError;
