/**
 * TemplateOnboardingModal Component
 * 
 * Shows after first store creation to prompt user about template library
 */

import React from 'react';
import { X, FileSpreadsheet, Plus } from 'lucide-react';

interface TemplateOnboardingModalProps {
    onBrowseTemplates: () => void;
    onStartFresh: () => void;
    onClose: () => void;
}

export default function TemplateOnboardingModal({
    onBrowseTemplates,
    onStartFresh,
    onClose,
}: TemplateOnboardingModalProps) {

    const handleDontShowAgain = () => {
        localStorage.setItem('skip_template_onboarding', 'true');
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl w-full max-w-md shadow-xl">
                {/* Header */}
                <div className="p-4 border-b border-border flex items-center justify-between">
                    <div className="flex items-center gap-2 text-primary">
                        <FileSpreadsheet className="w-5 h-5" />
                        <h3 className="font-bold">Set Up Your Inventory</h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-4">
                    <p className="text-secondary text-sm">
                        Would you like to start with a pre-built inventory template?
                        Templates include common items for different restaurant types.
                    </p>

                    <div className="grid gap-3">
                        {/* Browse Templates Button */}
                        <button
                            onClick={onBrowseTemplates}
                            className="w-full p-4 border-2 border-accent rounded-xl flex items-start gap-3 hover:bg-accent/5 transition-colors text-left"
                        >
                            <FileSpreadsheet className="w-6 h-6 text-accent flex-shrink-0 mt-0.5" />
                            <div>
                                <div className="font-bold text-primary">Browse Template Library</div>
                                <div className="text-sm text-secondary">
                                    Choose from Italian, Asian, Café, and more
                                </div>
                            </div>
                        </button>

                        {/* Start Fresh Button */}
                        <button
                            onClick={onStartFresh}
                            className="w-full p-4 border border-border rounded-xl flex items-start gap-3 hover:bg-background transition-colors text-left"
                        >
                            <Plus className="w-6 h-6 text-secondary flex-shrink-0 mt-0.5" />
                            <div>
                                <div className="font-bold text-primary">Start Fresh</div>
                                <div className="text-sm text-secondary">
                                    Build your inventory from scratch
                                </div>
                            </div>
                        </button>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 pb-4">
                    <button
                        onClick={handleDontShowAgain}
                        className="text-xs text-secondary hover:text-primary underline transition-colors"
                    >
                        Don't show this again
                    </button>
                </div>
            </div>
        </div>
    );
}
