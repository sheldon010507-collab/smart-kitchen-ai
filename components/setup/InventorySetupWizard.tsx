/**
 * Inventory Setup Wizard - Main Container
 * 
 * 3-step wizard for inventory initialization:
 * Stage 1: Data Import (Excel/Template/Manual)
 * Stage 3: Data Cleaning
 * Stage 4: Confirm & Commit
 */
import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { InventorySetupWizardProps, WizardStage, DraftInventoryItem, ImportPath, MergeStrategy, WizardDraft, DraftLocation, DraftCategory } from './types';
import { WIZARD_STRINGS, WIZARD_DRAFT_KEY } from './constants';
import { migrateLegacyDraftItems } from '../../utils/draftMigration';
import { SetupStepIndicator } from './SetupStepIndicator';
import { Stage1Ingest } from './Stage1Ingest';

import { Stage3Locations } from './Stage3Locations';
import { Stage3Categories } from './Stage3Categories';
import { Stage3Cleanse } from './Stage3Cleanse';
import { Stage4Commit } from './Stage4Commit';
import { SaveAsTemplateModal } from './SaveAsTemplateModal';
import { SuccessPage } from './SuccessPage';

export const InventorySetupWizard: React.FC<InventorySetupWizardProps> = ({
    businessId,
    userId,
    existingCategories,
    existingLocations,
    existingItemCount,
    initialTemplate,
    onClose,
    onComplete,
}) => {
    // Stage state
    const [currentStage, setCurrentStage] = useState<WizardStage>(1);
    const [draftItems, setDraftItems] = useState<DraftInventoryItem[]>([]);
    const [draftLocations, setDraftLocations] = useState<DraftLocation[]>([]);
    const [draftCategories, setDraftCategories] = useState<DraftCategory[]>([]);
    const [importPath, setImportPath] = useState<ImportPath | null>(null);
    const [selectedTemplateId, setSelectedTemplateId] = useState<string | undefined>(
        initialTemplate?.id
    );
    const [isComplete, setIsComplete] = useState(false);

    // Modal state
    const [showSaveTemplateModal, setShowSaveTemplateModal] = useState(false);

    // Merge strategy (for Stage 4)
    const [mergeStrategy, setMergeStrategy] = useState<MergeStrategy>('smart-merge');

    // ============================================================
    // Draft Persistence (LocalStorage)
    // ============================================================

    // Load draft on mount
    useEffect(() => {
        try {
            const saved = localStorage.getItem(WIZARD_DRAFT_KEY(businessId));
            if (saved) {
                const draft: WizardDraft = JSON.parse(saved);
                // Only restore if not too old (24 hours)
                const savedTime = new Date(draft.lastSavedAt).getTime();
                const now = Date.now();
                if (now - savedTime < 24 * 60 * 60 * 1000) {
                    setCurrentStage(draft.currentStage);
                    // Migrate legacy draft items to new field names
                    setDraftItems(migrateLegacyDraftItems(draft.draftItems || []));
                    setDraftLocations(draft.draftLocations || []);
                    setDraftCategories(draft.draftCategories || []);
                    setImportPath(draft.path);
                    setSelectedTemplateId(draft.templateId);
                    setMergeStrategy(draft.mergeStrategy);
                } else {
                    localStorage.removeItem(WIZARD_DRAFT_KEY(businessId));
                }
            }
        } catch (e) {
            console.error('Failed to load wizard draft:', e);
        }
    }, [businessId]);

    // Save draft on change
    useEffect(() => {
        if (draftItems.length > 0 || currentStage > 1) {
            const draft: WizardDraft = {
                businessId,
                path: importPath || 'manual',
                templateId: selectedTemplateId,
                currentStage,
                mergeStrategy,
                draftItems,
                draftLocations,
                draftCategories,
                lastSavedAt: new Date().toISOString(),
            };
            try {
                localStorage.setItem(WIZARD_DRAFT_KEY(businessId), JSON.stringify(draft));
            } catch (e) {
                console.error('Failed to save wizard draft:', e);
            }
        }
    }, [businessId, currentStage, draftItems, importPath, selectedTemplateId, mergeStrategy]);

    // Clear draft on complete
    const clearDraft = useCallback(() => {
        localStorage.removeItem(WIZARD_DRAFT_KEY(businessId));
    }, [businessId]);

    // ============================================================
    // Stage Handlers
    // ============================================================

    const handleStage1Next = useCallback((
        items: DraftInventoryItem[],
        path: ImportPath,
        templateId?: string
    ) => {
        setDraftItems(items);
        setImportPath(path);
        setSelectedTemplateId(templateId);
        setCurrentStage(2); // Go to Locations
    }, []);

    const handleStage2Next = useCallback(() => {
        // Go to Categories
        setCurrentStage(3);
    }, []);

    const handleStage2Back = useCallback(() => {
        setCurrentStage(1);
    }, []);

    const handleStage3Next = useCallback(() => {
        // Go to Cleanse (Stage 4)
        setCurrentStage(4);
    }, []);

    const handleStage3Back = useCallback(() => {
        setCurrentStage(2); // Back to Locations
    }, []);

    const handleStage4Next = useCallback((cleanedItems: DraftInventoryItem[]) => {
        setDraftItems(cleanedItems);
        setCurrentStage(5); // Go to Commit
    }, []);

    const handleStage4Back = useCallback(() => {
        setCurrentStage(3); // Back to Categories
    }, []);

    const handleStage5Back = useCallback(() => {
        setCurrentStage(4); // Back to Cleanse
    }, []);

    const handleCommit = useCallback(async (strategy: MergeStrategy) => {
        setMergeStrategy(strategy);
        await onComplete(draftItems.filter(i => !i.isDeleted), strategy);
        clearDraft();
        setIsComplete(true);
        setCurrentStage(6);  // Success stage
    }, [draftItems, onComplete, clearDraft]);

    const handleSaveAsTemplate = useCallback(() => {
        setShowSaveTemplateModal(true);
    }, []);

    const handleTemplateSaved = useCallback(() => {
        setShowSaveTemplateModal(false);
    }, []);

    // Success page stats
    const successStats = useMemo(() => {
        const active = draftItems.filter(i => !i.isDeleted);
        return {
            itemCount: active.length,
            categoryCount: new Set(active.map(i => i.category).filter(Boolean)).size,
            locationCount: new Set(active.map(i => i.location).filter(Boolean)).size,
        };
    }, [draftItems]);

    // ============================================================
    // Render
    // ============================================================

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-3">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                            📦 {WIZARD_STRINGS.title}
                        </h2>
                        {/* Auto-save indicator */}
                        {draftItems.length > 0 && !isComplete && (
                            <span className="flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded-full">
                                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                                Draft saved
                            </span>
                        )}
                    </div>
                    {!isComplete && (
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                            aria-label={WIZARD_STRINGS.close}
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    )}
                </div>

                {/* Step Indicator */}
                <SetupStepIndicator currentStage={currentStage} />

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {currentStage === 1 && (
                        <Stage1Ingest
                            businessId={businessId}
                            userId={userId}
                            onNext={handleStage1Next}
                            onCancel={onClose}
                            initialPath={importPath || undefined}
                            initialTemplateId={selectedTemplateId}
                        />
                    )}

                    {currentStage === 2 && (
                        <Stage3Locations
                            businessId={businessId}
                            locations={draftLocations}
                            onChange={setDraftLocations}
                            onNext={handleStage2Next}
                            onBack={handleStage2Back}
                        />
                    )}

                    {currentStage === 3 && (
                        <Stage3Categories
                            categories={draftCategories}
                            onChange={setDraftCategories}
                            onNext={handleStage3Next}
                            onBack={handleStage3Back}
                        />
                    )}

                    {currentStage === 4 && (
                        <Stage3Cleanse
                            items={draftItems}
                            existingCategories={[
                                ...existingCategories,
                                ...draftCategories.map(c => c.name)
                            ]}
                            existingLocations={[
                                ...existingLocations,
                                ...draftLocations.map(l => l.name)
                            ]}
                            onNext={handleStage4Next}
                            onBack={handleStage4Back}
                        />
                    )}

                    {currentStage === 5 && (
                        <Stage4Commit
                            items={draftItems}
                            existingItemCount={existingItemCount}
                            businessId={businessId}
                            userId={userId}
                            onCommit={handleCommit}
                            onBack={handleStage5Back}
                            onSaveAsTemplate={handleSaveAsTemplate}
                        />
                    )}

                    {currentStage === 6 && isComplete && (
                        <SuccessPage
                            itemCount={successStats.itemCount}
                            categoryCount={successStats.categoryCount}
                            locationCount={successStats.locationCount}
                            onViewInventory={onClose}
                        />
                    )}
                </div>
            </div>

            {/* Save as Template Modal */}
            {showSaveTemplateModal && (
                <SaveAsTemplateModal
                    items={draftItems}
                    businessId={businessId}
                    userId={userId}
                    onClose={() => setShowSaveTemplateModal(false)}
                    onSaved={handleTemplateSaved}
                />
            )}
        </div>
    );
};

export default InventorySetupWizard;
