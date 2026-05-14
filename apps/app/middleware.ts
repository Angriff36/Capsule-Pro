export { default } from "./proxy";

export const config = {
  matcher: [
    /*
     * Run auth routing for every app/API request by default, while leaving
     * public routes, framework internals, and static files alone. proxy.ts
     * keeps the same public allowlist for clarity and direct helper tests.
     */
    "/((?!(?:sign-in|sign-up|plasmic|view/proposal|sign/contract)(?:/|$)|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|manifest.webmanifest|site.webmanifest|.*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
  ],
};
