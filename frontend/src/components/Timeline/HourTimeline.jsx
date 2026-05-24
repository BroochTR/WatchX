import React, { useMemo } from 'react';

export const HourTimeline = ({ events, onHourClick, selectedHour }) => {
    const hours = Array.from({ length: 24 }, (_, i) => i);

    const eventsByHour = useMemo(() => {
        const counts = {};
        events.forEach(event => {
            const hour = new Date(event.timestamp_start).getHours();
            counts[hour] = (counts[hour] || 0) + 1;
        });
        return counts;
    }, [events]);

    const maxEvents = Math.max(...Object.values(eventsByHour), 1);
    const currentHour = new Date().getHours();

    return (
        <div className="rounded-[1.6rem] border border-white/10 bg-slate-950/55 p-4 text-slate-100">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-primary/80">Playback Heatmap</p>
                    <h3 className="mt-1 text-lg font-semibold tracking-tight">24-hour scrub bar</h3>
                </div>
                <p className="text-xs text-slate-400">Tap an hour to isolate motion density.</p>
            </div>

            <div className="grid grid-cols-6 gap-2 sm:grid-cols-8 lg:grid-cols-12 2xl:grid-cols-24">
                {hours.map(hour => {
                    const count = eventsByHour[hour] || 0;
                    const intensity = count > 0 ? Math.max(count / maxEvents, 0.12) : 0;
                    const isSelected = selectedHour === hour;
                    const isCurrent = hour === currentHour;

                    return (
                        <button
                            key={hour}
                            type="button"
                            className={`group rounded-[1.2rem] border px-2 py-3 text-left transition-all ${isSelected ? 'border-primary/30 bg-primary/12 shadow-[0_12px_24px_rgba(14,165,233,0.12)]' : 'border-white/10 bg-black/10 hover:border-white/20 hover:bg-white/5'} ${isCurrent ? 'ring-1 ring-primary/20' : ''}`}
                            onClick={() => onHourClick(hour)}
                        >
                            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
                                <span>{hour.toString().padStart(2, '0')}:00</span>
                                <span>{count}</span>
                            </div>

                            <div className="mt-3 h-16 rounded-2xl border border-white/6 bg-slate-900/70 p-2">
                                <div
                                    className={`h-full rounded-xl transition-all ${isSelected ? 'bg-gradient-to-t from-cyan-400 via-sky-400 to-emerald-300' : 'bg-gradient-to-t from-rose-500/50 via-amber-400/55 to-cyan-300/65 group-hover:from-cyan-400/80 group-hover:via-sky-400/70 group-hover:to-emerald-300/70'}`}
                                    style={{ opacity: intensity || 0.08 }}
                                />
                            </div>

                            {isCurrent && <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-primary">Current</p>}
                        </button>
                    );
                })}
            </div>
        </div>
    );
};
