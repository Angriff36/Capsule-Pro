import {
  ModuleLanding as DesignSystemModuleLanding,
  type ModuleLandingFeature,
} from "@repo/design-system/components/blocks/module-landing";
import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

/**
 * App-local ModuleLanding wrapper that injects `next/link` into the canonical
 * design-system primitive. This preserves existing call sites
 * (`import { ModuleLanding } from "../components/module-landing"`) while the
 * shared composition lives in `@repo/design-system/components/blocks/module-landing`.
 *
 * The design-system package cannot import `next/link` directly without
 * violating the package boundary rules in AGENTS.md, so app-side wrappers like
 * this one provide the router-aware Link component via dependency injection.
 */
const NextLinkAdapter = ({
  href,
  className,
  children,
}: {
  href: string;
  className?: string;
  children: ReactNode;
}) => (
  <Link className={className} href={href}>
    {children}
  </Link>
);

type DesignSystemModuleLandingProperties = ComponentProps<
  typeof DesignSystemModuleLanding
>;

type ModuleLandingProperties = Omit<
  DesignSystemModuleLandingProperties,
  "linkComponent"
>;

export const ModuleLanding = (properties: ModuleLandingProperties) => (
  <DesignSystemModuleLanding {...properties} linkComponent={NextLinkAdapter} />
);

export type { ModuleLandingFeature };
