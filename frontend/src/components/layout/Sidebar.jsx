import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Camera, Film, History, Settings, LogOut, Moon, Sun, FileText, ChevronDown, ChevronUp } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { Avatar } from '../ui/Avatar';

const SidebarItem = ({ icon: Icon, label, active, onClick }) => (
    <button
        onClick={onClick}
        className={`group relative flex min-w-[78px] flex-col items-center gap-2 rounded-[1.5rem] px-3 py-3 text-center transition-all duration-200 sm:min-w-[96px] sm:px-4
            ${active
                ? 'bg-primary/14 text-foreground shadow-[0_10px_30px_rgba(14,165,233,0.14)] dark:shadow-[0_10px_30px_rgba(14,165,233,0.18)]'
                : 'text-muted-foreground hover:bg-muted/80 hover:text-foreground dark:text-slate-300/70 dark:hover:bg-white/6 dark:hover:text-slate-100'
            }`}
    >
        <span className={`flex h-11 w-11 items-center justify-center rounded-2xl border transition-all ${active ? 'border-primary/30 bg-primary/14 text-primary' : 'border-border/80 bg-background/75 text-muted-foreground dark:border-white/10 dark:bg-black/10 dark:text-slate-300/80'}`}>
            <Icon className={`h-5 w-5 transition-transform group-hover:scale-110 ${active ? 'stroke-[2.5px]' : ''}`} />
        </span>
        <span className="text-[11px] font-bold uppercase tracking-[0.22em]">{label}</span>
    </button>
);

const UtilityButton = ({ icon: Icon, label, onClick, active = false, children }) => (
    <button
        type="button"
        onClick={onClick}
        className={`inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-sm transition-all ${active ? 'border-primary/30 bg-primary/10 text-primary' : 'border-border/70 bg-background/60 text-foreground/78 hover:border-border hover:bg-muted/75 hover:text-foreground dark:border-white/10 dark:bg-black/10 dark:text-slate-200 dark:hover:border-white/20 dark:hover:bg-white/10'}`}
    >
        <Icon className="h-4 w-4" />
        <span className="hidden sm:inline">{label}</span>
        {children}
    </button>
);

export const Sidebar = ({ activeTab, onTabChange, theme, toggleTheme }) => {
    const { user, logout } = useAuth();
    const [dockOpen, setDockOpen] = useState(() => {
        if (typeof window === 'undefined') {
            return true;
        }

        const stored = localStorage.getItem('watchx_bottom_dock_open');
        return stored !== 'false';
    });

    useEffect(() => {
        localStorage.setItem('watchx_bottom_dock_open', String(dockOpen));
    }, [dockOpen]);

    const menuItems = user?.role === 'client'
        ? [
            { id: 'cameras', label: 'Cameras', icon: Camera },
            { id: 'live', label: 'Live', icon: Film },
            { id: 'timeline', label: 'Playback', icon: History },
        ]
        : [
            { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
            { id: 'cameras', label: 'Cameras', icon: Camera },
            { id: 'live', label: 'Live', icon: Film },
            { id: 'timeline', label: 'Playback', icon: History },
            ...(user?.role !== 'viewer' ? [{ id: 'settings', label: 'Settings', icon: Settings }] : []),
        ];

    return (
        <>
            <header className="fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-6 lg:px-10 lg:pt-4">
                <div className="frost-panel glow-ring mx-auto flex w-full max-w-7xl items-center justify-between gap-3 rounded-[1.8rem] px-4 py-3 sm:px-5">
                    <button
                        type="button"
                        onClick={() => onTabChange(user?.role === 'client' ? 'cameras' : 'dashboard')}
                        className="flex items-center gap-3 text-left"
                    >
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-border/70 bg-background/75 dark:border-white/10 dark:bg-black/15">
                            <img src="/favicon.svg" alt="WatchX" className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-[11px] font-bold uppercase tracking-[0.32em] text-primary/80">WatchX</p>
                        </div>
                    </button>

                    <div className="flex items-center gap-2">
                        {user?.role === 'admin' && (
                            <UtilityButton icon={FileText} label="Logs" onClick={() => onTabChange('logs')} active={activeTab === 'logs'} />
                        )}
                        {user?.role !== 'client' && (
                            <button
                                type="button"
                                onClick={() => onTabChange('profile')}
                                className={`inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-sm transition-all ${activeTab === 'profile' ? 'border-primary/30 bg-primary/10 text-primary' : 'border-border/70 bg-background/60 text-foreground/78 hover:border-border hover:bg-muted/75 hover:text-foreground dark:border-white/10 dark:bg-black/10 dark:text-slate-200 dark:hover:border-white/20 dark:hover:bg-white/10'}`}
                            >
                                <Avatar user={user} size="sm" className="h-7 w-7 text-xs" />
                                <span className="hidden max-w-28 truncate sm:inline">{user?.username}</span>
                            </button>
                        )}
                        <UtilityButton
                            icon={theme === 'dark' ? Sun : Moon}
                            label={theme === 'dark' ? 'Light' : 'Dark'}
                            onClick={toggleTheme}
                        />
                        <UtilityButton icon={LogOut} label="Logout" onClick={logout} />
                    </div>
                </div>
            </header>

            <div className="pointer-events-none fixed inset-x-0 bottom-3 z-50 px-3 sm:px-6 lg:px-10 lg:bottom-4">
                <div className="mx-auto flex w-full max-w-fit flex-col items-center gap-2">
                    <button
                        type="button"
                        onClick={() => setDockOpen(prev => !prev)}
                        aria-expanded={dockOpen}
                        aria-controls="bottom-navigation-dock"
                        className="pointer-events-auto inline-flex items-center gap-2 rounded-full border border-border/80 bg-background/78 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.24em] text-foreground/78 backdrop-blur-sm transition-all hover:border-primary/30 hover:text-primary dark:border-white/10 dark:bg-slate-950/75 dark:text-slate-200"
                    >
                        {dockOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                        <span>{dockOpen ? 'Hide Dock' : 'Show Dock'}</span>
                    </button>

                    <div
                        id="bottom-navigation-dock"
                        className={`pointer-events-auto flex flex-col items-center gap-2 overflow-hidden transition-all duration-300 ease-out ${dockOpen ? 'max-h-64 translate-y-0 opacity-100' : 'pointer-events-none max-h-0 translate-y-4 opacity-0'}`}
                    >
                        <nav className="frost-panel glow-ring overflow-x-auto overflow-y-hidden rounded-[2rem] px-2 py-2.5 sm:overflow-visible sm:px-3">
                            <div className="flex items-end gap-1.5 sm:gap-2">
                                {menuItems.map((item) => (
                                    <SidebarItem
                                        key={item.id}
                                        icon={item.icon}
                                        label={item.label}
                                        active={activeTab === item.id}
                                        onClick={() => onTabChange(item.id)}
                                    />
                                ))}
                            </div>
                        </nav>
                    </div>
                </div>
            </div>
        </>
    );
};
