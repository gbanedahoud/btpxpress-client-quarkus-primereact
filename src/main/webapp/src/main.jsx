import React from 'react';
import ReactDOM from 'react-dom/client';
import { ErrorBoundary } from 'react-error-boundary';
import App from './App';
import './index.css';

function ErrorFallback({ error }) {
    return (
        <div role="alert" className="min-h-screen bg-red-50 flex items-center justify-center p-4">
            <div className="bg-white p-8 rounded-lg shadow-xl max-w-lg">
                <h2 className="text-2xl font-bold text-red-600 mb-4">Une erreur est survenue</h2>
                <p className="text-gray-600 mb-4">Nous nous excusons pour ce désagrément. Notre équipe technique a été notifiée.</p>
                <pre className="bg-red-50 p-4 rounded text-sm overflow-auto">
          {error.message}
        </pre>
                <button
                    onClick={() => window.location.reload()}
                    className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                >
                    Rafraîchir la page
                </button>
            </div>
        </div>
    );
}

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <ErrorBoundary FallbackComponent={ErrorFallback}
                       onError={(error, errorInfo) => {
                           console.error('Application Error:', error, errorInfo);
                           // Ici, vous pouvez ajouter votre logique de reporting d'erreur
                           // Par exemple, envoyer à un service comme Sentry
                       }}
        >
            <App />
        </ErrorBoundary>
    </React.StrictMode>,
);