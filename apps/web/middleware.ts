import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Valid locales - must match packages/internationalization/languine.json
const VALID_LOCALES = ["en", "es", "de", "zh", "fr", "pt"];

// Static file patterns that should not be treated as locales
const STATIC_FILE_PATTERNS = [
  /^favicon\.ico$/,
  /^robots\.txt$/,
  /^sitemap\.xml$/,
  /^manifest\.json$/,
  /^sw\.js$/,
  /^workbox-.*\.js$/,
  /^apple-touch-icon.*\.png$/,
  /^android-chrome.*\.png$/,
  /^mstile.*\.png$/,
  /^browserconfig\.xml$/,
  /^site\.webmanifest$/,
  /^opengraph-image.*$/,
  /^twitter-image.*$/,
];

// Known bot user agents that often hit static files incorrectly
const BOT_PATTERNS = [
  /bot/i,
  /crawler/i,
  /spider/i,
  /scraper/i,
  /facebookexternalhit/i,
  /twitterbot/i,
  /linkedinbot/i,
  /slackbot/i,
  /discordbot/i,
  /whatsapp/i,
  /telegram/i,
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Get the first path segment (potential locale)
  const pathSegments = pathname.split("/").filter(Boolean);
  const potentialLocale = pathSegments[0];
  
  // If no path segment, let it through (root redirect)
  if (!potentialLocale) {
    return NextResponse.next();
  }
  
  // Check if this looks like a static file request
  const isStaticFile = STATIC_FILE_PATTERNS.some(pattern => 
    pattern.test(potentialLocale)
  );
  
  if (isStaticFile) {
    // Return 404 for static files hitting the locale route
    return new NextResponse("Not Found", { status: 404 });
  }
  
  // Check if the locale is valid
  const isValidLocale = VALID_LOCALES.includes(potentialLocale);
  
  if (!isValidLocale) {
    // Check if this might be a bot hitting an invalid URL
    const userAgent = request.headers.get("user-agent") || "";
    const isBot = BOT_PATTERNS.some(pattern => pattern.test(userAgent));
    
    // For bots with invalid locales, return 404 to prevent errors
    if (isBot || potentialLocale.includes(".")) {
      return new NextResponse("Not Found", { status: 404 });
    }
    
    // For humans, redirect to default locale (en) with the same path
    const url = request.nextUrl.clone();
    url.pathname = `/en${pathname}`;
    return NextResponse.redirect(url);
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    // Match all paths except _next, api, and static files
    "/((?!_next|api|trpc|.*\\..*).*)",
  ],
};
