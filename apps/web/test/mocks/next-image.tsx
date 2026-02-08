import React from "react";
import type { ImageProps } from "next/image";

// Mock Next.js Image component for vitest
export default function Image({ alt, ...props }: ImageProps) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img alt={alt} {...props} />;
}
