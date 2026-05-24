import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CalendarRange } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { ConfirmModal } from '../components/ui/ConfirmModal';

import { EventFilters } from '../components/Timeline/EventFilters';
import { BulkActionBar } from '../components/Timeline/BulkActionBar';
import { EventPreview } from '../components/Timeline/EventPreview';

const API_BASE = `/api`;

export const Timeline = () => {
    const { token, user } = useAuth();
    const [events, setEvents] = useState([]);
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [cameraMap, setCameraMap] = useState({});
    const [searchParams, setSearchParams] = useSearchParams();
    const [cameras, setCameras] = useState([]);
    const [selectedCameraFilter, setSelectedCameraFilter] = useState('all');
    const [selectedHour, setSelectedHour] = useState(null);
    const [selectedTypeFilter, setSelectedTypeFilter] = useState('all');
    const [selectedObjectFilter, setSelectedObjectFilter] = useState('all');
    const [selectedDate, setSelectedDate] = useState(new Date().toLocaleDateString('en-CA'));
    const { showToast } = useToast();
    const [confirmConfig, setConfirmConfig] = useState({ isOpen: false });
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [lastSelectedId, setLastSelectedId] = useState(null);
    const [isBulkDeleting, setIsBulkDeleting] = useState(false);
    const cameraId = searchParams.get('camera');
    const type = searchParams.get('type');
    const urlDate = searchParams.get('date');
    const eventId = searchParams.get('event_id');

    const filteredEvents = useMemo(() => {
        let results = events;
        if (selectedCameraFilter !== 'all') results = results.filter(e => e.camera_id === parseInt(selectedCameraFilter));
        if (selectedHour !== null) results = results.filter(e => new Date(e.timestamp_start).getHours() === selectedHour);
        if (selectedTypeFilter !== 'all') results = results.filter(e => e.type === selectedTypeFilter);
        if (selectedObjectFilter !== 'all') {
            results = results.filter(e => e.ai_metadata && e.ai_metadata.toLowerCase().includes(selectedObjectFilter.toLowerCase()));
        }
        return results;
    }, [events, selectedHour, selectedCameraFilter, selectedTypeFilter, selectedObjectFilter]);

    useEffect(() => {
        if (urlDate) setSelectedDate(urlDate);
    }, [urlDate]);

    const fetchEvents = useCallback(() => {
        let url = `${API_BASE}/events`;
        const params = new URLSearchParams();
        params.append('limit', '1000');
        if (cameraId) params.append('camera_id', cameraId);
        if (type) params.append('type', type);
        if (selectedDate) params.append('date', selectedDate);

        if (Array.from(params).length > 0) url += `?${params.toString()}`;

        fetch(url, { headers: { Authorization: `Bearer ${token}` } })
            .then(res => res.json())
            .then(data => {
                setEvents(data);
                if (eventId) {
                    const targetEvent = data.find(e => e.id === parseInt(eventId));
                    if (targetEvent) {
                        setSelectedEvent(targetEvent);
                        setTimeout(() => {
                            const element = document.getElementById(`event-${targetEvent.id}`);
                            if (element) element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }, 500);
                    }
                }
            })
            .catch(err => console.error(err));
    }, [cameraId, type, selectedDate, token, eventId]);

    const fetchCameras = useCallback(() => {
        fetch(`${API_BASE}/cameras`, { headers: { Authorization: `Bearer ${token}` } })
            .then(res => res.json())
            .then(data => {
                setCameras(data);
                setCameraMap(data.reduce((acc, cam) => ({ ...acc, [cam.id]: cam }), {}));
            })
            .catch(err => console.error(err));
    }, [token]);

    useEffect(() => {
        if (token) {
            fetchEvents();
            fetchCameras();
            const timer = setInterval(fetchEvents, 30000);
            return () => clearInterval(timer);
        }
    }, [fetchEvents, fetchCameras, token]);

    const getCamera = (id) => cameraMap[id];
    const getCameraName = (id) => cameraMap[id]?.name || `Camera ${id}`;

    const getMediaUrl = (path) => {
        if (!path) return '';
        let relative = path;
        const prefixes = ['/var/lib/motion/', '/var/lib/watchx/recordings/'];
        prefixes.forEach(p => { if (relative.startsWith(p)) relative = relative.replace(p, ''); });
        return `${API_BASE}/media/${relative}`;
    };

    const handleDelete = async (id) => {
        setConfirmConfig({
            isOpen: true,
            title: 'Delete Event',
            message: 'Are you sure you want to delete this event? This action cannot be undone.',
            onConfirm: async () => {
                try {
                    const res = await fetch(`${API_BASE}/events/${id}`, {
                        method: 'DELETE',
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    if (res.ok) {
                        setEvents(prev => prev.filter(e => e.id !== id));
                        setSelectedIds(prev => {
                            const next = new Set(prev);
                            next.delete(id);
                            return next;
                        });
                        if (selectedEvent?.id === id) setSelectedEvent(null);
                        showToast('Event deleted successfully', 'success');
                    } else {
                        showToast('Failed to delete event', 'error');
                    }
                } catch (err) {
                    showToast('Error deleting event: ' + err.message, 'error');
                }
                setConfirmConfig({ isOpen: false });
            },
            onCancel: () => setConfirmConfig({ isOpen: false })
        });
    };

    const handleToggleSelect = useCallback((id, isShift) => {
        if (user?.role !== 'admin') return;
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (isShift && lastSelectedId !== null) {
                const allIds = filteredEvents.map(e => e.id);
                const start = allIds.indexOf(lastSelectedId);
                const end = allIds.indexOf(id);
                if (start !== -1 && end !== -1) {
                    const [rangeStart, rangeEnd] = start < end ? [start, end] : [end, start];
                    allIds.slice(rangeStart, rangeEnd + 1).forEach(rid => next.add(rid));
                }
            } else {
                if (next.has(id)) next.delete(id);
                else next.add(id);
            }
            return next;
        });
        setLastSelectedId(id);
    }, [filteredEvents, lastSelectedId]);

    const handleBulkDelete = async () => {
        const count = selectedIds.size;
        if (count === 0) return;
        setConfirmConfig({
            isOpen: true,
            title: `Delete ${count} Events`,
            message: `Are you sure you want to delete ${count} selected events?`,
            onConfirm: async () => {
                setIsBulkDeleting(true);
                try {
                    const res = await fetch(`${API_BASE}/events/bulk-delete`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                        body: JSON.stringify({ event_ids: Array.from(selectedIds) })
                    });
                    if (res.ok) {
                        const data = await res.json();
                        setEvents(prev => prev.filter(e => !selectedIds.has(e.id)));
                        if (selectedEvent && selectedIds.has(selectedEvent.id)) setSelectedEvent(null);
                        setSelectedIds(new Set());
                        showToast(`Successfully deleted ${data.deleted_count} events`, 'success');
                    } else {
                        showToast('Failed to perform bulk delete', 'error');
                    }
                } catch (err) {
                    showToast('Error during bulk delete: ' + err.message, 'error');
                } finally {
                    setIsBulkDeleting(false);
                    setConfirmConfig({ isOpen: false });
                }
            },
            onCancel: () => setConfirmConfig({ isOpen: false })
        });
    };

    const handleSelectAll = () => {
        if (user?.role !== 'admin') return;
        if (selectedIds.size === filteredEvents.length) setSelectedIds(new Set());
        else setSelectedIds(new Set(filteredEvents.map(e => e.id)));
    };

    const videoRef = useRef(null);
    const [autoplayNext, setAutoplayNext] = useState(() => JSON.parse(localStorage.getItem('watchx_autoplay_next') ?? 'true'));
    const [playbackSpeed, setPlaybackSpeed] = useState(() => Number(localStorage.getItem('watchx_playback_speed') ?? '1.0'));
    const [autoplayDirection, setAutoplayDirection] = useState(() => localStorage.getItem('watchx_autoplay_direction') ?? 'desc');

    useEffect(() => { localStorage.setItem('watchx_autoplay_next', JSON.stringify(autoplayNext)); }, [autoplayNext]);
    useEffect(() => { localStorage.setItem('watchx_autoplay_direction', autoplayDirection); }, [autoplayDirection]);
    useEffect(() => { localStorage.setItem('watchx_playback_speed', playbackSpeed); }, [playbackSpeed]);
    useEffect(() => { if (videoRef.current) videoRef.current.playbackRate = playbackSpeed; }, [playbackSpeed, selectedEvent]);

    const goToNextEvent = useCallback(() => {
        if (!selectedEvent) return;
        const allEvents = filteredEvents;
        const currentIndex = allEvents.findIndex(e => e.id === selectedEvent.id);
        if (currentIndex === -1) return;
        let nextIndex = -1;
        if (autoplayDirection === 'desc') { if (currentIndex < allEvents.length - 1) nextIndex = currentIndex + 1; }
        else { if (currentIndex > 0) nextIndex = currentIndex - 1; }
        if (nextIndex !== -1) setSelectedEvent(allEvents[nextIndex]);
    }, [autoplayDirection, selectedEvent, filteredEvents]);

    const handleVideoEnded = () => { if (autoplayNext) goToNextEvent(); };

    useEffect(() => {
        let timer;
        if (autoplayNext && selectedEvent && selectedEvent.type === 'snapshot') {
            timer = setTimeout(() => { goToNextEvent(); }, 5000);
        }
        return () => { if (timer) clearTimeout(timer); };
    }, [autoplayNext, selectedEvent, goToNextEvent]);

    useEffect(() => {
        if (filteredEvents.length === 0) {
            if (selectedEvent) {
                setSelectedEvent(null);
            }
            return;
        }

        if (!selectedEvent || !filteredEvents.some(event => event.id === selectedEvent.id)) {
            setSelectedEvent(filteredEvents[0]);
        }
    }, [filteredEvents, selectedEvent]);

    return (
        <div className="h-[calc(100dvh-8.9rem)] overflow-hidden">
            <div className="frost-panel flex h-full min-h-0 flex-col rounded-[2rem] border border-white/10 p-3 sm:p-4">
                <div className="mt-2 flex min-h-0 flex-1 flex-col gap-3">
                    <div className="flex min-h-0 flex-1 flex-col gap-3 md:grid md:grid-cols-[15rem_minmax(0,1fr)] md:items-stretch">
                        <div className="rounded-[1.7rem] border border-white/10 bg-slate-950/35 p-3 md:flex md:min-h-0 md:flex-col">
                            <EventFilters 
                                cameras={cameras} selectedCameraFilter={selectedCameraFilter} setSelectedCameraFilter={setSelectedCameraFilter}
                                selectedTypeFilter={selectedTypeFilter} setSelectedTypeFilter={setSelectedTypeFilter}
                                selectedObjectFilter={selectedObjectFilter} setSelectedObjectFilter={setSelectedObjectFilter}
                                selectedDate={selectedDate} setSelectedDate={setSelectedDate}
                                onReset={() => {
                                    const today = new Date().toLocaleDateString('en-CA');
                                    setSelectedDate(today); setSelectedHour(null); setSelectedCameraFilter('all'); setSelectedTypeFilter('all'); setSelectedObjectFilter('all'); setSearchParams({});
                                }}
                                selectedHour={selectedHour} setSelectedHour={setSelectedHour} searchParams={searchParams} setSearchParams={setSearchParams}
                            />
                        </div>

                        <div className="flex min-h-0 flex-1 flex-col rounded-[1.7rem] border border-white/10 bg-slate-950/35 p-3">
                            <EventPreview 
                                selectedEvent={selectedEvent} getCameraName={getCameraName} getCamera={getCamera} getMediaUrl={getMediaUrl} setSelectedEvent={setSelectedEvent}
                                autoplayNext={autoplayNext} setAutoplayNext={setAutoplayNext} autoplayDirection={autoplayDirection} setAutoplayDirection={setAutoplayDirection}
                                playbackSpeed={playbackSpeed} setPlaybackSpeed={setPlaybackSpeed} handleVideoEnded={handleVideoEnded} handleDelete={handleDelete} videoRef={videoRef} user={user}
                            />
                        </div>
                    </div>

                    <div className="rounded-[1.7rem] border border-white/10 bg-slate-950/35 p-3">
                        {filteredEvents.length === 0 ? (
                            <div className="flex min-h-[8rem] flex-col items-center justify-center rounded-[1.35rem] border border-dashed border-white/10 bg-slate-950/45 text-slate-400">
                                <CalendarRange className="mb-2 h-8 w-8 opacity-40" />
                                <p className="text-sm">No clips found for the current filters.</p>
                            </div>
                        ) : (
                            <div className="flex gap-3 overflow-x-auto pb-1">
                                {filteredEvents.map((event) => {
                                    const isFocused = selectedEvent?.id === event.id;
                                    const isMultiSelected = selectedIds.has(event.id);
                                    const eventTime = new Date(event.timestamp_start).toLocaleTimeString('en-GB', {
                                        hour: '2-digit',
                                        minute: '2-digit',
                                        second: '2-digit'
                                    });

                                    return (
                                        <button
                                            key={event.id}
                                            id={`event-${event.id}`}
                                            type="button"
                                            className={`min-w-[14rem] rounded-[1.35rem] border p-3 text-left transition-all ${isFocused ? 'border-primary/30 bg-primary/12 shadow-[0_16px_30px_rgba(14,165,233,0.14)]' : 'border-white/10 bg-slate-950/50 hover:border-white/20 hover:bg-slate-950/65'} ${isMultiSelected ? 'ring-2 ring-primary/20' : ''}`}
                                            onClick={(e) => {
                                                if (user?.role === 'admin' && (e.shiftKey || selectedIds.size > 0 && !isFocused)) {
                                                    handleToggleSelect(event.id, e.shiftKey);
                                                    return;
                                                }
                                                setSelectedEvent(event);
                                            }}
                                        >
                                            <div className={`h-1.5 rounded-full ${event.type === 'snapshot' ? 'bg-gradient-to-r from-amber-400 to-orange-500' : 'bg-gradient-to-r from-cyan-400 to-sky-500'}`} />
                                            <div className="mt-3 flex items-center justify-between gap-3 text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">
                                                <span>{event.type}</span>
                                                <span>{eventTime}</span>
                                            </div>
                                            <p className="mt-2 truncate text-lg font-semibold tracking-tight text-slate-50">{getCameraName(event.camera_id)}</p>
                                            <p className="mt-1 text-sm text-slate-400">{event.ai_metadata || 'Motion event detected'}</p>
                                            {isMultiSelected && (
                                                <p className="mt-3 text-[10px] font-bold uppercase tracking-[0.22em] text-primary">Queued for bulk action</p>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                <ConfirmModal {...confirmConfig} />
                <BulkActionBar selectedIds={selectedIds} filteredEvents={filteredEvents} handleSelectAll={handleSelectAll} setSelectedIds={setSelectedIds} handleBulkDelete={handleBulkDelete} isBulkDeleting={isBulkDeleting} user={user} />
            </div>
        </div>
    );
};
