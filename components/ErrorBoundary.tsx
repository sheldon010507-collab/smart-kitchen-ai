import React from 'react';
import { ErrorBoundary as ReactErrorBoundary, FallbackProps } from 'react-error-boundary';
import { AlertTriangle, RefreshCw } from 'lucide-react';

/**
 * Fallback component shown when an error occurs
 */
function ErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <AlertTriangle className="w-8 h-8 text-red-500" />
                </div>

                <h1 className="text-xl font-bold text-gray-900 mb-2">
                    Something went wrong
                </h1>

                <p className="text-gray-600 mb-6">
                    We're sorry, an unexpected error occurred. Please try again.
                </p>

                <div className="flex gap-3 justify-center">
                    <button
                        onClick={resetErrorBoundary}
                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200"
                    >
                        Try Again
                    </button>
                    <button
                        onClick={() => window.location.reload()}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 flex items-center gap-2"
                    >
                        <RefreshCw className="w-4 h-4" />
                        Reload
                    </button>
                </div>
            </div>
        </div>
    );
}

interface Props {
    children: React.ReactNode;
}

/**
 * Error Boundary wrapper using react-error-boundary
 */
export function ErrorBoundary({ children }: Props) {
    return (
        <ReactErrorBoundary
            FallbackComponent={ErrorFallback}
            onError={(error, info) => {
                console.error('ErrorBoundary caught an error:', error, info);
            }}
        >
            {children}
        </ReactErrorBoundary>
    );
}

export default ErrorBoundary;
