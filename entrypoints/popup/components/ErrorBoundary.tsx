import React, { Component, ReactNode } from 'react';
import { Button } from '../../../components/ui/button';
import { logger } from '../../../lib/logger';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    logger.error('ErrorBoundary caught an error:', { error, errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || <ErrorFallback error={this.state.error} />;
    }

    return this.props.children;
  }
}

const ErrorFallback: React.FC<{ error?: Error }> = ({ error }) => (
  <div className="flex flex-col items-center justify-center gap-3 rounded-[var(--radius)] border border-border/60 bg-card/95 p-6 text-center shadow-sm">
    <div className="text-5xl">:(</div>
    <h2 className="text-[15px] font-semibold text-foreground">Something went wrong</h2>
    <p className="text-[12.5px] text-muted-foreground">
      DialogDrive encountered an unexpected error.
    </p>
    {error && (
      <details className="max-w-xs text-[11.5px] text-muted-foreground">
        <summary className="cursor-pointer font-medium text-foreground/80">Error details</summary>
        <pre className="mt-1 whitespace-pre-wrap rounded-md bg-muted/40 p-2 text-left text-[11px]">
          {error.message}
        </pre>
      </details>
    )}
    <Button
      onClick={() => window.location.reload()}
      className="h-8 rounded-full px-4 text-[12.5px] font-semibold hover:bg-primary/90"
    >
      Reload Extension
    </Button>
  </div>
);
