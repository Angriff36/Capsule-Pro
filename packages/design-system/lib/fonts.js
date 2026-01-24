"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fonts = void 0;
const utils_1 = require("@repo/design-system/lib/utils");
const mono_1 = require("geist/font/mono");
const google_1 = require("next/font/google");
const brandSans = (0, google_1.Source_Sans_3)({
    subsets: ["latin"],
    variable: "--font-brand-sans",
    display: "swap",
});
const brandDisplay = (0, google_1.Playfair_Display)({
    subsets: ["latin"],
    variable: "--font-brand-display",
    display: "swap",
});
exports.fonts = (0, utils_1.cn)(brandSans.variable, brandDisplay.variable, mono_1.GeistMono.variable, "touch-manipulation font-sans antialiased");
