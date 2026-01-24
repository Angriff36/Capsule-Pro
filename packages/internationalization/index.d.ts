import "server-only";
import type en from "./dictionaries/en.json";
export declare const locales: readonly [string, ...string[]];
export type Dictionary = typeof en;
export declare const getDictionary: (locale: string) => Promise<Dictionary>;
//# sourceMappingURL=index.d.ts.map
