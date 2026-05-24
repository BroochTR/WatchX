import React, { useState, useEffect, useRef } from 'react';
import { Routes, Route, useLocation, useNavigate, Navigate } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { CommandCenter } from './pages/CommandCenter';
import { Cameras } from './pages/Cameras';
import { LiveView } from './pages/LiveView';
import { Timeline } from './pages/Timeline';
import { Settings } from './pages/Settings';
import { Login } from './pages/Login';
import { Setup } from './pages/Setup';
import { Logs } from './pages/Logs';
import { Profile } from './pages/Profile';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Loader2, X } from 'lucide-react';
import { SystemInitializing } from './components/SystemInitializing';

const ProtectedRoute = ({ children }) => {
    const { isAuthenticated, loading } = useAuth();
    if (loading) return <div className="flex items-center justify-center h-screen bg-background"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
    return isAuthenticated ? children : <Navigate to="/login" />;
};

const FloatingRoutePanel = ({ title, subtitle, eyebrow = 'Overlay Panel', onClose, children }) => (
    <div className="fixed inset-x-3 top-20 bottom-24 z-[80] sm:inset-x-6 lg:inset-x-10 lg:top-24 lg:bottom-10">
        <div className="frost-panel glow-ring h-full overflow-hidden rounded-[2rem] border border-white/10">
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4 sm:px-6">
                <div>
                    {eyebrow && <p className="text-[11px] font-bold uppercase tracking-[0.32em] text-primary/80">{eyebrow}</p>}
                    <h2 className={`${eyebrow ? 'mt-1' : ''} text-2xl font-bold tracking-tight text-foreground`}>{title}</h2>
                    {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
                </div>
                <button
                    type="button"
                    onClick={onClose}
                    className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-background/50 text-muted-foreground transition hover:border-primary/30 hover:text-foreground"
                    aria-label={`Close ${title}`}
                >
                    <X className="h-5 w-5" />
                </button>
            </div>
            <div className="h-[calc(100%-6rem)] overflow-y-auto px-2 pb-2 sm:px-3 sm:pb-3">
                {children}
            </div>
        </div>
    </div>
);

function AppContent() {
    const location = useLocation();
    const navigate = useNavigate();
    const { isAuthenticated, loading, token, isBackendReady, user } = useAuth();
    const isClient = user?.role === 'client';

    // Theme logic
    const [theme, setTheme] = useState(() => {
        if (typeof window !== 'undefined') return localStorage.getItem('theme') || 'light';
        return 'light';
    });

    useEffect(() => {
        const root = window.document.documentElement;
        root.classList.remove('light', 'dark');
        root.classList.add(theme);
        localStorage.setItem('theme', theme);
    }, [theme]);

    const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');

    // Tab mapping
    const pathToTab = {
        '/': 'dashboard',
        '/dashboard': 'dashboard',
        '/live': 'live',
        '/cameras': 'cameras',
        '/timeline': 'timeline',
        '/recordings': 'timeline',
        '/settings': 'settings',
        '/logs': 'logs',
        '/profile': 'profile'
    };
    const overlayPaths = new Set(['/settings', '/logs']);
    const lastCanvasPathRef = useRef('/dashboard');
    const activeTab = pathToTab[location.pathname] || 'dashboard';

    const [defaultLandingPage, setDefaultLandingPage] = useState('live');

    useEffect(() => {
        if (isAuthenticated && token) {
            fetch('/api/settings/default_landing_page', {
                headers: { Authorization: `Bearer ${token}` }
            })
                .then(res => res.json())
                .then(data => {
                    if (data && data.value) {
                        setDefaultLandingPage(data.value);
                    }
                })
                .catch(err => console.error('Failed to fetch landing page setting', err));
        }
    }, [isAuthenticated, token]);

    // Redirect root to default landing page
    useEffect(() => {
        if (isAuthenticated && location.pathname === '/') {
            if (isClient) {
                navigate('/cameras', { replace: true });
                return;
            }
            const pageToPath = {
                'dashboard': '/dashboard',
                'live': '/live',
                'timeline': '/timeline'
            };
            const targetPath = pageToPath[defaultLandingPage] || '/live';
            if (location.pathname !== targetPath) {
                navigate(targetPath, { replace: true });
            }
        }
    }, [isAuthenticated, location.pathname, defaultLandingPage, navigate, isClient]);

    useEffect(() => {
        if (!isAuthenticated || overlayPaths.has(location.pathname)) {
            return;
        }
        lastCanvasPathRef.current = location.pathname;
    }, [isAuthenticated, location.pathname]);

    const fallbackCanvasPath = isClient ? '/cameras' : '/dashboard';
    const canvasPath = overlayPaths.has(location.pathname)
        ? location.state?.backgroundPath || lastCanvasPathRef.current || fallbackCanvasPath
        : location.pathname;
    const backgroundLocation = overlayPaths.has(location.pathname)
        ? { ...location, pathname: canvasPath }
        : location;

    const handleTabChange = (tab) => {
        const tabToPath = {
            'dashboard': '/dashboard',
            'live': '/live',
            'cameras': '/cameras',
            'timeline': '/timeline',
            'recordings': '/timeline',
            'settings': '/settings',
            'logs': '/logs',
            'profile': '/profile'
        };
        const target = tabToPath[tab] || '/dashboard';
        if (isClient && !['/cameras', '/live', '/timeline'].includes(target)) {
            navigate('/cameras');
            return;
        }
        if (overlayPaths.has(target)) {
            navigate(target, {
                state: {
                    backgroundPath: overlayPaths.has(location.pathname)
                        ? canvasPath
                        : location.pathname
                }
            });
            return;
        }
        navigate(target);
    };

    const clientBlocked = isClient && !['/cameras', '/live', '/timeline', '/recordings'].includes(location.pathname);
    const closeOverlay = () => navigate(canvasPath || fallbackCanvasPath, { replace: true });

    const overlayContent = overlayPaths.has(location.pathname) ? (
        <Routes>
            <Route
                path="/settings"
                element={
                    <FloatingRoutePanel
                        title="Settings"
                        eyebrow={null}
                        onClose={closeOverlay}
                    >
                        <Settings />
                    </FloatingRoutePanel>
                }
            />
            <Route
                path="/logs"
                element={
                    <FloatingRoutePanel
                        title="System Logs"
                        eyebrow={null}
                        onClose={closeOverlay}
                    >
                        <Logs />
                    </FloatingRoutePanel>
                }
            />
        </Routes>
    ) : null;

    if (loading) return <div className="flex items-center justify-center h-screen bg-background"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

    if (!isBackendReady) {
        return <SystemInitializing />;
    }

    return (
        <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/setup" element={<Setup />} />

            <Route path="/*" element={
                <ProtectedRoute>
                    <Layout
                        activeTab={activeTab}
                        onTabChange={handleTabChange}
                        theme={theme}
                        toggleTheme={toggleTheme}
                        overlay={overlayContent}
                        overlayRoute={overlayPaths.has(location.pathname)}
                    >
                        <Routes location={backgroundLocation}>
                            <Route path="/" element={clientBlocked ? <Navigate to="/cameras" /> : <CommandCenter />} />
                            <Route path="/dashboard" element={clientBlocked ? <Navigate to="/cameras" /> : <CommandCenter />} />
                            <Route path="/live" element={<LiveView />} />
                            <Route path="/cameras" element={<Cameras />} />
                            <Route path="/timeline" element={<Timeline />} />
                            <Route path="/recordings" element={<Timeline />} />
                            <Route path="/settings" element={clientBlocked ? <Navigate to="/cameras" /> : <Settings />} />
                            <Route path="/logs" element={clientBlocked ? <Navigate to="/cameras" /> : <Logs />} />
                            <Route path="/about" element={<Navigate to={clientBlocked ? "/cameras" : "/dashboard"} replace />} />
                            <Route path="/profile" element={clientBlocked ? <Navigate to="/cameras" /> : <Profile />} />
                        </Routes>
                    </Layout>
                </ProtectedRoute>
            } />
        </Routes>
    );
}

import { ToastProvider } from './contexts/ToastContext';

function App() {
    return (
        <AuthProvider>
            <ToastProvider>
                <AppContent />
            </ToastProvider>
        </AuthProvider>
    );
}

export default App;
