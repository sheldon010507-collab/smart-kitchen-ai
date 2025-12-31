import React from 'react';

interface ErrorBoundaryProps {
    children: React.ReactNode;
}

interface ErrorBoundaryState {
    hasError: boolean;
    error?: unknown;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
    declare props: ErrorBoundaryProps;
    state: ErrorBoundaryState = { hasError: false };

    static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
        return { hasError: true, error };
    }

    componentDidCatch(error: unknown, info: React.ErrorInfo) {
        console.error("[UI crashed]", error, info);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="p-6 rounded-xl border border-red-200 bg-red-50 text-red-800">
                    <div className="font-bold mb-2">This page crashed.</div>
                    <div className="text-sm opacity-90">
                        Open DevTools Console to see the error details. Fix the error and refresh.
                    </div>
                </div>
            );
        }
        return this.props.children;
    }
}

export default ErrorBoundary;
