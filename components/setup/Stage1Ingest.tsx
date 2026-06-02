/**
 * Stage 1: Data Ingest
 * Import method selection: Excel/CSV or templates.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { Stage1IngestProps, DraftInventoryItem, InventoryTemplate, ImportPath } from './types';
import { WIZARD_STRINGS } from './constants';
import { getAvailableTemplates, incrementUsageCount, deleteTemplate } from '../../services/templateService';
import { TemplateCard } from './TemplateCard';
import { TemplatePreviewModal } from './TemplatePreviewModal';
import { ExcelPreview } from './ExcelPreview';

export const Stage1Ingest: React.FC<Stage1IngestProps> = ({
    businessId,
    userId,
    onNext,
    onCancel,
    initialPath,
    initialTemplateId,
}) => {
    const safeInitialPath = initialPath === 'photo' ? null : initialPath;
    const [importPath, setImportPath] = useState<ImportPath | null>(safeInitialPath || null);
    const [templates, setTemplates] = useState<InventoryTemplate[]>([]);
    const [loadingTemplates, setLoadingTemplates] = useState(true);
    const [selectedTemplate, setSelectedTemplate] = useState<InventoryTemplate | null>(null);
    const [previewTemplate, setPreviewTemplate] = useState<InventoryTemplate | null>(null);
    const [excelItems, setExcelItems] = useState<DraftInventoryItem[]>([]);

    useEffect(() => {
        const loadTemplates = async () => {
            setLoadingTemplates(true);
            const result = await getAvailableTemplates(userId, businessId);
            if (result.data) {
                setTemplates(result.data);
                if (initialTemplateId) {
                    const found = result.data.find(t => t.id === initialTemplateId);
                    if (found) {
                        setSelectedTemplate(found);
                        setImportPath('template');
                    }
                }
            }
            setLoadingTemplates(false);
        };
        loadTemplates();
    }, [userId, businessId, initialTemplateId]);

    const systemTemplates = templates.filter(t => t.isSystem);
    const userTemplates = templates.filter(t => !t.isSystem);

    const handleSelectTemplate = useCallback((template: InventoryTemplate) => {
        setSelectedTemplate(template);
        setImportPath('template');
    }, []);

    const handleExcelLoad = useCallback((items: DraftInventoryItem[]) => {
        setExcelItems(items);
    }, []);

    const handleDeleteTemplate = useCallback(async (template: InventoryTemplate) => {
        if (!window.confirm(`Are you sure you want to delete "${template.name}"?`)) return;
        try {
            await deleteTemplate(template.id, userId);
            setTemplates(prev => prev.filter(t => t.id !== template.id));
            if (selectedTemplate?.id === template.id) setSelectedTemplate(null);
        } catch (err) {
            console.error('Delete template error:', err);
            alert('Failed to delete template');
        }
    }, [selectedTemplate, userId]);

    const handleNext = useCallback(async () => {
        if (importPath === 'template' && selectedTemplate) {
            const draftItems: DraftInventoryItem[] = selectedTemplate.items.map((item, index) => ({
                id: `draft-${Date.now()}-${index}`,
                name: item.name,
                category: item.category,
                quantityUnit: item.unit,
                unitCost: item.cost,
                minStockLevel: item.suggestedPar,
            }));

            await incrementUsageCount(selectedTemplate.id);
            onNext(draftItems, 'template', selectedTemplate.id);
        } else if (importPath === 'excel' && excelItems.length > 0) {
            onNext(excelItems, 'excel');
        }
    }, [importPath, selectedTemplate, excelItems, onNext]);

    const canProceed =
        (importPath === 'template' && selectedTemplate) ||
        (importPath === 'excel' && excelItems.length > 0);

    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    {WIZARD_STRINGS.selectMethod}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button
                        onClick={() => setImportPath('excel')}
                        className={`p-4 rounded-xl border-2 text-center transition-all ${
                            importPath === 'excel'
                                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                : 'border-gray-200 dark:border-gray-700 hover:border-blue-300'
                        }`}
                    >
                        <div className="text-3xl mb-2">CSV</div>
                        <div className="font-semibold text-gray-900 dark:text-white">
                            {WIZARD_STRINGS.excelImport}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                            {WIZARD_STRINGS.excelDesc}
                        </div>
                    </button>

                    <button
                        onClick={() => setImportPath('template')}
                        className={`p-4 rounded-xl border-2 text-center transition-all ${
                            importPath === 'template'
                                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                : 'border-gray-200 dark:border-gray-700 hover:border-blue-300'
                        }`}
                    >
                        <div className="text-3xl mb-2">KB</div>
                        <div className="font-semibold text-gray-900 dark:text-white">
                            {WIZARD_STRINGS.useTemplate}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                            Start from a saved kitchen baseline and keep improving it from Telegram.
                        </div>
                    </button>
                </div>
            </div>

            {importPath && <hr className="border-gray-200 dark:border-gray-700" />}

            {importPath === 'excel' && <ExcelPreview onLoad={handleExcelLoad} />}

            {importPath === 'template' && (
                <div className="space-y-6">
                    <div>
                        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                            {WIZARD_STRINGS.systemTemplates} ({systemTemplates.length})
                        </h4>
                        {loadingTemplates ? (
                            <div className="flex items-center justify-center py-8">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                                {systemTemplates.map(template => (
                                    <TemplateCard
                                        key={template.id}
                                        template={template}
                                        source="system"
                                        onSelect={handleSelectTemplate}
                                        onPreview={setPreviewTemplate}
                                        isSelected={selectedTemplate?.id === template.id}
                                    />
                                ))}
                            </div>
                        )}
                    </div>

                    <div>
                        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                            {WIZARD_STRINGS.myTemplates} ({userTemplates.length})
                        </h4>
                        {userTemplates.length > 0 ? (
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                {userTemplates.map(template => (
                                    <TemplateCard
                                        key={template.id}
                                        template={template}
                                        source="user"
                                        onSelect={handleSelectTemplate}
                                        onPreview={setPreviewTemplate}
                                        onDelete={handleDeleteTemplate}
                                        isSelected={selectedTemplate?.id === template.id}
                                    />
                                ))}
                            </div>
                        ) : (
                            <div className="py-8 text-center bg-gray-50 dark:bg-gray-900 rounded-xl">
                                <div className="text-gray-400 dark:text-gray-500 text-4xl mb-2">KB</div>
                                <p className="text-gray-500 dark:text-gray-400">
                                    No saved kitchen baseline yet. Add stock from CSV now; Telegram receipt corrections will build the baseline over time.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            <div className="flex justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                    onClick={onCancel}
                    className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                    {WIZARD_STRINGS.cancel}
                </button>
                <button
                    onClick={handleNext}
                    disabled={!canProceed}
                    className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                        canProceed
                            ? 'bg-blue-500 hover:bg-blue-600 text-white'
                            : 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                    }`}
                >
                    {WIZARD_STRINGS.next}: {WIZARD_STRINGS.step3} -&gt;
                </button>
            </div>

            {previewTemplate && (
                <TemplatePreviewModal
                    template={previewTemplate}
                    onClose={() => setPreviewTemplate(null)}
                    onSelect={(t) => {
                        handleSelectTemplate(t);
                        setPreviewTemplate(null);
                    }}
                />
            )}
        </div>
    );
};

export default Stage1Ingest;
