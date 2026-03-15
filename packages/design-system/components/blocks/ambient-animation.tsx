/**
 * Ambient Animation
 *
 * A subtle, looping ambient animation (soft particle flow) for empty dashboard states.
 * Makes empty states feel alive rather than broken. The animation fades out once content is added.
 *
 * Features:
 * - CSS-only animation for performance
 * - Respects prefers-reduced-motion for accessibility
 * - Subtle particle flow effect that doesn't distract
 * - Fade-in/out transitions when mounting/unmounting
 */

import { cn } from "@repo/design-system/lib/utils";
import * as React from "react";

export interface AmbientAnimationProps {
  /** Whether the animation is visible */
  isVisible?: boolean;
  /** Animation variant */
  variant?: "particles" | "waves" | "pulse";
  /** Intensity of the animation (0-1) */
  intensity?: number;
  /** Additional class names */
  className?: string;
  /** Children to wrap (the empty state content) */
  children?: React.ReactNode;
}

/**
 * AmbientAnimation - Subtle ambient animation for empty states
 *
 * Usage:
 * ```tsx
 * <AmbientAnimation isVisible={isEmpty}>
 *   <EmptyListState onCreate={handleCreate} />
 * </AmbientAnimation>
 * ```
 */
export function AmbientAnimation({
  isVisible = true,
  variant = "particles",
  intensity = 0.6,
  className,
  children,
}: AmbientAnimationProps) {
  const [shouldRender, setShouldRender] = React.useState(isVisible);

  // Handle visibility changes with fade transition
  React.useEffect(() => {
    if (isVisible) {
      setShouldRender(true);
    } else {
      const timer = setTimeout(() => setShouldRender(false), 500);
      return () => clearTimeout(timer);
    }
  }, [isVisible]);

  // Don't render if not visible and transition complete
  if (!(shouldRender || isVisible)) {
    return <>{children}</>;
  }

  return (
    <div className={cn("relative", className)}>
      {/* Ambient animation layer */}
      <div
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute inset-0 overflow-hidden rounded-lg transition-opacity duration-500",
          isVisible ? "opacity-100" : "opacity-0"
        )}
      >
        {variant === "particles" && <ParticleFlow intensity={intensity} />}
        {variant === "waves" && <WaveAnimation intensity={intensity} />}
        {variant === "pulse" && <PulseAnimation intensity={intensity} />}
      </div>

      {/* Content layer */}
      <div className="relative z-10">{children}</div>
    </div>
  );
}

/**
 * Particle Flow Animation
 * Soft floating particles that drift across the container
 */
function ParticleFlow({ intensity }: { intensity: number }) {
  const particles = React.useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => ({
      id: i,
      size: Math.random() * 4 + 2,
      x: Math.random() * 100,
      y: Math.random() * 100,
      delay: Math.random() * 5,
      duration: Math.random() * 10 + 15,
      opacity: Math.random() * 0.3 + 0.1,
    }));
  }, []);

  return (
    <div className="absolute inset-0">
      {particles.map((particle) => (
        <div
          className="animate-ambient-particle absolute rounded-full bg-muted-foreground/30"
          key={particle.id}
          style={{
            width: particle.size,
            height: particle.size,
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            opacity: particle.opacity * intensity,
            animationDelay: `${particle.delay}s`,
            animationDuration: `${particle.duration}s`,
          }}
        />
      ))}
      {/* Gradient overlay for depth */}
      <div
        className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-muted/10"
        style={{ opacity: intensity * 0.5 }}
      />
    </div>
  );
}

/**
 * Wave Animation
 * Gentle wave pattern that moves across the container
 */
function WaveAnimation({ intensity }: { intensity: number }) {
  return (
    <div className="absolute inset-0">
      <div
        className="animate-ambient-wave absolute inset-0 opacity-30"
        style={{
          background: `
            radial-gradient(ellipse at 30% 50%, hsl(var(--muted)) 0%, transparent 50%),
            radial-gradient(ellipse at 70% 50%, hsl(var(--muted)) 0%, transparent 50%)
          `,
          opacity: intensity * 0.4,
        }}
      />
      <div
        className="animate-ambient-wave-slow absolute inset-0 opacity-20"
        style={{
          background: `
            radial-gradient(ellipse at 50% 30%, hsl(var(--primary) / 0.1) 0%, transparent 40%),
            radial-gradient(ellipse at 50% 70%, hsl(var(--primary) / 0.1) 0%, transparent 40%)
          `,
          opacity: intensity * 0.3,
        }}
      />
    </div>
  );
}

/**
 * Pulse Animation
 * Subtle breathing/pulsing effect
 */
function PulseAnimation({ intensity }: { intensity: number }) {
  return (
    <div className="absolute inset-0">
      <div
        className="animate-ambient-pulse absolute inset-0 rounded-lg"
        style={{
          background:
            "radial-gradient(circle at center, hsl(var(--muted) / 0.2) 0%, transparent 70%)",
          opacity: intensity * 0.5,
        }}
      />
      <div
        className="animate-ambient-pulse-slow absolute inset-0 rounded-lg"
        style={{
          background:
            "radial-gradient(circle at 30% 30%, hsl(var(--primary) / 0.05) 0%, transparent 50%)",
          opacity: intensity * 0.3,
        }}
      />
    </div>
  );
}

/**
 * withAmbientAnimation - HOC to wrap empty state components with ambient animation
 *
 * Usage:
 * ```tsx
 * const AnimatedEmptyState = withAmbientAnimation(EmptyListState);
 * <AnimatedEmptyState isVisible={isEmpty} onCreate={handleCreate} />
 * ```
 */
export function withAmbientAnimation<P extends object>(
  Component: React.ComponentType<P>
) {
  return function WithAmbientAnimationWrapper({
    isVisible = true,
    variant = "particles",
    intensity = 0.6,
    ...props
  }: P & {
    isVisible?: boolean;
    variant?: "particles" | "waves" | "pulse";
    intensity?: number;
  }) {
    return (
      <AmbientAnimation
        intensity={intensity}
        isVisible={isVisible}
        variant={variant}
      >
        <Component {...(props as P)} />
      </AmbientAnimation>
    );
  };
}

export default AmbientAnimation;
