import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  message?: string;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center text-center px-6">
          <div>
            <h2 className="text-lg font-semibold text-slate-800">Something went wrong</h2>
            <p className="text-sm text-slate-500 mt-2">{this.state.message}</p>
            <button
              onClick={() => window.location.assign("/")}
              className="mt-4 text-brand-600 text-sm hover:underline"
            >
              Return home
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
