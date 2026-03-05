"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";
import { Component, type ErrorInfo, type ReactNode } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  /** Component name for contextual error logging */
  componentName?: string;
  /** Compact mode for smaller containers like side panels */
  compact?: boolean;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Generic React Error Boundary with contextual logging.
 *
 * Usage:
 * ```tsx
 * <ErrorBoundary componentName="BoardFlow">
 *   <BoardFlow {...props} />
 * </ErrorBoundary>
 * ```
 */
export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log with component context for easier debugging
    const componentContext = this.props.componentName
      ? `[${this.props.componentName}]`
      : "[ErrorBoundary]";

    console.error(`${componentContext} Caught render error:`, {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
    });
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null });
  };

  override render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Compact fallback for side panels and smaller containers
      if (this.props.compact) {
        return (
          <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-background p-4 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">Something went wrong</p>
              <p className="text-muted-foreground text-xs">
                {this.state.error?.message || "An unexpected error occurred"}
              </p>
            </div>
            <button
              className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
              onClick={this.handleRetry}
            >
              <RefreshCw className="h-3 w-3" />
              Retry
            </button>
          </div>
        );
      }

      // Default fallback UI
      return (
        <div className="flex h-full w-full flex-col items-center justify-center gap-4 bg-background p-8 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="h-8 w-8 text-destructive" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-semibold">Something went wrong</h2>
            <p className="text-muted-foreground max-w-md">
              {this.state.error?.message ||
                "An unexpected error occurred while rendering the board."}
            </p>
          </div>
          <button
            className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            onClick={this.handleRetry}
          >
            <RefreshCw className="h-4 w-4" />
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// ============================================================================
// Specialized Error Boundary Wrappers
// ============================================================================

/**
 * Error boundary for the BoardFlow canvas component.
 * Catches render errors in the React Flow canvas without crashing the entire board.
 */
export function BoardFlowErrorBoundary({ children }: { children: ReactNode }) {
  return <ErrorBoundary componentName="BoardFlow">{children}</ErrorBoundary>;
}

/**
 * Error boundary for the EntityDetailPanel component.
 * Uses compact mode suitable for the side sheet.
 */
export function EntityDetailPanelErrorBoundary({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <ErrorBoundary compact componentName="EntityDetailPanel">
      {children}
    </ErrorBoundary>
  );
}

/**
 * Error boundary for the BoardFilterPanel component.
 * Uses compact mode for the filter dropdown.
 */
export function BoardFilterPanelErrorBoundary({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <ErrorBoundary compact componentName="BoardFilterPanel">
      {children}
    </ErrorBoundary>
  );
}
