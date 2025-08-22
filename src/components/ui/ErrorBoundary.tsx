import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    // Ignorer les erreurs DOM spécifiques qui ne sont pas critiques
    if (
      error.message &&
      (error.message.includes("insertBefore") ||
        error.message.includes("removeChild") ||
        error.message.includes("Failed to execute") ||
        error.message.includes("NotFoundError"))
    ) {
      console.warn("⚠️ Erreur DOM ignorée par ErrorBoundary:", error.message);
      return { hasError: false, error: undefined };
    }

    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Ne pas logger les erreurs DOM comme des erreurs critiques
    if (
      error.message &&
      (error.message.includes("insertBefore") ||
        error.message.includes("removeChild") ||
        error.message.includes("Failed to execute") ||
        error.message.includes("NotFoundError"))
    ) {
      console.warn("⚠️ Erreur DOM non critique ignorée:", error.message);
      return;
    }

    console.error("ErrorBoundary caught a critical error:", error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-[200px] flex items-center justify-center p-8">
          <div className="text-center max-w-md">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Une erreur est survenue
            </h2>
            <p className="text-gray-600 mb-4">
              Nous nous excusons pour ce problème. Veuillez réessayer ou
              actualiser la page.
            </p>
            <button
              onClick={this.handleRetry}
              className="inline-flex items-center px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Réessayer
            </button>
            {process.env.NODE_ENV === "development" && this.state.error && (
              <details className="mt-4 text-left">
                <summary className="cursor-pointer text-sm text-gray-500">
                  Détails de l'erreur (développement)
                </summary>
                <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto">
                  {this.state.error.stack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
