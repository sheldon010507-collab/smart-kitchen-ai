import React, { useState, useRef } from 'react';
import {
    Upload,
    FileSpreadsheet,
    Camera,
    Sparkles,
    ChevronRight,
    CheckCircle2,
    Clock
} from 'lucide-react';
import type {
    IngestionPath,
    DraftInventoryItem,
    DraftLocation,
    DraftCategory,
    IndustryTemplate
} from '../../types';
import { INDUSTRY_TEMPLATES } from './industryTemplates';
import * as XLSX from 'xlsx';

interface Props {
    existingCategories: string[];
    existingLocations: string[];
    onOpenScanner: () => void;
    onComplete: (
        path: IngestionPath,
        items: DraftInventoryItem[],
        locations: DraftLocation[],
        categories: DraftCategory[],
        template?: IndustryTemplate
    ) => void;
}

// Column mapping for Excel import
const COLUMN_MAPPINGS: Record<string, string[]> = {
    name: ['name', 'item', 'product', '名称', '商品', '品名', '物品'],
    category: ['category', 'type', 'group', '分类', '类别', '品类'],
    unit: ['unit', 'uom', '单位', '计量单位'],
    cost: ['cost', 'price', 'unit_cost', '成本', '单价', '进价'],
    location: ['location', 'storage', 'place', '位置', '存放位置', '库位'],
    minStockLevel: ['par', 'par_level', 'stock', 'min', 'min_stock', 'min_stock_level', 'standard'],
    supplier: ['supplier', 'vendor', '供应商'],
};

const Stage1Ingest: React.FC<Props> = ({
    existingCategories,
    existingLocations,
    onOpenScanner,
    onComplete,
}) => {
    const [selectedPath, setSelectedPath] = useState<IngestionPath | null>(null);
    const [selectedTemplate, setSelectedTemplate] = useState<IndustryTemplate | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Auto-detect column mapping
    const autoMapColumns = (headers: string[]): Record<string, number> => {
        const mapping: Record<string, number> = {};

        headers.forEach((header, index) => {
            const headerLower = header.toLowerCase().trim();

            for (const [field, aliases] of Object.entries(COLUMN_MAPPINGS)) {
                if (aliases.some(alias => headerLower.includes(alias))) {
                    if (!mapping[field]) {
                        mapping[field] = index;
                    }
                }
            }
        });

        return mapping;
    };

    // Validate and create draft item
    const createDraftItem = (
        row: any[],
        mapping: Record<string, number>,
        index: number
    ): DraftInventoryItem | null => {
        const name = mapping.name !== undefined ? String(row[mapping.name] || '').trim() : '';
        if (!name) return null;

        const unit = mapping.unit !== undefined ? String(row[mapping.unit] || '').trim() : '';
        const category = mapping.category !== undefined ? String(row[mapping.category] || '').trim() : '';
        const location = mapping.location !== undefined ? String(row[mapping.location] || '').trim() : '';
        const cost = mapping.cost !== undefined ? parseFloat(row[mapping.cost]) || 0 : 0;
        const minStockLevel = mapping.minStockLevel !== undefined ? parseFloat(row[mapping.minStockLevel]) || 0 : 0;

        // Validation
        const errors: string[] = [];
        const warnings: string[] = [];
        if (!unit) errors.push('Missing unit');
        if (!category) warnings.push('No category assigned');
        if (!location) warnings.push('No location assigned');
        if (minStockLevel === 0) warnings.push('Min stock level is 0');

        return {
            id: `draft_${Date.now()}_${index}`,
            name,
            category: category || 'Unassigned',
            quantityUnit: unit || 'pcs',
            unitCost: cost,
            location: location || 'Default Storage',
            minStockLevel,
            supplier: mapping.supplier !== undefined ? String(row[mapping.supplier] || '').trim() : undefined,
            status: errors.length > 0 ? 'error' : warnings.length > 0 ? 'warning' : 'ready',
            errors,
            warnings,
        };
    };

    // Handle Excel file upload
    const handleFileUpload = async (file: File) => {
        setIsProcessing(true);
        setError(null);

        try {
            const data = await file.arrayBuffer();
            const workbook = XLSX.read(data, { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            const sheet = workbook.Sheets[sheetName];
            const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

            if (rows.length < 2) {
                throw new Error('文件为空或只有表头');
            }

            const headers = rows[0].map(h => String(h || ''));
            const mapping = autoMapColumns(headers);

            if (mapping.name === undefined) {
                throw new Error('未找到商品名称列。请确保表头包含 "Name" 或 "名称"');
            }

            const draftItems: DraftInventoryItem[] = [];
            const categories = new Set<string>();
            const locations = new Set<string>();

            for (let i = 1; i < rows.length; i++) {
                const item = createDraftItem(rows[i], mapping, i);
                if (item) {
                    draftItems.push(item);
                    if (item.category) categories.add(item.category);
                    if (item.location) locations.add(item.location);
                }
            }

            if (draftItems.length === 0) {
                throw new Error('未能解析出任何商品');
            }

            // Create draft categories and locations
            const draftCategories: DraftCategory[] = Array.from(categories).map(name => ({ name }));
            const draftLocations: DraftLocation[] = Array.from(locations).map(name => ({
                name,
                type: name.toLowerCase().includes('fridge') || name.includes('冷藏')
                    ? 'Fridge'
                    : name.toLowerCase().includes('freezer') || name.includes('冷冻')
                        ? 'Freezer'
                        : 'Dry',
            }));

            onComplete('import', draftItems, draftLocations, draftCategories);
        } catch (e: any) {
            setError(e.message || '文件解析失败');
        } finally {
            setIsProcessing(false);
        }
    };

    // Handle template selection
    const handleTemplateSelect = (template: IndustryTemplate) => {
        setSelectedTemplate(template);
    };

    // Confirm template and proceed
    const handleTemplateConfirm = () => {
        if (!selectedTemplate) return;

        const draftItems: DraftInventoryItem[] = selectedTemplate.items.map((item, i) => ({
            id: `template_${Date.now()}_${i}`,
            name: item.name,
            category: item.category,
            quantityUnit: item.unit,
            unitCost: 0,
            location: selectedTemplate.locations[0]?.name || 'Default Storage',
            minStockLevel: item.suggestedPar || 0,
            status: 'warning' as const,
            errors: [],
            warnings: ['Min stock level is 0', 'Set unit cost'].filter((_, idx) =>
                idx === 0 ? item.suggestedPar === 0 : true
            ),
        }));

        const draftCategories: DraftCategory[] = selectedTemplate.categories.map(c => ({
            name: c.name,
            parentId: c.parent,
        }));

        const draftLocations: DraftLocation[] = selectedTemplate.locations;

        onComplete('template', draftItems, draftLocations, draftCategories, selectedTemplate);
    };

    // Handle photo scan
    const handlePhotoScan = () => {
        onOpenScanner();
    };

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Select Data Source</h2>
                <p className="text-gray-500">Choose the best way to start building your inventory</p>
            </div>

            {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
                    <p className="font-medium">Import Failed</p>
                    <p className="text-sm mt-1">{error}</p>
                </div>
            )}

            {/* Three Options */}
            <div className="grid md:grid-cols-3 gap-4 mb-8">
                {/* Option A: Excel Import */}
                <button
                    onClick={() => {
                        setSelectedPath('import');
                        setSelectedTemplate(null);
                        fileInputRef.current?.click();
                    }}
                    disabled={isProcessing}
                    className={`
            p-6 rounded-2xl border-2 text-left transition-all
            ${selectedPath === 'import'
                            ? 'border-primary bg-primary/5'
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'}
            ${isProcessing ? 'opacity-50 cursor-wait' : ''}
          `}
                >
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                            <FileSpreadsheet className="w-6 h-6 text-blue-600" />
                        </div>
                        <span className="px-2 py-1 text-xs font-bold bg-blue-100 text-blue-700 rounded-full">
                            Recommended
                        </span>
                    </div>
                    <h3 className="font-bold text-gray-900 mb-1">Import Existing Inventory</h3>
                    <p className="text-sm text-gray-500 mb-3">
                        Upload Excel or CSV file
                    </p>
                    <div className="flex items-center text-sm text-gray-400">
                        <Clock className="w-4 h-4 mr-1" />
                        ~2 minutes
                    </div>
                </button>

                {/* Option B: Template */}
                <button
                    onClick={() => {
                        setSelectedPath('template');
                        setSelectedTemplate(null);
                    }}
                    disabled={isProcessing}
                    className={`
            p-6 rounded-2xl border-2 text-left transition-all
            ${selectedPath === 'template'
                            ? 'border-primary bg-primary/5'
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'}
          `}
                >
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
                            <Sparkles className="w-6 h-6 text-purple-600" />
                        </div>
                        <span className="px-2 py-1 text-xs font-bold bg-green-100 text-green-700 rounded-full">
                            New Store
                        </span>
                    </div>
                    <h3 className="font-bold text-gray-900 mb-1">Use Industry Template</h3>
                    <p className="text-sm text-gray-500 mb-3">
                        Quick start with standard categories and common items
                    </p>
                    <div className="flex items-center text-sm text-green-600 font-medium">
                        <CheckCircle2 className="w-4 h-4 mr-1" />
                        Saves 80% setup time
                    </div>
                </button>

                {/* Option C: Photo Scan */}
                <button
                    onClick={() => {
                        setSelectedPath('photo');
                        handlePhotoScan();
                    }}
                    disabled={isProcessing}
                    className={`
            p-6 rounded-2xl border-2 text-left transition-all
            ${selectedPath === 'photo'
                            ? 'border-primary bg-primary/5'
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'}
          `}
                >
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center">
                            <Camera className="w-6 h-6 text-orange-600" />
                        </div>
                    </div>
                    <h3 className="font-bold text-gray-900 mb-1">Photo Scan</h3>
                    <p className="text-sm text-gray-500 mb-3">
                        Scan shelves or inventory, AI auto-detects items
                    </p>
                    <div className="flex items-center text-sm text-gray-400">
                        <Clock className="w-4 h-4 mr-1" />
                        ~5 minutes
                    </div>
                </button>
            </div>

            {/* Hidden file input */}
            <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(file);
                }}
            />

            {/* Template Selection Panel */}
            {selectedPath === 'template' && (
                <div className="border-t border-gray-200 pt-6">
                    <h3 className="font-bold text-gray-900 mb-4">Select Your Business Type</h3>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
                        {INDUSTRY_TEMPLATES.map((template) => (
                            <button
                                key={template.id}
                                onClick={() => handleTemplateSelect(template)}
                                className={`
                  p-4 rounded-xl border-2 text-left transition-all
                  ${selectedTemplate?.id === template.id
                                        ? 'border-primary bg-primary/5'
                                        : 'border-gray-200 hover:border-gray-300'}
                `}
                            >
                                <div className="text-2xl mb-2">{template.icon}</div>
                                <div className="font-medium text-gray-900">{template.nameZh}</div>
                                <div className="text-xs text-gray-500 mt-1">
                                    {template.items.length} items
                                </div>
                            </button>
                        ))}
                    </div>

                    {/* Template Preview */}
                    {selectedTemplate && (
                        <div className="bg-gray-50 rounded-xl p-4 mb-4">
                            <h4 className="font-bold text-gray-900 mb-3">
                                {selectedTemplate.name} Template Preview
                            </h4>

                            <div className="grid md:grid-cols-3 gap-4 text-sm">
                                <div>
                                    <div className="text-gray-500 mb-2">📁 Categories</div>
                                    <div className="text-gray-900">
                                        {selectedTemplate.categories.filter(c => !c.parent).length} main,
                                        {selectedTemplate.categories.length} total
                                    </div>
                                </div>
                                <div>
                                    <div className="text-gray-500 mb-2">📦 Items</div>
                                    <div className="text-gray-900">
                                        {selectedTemplate.items.length} common items
                                    </div>
                                </div>
                                <div>
                                    <div className="text-gray-500 mb-2">📍 Locations</div>
                                    <div className="text-gray-900">
                                        {selectedTemplate.locations.length} storage locations
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={handleTemplateConfirm}
                                className="mt-4 w-full py-3 bg-primary text-white font-bold rounded-xl hover:bg-black flex items-center justify-center gap-2"
                            >
                                Use This Template
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Loading State */}
            {isProcessing && (
                <div className="text-center py-8">
                    <div className="inline-flex items-center gap-3 px-6 py-3 bg-gray-100 rounded-full">
                        <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                        <span className="text-gray-700 font-medium">Parsing file...</span>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Stage1Ingest;
