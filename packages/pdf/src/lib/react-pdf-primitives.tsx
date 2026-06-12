/**
 * Typed re-exports for @react-pdf/renderer JSX primitives.
 *
 * react-pdf class components extend React.Component from @react-pdf's own
 * `import * as React from "react"` resolution. In a pnpm monorepo, Next.js
 * production typecheck can resolve a different @types/react copy for app code,
 * producing "JSX element class does not support attributes" errors.
 * Cast once here instead of in every template.
 */
import {
  pdf,
  Document as ReactPdfDocument,
  Image as ReactPdfImage,
  Link as ReactPdfLink,
  Page as ReactPdfPage,
  Text as ReactPdfText,
  View as ReactPdfView,
  StyleSheet,
} from "@react-pdf/renderer";
import type { ComponentType, ReactElement, ReactNode } from "react";

type WithChildren<P> = P & { children?: ReactNode };

/** react-pdf Style objects are not DOM CSSProperties. */
type PdfStyle = Record<string, unknown>;

function asComponent<P extends object>(
  component: unknown
): ComponentType<WithChildren<P>> {
  return component as ComponentType<WithChildren<P>>;
}

type DocumentProps = WithChildren<{
  title?: string;
  author?: string;
  subject?: string;
  creator?: string;
  keywords?: string;
  producer?: string;
  creationDate?: Date;
  modificationDate?: Date;
}>;

type PageProps = WithChildren<{
  size?: string | number[];
  orientation?: "portrait" | "landscape";
  style?: PdfStyle | PdfStyle[];
}>;

type BoxProps = WithChildren<{
  style?: PdfStyle | PdfStyle[];
  wrap?: boolean;
  break?: boolean;
  fixed?: boolean;
}>;

type TextProps = WithChildren<{
  style?: PdfStyle | PdfStyle[];
}>;

type ImageProps = {
  src?: string;
  style?: PdfStyle | PdfStyle[];
};

export const Document = asComponent<DocumentProps>(ReactPdfDocument);
export const Page = asComponent<PageProps>(ReactPdfPage);
export const View = asComponent<BoxProps>(ReactPdfView);
export const Text = asComponent<TextProps>(ReactPdfText);
export const Image = asComponent<ImageProps>(ReactPdfImage);
export const Link =
  asComponent<WithChildren<{ src?: string; style?: PdfStyle }>>(ReactPdfLink);

export { pdf, StyleSheet };

/** Bridge workspace ReactElement to react-pdf's pdf() input type. */
export function renderToPdf(component: ReactElement) {
  return pdf(component as Parameters<typeof pdf>[0]);
}
