/**
 * Stage 1: Data Ingest
 * Import method selection: Excel/CSV, Templates, or Manual
 */
import React, { useState, useEffect, useCallback } from 'react';
import { Stage1IngestProps, DraftInventoryItem, InventoryTemplate, ImportPath, TemplateSource } from './types';
import { WIZARD_STRINGS } from './constants';
import { getAvailableTemplates, incrementUsageCount } from '../../services/templateService';
import { TemplateCard } from './TemplateCard';
import { TemplatePreviewModal } from './TemplatePreviewModal';
import { ExcelPreview } from './ExcelPreview';
import { PhotoScanSection } from './PhotoScanSection';

export const Stage1Ingest: React.FC<Stage1IngestProps> = ({
    businessId,
    userId,
    onNext,
    onCancel,
    initialPath,
    initialTemplateId,
}) => {
    // State
    const [importPath, setImportPath] = useState<ImportPath | null>(initialPath || null);
    const [templates, setTemplates] = useState<InventoryTemplate[]>([]);
    const [loadingTemplates, setLoadingTemplates] = useState(true);
    const [selectedTemplate, setSelectedTemplate] = useState<InventoryTemplate | null>(null);
    const [previewTemplate, setPreviewTemplate] = useState<InventoryTemplate | null>(null);

    // Excel state
    const [excelItems, setExcelItems] = useState<DraftInventoryItem[]>([]);
    const [excelLoaded, setExcelLoaded] = useState(false);

    // Photo scan state
    const [photoItems, setPhotoItems] = useState<DraftInventoryItem[]>([]);
    const [photoLoaded, setPhotoLoaded] = useState(false);

    // Load templates
    useEffect(() => {
        const loadTemplates = async () => {
            setLoadingTemplates(true);
            const result = await getAvailableTemplates(userId);
            if (result.data) {
                setTemplates(result.data);
                // Auto-select if initialTemplateId provided
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
    }, [userId, initialTemplateId]);

    // Template categorization
    const systemTemplates = templates.filter(t => t.isSystem);
    const userTemplates = templates.filter(t => !t.isSystem);

    // Handle template selection
    const handleSelectTemplate = useCallback((template: InventoryTemplate) => {
        setSelectedTemplate(template);
        setImportPath('template');
    }, []);

    // Handle Excel load
    const handleExcelLoad = useCallback((items: DraftInventoryItem[]) => {
        setExcelItems(items);
        setExcelLoaded(true);
    }, []);

    // Handle photo scan result
    const handlePhotoResult = useCallback((items: DraftInventoryItem[]) => {
        setPhotoItems(items);
        setPhotoLoaded(true);
    }, []);

    // Handle Next
    const handleNext = useCallback(async () => {
        if (importPath === 'template' && selectedTemplate) {
            // Convert template items to draft items
            const draftItems: DraftInventoryItem[] = selectedTemplate.items.map((item, index) => ({
                id: `draft-${Date.now()}-${index}`,
                name: item.name,
                category: item.category,
                quantityUnit: item.unit,
                unitCost: item.cost,
                minStockLevel: item.suggestedPar,
            }));

            // Increment usage count
            await incrementUsageCount(selectedTemplate.id);

            onNext(draftItems, 'template', selectedTemplate.id);
        } else if (importPath === 'excel' && excelItems.length > 0) {
            onNext(excelItems, 'excel');
        } else if (importPath === 'photo' && photoItems.length > 0) {
            onNext(photoItems, 'photo');
        }
    }, [importPath, selectedTemplate, excelItems, photoItems, onNext]);

    // Can proceed?
    const canProceed =
        (importPath === 'template' && selectedTemplate) ||
        (importPath === 'excel' && excelItems.length > 0) ||
        (importPath === 'photo' && photoItems.length > 0);

    return (
        <div className="space-y-6">
            {/* Import Method Selection */}
            <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    {WIZARD_STRINGS.selectMethod}
                </h3>
                <div className="grid grid-cols-3 gap-4">
                    {/* Excel/CSV */}
                    <button
                        onClick={() => setImportPath('excel')}
                        className={`
              p-4 rounded-xl border-2 text-center transition-all
              ${importPath === 'excel'
                                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                : 'border-gray-200 dark:border-gray-700 hover:border-blue-300'
                            }
            `}
                    >
                        <div className="text-3xl mb-2">📊</div>
                        <div className="font-semibold text-gray-900 dark:text-white">
                            {WIZARD_STRINGS.excelImport}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                            {WIZARD_STRINGS.excelDesc}
                        </div>
                    </button>

                    {/* Template */}
                    <button
                        onClick={() => setImportPath('template')}
                        className={`
              p-4 rounded-xl border-2 text-center transition-all
              ${importPath === 'template'
                                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                : 'border-gray-200 dark:border-gray-700 hover:border-blue-300'
                            }
            `}
                    >
                        <div className="text-3xl mb-2">📋</div>
                        <div className="font-semibold text-gray-900 dark:text-white">
                            {WIZARD_STRINGS.useTemplate}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                            {WIZARD_STRINGS.templateDesc}
                        </div>
                    </button>

                    {/* Photo Scan */}
                    <button
                        onClick={() => setImportPath('photo')}
                        className={`
              p-4 rounded-xl border-2 text-center transition-all
              ${importPath === 'photo'
                                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                : 'border-gray-200 dark:border-gray-700 hover:border-blue-300'
                            }
            `}
                    >
                        <div className="text-3xl mb-2">📷</div>
                        <div className="font-semibold text-gray-900 dark:text-white">
                            {WIZARD_STRINGS.photoScan}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                            {WIZARD_STRINGS.photoDesc}
                        </div>
                    </button>
                </div>
            </div>

            {/* Divider */}
            {importPath && <hr className="border-gray-200 dark:border-gray-700" />}

            {/* Excel Import Section */}
            {importPath === 'excel' && (
                <ExcelPreview onLoad={handleExcelLoad} />
            )}

            {/* Template Selection Section */}
            {importPath === 'template' && (
                <div className="space-y-6">
                    {/* System Templates */}
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

                    {/* User Templates */}
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
                                        isSelected={selectedTemplate?.id === template.id}
                                    />
                                ))}
                            </div>
                        ) : (
                            <div className="py-8 text-center bg-gray-50 dark:bg-gray-900 rounded-xl">
                                <div className="text-gray-400 dark:text-gray-500 text-4xl mb-2">💡</div>
                                <p className="text-gray-500 dark:text-gray-400">
                                    {WIZARD_STRINGS.noCustomTemplates}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Photo Scan Section */}
            {importPath === 'photo' && (
                <PhotoScanSection
                    onItemsFound={handlePhotoResult}
                    existingNames={[]}
                />
            )}

            {/* Footer Buttons */}
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
                    className={`
            px-6 py-2 rounded-lg font-medium transition-colors
            ${canProceed
                            ? 'bg-blue-500 hover:bg-blue-600 text-white'
                            : 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                        }
          `}
                >
                    {WIZARD_STRINGS.next}: {WIZARD_STRINGS.step3} →
                </button>
            </div>

            {/* Template Preview Modal */}
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
