import React from 'react';
import { Filter, Video, Image as ImageIcon, Play, Calendar, CalendarDays, Brain } from 'lucide-react';

/**
 * Event Filters Component for Timeline
 * @param {Object} props
 * @param {Array} props.cameras - List of available cameras
 * @param {String} props.selectedCameraFilter - Current camera filter ID
 * @param {Function} props.setSelectedCameraFilter - Handler for camera filter change
 * @param {String} props.selectedTypeFilter - Current media type filter (all, video, snapshot)
 * @param {Function} props.setSelectedTypeFilter - Handler for type filter change
 * @param {String} props.selectedDate - Current date filter (YYYY-MM-DD)
 * @param {Function} props.setSelectedDate - Handler for date filter change
 * @param {Function} props.onReset - Handler for resetting all filters
 * @param {Number} props.selectedHour - Currently selected hour overlay
 * @param {Function} props.setSelectedHour - Handler for hour filter removal
 * @param {Object} props.searchParams - Current URL search params
 * @param {Function} props.setSearchParams - Handler for updating URL search params
 */
export const EventFilters = ({
    cameras,
    selectedCameraFilter,
    setSelectedCameraFilter,
    selectedTypeFilter,
    setSelectedTypeFilter,
    selectedObjectFilter,
    setSelectedObjectFilter,
    selectedDate,
    setSelectedDate,
    onReset,
    selectedHour,
    setSelectedHour,
    searchParams,
    setSearchParams
}) => {
    const isDefaultState =
        selectedDate === new Date().toLocaleDateString('en-CA') &&
        selectedCameraFilter === 'all' &&
        selectedTypeFilter === 'all' &&
        selectedObjectFilter === 'all';

    return (
        <div className="mb-4 flex flex-wrap items-center gap-3 p-1 md:mb-0 md:flex-col md:items-stretch md:gap-2 md:p-0">
            {/* Camera Filter */}
            <div className="relative md:w-full">
                <select
                    className="appearance-none bg-card border border-border rounded-xl text-sm min-w-[140px] py-2 pl-3 pr-8 text-foreground outline-none transition-all hover:border-primary/50 focus:ring-2 focus:ring-primary/20 md:w-full"
                    value={selectedCameraFilter}
                    onChange={(e) => {
                        setSelectedCameraFilter(e.target.value);
                        const newParams = new URLSearchParams(searchParams);
                        if (e.target.value === 'all') newParams.delete('camera');
                        else newParams.set('camera', e.target.value);
                        setSearchParams(newParams);
                    }}
                >
                    <option value="all">All Cameras</option>
                    {cameras.map(cam => (
                        <option key={cam.id} value={cam.id}>{cam.name}</option>
                    ))}
                </select>
                <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground">
                    <Filter className="w-3.5 h-3.5" />
                </div>
            </div>

            {/* Media Type Filter */}
            <div className="relative md:w-full">
                <select
                    className="appearance-none bg-card border border-border rounded-xl text-sm min-w-[120px] py-2 pl-3 pr-8 text-foreground outline-none transition-all hover:border-primary/50 focus:ring-2 focus:ring-primary/20 md:w-full"
                    value={selectedTypeFilter}
                    onChange={(e) => {
                        setSelectedTypeFilter(e.target.value);
                        const newParams = new URLSearchParams(searchParams);
                        if (e.target.value === 'all') newParams.delete('type');
                        else newParams.set('type', e.target.value);
                        setSearchParams(newParams);
                    }}
                >
                    <option value="all">All Media</option>
                    <option value="video">Videos</option>
                    <option value="snapshot">Snapshots</option>
                </select>
                <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground">
                    {selectedTypeFilter === 'video' ? <Video className="w-3.5 h-3.5" /> : selectedTypeFilter === 'snapshot' ? <ImageIcon className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                </div>
            </div>

            {/* Object Type Filter */}
            <div className="relative md:w-full">
                <select
                    className="appearance-none bg-card border border-border rounded-xl text-sm min-w-[130px] py-2 pl-3 pr-8 text-foreground outline-none transition-all hover:border-primary/50 focus:ring-2 focus:ring-primary/20 md:w-full"
                    value={selectedObjectFilter}
                    onChange={(e) => {
                        setSelectedObjectFilter(e.target.value);
                    }}
                >
                    <option value="all">All Objects</option>
                    <option value="person">Person</option>
                    <option value="vehicle">Vehicle</option>
                    <option value="dog">Dog</option>
                    <option value="cat">Cat</option>
                </select>
                <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground">
                    <Brain className="w-3.5 h-3.5" />
                </div>
            </div>

            {/* Date Picker */}
            <div className="relative flex items-center md:w-full">
                <input
                    type="date"
                    className="timeline-date-input bg-card border border-border rounded-xl py-2 pl-9 pr-10 text-sm text-foreground outline-none transition-all hover:border-primary/50 focus:ring-2 focus:ring-primary/20 md:w-full"
                    value={selectedDate}
                    onChange={(e) => {
                        setSelectedDate(e.target.value);
                        const newParams = new URLSearchParams(searchParams);
                        newParams.set('date', e.target.value);
                        setSearchParams(newParams);
                    }}
                />
                <Calendar className="absolute left-3 w-4 h-4 text-primary" />
                <CalendarDays className="absolute right-3 w-4 h-4 pointer-events-none text-foreground/70 dark:text-slate-300" />
            </div>

            {/* Reset Button */}
            <button
                onClick={onReset}
                className={`flex items-center justify-center space-x-1.5 rounded-xl border px-3 py-2 text-sm transition-all md:w-full
                ${isDefaultState
                        ? 'bg-card border-border text-primary font-semibold hover:border-primary/40 hover:bg-card dark:bg-card dark:border-border dark:text-primary'
                        : 'bg-card border-border text-muted-foreground hover:bg-accent hover:border-primary/25'
                    }`}
            >
                <span>Reset</span>
            </button>

            {/* Selected Hour Active Filter */}
            {selectedHour !== null && (
                <button
                    onClick={() => setSelectedHour(null)}
                    className="flex items-center gap-1.5 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-500 transition-colors hover:bg-red-500/20 md:w-full md:justify-center"
                >
                    <span className="font-bold">{selectedHour}:00</span>
                    <span className="opacity-70">✕</span>
                </button>
            )}
        </div>
    );
};
