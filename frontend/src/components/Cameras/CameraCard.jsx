import React, { useEffect, useState } from 'react';
import { Camera, MapPin, Download, Edit, Trash2, Activity, Clock } from 'lucide-react';
import { Toggle } from '../ui/FormControls';
import { Button } from '../ui/Button';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';

export const CameraCard = ({ camera, onDelete, onEdit, onToggleActive, isSelected, onSelect }) => {
    const { user, token } = useAuth();
    const { showToast } = useToast();
    const [previewKey, setPreviewKey] = useState(() => Date.now());
    const [previewFailed, setPreviewFailed] = useState(false);

    const isConnected = camera.status === 'CONNECTED';

    useEffect(() => {
        setPreviewFailed(false);
    }, [camera.id]);

    useEffect(() => {
        if (!camera.is_active) {
            return undefined;
        }

        const interval = setInterval(() => {
            setPreviewFailed(false);
            setPreviewKey(Date.now());
        }, 15000);

        return () => clearInterval(interval);
    }, [camera.id, camera.is_active]);
    
    return (
        <div
            className={`frost-panel border rounded-[1.8rem] flex flex-col hover:-translate-y-1 hover:shadow-[0_28px_60px_rgba(2,6,23,0.28)] transition-all duration-300 group relative overflow-hidden
                ${!camera.is_active ? 'opacity-75 grayscale-[0.35]' : ''}
                ${isSelected ? 'border-primary ring-2 ring-primary/20' : 'border-border/70 dark:border-white/10'}
            `}
        >
            <div className="relative aspect-[16/9] overflow-hidden border-b border-border/70 bg-slate-950/80 dark:border-white/10">
                {!previewFailed && camera.is_active ? (
                    <img
                        src={`/api/cameras/${camera.id}/frame?t=${previewKey}`}
                        alt={`${camera.name} preview`}
                        className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                        onError={() => setPreviewFailed(true)}
                    />
                ) : (
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(34,211,238,0.14),transparent_45%),linear-gradient(135deg,rgba(15,23,42,0.96),rgba(30,41,59,0.92))]">
                        <div className="absolute inset-0 bg-[linear-gradient(rgba(148,163,184,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.08)_1px,transparent_1px)] bg-[size:36px_36px] opacity-25" />
                        <div className="absolute inset-0 flex items-center justify-center">
                            <span className="flex h-20 w-20 items-center justify-center rounded-full border border-white/10 bg-black/20 text-cyan-300">
                                <Camera className="h-9 w-9" />
                            </span>
                        </div>
                    </div>
                )}

                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/25 to-transparent" />

                <div className="absolute left-4 right-4 top-4 z-10 flex items-start justify-between gap-3">
            {/* Selection Checkbox */}
                    {user?.role === 'admin' && (
                        <div
                            className={`flex h-6 w-6 items-center justify-center rounded-md border-2 transition-all cursor-pointer ${isSelected ? 'bg-primary border-primary' : 'bg-background/80 border-border group-hover:border-primary/50'}`}
                            onClick={(e) => {
                                e.stopPropagation();
                                onSelect?.(camera.id);
                            }}
                        >
                            {isSelected && (
                                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" />
                                </svg>
                            )}
                        </div>
                    )}

                    {user?.role === 'admin' && (
                        <div onClick={(e) => e.stopPropagation()} className="flex-shrink-0 rounded-full border border-white/10 bg-slate-950/70 px-2 py-1 backdrop-blur-sm">
                            <Toggle
                                checked={camera.is_active}
                                onChange={() => onToggleActive(camera)}
                                compact={true}
                            />
                        </div>
                    )}
                </div>

                <div className="absolute inset-x-4 bottom-4 z-10 rounded-[1.4rem] border border-white/10 bg-slate-950/70 p-4 text-slate-50 backdrop-blur-md">
                    <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                            <h3 className="truncate text-xl font-semibold tracking-tight" title={camera.name}>{camera.name}</h3>
                            <div className="mt-1 flex items-center text-xs text-slate-300/80">
                                <MapPin className="mr-1 h-3.5 w-3.5 flex-shrink-0" />
                                <span className="truncate" title={camera.location}>{camera.location || 'Unknown location'}</span>
                            </div>
                        </div>

                        <div className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider
                            ${camera.status === 'CONNECTED' ? 'bg-green-500/10 text-green-300 border-green-500/20' : 
                              camera.status === 'UNAUTHORIZED' ? 'bg-amber-500/10 text-amber-200 border-amber-500/20' : 
                              camera.status === 'UNREACHABLE' ? 'bg-rose-500/10 text-rose-200 border-rose-500/20' : 
                              'bg-slate-800/80 text-slate-300 border-white/10'}
                        `}>
                            <Activity className={`h-3 w-3 ${isConnected ? 'animate-pulse' : ''}`} />
                            <span>{camera.status || 'OFFLINE'}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="p-5 flex-1">

                <div className="mb-4">
                    <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="inline-flex h-[22px] items-center whitespace-nowrap rounded-full border border-border/70 bg-muted/75 px-2 py-0.5 text-[10px] font-mono text-muted-foreground dark:border-white/10 dark:bg-slate-950/45 dark:text-slate-300">
                                ID: {camera.id}
                            </span>
                        </div>
                    </div>

                    {camera.status !== 'CONNECTED' && camera.last_seen && (
                        <div className="mt-3 flex items-center text-[10px] italic text-muted-foreground">
                            <Clock className="mr-1 h-2.5 w-2.5" />
                            <span>Last seen: {new Date(camera.last_seen).toLocaleString()}</span>
                        </div>
                    )}
                </div>

                {user?.role === 'admin' && (
                    <div className="space-y-2 text-sm text-muted-foreground">
                        <p className="truncate rounded-2xl border border-border/70 bg-muted/65 px-3 py-2 text-foreground/80 dark:border-white/10 dark:bg-slate-950/35 dark:text-inherit">
                            <span className="font-medium text-foreground">RTSP:</span> {(() => {
                                try {
                                    if (camera.rtsp_url && camera.rtsp_url.includes('@')) {
                                        const parts = camera.rtsp_url.split('@');
                                        const protocol = parts[0].split('://')[0] + '://';
                                        return protocol + parts[1];
                                    }
                                    return camera.rtsp_url;
                                } catch (e) {
                                    return camera.rtsp_url;
                                }
                            })()}
                        </p>
                    </div>
                )}
            </div>

            <div className="flex justify-end border-t border-border/70 bg-muted/35 p-4 space-x-2 dark:border-white/10 dark:bg-slate-950/20">
                {user?.role === 'admin' && (
                    <>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={async () => {
                                try {
                                    const res = await fetch(`/api/cameras/${camera.id}/export`, {
                                        headers: { Authorization: `Bearer ${token}` }
                                    });
                                    if (res.ok) {
                                        const blob = await res.blob();
                                        const url = window.URL.createObjectURL(blob);
                                        const a = document.createElement('a');
                                        a.href = url;

                                        const disposition = res.headers.get('Content-Disposition');
                                        let filename = `watchx_camera_${camera.name.replace(' ', '_')}_${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}.json`;
                                        if (disposition && disposition.includes('filename=')) {
                                            filename = disposition.split('filename=')[1].replace(/"/g, '');
                                        }
                                        a.download = filename;

                                        document.body.appendChild(a);
                                        a.click();
                                        window.URL.revokeObjectURL(url);
                                        document.body.removeChild(a);
                                        showToast("Camera settings exported successfully", "success");
                                    } else {
                                        showToast("Failed to export settings", "error");
                                    }
                                } catch (e) {
                                    showToast("Export error: " + e.message, "error");
                                }
                            }}
                            className="p-2 text-green-600 hover:bg-green-100 dark:hover:bg-green-900/40"
                            title="Export Camera Settings"
                        >
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onEdit(camera)}
                            className="p-2 text-blue-500 hover:bg-blue-100 dark:hover:bg-blue-900/40"
                            title="Edit Camera"
                        >
                            <Edit className="w-5 h-5" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onDelete(camera.id)}
                            className="p-2 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/40"
                            title="Delete Camera"
                        >
                            <Trash2 className="w-5 h-5" />
                        </Button>
                    </>
                )}
            </div>
        </div>
    );
};
