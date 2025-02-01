import React, { Suspense } from 'react';

const LandingPage = React.lazy(() => import('./components/LandingPage'));

const LoadingFallback = () => (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center">
        <div className="animate-pulse space-y-4 text-center">
            <div className="w-32 h-32 bg-slate-700 rounded-lg mx-auto"></div>
            <div className="h-8 bg-slate-700 rounded w-64 mx-auto"></div>
            <div className="h-4 bg-slate-700 rounded w-48 mx-auto"></div>
        </div>
    </div>
);

function App() {
    return (
        <Suspense fallback={<LoadingFallback />}>
            <LandingPage />
        </Suspense>
    );
}

export default App;