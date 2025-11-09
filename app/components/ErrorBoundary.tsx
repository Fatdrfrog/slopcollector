'use client';

import { Component, type ReactNode } from 'react';
import { AlertTriangle, RefreshCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

/**
 * Error boundary to catch and display errors gracefully
 * Prevents entire app from crashing on component errors
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error boundary caught:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-screen w-screen flex items-center justify-center bg-[#0f0f0f] p-4">
          <div className="max-w-md w-full bg-[#1a1a1a] border border-[#ff6b6b]/30 rounded-lg p-8 text-center">
            <div className="w-16 h-16 bg-[#ff6b6b]/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-[#ff6b6b]" />
            </div>
            <h1 className="text-xl font-bold text-white mb-2 font-mono">
              Something went wrong
            </h1>
            <p className="text-sm text-[#ccc] mb-6">
              An unexpected error occurred. The development team has been notified.
            </p>
            {this.state.error && (
              <div className="bg-[#0f0f0f] border border-[#3a3a3a] rounded-md p-3 mb-6 text-left">
                <code className="text-xs text-[#ff6b6b] font-mono break-all">
                  {this.state.error.message}
                </code>
              </div>
            )}
            <button
              onClick={this.handleReset}
              className="inline-flex items-center gap-2 bg-[#7ed321] hover:bg-[#6bc916] text-black font-bold py-2 px-4 rounded-md transition-colors"
            >
              <RefreshCcw className="w-4 h-4" />
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

