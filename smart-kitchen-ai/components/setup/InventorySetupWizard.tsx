import React, { useState, useEffect, useCallback } from 'react';
import { X, ArrowLeft, ArrowRight, Save } from 'lucide-react';
import type {
    SetupStage,
    SetupState,
    DraftInventoryItem,
    DraftLocation,
    DraftCategory,
    IngestionPath,
    IndustryTemplate,
    InventoryItem
} from '../../types';
import SetupStepIndicator from './SetupStepIndicator';
import Stage1Ingest from './Stage1Ingest';
import Stage3Cleanse from './Stage3Cleanse';
import Stage4Commit from './Stage4Commit';
import Scanner from '../Scanner';

interface Props {
    businessId: string;
    existingCategories: string[];
    existingLocations: string[];
    onClose: () => void;
    onComplete: (items: InventoryItem[]) => void;
}

const DRAFT_STORAGE_KEY = 'inventory_setup_draft';

const InventorySetupWizard: React.FC<Props> = ({
    businessId,
    existingCategories,
    existingLocations,
    onClose,
    onComplete,
}) => {
    // Setup state
    const [currentStage, setCurrentStage] = useState<SetupStage>(1);
    const [ingestionPath, setIngestionPath] = useState<IngestionPath | null>(null);
    const [selectedTemplate, setSelectedTemplate] = useState<IndustryTemplate | null>(null);

    // Draft data
    const [draftItems, setDraftItems] = useState<DraftInventoryItem[]>([]);
    const [draftLocations, setDraftLocations] = useState<DraftLocation[]>([]);
    const [draftCategories, setDraftCategories] = useState<DraftCategory[]>([]);

    // UI state
    const [isSaving, setIsSaving] = useState(false);
    const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
    const [showScanner, setShowScanner] = useState(false);

    // Load draft from localStorage on mount
    useEffect(() => {
        try {
            const saved = localStorage.getItem(`${DRAFT_STORAGE_KEY}_${businessId}`);
            if (saved) {
                const draft: SetupState = JSON.parse(saved);
                if (draft.businessId === businessId) {
                    setCurrentStage(draft.currentStage);
                    setIngestionPath(draft.path);
                    setDraftItems(draft.draftItems || []);
                    setDraftLocations(draft.draftLocations || []);
                    setDraftCategories(draft.draftCategories || []);
                    setLastSavedAt(draft.lastSavedAt || null);
                }
            }
        } catch (e) {
            console.warn('Failed to load setup draft:', e);
        }
    }, [businessId]);

    // Auto-save draft on changes
    const saveDraft = useCallback(() => {
        if (!ingestionPath) return;

        const draft: SetupState = {
            businessId,
            path: ingestionPath,
            templateId: selectedTemplate?.id,
            currentStage,
            draftItems,
            draftLocations,
            draftCategories,
            lastSavedAt: new Date().toISOString(),
        };

        try {
            localStorage.setItem(`${DRAFT_STORAGE_KEY}_${businessId}`, JSON.stringify(draft));
            setLastSavedAt(draft.lastSavedAt!);
        } catch (e) {
            console.warn('Failed to save setup draft:', e);
        }
    }, [businessId, ingestionPath, selectedTemplate, currentStage, draftItems, draftLocations, draftCategories]);

    // Debounced auto-save
    useEffect(() => {
        if (currentStage > 1 && draftItems.length > 0) {
            const timer = setTimeout(saveDraft, 2000);
            return () => clearTimeout(timer);
        }
    }, [draftItems, draftLocations, draftCategories, saveDraft, currentStage]);

    // Clear draft on complete
    const clearDraft = () => {
        localStorage.removeItem(`${DRAFT_STORAGE_KEY}_${businessId}`);
    };

    // Stage navigation
    const canGoNext = (): boolean => {
        switch (currentStage) {
            case 1:
                return ingestionPath !== null;
            case 2:
                return true; // Audit is optional
            case 3:
                // Must have at least some items with no critical errors
                return draftItems.length > 0 && draftItems.every(i => i.status !== 'error');
            case 4:
                return true;
            default:
                return false;
        }
    };

    const handleNext = () => {
        if (currentStage < 4 && canGoNext()) {
            // Skip Stage 2 (Audit) for now - it's optional
            if (currentStage === 1) {
                setCurrentStage(3);
            } else {
                setCurrentStage((currentStage + 1) as SetupStage);
            }
        }
    };

    const handleBack = () => {
        if (currentStage > 1) {
            // Skip Stage 2 when going back
            if (currentStage === 3) {
                setCurrentStage(1);
            } else {
                setCurrentStage((currentStage - 1) as SetupStage);
            }
        }
    };

    // Handle data from Stage 1
    const handleIngestComplete = (
        path: IngestionPath,
        items: DraftInventoryItem[],
        locations: DraftLocation[],
        categories: DraftCategory[],
        template?: IndustryTemplate
    ) => {
        setIngestionPath(path);
        setDraftItems(items);
        setDraftLocations(locations);
        setDraftCategories(categories);
        if (template) setSelectedTemplate(template);

        // Auto-advance to Stage 3
        setCurrentStage(3);
        saveDraft();
    };

    // Handle scan results from Scanner component
    const handleScanComplete = (items: InventoryItem[]) => {
        // Check if Scanner returned empty results
        if (!items || items.length === 0) {
            alert('No items detected. Please try again with a clearer photo.');
            setShowScanner(false);
            return;
        }

        const drafts: DraftInventoryItem[] = items.map((item, i) => ({
            id: `scan_${Date.now()}_${i}`,
            name: item.name,
            category: item.category || 'Unassigned',
            quantityUnit: item.quantityUnit || 'pcs',
            unitCost: item.unitCost || 0,
            location: item.location || 'Default Storage',
            minStockLevel: 0,
            status: 'warning' as const,
            errors: [],
            warnings: ['Set min stock level', 'Verify unit cost'],
        }));

        setIngestionPath('photo');
        setDraftItems(drafts);
        setShowScanner(false);
        setCurrentStage(3);
        saveDraft();
    };
    // Handle final commit
    const handleCommit = async () => {
        setIsSaving(true);

        try {
            // Convert draft items to InventoryItem format
            const inventoryItems: InventoryItem[] = draftItems
                .filter(d => d.status !== 'error')
                .map(d => ({
                    id: d.id,
                    businessId,
                    name: d.name,
                    quantity: `0 ${d.quantityUnit}`,
                    quantityValue: 0, // Initial quantity is 0, user will do first count
                    quantityUnit: d.quantityUnit,
                    unitCost: d.unitCost,
                    category: d.category,
                    location: d.location,
                    minStockLevel: d.minStockLevel,
                    expiryDate: '',
                    addedDate: new Date().toISOString().split('T')[0],
                }));

            clearDraft();
            onComplete(inventoryItems);
        } catch (e) {
            console.error('Commit failed:', e);
            alert('Save failed. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    // Handle close with confirmation
    const handleClose = () => {
        if (draftItems.length > 0) {
            const confirm = window.confirm('You have unsaved data. Are you sure you want to exit?\nYour draft will be auto-saved.');
            if (!confirm) return;
            saveDraft();
        }
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 bg-white flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white shrink-0">
                <div>
                    <h1 className="text-xl font-bold text-gray-900">Inventory Setup</h1>
                    <p className="text-sm text-gray-500 mt-0.5">
                        {lastSavedAt && `Draft saved at ${new Date(lastSavedAt).toLocaleTimeString()}`}
                    </p>
                </div>
                <button
                    onClick={handleClose}
                    className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"
                    aria-label="Close"
                >
                    <X className="w-5 h-5" />
                </button>
            </div>

            {/* Step Indicator */}
            <div className="px-6 border-b border-gray-100 bg-gray-50 shrink-0">
                <SetupStepIndicator
                    currentStage={currentStage}
                    onStageClick={(stage) => stage <= currentStage && setCurrentStage(stage)}
                />
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-auto">
                {currentStage === 1 && (
                    <Stage1Ingest
                        existingCategories={existingCategories}
                        existingLocations={existingLocations}
                        onOpenScanner={() => setShowScanner(true)}
                        onComplete={handleIngestComplete}
                    />
                )}

                {currentStage === 2 && (
                    <div className="flex items-center justify-center h-full text-gray-500">
                        <p>Audit stage is optional - click Next to continue</p>
                    </div>
                )}

                {currentStage === 3 && (
                    <Stage3Cleanse
                        draftItems={draftItems}
                        draftLocations={draftLocations}
                        draftCategories={draftCategories}
                        existingCategories={existingCategories}
                        existingLocations={existingLocations}
                        onItemsChange={setDraftItems}
                        onLocationsChange={setDraftLocations}
                        onCategoriesChange={setDraftCategories}
                    />
                )}

                {currentStage === 4 && (
                    <Stage4Commit
                        draftItems={draftItems}
                        draftLocations={draftLocations}
                        draftCategories={draftCategories}
                        onCommit={handleCommit}
                        isCommitting={isSaving}
                    />
                )}
            </div>

            {/* Scanner Modal */}
            {showScanner && (
                <Scanner
                    initialMode="fridge"
                    onClose={() => setShowScanner(false)}
                    onItemsFound={handleScanComplete}
                    onSalesProcessed={() => { }}
                    inventoryNameOptions={existingCategories}
                />
            )}

            {/* Footer Navigation */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-white shrink-0">
                <button
                    onClick={handleBack}
                    disabled={currentStage === 1}
                    className={`
            flex items-center gap-2 px-4 py-2 rounded-lg font-medium
            ${currentStage === 1
                            ? 'text-gray-300 cursor-not-allowed'
                            : 'text-gray-600 hover:bg-gray-100'}
          `}
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back
                </button>

                <div className="flex items-center gap-3">
                    {currentStage > 1 && (
                        <button
                            onClick={saveDraft}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-100 font-medium"
                        >
                            <Save className="w-4 h-4" />
                            Save Draft
                        </button>
                    )}

                    {currentStage < 4 ? (
                        <button
                            onClick={handleNext}
                            disabled={!canGoNext()}
                            className={`
                flex items-center gap-2 px-6 py-2 rounded-lg font-bold
                ${canGoNext()
                                    ? 'bg-primary text-white hover:bg-black'
                                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'}
              `}
                        >
                            Next
                            <ArrowRight className="w-4 h-4" />
                        </button>
                    ) : (
                        <button
                            onClick={handleCommit}
                            disabled={isSaving || draftItems.some(i => i.status === 'error')}
                            className={`
                flex items-center gap-2 px-6 py-2 rounded-lg font-bold
                ${!isSaving && !draftItems.some(i => i.status === 'error')
                                    ? 'bg-green-600 text-white hover:bg-green-700'
                                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'}
              `}
                        >
                            {isSaving ? 'Saving...' : 'Complete Setup'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default InventorySetupWizard;
