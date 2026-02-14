import type { LinkProps } from "next/link";
import type React from "react";

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
