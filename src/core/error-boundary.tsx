/**
 * ModuleErrorBoundary — Generic React error boundary for module-level error isolation.
 *
 * Each module (profiles, habits) gets its own instance with a named `moduleName`
 * so that errors in one module don't crash the entire app. Error state is logged
 * via core/logger.ts and displayed as a recoverable UI message.
 *
 * Usage:
 *   <ModuleErrorBoundary moduleName="habits">
 *     <HabitsBoard />
 *   </ModuleErrorBoundary>
 */

'use client';

import React, { Component, type ErrorInfo, type PropsWithChildren } from 'react';
import { getLogger } from './logger';

// Module-scoped logger for error-boundary errors (moduleName passed at runtime)
const _errorLogger = getLogger('error-boundary');

interface ModuleErrorBoundaryProps {
  moduleName: string;
}

interface ModuleErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ModuleErrorBoundary extends Component<
  PropsWithChildren<ModuleErrorBoundaryProps>,
  ModuleErrorBoundaryState
> {
  constructor(props: PropsWithChildren<ModuleErrorBoundaryProps>) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ModuleErrorBoundaryState {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    _errorLogger.error(`[${this.props.moduleName}] ModuleErrorBoundary caught`, {
      errorMessage: error.message,
      componentStack: info.componentStack,
    });
  }

  override render() {
    if (this.state.hasError && this.state.error) {
      return (
        <div className="glass-card p-6 text-center">
          <p className="mb-2 text-lg font-semibold text-accent-danger">
            Something went wrong in the {this.props.moduleName} module.
          </p>
          <p className="mb-4 text-sm text-gray-400">{this.state.error.message}</p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="rounded-lg border border-glass-border bg-glass px-4 py-2 text-sm text-white transition hover:bg-glass-hover"
            >
              Try Again
            </button>
            <button
              onClick={() => window.location.reload()}
              className="rounded-lg border border-accent-primary bg-accent-primary/20 px-4 py-2 text-sm text-accent-primary transition hover:bg-accent-primary/30"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ModuleErrorBoundary;