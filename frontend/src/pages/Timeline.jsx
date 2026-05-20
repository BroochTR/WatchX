import React, { useEffect, useMemo, useState } from 'react';
import { Calendar } from 'lucide-react';

import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';

import { HourTimeline } from '../components/Timeline/HourTimeline';
import { EventCard } from '../components/Timeline/EventCard';
import { EventPreview } from '../components/Timeline/EventPreview';

const API_BASE = '/api';

export const Timeline = () => {
    const { token } = useAuth();
    const { showToast } = useToast();

    const [events, setEvents] = useState([]);
    const [cameras, setCameras] = useState([]);
    const [cameraMap, setCameraMap] = useState({});

    const [selectedEvent, setSelectedEvent] = useState(null);

    const [selectedCamera, setSelectedCamera] = useState('all');
    const [selectedDate, setSelectedDate] = useState(
        new Date().toLocaleDateString('en-CA')
    );

    const [selectedHour, setSelectedHour] = useState(null);

    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!token) return;

        fetchCameras();
    }, [token]);

    useEffect(() => {
        if (!token) return;

        fetchEvents();
    }, [token, selectedDate]);

    const fetchCameras = async () => {
        try {
            const res = await fetch(`${API_BASE}/cameras`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            const data = await res.json();

            setCameras(data);

            const map = {};

            data.forEach(cam => {
                map[cam.id] = cam;
            });

            setCameraMap(map);
        } catch (err) {
            console.error(err);
        }
    };

    const fetchEvents = async () => {
        setLoading(true);

        try {
            const params = new URLSearchParams();

            params.append('limit', '500');

            if (selectedDate) {
                params.append('date', selectedDate);
            }

            const res = await fetch(
                `${API_BASE}/events?${params.toString()}`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );

            const data = await res.json();

            setEvents(data);

            if (data.length > 0 && !selectedEvent) {
                setSelectedEvent(data[0]);
            }
        } catch (err) {
            console.error(err);
            showToast('Failed to load events', 'error');
        } finally {
            setLoading(false);
        }
    };

    const filteredEvents = useMemo(() => {
        let result = [...events];

        if (selectedCamera !== 'all') {
            result = result.filter(
                e => e.camera_id === parseInt(selectedCamera)
            );
        }

        if (selectedHour !== null) {
            result = result.filter(event => {
                return (
                    new Date(event.timestamp_start).getHours() === selectedHour
                );
            });
        }

        return result;
    }, [events, selectedCamera, selectedHour]);

    const getCamera = id => {
        return cameraMap[id];
    };

    const getCameraName = id => {
        return cameraMap[id]?.name || `Camera ${id}`;
    };

    const getMediaUrl = path => {
        if (!path) return '';

        let relative = path;

        if (relative.startsWith('/var/lib/motion/')) {
            relative = relative.replace('/var/lib/motion/', '');
        }

        return `${API_BASE}/media/${relative}`;
    };

    const handleDelete = async id => {
        if (!window.confirm('Delete this event?')) {
            return;
        }

        try {
            const res = await fetch(`${API_BASE}/events/${id}`, {
                method: 'DELETE',
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            if (!res.ok) {
                throw new Error('Delete failed');
            }

            setEvents(prev => prev.filter(e => e.id !== id));

            if (selectedEvent?.id === id) {
                setSelectedEvent(null);
            }

            showToast('Event deleted', 'success');
        } catch (err) {
            console.error(err);
            showToast('Failed to delete event', 'error');
        }
    };

    return (
        <div className="h-full flex flex-col p-6">
            <div className="mb-6">
                <h1 className="text-3xl font-bold">
                    Timeline
                </h1>

                <p className="text-muted-foreground mt-2">
                    Browse recorded events and playback clips.
                </p>
            </div>

            <div className="flex gap-4 mb-4">
                <select
                    value={selectedCamera}
                    onChange={e => setSelectedCamera(e.target.value)}
                    className="border border-border rounded-lg px-3 py-2 bg-background"
                >
                    <option value="all">
                        All Cameras
                    </option>

                    {cameras.map(camera => (
                        <option
                            key={camera.id}
                            value={camera.id}
                        >
                            {camera.name}
                        </option>
                    ))}
                </select>

                <input
                    type="date"
                    value={selectedDate}
                    onChange={e => setSelectedDate(e.target.value)}
                    className="border border-border rounded-lg px-3 py-2 bg-background"
                />
            </div>

            <div className="flex flex-1 gap-6 min-h-0">
                <div className="w-[360px] border border-border rounded-xl overflow-hidden flex flex-col">
                    <div className="border-b border-border p-3">
                        <HourTimeline
                            events={events}
                            selectedHour={selectedHour}
                            onHourClick={hour => {
                                setSelectedHour(
                                    selectedHour === hour ? null : hour
                                );
                            }}
                        />
                    </div>

                    <div className="flex-1 overflow-y-auto p-3 space-y-2">
                        {loading ? (
                            <div className="text-sm text-muted-foreground">
                                Loading events...
                            </div>
                        ) : filteredEvents.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                                <Calendar className="w-10 h-10 opacity-30 mb-3" />

                                <p>No events found</p>
                            </div>
                        ) : (
                            filteredEvents.map(event => (
                                <EventCard
                                    key={event.id}
                                    event={event}
                                    camera={getCamera(event.camera_id)}
                                    isSelected={
                                        selectedEvent?.id === event.id
                                    }
                                    onClick={() => {
                                        setSelectedEvent(event);
                                    }}
                                    onDelete={handleDelete}
                                    getMediaUrl={getMediaUrl}
                                />
                            ))
                        )}
                    </div>
                </div>

                <div className="flex-1 border border-border rounded-xl p-4 min-h-0">
                    <EventPreview
                        selectedEvent={selectedEvent}
                        getCamera={getCamera}
                        getCameraName={getCameraName}
                        getMediaUrl={getMediaUrl}
                        setSelectedEvent={setSelectedEvent}
                    />
                </div>
            </div>
        </div>
    );
};
```
