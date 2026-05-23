import React from 'react';
import { Brain } from 'lucide-react';
import { CollapsibleSection } from '../../../components/ui/CollapsibleSection';
import { SelectField, Toggle } from '../../../components/ui/FormControls';

export const AISettings = ({
    globalSettings,
    setGlobalSettings,
    isOpen,
    onToggle
}) => {
    return (
        <CollapsibleSection
            id="ai-settings"
            title="AI Detection Engine"
            description="Configure the global AI model architecture and performance."
            icon={<Brain className="w-6 h-6" />}
            isOpen={isOpen}
            onToggle={onToggle}
        >
            <div className="space-y-6">
                <div className="bg-muted/30 p-4 rounded-xl border border-border/50">
                    <Toggle
                        label="Global AI Activation"
                        help="When disabled, the AI engine is completely turned off to save system resources. Individual camera AI settings will be ignored."
                        checked={globalSettings.ai_enabled === true || globalSettings.ai_enabled === "true"}
                        onChange={(val) => setGlobalSettings({ ...globalSettings, ai_enabled: val })}
                    />
                </div>

                <div className={!(globalSettings.ai_enabled === true || globalSettings.ai_enabled === "true") ? 'opacity-50 pointer-events-none' : ''}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <SelectField
                            label="Hardware Accelerator"
                            value={globalSettings.ai_hardware === 'tpu' ? 'cpu' : (globalSettings.ai_hardware || 'auto')}
                            onChange={(val) => setGlobalSettings({ ...globalSettings, ai_hardware: val })}
                            options={[
                                { value: 'auto', label: 'Auto (NVIDIA > CPU)' },
                                { value: 'nvidia', label: 'NVIDIA GPU (YOLOv8 CUDA)' },
                                { value: 'cpu', label: 'CPU (Standard)' },
                            ]}
                            help="YOLOv8 can use NVIDIA CUDA when the engine container has GPU access. CPU remains the universal fallback."
                        />
                    </div>
                </div>

                
            </div>
        </CollapsibleSection>
    );
};
