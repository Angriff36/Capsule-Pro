import { log as logtail } from "@logtail/next";

function toContext(value: unknown): Record<string, any> | undefined {
  if (value === undefined) return undefined;
  if (value instanceof Error) {
    return {
      errorMessage: value.message,
      stack: value.stack,
      name: value.name,
    };
  }
  if (typeof value === "object" && value !== null) {
    return value as Record<string, any>;
  }
  return { error: String(value) };
}

const isDev = process.env.NODE_ENV !== "production";

export const log = {
  debug: (message: string, ...args: unknown[]) => {
    if (isDev) {
      console.debug(message, ...args);
    } else {
      logtail.debug(message, toContext(args[0]));
    }
  },
  info: (message: string, ...args: unknown[]) => {
    if (isDev) {
      console.info(message, ...args);
    } else {
      logtail.info(message, toContext(args[0]));
    }
  },
  error: (message: string, ...args: unknown[]) => {
    if (isDev) {
      console.error(message, ...args);
    } else {
      logtail.error(message, toContext(args[0]));
    }
  },
  warn: (message: string, ...args: unknown[]) => {
    if (isDev) {
      console.warn(message, ...args);
    } else {
      logtail.warn(message, toContext(args[0]));
    }
  },
};
