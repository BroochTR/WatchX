import React, { useEffect, useRef, useState } from 'react';
import {
    Activity,
    Camera,
    Cpu,
    Database,
    HardDrive,
    Network,
    ShieldCheck,
    TerminalSquare,
    Zap
} from 'lucide-react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis } from 'recharts';
import { useAuth } from '../contexts/AuthContext';

const EMPTY_STATS = {
    active_cameras: 0,
    events_24h: 0,
    total_errors: 0,
    uptime: '0m',
    system_status: 'Unknown',
    storage: {
        used_gb: 0,
        free_gb: 0,
        total_gb: 0,
        percent: 0,
        quota_percent: 0,
        estimated_retention_days: null
    },
    network: {
        recv_mbps: 0,
        sent_mbps: 0,
        peak_last_24h_mbps: 0
    },
    database: {
        size_mb: 0,
        event_count: 0
    },
    engine: {
        gpu: null,
        ai: {
            hardware: 'unknown'
        }
    }
};

const MetricCard = ({ icon: Icon, label, value, detail, accent, className = '', valueClassName = '' }) => (
    <div className={`rounded-[1.45rem] border border-border/70 bg-background/55 p-4 text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.58)] dark:border-white/10 dark:bg-slate-950/45 dark:text-slate-100 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] ${className}`}>
        <div className="flex items-center justify-between gap-3">
            <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.26em] text-muted-foreground dark:text-slate-400">{label}</p>
                <p className={`mt-2 text-2xl font-bold tracking-tight ${valueClassName}`}>{value}</p>
                {detail && <p className="mt-1 text-sm leading-snug text-muted-foreground dark:text-slate-400">{detail}</p>}
            </div>
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-border/70 bg-background/70 dark:border-white/10 dark:bg-black/20" style={{ color: accent }}>
                <Icon className="h-4.5 w-4.5" />
            </span>
        </div>
    </div>
);

const formatLogLine = (line, index) => {
    const lower = line.toLowerCase();
    let colorClass = 'text-slate-300';

    if (lower.includes('error') || lower.includes('exception') || lower.includes('critical') || lower.includes('fail')) {
        colorClass = 'text-rose-300';
    } else if (lower.includes('warn')) {
        colorClass = 'text-amber-300';
    } else if (lower.includes('info')) {
        colorClass = 'text-sky-300';
    } else if (lower.includes('debug')) {
        colorClass = 'text-slate-400';
    }

    return (
        <div key={`${index}-${line.slice(0, 16)}`} className={`border-b border-slate-800/80 pb-1 ${colorClass}`}>
            <span className="mr-3 inline-block w-8 select-none text-right text-slate-500">{index + 1}</span>
            <span className="whitespace-pre-wrap break-all">{line}</span>
        </div>
    );
};

export const CommandCenter = () => {
    const { token, user } = useAuth();
    const [stats, setStats] = useState(EMPTY_STATS);
    const [resourceHistory, setResourceHistory] = useState([]);
    const [logs, setLogs] = useState([]);
    const logsContainerRef = useRef(null);

    useEffect(() => {
        if (!logsContainerRef.current) {
            return;
        }

        logsContainerRef.current.scrollTop = logsContainerRef.current.scrollHeight;
    }, [logs]);

    useEffect(() => {
        if (!token) {
            return;
        }

        let cancelled = false;

        const fetchCommandCenter = async () => {
            try {
                const requests = [
                    fetch('/api/stats', { headers: { Authorization: `Bearer ${token}` } }),
                    fetch('/api/stats/resources-history', { headers: { Authorization: `Bearer ${token}` } })
                ];

                if (user?.role === 'admin') {
                    requests.push(fetch('/api/logs/?service=all&lines=80', { headers: { Authorization: `Bearer ${token}` } }));
                }

                const [statsRes, resourcesRes, logsRes] = await Promise.all(requests);

                if (!cancelled && statsRes.ok) {
                    setStats(await statsRes.json());
                }

                if (!cancelled && resourcesRes.ok) {
                    const data = await resourcesRes.json();
                    setResourceHistory(Array.isArray(data)
                        ? data.map((item) => ({
                            time: new Date(item.timestamp).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
                            cpu: Math.round(item.cpu_percent || 0),
                            memory: Math.round(((item.memory_mb || 0) / 1024) * 10) / 10,
                            traffic: Math.round(((item.network_recv_mbps || 0) + (item.network_sent_mbps || 0)) * 10) / 10
                        }))
                        : []);
                }

                if (!cancelled && logsRes && logsRes.ok) {
                    const data = await logsRes.json();
                    setLogs(Array.isArray(data) ? data : []);
                }
            } catch (error) {
                if (!cancelled) {
                    setResourceHistory([]);
                }
            }
        };

        fetchCommandCenter();
        const interval = setInterval(fetchCommandCenter, 5000);

        return () => {
            cancelled = true;
            clearInterval(interval);
        };
    }, [token, user?.role]);

    const latestResources = resourceHistory[resourceHistory.length - 1] || { cpu: 0, memory: 0, traffic: 0 };
    const networkCurrent = (stats.network?.recv_mbps || 0) + (stats.network?.sent_mbps || 0);
    const gpuLoad = stats.engine?.gpu?.load_percent ?? 0;
    const gpuName = stats.engine?.gpu?.name || (stats.engine?.ai?.hardware === 'nvidia' ? 'NVIDIA GPU' : 'GPU unavailable');
    const gpuMemoryPercent = stats.engine?.gpu?.memory_percent;
    const networkPeak24h = stats.network?.peak_last_24h_mbps ?? 0;

    const storagePercent = stats.storage?.quota_percent || stats.storage?.percent || 0;
    const summaryCards = [
        {
            key: 'active',
            icon: Camera,
            label: 'Active Cameras',
            value: stats.active_cameras || 0,
            detail: `${stats.events_24h || 0} events / 24h`,
            accent: '#22d3ee'
        },
        {
            key: 'state',
            icon: ShieldCheck,
            label: 'System State',
            value: stats.total_errors || 0,
            detail: `Active issue${stats.total_errors === 1 ? '' : 's'} · Uptime ${stats.uptime || '0m'}`,
            accent: '#34d399',
            valueClassName: 'text-xl md:text-2xl'
        },
        {
            key: 'cpu',
            icon: Cpu,
            label: 'CPU Load',
            value: latestResources.cpu,
            valueSuffix: '%',
            color: '#22d3ee',
            detail: ''
        },
        {
            key: 'gpu-load',
            icon: Zap,
            label: 'GPU Load',
            value: Number(gpuLoad.toFixed(1)),
            valueSuffix: '%',
            color: '#a855f7',
            detail: gpuMemoryPercent !== undefined && gpuMemoryPercent !== null
                ? `${gpuName} · VRAM ${gpuMemoryPercent}%`
                : gpuName
        },
        {
            key: 'network',
            icon: Network,
            label: 'Network I/O',
            value: Number(networkCurrent.toFixed(1)),
            valueSuffix: ' MB/s',
            color: '#f59e0b',
            detail: `Peak 24h ${networkPeak24h.toFixed(1)} MB/s`
        },
        {
            key: 'database',
            icon: Database,
            label: 'Database',
            value: `${stats.database?.size_mb || 0} MB`,
            color: '#f59e0b',
            detail: `${stats.database?.event_count || 0} indexed events`
        }
    ];

    return (
        <div className="grid gap-4 lg:h-[calc(100dvh-8.9rem)] lg:grid-rows-[auto_minmax(0,1fr)] lg:overflow-hidden">
            <section className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-6">
                {summaryCards.map((item) => (
                    <MetricCard
                        key={item.key}
                        icon={item.icon}
                        label={item.label}
                        value={item.valueSuffix ? `${item.value}${item.valueSuffix}` : item.value}
                        detail={item.detail}
                        accent={item.color}
                        valueClassName={item.valueClassName}
                    />
                ))}
            </section>

            <section className="grid min-h-0 gap-4 xl:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
                <div className="frost-panel flex min-h-0 flex-col rounded-[1.8rem] border border-border/70 p-4 lg:p-5 dark:border-white/10">
                    <div className="mb-4 grid gap-3 sm:grid-cols-2">
                        <MetricCard
                            icon={Activity}
                            label="Events"
                            value={stats.events_24h || 0}
                            detail="Last 24 hours"
                            accent="#22d3ee"
                            className="p-3.5"
                            valueClassName="text-xl"
                        />
                        <MetricCard
                            icon={HardDrive}
                            label="Storage"
                            value={`${storagePercent.toFixed(1)}%`}
                            detail={`${stats.storage?.used_gb || 0} GB of ${stats.storage?.total_gb || 0} GB`}
                            accent="#2dd4bf"
                            className="p-3.5"
                            valueClassName="text-xl"
                        />
                    </div>

                    <div className="mb-3 flex items-center justify-between gap-3">
                        <div>
                            <p className="text-lg font-semibold tracking-tight text-foreground dark:text-slate-50">CPU, traffic and memory</p>
                            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground dark:text-slate-400">
                                <span className="inline-flex items-center gap-2">
                                    <span className="h-2 w-2 rounded-full bg-cyan-400" />
                                    CPU %
                                </span>
                                <span className="inline-flex items-center gap-2">
                                    <span className="h-2 w-2 rounded-full bg-amber-400" />
                                    Traffic MB/s
                                </span>
                                <span className="inline-flex items-center gap-2">
                                    <span className="h-2 w-2 rounded-full bg-teal-400" />
                                    Memory GB
                                </span>
                            </div>
                        </div>
                        <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-border/70 bg-background/70 text-cyan-500 dark:border-white/10 dark:bg-black/20 dark:text-cyan-300">
                            <Activity className="h-4.5 w-4.5" />
                        </span>
                    </div>

                    <div className="grid min-h-0 flex-1 gap-3 lg:grid-rows-[minmax(0,1fr)_auto]">
                        <div className="min-h-0 rounded-[1.5rem] border border-border/70 bg-background/55 p-3 dark:border-white/10 dark:bg-slate-950/45">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={resourceHistory} margin={{ top: 10, right: 8, left: -18, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="cpuWave" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.4} />
                                            <stop offset="95%" stopColor="#22d3ee" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="networkWave" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.34} />
                                            <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="memoryWave" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#2dd4bf" stopOpacity={0.26} />
                                            <stop offset="95%" stopColor="#2dd4bf" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid stroke="rgba(148,163,184,0.12)" vertical={false} />
                                    <XAxis dataKey="time" stroke="rgba(148,163,184,0.45)" tickLine={false} axisLine={false} minTickGap={18} />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: 'hsl(var(--popover))',
                                            border: '1px solid hsl(var(--border))',
                                            borderRadius: '1rem',
                                            color: 'hsl(var(--popover-foreground))'
                                        }}
                                    />
                                    <Area type="monotone" dataKey="cpu" stroke="#22d3ee" strokeWidth={2} fill="url(#cpuWave)" />
                                    <Area type="monotone" dataKey="traffic" stroke="#f59e0b" strokeWidth={2} fill="url(#networkWave)" />
                                    <Area type="monotone" dataKey="memory" stroke="#2dd4bf" strokeWidth={2} fill="url(#memoryWave)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>

                    </div>
                </div>

                <div className="frost-panel flex min-h-0 flex-col rounded-[1.8rem] border border-border/70 p-4 lg:p-5 dark:border-white/10">
                    <div className="mb-3 flex items-center justify-between gap-3">
                        <div>
                            <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-primary/80">Live Terminal</p>
                        </div>
                        <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-border/70 bg-background/70 text-amber-500 dark:border-white/10 dark:bg-black/20 dark:text-amber-300">
                            <TerminalSquare className="h-4.5 w-4.5" />
                        </span>
                    </div>

                    {user?.role !== 'admin' ? (
                        <div className="flex min-h-0 flex-1 items-center justify-center rounded-[1.5rem] border border-dashed border-border/70 bg-background/55 px-6 text-center text-muted-foreground dark:border-white/10 dark:bg-slate-950/45 dark:text-slate-400">
                            Live logs remain admin-only. The raw terminal stream still follows RBAC.
                        </div>
                    ) : (
                        <div ref={logsContainerRef} className="min-h-0 flex-1 overflow-y-auto rounded-[1.5rem] border border-white/10 bg-[#020617] p-4 font-mono text-xs text-slate-200 shadow-[inset_0_0_60px_rgba(14,165,233,0.08)]">
                            {logs.length === 0 ? (
                                <div className="flex h-full items-center justify-center text-slate-400">Waiting for log stream...</div>
                            ) : (
                                <div className="space-y-1">{logs.map((line, index) => formatLogLine(line, index))}</div>
                            )}
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
};