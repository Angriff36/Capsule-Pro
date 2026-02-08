import React from "react";
import type { LinkProps } from "next/link";

// Mock Next.js Link component for vitest
export default function Link({
  children,
  href,
  ...props
}: LinkProps & React.AnchorHTMLAttributes<HTMLAnchorElement>) {
  return (
    <a href={href?.toString()} {...props}>
      {children}
    </a>
  );
}
