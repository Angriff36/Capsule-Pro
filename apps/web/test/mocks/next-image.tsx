import type { ImageProps } from "next/image";

// Mock Next.js Image component for vitest
export default function Image({ alt, src, ...props }: ImageProps) {
  // Convert StaticImport to string for native img element
  const imgSrc = typeof src === "string" ? src : (src as { src: string }).src;
  // eslint-disable-next-line @next/next/no-img-element
  return <img alt={alt} src={imgSrc} {...props} />;
}
