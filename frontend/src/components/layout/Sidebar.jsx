import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Camera, Film, History, Settings, LogOut, Moon, Sun, X, Info, FileText } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { Avatar } from '../ui/Avatar';
import packageJson from '../../../package.json';

const SidebarItem = ({ icon: Icon, label, active, onClick }) => (
    <button
        onClick={onClick}
        className={`w-full flex items-center justify-between px-4 py-3 rounded-md transition-all duration-200 group
      ${active
                ? 'bg-primary/15 text-primary border border-primary/40 shadow-[0_0_20px_-10px_hsl(var(--primary))]'
                : 'text-muted-foreground hover:bg-accent/15 hover:text-foreground border border-transparent'
            }`}
    >
        <div className="flex items-center space-x-3">
            <Icon className={`w-5 h-5 transition-transform group-hover:scale-110 ${active ? 'stroke-[2.5px]' : ''}`} />
            <span className="font-semibold text-sm uppercase tracking-wide">{label}</span>
        </div>
        <span className={`h-2 w-2 rounded-full ${active ? 'bg-primary' : 'bg-muted-foreground/30 group-hover:bg-accent'}`} />
    </button>
);

export const Sidebar = ({ activeTab, onTabChange, theme, toggleTheme, isOpen, onClose }) => {
    const { user, logout } = useAuth();
    const [latestVersion, setLatestVersion] = useState(null);

    const menuItems = user?.role === 'client'
        ? [
            { id: 'cameras', label: 'Cameras', icon: Camera },
            { id: 'live', label: 'Live View', icon: Film },
            { id: 'timeline', label: 'Timeline', icon: History },
        ]
        : [
            { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
            { id: 'cameras', label: 'Cameras', icon: Camera },
            { id: 'live', label: 'Live View', icon: Film },
            { id: 'timeline', label: 'Timeline', icon: History },
            ...(user?.role !== 'viewer' ? [{ id: 'settings', label: 'Settings', icon: Settings }] : []),
            ...(user?.role === 'admin' ? [{ id: 'logs', label: 'System Logs', icon: FileText }] : []),
            { id: 'about', label: 'About', icon: Info },
        ];

    return (
        <aside className={`
            w-72 h-[100dvh] max-h-[100dvh] overflow-hidden bg-card/80 border-r border-border/60 backdrop-blur-xl flex flex-col fixed left-0 top-0 z-50
            transition-transform duration-300 ease-in-out
            ${isOpen ? 'translate-x-0' : '-translate-x-full'}
            lg:translate-x-0
        `}>
            <div className="p-6 flex flex-col items-start gap-4">
                <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center">
                        <img
                            src={theme === 'dark' ? "/watchx_logo_dark.png" : "/watchx_logo_variant_2.png"}
                            alt="watchx"
                            className="h-8 w-auto"
                        />
                    </div>
                    <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Control Room</p>
                        <p className="text-lg font-bold">watchx</p>
                    </div>
                </div>
                <div className="w-full rounded-lg border border-border/60 bg-background/60 px-3 py-2 text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                    Navigation
                </div>
                <button
                    onClick={onClose}
                    className="lg:hidden absolute top-4 right-4 p-2 rounded-lg hover:bg-accent/20"
                >
                    <X className="w-5 h-5" />
                </button>
            </div>

            <nav className="flex-1 overflow-y-auto min-h-0 px-4 space-y-2 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
                {menuItems.map((item) => (
                    <SidebarItem
                        key={item.id}
                        icon={item.icon}
                        label={item.label}
                        active={activeTab === item.id}
                        onClick={() => onTabChange(item.id)}
                    />
                ))}
            </nav>


            <div className="p-4 border-t border-border/60 space-y-2">
                {user?.role !== 'client' && (
                    <button
                        onClick={() => onTabChange('profile')}
                        className={`w-full flex items-center space-x-3 px-4 py-3 rounded-md transition-all duration-200 group
                        ${activeTab === 'profile'
                                ? 'bg-primary/15 text-primary border border-primary/40'
                                : 'text-muted-foreground hover:bg-accent/15 hover:text-foreground border border-transparent'
                            }`}
                    >
                        <Avatar user={user} size="sm" className="w-6 h-6 text-xs" />
                        <span className="font-semibold text-sm uppercase tracking-wide truncate">{user?.username}</span>
                    </button>
                )}

                <SidebarItem icon={LogOut} label="Logout" onClick={logout} />

                <button
                    onClick={toggleTheme}
                    className="w-full flex items-center space-x-3 px-4 py-3 rounded-md text-muted-foreground hover:bg-accent/15 hover:text-foreground transition-all duration-200 group border border-transparent"
                >
                    {theme === 'dark' ? (
                        <Sun className="w-5 h-5 group-hover:text-yellow-500 transition-colors" />
                    ) : (
                        <Moon className="w-5 h-5 group-hover:text-blue-500 transition-colors" />
                    )}
                    <span className="font-medium text-sm">
                        {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
                    </span>
                </button>

                <div className="pt-3 pb-6 lg:pb-1 flex flex-col items-center justify-center space-y-1">
                    <a
                        href={`https://github.com/spupuz/watchx/releases/tag/v${packageJson.version}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-muted-foreground hover:text-foreground font-mono tracking-wider transition-colors"
                        title="View release on GitHub"
                    >
                        v{packageJson.version}
                    </a>
                    {latestVersion && (
                        <a
                            href="https://github.com/spupuz/watchx/releases/latest"
                            target="_blank"
                            rel="noopener noreferrer"
                            title={`New version ${latestVersion} is available`}
                            className="text-[10px] text-primary animate-pulse font-semibold hover:underline bg-primary/10 px-2 py-0.5 rounded-full"
                        >
                            New version available!
                        </a>
                    )}
                </div>
            </div>
        </aside>
    );
};
