import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Camera, Plus, Trash2, MapPin, Activity } from 'lucide-react';
import { Toggle } from '../components/ui/FormControls';
import { GroupsManager } from '../components/GroupsManager';

import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import { Button } from '../components/ui/Button';
import { CameraCard } from '../components/Cameras/CameraCard';
import { CameraAddEditModal } from '../components/Cameras/AddEditModal/CameraAddEditModal';
import { CopySettingsModal } from '../components/Cameras/CopySettingsModal';
import { parseRtspUrl } from '../utils/cameraUtils';
import { DEFAULT_CAMERA_STATE } from '../constants/cameraDefaults';
import { CATEGORY_FIELD_MAP, EXCLUDED_FIELDS } from '../utils/cameraSettingsMapping';
import { BulkActionsBar } from '../components/Cameras/BulkActionsBar';
import { ProcessingOverlay } from '../components/Cameras/ProcessingOverlay';


export const Cameras = () => {
    const { user, token } = useAuth();
    const [cameras, setCameras] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [newCamera, setNewCamera] = useState({...DEFAULT_CAMERA_STATE});

    const [stats, setStats] = useState(null);
    const [activeTab, setActiveTab] = useState('general');
    const [editingId, setEditingId] = useState(null);
    const [view, setView] = useState('cameras');
    const [isGroupView, setIsGroupView] = useState(() => {
        return localStorage.getItem('camerasGroupBy') === 'true';
    });
    const [globalSettings, setGlobalSettings] = useState(null);
    const [clientUsers, setClientUsers] = useState([]);

    const handleGroupViewToggle = (val) => {
        setIsGroupView(val);
        localStorage.setItem('camerasGroupBy', val);
    };

    useEffect(() => {
        if (user?.role !== 'client') {
            return;
        }

        if (isGroupView) {
            setIsGroupView(false);
            localStorage.setItem('camerasGroupBy', 'false');
        }

        if (view === 'groups') {
            setView('cameras');
        }
    }, [user?.role, isGroupView, view]);
    const { showToast } = useToast();
    const [isProcessing, setIsProcessing] = useState(false);
    const [processingMessage, setProcessingMessage] = useState({ title: 'Processing', text: 'Please wait...' });
    const [selectedCameraIds, setSelectedCameraIds] = useState([]);
    const [confirmConfig, setConfirmConfig] = useState({ isOpen: false });

    const [searchParams, setSearchParams] = useSearchParams();

    // Fetch Cameras & Periodic Polling
    useEffect(() => {
        if (!token) return;
        
        // Initial fetch
        fetchCameras();
        fetchStats();
        fetchGlobalSettings();
        fetchClientUsers();

        // Polling loop for live status (15s)
        const pollInterval = setInterval(() => {
            fetchCameras();
            fetchStats();
        }, 15000);

        return () => clearInterval(pollInterval);
    }, [token]);

    const fetchClientUsers = async () => {
        if (user?.role !== 'admin') return;
        try {
            const res = await fetch('/api/users', {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setClientUsers(data.filter(u => u.role === 'client'));
            }
        } catch (err) {
            console.error('Failed to fetch client users', err);
        }
    };

    const fetchStats = async () => {
        try {
            const res = await fetch('/api/stats', {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) setStats(await res.json());
        } catch (err) {
            console.error("Failed to fetch stats", err);
        }
    };

    const fetchGlobalSettings = async () => {
        try {
            const res = await fetch('/api/settings', {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setGlobalSettings({
                    max_global_storage_gb: data.max_global_storage_gb?.value !== undefined ? parseFloat(data.max_global_storage_gb.value) : 0,
                    cleanup_enabled: data.cleanup_enabled?.value === 'true',
                    ai_enabled: data.ai_enabled?.value === 'true' || data.ai_enabled?.value === true
                });
            }
        } catch (err) {
            console.error("Failed to fetch global settings", err);
        }
    };

    // Check for edit parameter in URL
    useEffect(() => {
        const editId = searchParams.get('edit');
        if (editId && cameras.length > 0) {
            const camera = cameras.find(c => c.id === parseInt(editId));
            if (camera) {
                const { user, pass, host } = parseRtspUrl(camera.rtsp_url);
                setNewCamera({
                    ...camera,
                    rtsp_username: user,
                    rtsp_password: pass,
                    rtsp_host: host
                });
                setEditingId(camera.id);
                setShowAddModal(true);
                // Clear the URL parameter after opening modal
                setSearchParams({});
            }
        }
    }, [cameras, searchParams]);

    // Handle ESC key to close modal
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && showAddModal) {
                setShowAddModal(false);
                setEditingId(null);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [showAddModal]);

    const fetchCameras = async () => {
        try {
            const res = await fetch('/api/cameras', {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setCameras(data);
            }
        } catch (err) {
            console.error("Failed to fetch cameras", err);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        setConfirmConfig({
            isOpen: true,
            title: 'Delete Camera',
            message: 'Are you sure you want to delete this camera? This will stop its recording process and remove its configuration.',
            onConfirm: async () => {
                try {
                    const res = await fetch(`/api/cameras/${id}`, {
                        method: 'DELETE',
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    if (res.ok) {
                        setCameras(prev => prev.filter(c => c.id !== id));
                        setSelectedCameraIds(prev => prev.filter(sid => sid !== id));
                        showToast('Camera deleted', 'success');
                    }
                } catch (err) {
                    showToast('Failed to delete camera', 'error');
                }
                setConfirmConfig({ isOpen: false });
            },
            onCancel: () => setConfirmConfig({ isOpen: false })
        });
    };

    const handleBulkDelete = async () => {
        if (selectedCameraIds.length === 0) return;

        setConfirmConfig({
            isOpen: true,
            title: 'Bulk Delete',
            message: `Are you sure you want to delete ${selectedCameraIds.length} camera(s)? This action is permanent and will stop all related processes and delete media files.`,
            onConfirm: async () => {
                setProcessingMessage({
                    title: 'Deleting Cameras',
                    text: `Removing ${selectedCameraIds.length} camera(s) and their associated data...`
                });
                setIsProcessing(true);
                setConfirmConfig({ isOpen: false });
                try {
                    const res = await fetch('/api/cameras/bulk-delete', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            Authorization: `Bearer ${token}`
                        },
                        body: JSON.stringify(selectedCameraIds)
                    });
                    if (res.ok) {
                        const data = await res.json();
                        setCameras(prev => prev.filter(c => !selectedCameraIds.includes(c.id)));
                        setSelectedCameraIds([]);
                        showToast(data.message, 'success');
                    } else {
                        showToast('Bulk delete failed', 'error');
                    }
                } catch (err) {
                    showToast('Failed to perform bulk delete: ' + err.message, 'error');
                } finally {
                    setIsProcessing(false);
                }
            },
            onCancel: () => setConfirmConfig({ isOpen: false })
        });
    };

    const handleSelectCamera = (id) => {
        setSelectedCameraIds(prev =>
            prev.includes(id) ? prev.filter(sid => sid !== id) : [...prev, id]
        );
    };

    const handleSelectAll = (ids) => {
        const allInIdsSelected = ids.every(id => selectedCameraIds.includes(id));
        if (allInIdsSelected) {
            setSelectedCameraIds(prev => prev.filter(id => !ids.includes(id)));
        } else {
            setSelectedCameraIds(prev => Array.from(new Set([...prev, ...ids])));
        }
    };

    const handleEdit = (camera) => {
        const { user, pass, host } = parseRtspUrl(camera.rtsp_url);
        setNewCamera({
            ...camera,
            rtsp_username: user,
            rtsp_password: pass,
            rtsp_host: host,
            client_user_ids: camera.client_user_ids || []
        });
        setEditingId(camera.id);
        setShowAddModal(true);
    };

    const handleCleanup = async (cameraId, type) => {
        setConfirmConfig({
            isOpen: true,
            title: 'Storage Cleanup',
            message: `Are you sure you want to clean up ${type} storage for this camera? This will enforce retention limits immediately.`,
            onConfirm: async () => {
                try {
                    const res = await fetch(`/api/cameras/${cameraId}/cleanup?type=${type}`, {
                        method: 'POST',
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    if (res.ok) {
                        const data = await res.json();
                        showToast(data.message, 'success');
                        fetchStats();
                    } else {
                        const err = await res.json();
                        showToast('Cleanup failed: ' + err.detail, 'error');
                    }
                } catch (err) {
                    showToast('Cleanup failed: ' + err.message, 'error');
                }
                setConfirmConfig({ isOpen: false });
            },
            onCancel: () => setConfirmConfig({ isOpen: false })
        });
    };

    const handleToggleActive = async (camera) => {
        try {
            const res = await fetch(`/api/cameras/${camera.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    // Must include required fields if schema enforces them, 
                    // but usually partial updates prefer explicit fields or full object.
                    // To be safe, spread camera.
                    ...camera,
                    is_active: !camera.is_active,
                    // Ensure excluded fields don't cause validation error if API is strict
                    // But backend usually ignores extra fields or we use same schema.
                    // Just spreading camera is usually safest if schema matches read model.
                })
            });
            if (res.ok) {
                fetchCameras();
                showToast(`Camera ${camera.name} ${!camera.is_active ? 'Enabled' : 'Disabled'}`, 'success');
            } else {
                showToast("Failed to toggle camera", "error");
            }
        } catch (err) {
            console.error(err);
            showToast("Error toggling camera", "error");
        }
    };

    const [showCopyModal, setShowCopyModal] = useState(false);
    const [copyTargets, setCopyTargets] = useState([]);

    const handleCreate = async (e, shouldClose = true) => {
        if (e) e.preventDefault();
        try {
            const url = editingId
                ? `/api/cameras/${editingId}`
                : '/api/cameras';

            const method = editingId ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(newCamera)
            });
            if (res.ok) {
                const savedCamera = await res.json();

                if (shouldClose) {
                    setShowAddModal(false);
                    setNewCamera({...DEFAULT_CAMERA_STATE, text_left: 'Camera Name', max_storage_gb: 0, notify_attach_image_email: true, notify_attach_image_telegram: true});

                    setEditingId(null);
                } else {
                    // Update state to reflect that we are now editing an existing camera
                    setEditingId(savedCamera.id);
                    const { user, pass, host } = parseRtspUrl(savedCamera.rtsp_url);
                    setNewCamera({
                        ...savedCamera,
                        rtsp_username: user,
                        rtsp_password: pass,
                        rtsp_host: host,
                        client_user_ids: savedCamera.client_user_ids || []
                    });
                    showToast("Settings saved successfully.", "success");
                }
                fetchCameras();
            }
        } catch (err) {
            console.error("Failed to save", err);
            showToast("Failed to save: " + err.message, "error");
        }
    };

    const handleCopySettings = async (selectedCategories) => {
        if (copyTargets.length === 0) return;

        setConfirmConfig({
            isOpen: true,
            title: 'Copy Settings',
            message: `Overwrite ${selectedCategories.length} categories of settings for ${copyTargets.length} cameras?`,
            onConfirm: async () => {
                // Determine which fields to copy based on selected categories
                const fieldsToCopy = [];
                selectedCategories.forEach(cat => {
                    if (CATEGORY_FIELD_MAP[cat]) {
                        fieldsToCopy.push(...CATEGORY_FIELD_MAP[cat]);
                    }
                });

                const settingsToCopy = Object.keys(newCamera).reduce((acc, key) => {
                    // Only copy if it's in the selected categories AND not explicitly excluded
                    if (fieldsToCopy.includes(key) && !EXCLUDED_FIELDS.includes(key)) {
                        acc[key] = newCamera[key];
                    }
                    return acc;
                }, {});

                if (Object.keys(settingsToCopy).length === 0) {
                    showToast('No settings selected to copy', 'warning');
                    setConfirmConfig({ isOpen: false });
                    return;
                }

                for (const targetId of copyTargets) {
                    const targetCam = cameras.find(c => c.id === targetId);
                    if (!targetCam) continue;

                    const updatedCam = { ...targetCam, ...settingsToCopy };
                    try {
                        const res = await fetch(`/api/cameras/${targetId}`, {
                            method: 'PUT',
                            headers: {
                                'Content-Type': 'application/json',
                                Authorization: `Bearer ${token}`
                            },
                            body: JSON.stringify(updatedCam)
                        });
                        if (!res.ok) throw new Error(`Camera ${targetId} failed`);
                    } catch (err) {
                        console.error(`Failed to update camera ${targetId}`, err);
                        showToast(`Failed to copy to camera ${targetCam.name}: ${err.message}`, 'error');
                    }
                }

                setShowCopyModal(false);
                setCopyTargets([]);
                fetchCameras();
                showToast("Settings copied successfully.", "success");
                setConfirmConfig({ isOpen: false });
            },
            onCancel: () => setConfirmConfig({ isOpen: false })
        });
    };

    const handleTestNotification = async (channel, config = {}) => {
        setProcessingMessage({ title: 'Sending Test', text: `Testing ${channel} notification...` });
        setIsProcessing(true);
        try {
            const res = await fetch('/api/settings/test-notify', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    channel,
                    settings: config
                })
            });
            const data = await res.json();
            if (res.ok) {
                showToast(data.message, 'success');
            } else {
                showToast(data.detail || 'Test failed', 'error');
            }
        } catch (err) {
            showToast('Test failed: ' + err.message, 'error');
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div>
            <div className="mb-4 flex flex-col sm:flex-row justify-end items-start sm:items-center gap-4">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 w-full sm:w-auto overflow-hidden">
                    {/* Group View Toggle - visible to all users */}
                    {view === 'cameras' && user?.role !== 'client' && (
                        <div className="flex items-center gap-4">
                            <Toggle
                                checked={isGroupView}
                                onChange={handleGroupViewToggle}
                                label="Group View"
                                help="Group cameras by assigned groups"
                            />
                            {user?.role === 'admin' && cameras.length > 0 && (
                                <button
                                    onClick={() => handleSelectAll(cameras.map(c => c.id))}
                                    className="flex items-center justify-center space-x-2 bg-muted hover:bg-secondary text-foreground px-3 h-8 rounded-lg transition-all whitespace-nowrap text-xs font-bold border border-border shadow-sm active:scale-95"
                                >
                                    <div className={`w-3.5 h-3.5 rounded-sm border flex items-center justify-center transition-colors ${cameras.every(c => selectedCameraIds.includes(c.id)) ? 'bg-primary border-primary' : 'bg-background border-border'}`}>
                                        {cameras.every(c => selectedCameraIds.includes(c.id)) && <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={5} d="M5 13l4 4L19 7" /></svg>}
                                    </div>
                                    <span>{cameras.every(c => selectedCameraIds.includes(c.id)) ? 'Deselect All' : 'Select All'}</span>
                                </button>
                            )}
                        </div>
                    )}
                    {user?.role === 'admin' && view === 'cameras' && (
                        <>
                            <Button
                                onClick={() => {
                                    setEditingId(null);
                                    setNewCamera({...DEFAULT_CAMERA_STATE, rtsp_username: '', rtsp_password: '', rtsp_host: '', max_storage_gb: 0, notify_attach_image_email: true, notify_attach_image_telegram: true});
                                    setShowAddModal(true);
                                }}
                            >
                                <Plus className="w-4 h-4 mr-2" />
                                <span>Add Camera</span>
                            </Button>
                        </>
                    )}
                </div>
            </div>

            {/* Tabs */}
            <div className="flex space-x-1 border-b border-border mb-5">
                <button
                    onClick={() => setView('cameras')}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${view === 'cameras' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                >
                    Cameras
                </button>
                {user?.role !== 'client' && (
                    <button
                        onClick={() => setView('groups')}
                        className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${view === 'groups' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                    >
                        Groups
                    </button>
                )}
            </div>

            {
                view === 'groups' ? (
                    <GroupsManager cameras={cameras} onUpdate={fetchCameras} />
                ) : loading ? (
                    <div className="flex justify-center p-12"><Activity className="animate-spin w-8 h-8 text-primary" /></div>
                ) : (
                    <>
                        {isGroupView && cameras.length > 0 ? (
                            <div className="space-y-12">
                                {(() => {
                                    const grouped = {};
                                    const ungrouped = [];
                                    cameras.forEach(cam => {
                                        if (cam.groups && cam.groups.length > 0) {
                                            cam.groups.forEach(g => {
                                                if (!grouped[g.name]) grouped[g.name] = [];
                                                if (!grouped[g.name].find(c => c.id === cam.id)) {
                                                    grouped[g.name].push(cam);
                                                }
                                            });
                                        } else {
                                            ungrouped.push(cam);
                                        }
                                    });

                                    const sortedGroupNames = Object.keys(grouped).sort();

                                    return (
                                        <>
                                            {sortedGroupNames.map(groupName => {
                                                const groupCamIds = grouped[groupName].map(c => c.id);
                                                const allInGroupSelected = groupCamIds.every(id => selectedCameraIds.includes(id));
                                                return (
                                                    <div key={groupName} className="relative">
                                                        <h3 className="text-xl font-bold mb-6 text-foreground/90 flex items-center border-b pb-2">
                                                            <span className="bg-primary/10 text-primary px-2.5 py-0.5 rounded-md text-sm mr-3 font-mono">
                                                                {grouped[groupName].length}
                                                            </span>
                                                            {groupName}
                                                            {user?.role === 'admin' && (
                                                                <button
                                                                    onClick={() => handleSelectAll(groupCamIds)}
                                                                    className="ml-auto text-[10px] font-bold px-2 py-1 bg-muted hover:bg-secondary rounded-md transition-all border border-border flex items-center gap-1.5 uppercase tracking-tight"
                                                                >
                                                                    <div className={`w-3 h-3 rounded-sm border flex items-center justify-center transition-colors ${allInGroupSelected ? 'bg-primary border-primary' : 'bg-background border-border'}`}>
                                                                        {allInGroupSelected && <svg className="w-2 h-2 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={6} d="M5 13l4 4L19 7" /></svg>}
                                                                    </div>
                                                                    {allInGroupSelected ? 'Deselect Group' : 'Select Group'}
                                                                </button>
                                                            )}
                                                        </h3>
                                                        <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-6">
                                                            {grouped[groupName].map(cam => (
                                                                <CameraCard
                                                                    key={`${groupName}-${cam.id}`}
                                                                    camera={cam}
                                                                    onDelete={handleDelete}
                                                                    onEdit={handleEdit}
                                                                    onToggleActive={handleToggleActive}
                                                                    isSelected={selectedCameraIds.includes(cam.id)}
                                                                    onSelect={handleSelectCamera}
                                                                />
                                                            ))}
                                                        </div>
                                                    </div>
                                                );
                                            })}

                                            {ungrouped.length > 0 && (
                                                <div className="relative">
                                                    {sortedGroupNames.length > 0 && (
                                                        <h3 className="text-xl font-bold mb-6 text-foreground/90 flex items-center border-b pb-2 pt-4 opacity-80">
                                                            Ungrouped Cameras
                                                            {user?.role === 'admin' && (
                                                                <button
                                                                    onClick={() => handleSelectAll(ungrouped.map(c => c.id))}
                                                                    className="ml-auto text-[10px] font-bold px-2 py-1 bg-muted hover:bg-secondary rounded-md transition-all border border-border flex items-center gap-1.5 uppercase tracking-tight"
                                                                >
                                                                    <div className={`w-3 h-3 rounded-sm border flex items-center justify-center transition-colors ${ungrouped.every(c => selectedCameraIds.includes(c.id)) ? 'bg-primary border-primary' : 'bg-background border-border'}`}>
                                                                        {ungrouped.every(c => selectedCameraIds.includes(c.id)) && <svg className="w-2 h-2 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={6} d="M5 13l4 4L19 7" /></svg>}
                                                                    </div>
                                                                    {ungrouped.every(c => selectedCameraIds.includes(c.id)) ? 'Deselect Ungrouped' : 'Select Ungrouped'}
                                                                </button>
                                                            )}
                                                        </h3>
                                                    )}
                                                    <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-6">
                                                        {ungrouped.map(cam => (
                                                            <CameraCard
                                                                key={cam.id}
                                                                camera={cam}
                                                                onDelete={handleDelete}
                                                                onEdit={handleEdit}
                                                                onToggleActive={handleToggleActive}
                                                                isSelected={selectedCameraIds.includes(cam.id)}
                                                                onSelect={handleSelectCamera}
                                                            />
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </>
                                    );
                                })()}
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-6">
                                {cameras.map(cam => (
                                    <CameraCard
                                        key={cam.id}
                                        camera={cam}
                                        onDelete={handleDelete}
                                        onEdit={handleEdit}
                                        onToggleActive={handleToggleActive}
                                        isSelected={selectedCameraIds.includes(cam.id)}
                                        onSelect={handleSelectCamera}
                                        handleCleanup={handleCleanup}
                                        setShowCopyModal={setShowCopyModal}
                                        globalSettings={globalSettings}
                                    />
                                ))}
                            </div>
                        )}

                        {cameras.length === 0 && (
                            <div className="text-center py-12 text-muted-foreground bg-card border border-dashed border-border rounded-xl">
                                <Camera className="w-12 h-12 mx-auto mb-4 opacity-20" />
                                <p>No cameras found. Add one to get started.</p>
                            </div>
                        )}
                    </>
                )
            }

            <CameraAddEditModal
                showAddModal={showAddModal}
                setShowAddModal={setShowAddModal}
                editingId={editingId}
                setEditingId={setEditingId}
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                newCamera={newCamera}
                setNewCamera={setNewCamera}
                cameras={cameras}
                clientUsers={user?.role === 'admin' ? clientUsers : null}
                token={token}
                stats={stats}
                handleCreate={handleCreate}
                handleCleanup={handleCleanup}
                handleTestNotification={handleTestNotification}
                setShowCopyModal={setShowCopyModal}
                globalSettings={globalSettings}
            />

            <CopySettingsModal
                showCopyModal={showCopyModal}
                setShowCopyModal={setShowCopyModal}
                cameras={cameras}
                editingId={editingId}
                copyTargets={copyTargets}
                setCopyTargets={setCopyTargets}
                handleCopySettings={handleCopySettings}
            />
            {/* Bulk Actions Floating Bar */}
            {selectedCameraIds.length > 0 && !showAddModal && (
                <BulkActionsBar 
                    selectedCameraIds={selectedCameraIds} 
                    setSelectedCameraIds={setSelectedCameraIds} 
                    handleBulkDelete={handleBulkDelete} 
                />
            )}

            {/* Global Processing Overlay */}
            {isProcessing && <ProcessingOverlay isProcessing={isProcessing} processingMessage={processingMessage} />}

            <ConfirmModal {...confirmConfig} />
        </div >
    );
};
