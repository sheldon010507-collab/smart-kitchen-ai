/**
 * Stage 3: Data Cleaning
 * Duplicate detection, batch editing, and data standardization
 * Enhanced with Data Health System (v1.3)
 */
import React, { useState, useCallback, useMemo } from 'react';
import { Stage3CleanseProps, DraftInventoryItem, ValidationIssue } from './types';
import { WIZARD_STRINGS, UNIT_NORMALIZATION, UNIT_OPTIONS } from './constants';
import { DataHealthBar } from './DataHealthBar';
import { migrateLegacyDraftItems } from '../../utils/draftMigration';

// Levenshtein distance for similarity detection
const levenshtein = (a: string, b: string): number => {
    const matrix: number[][] = [];

    for (let i = 0; i <= b.length; i++) {
        matrix[i] = [i];
    }
    for (let j = 0; j <= a.length; j++) {
        matrix[0][j] = j;
    }

    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1,
                    matrix[i][j - 1] + 1,
                    matrix[i - 1][j] + 1
                );
            }
        }
    }

    return matrix[b.length][a.length];
};

// Check if two names are similar
const isSimilar = (a: string, b: string, threshold = 0.3): boolean => {
    const aLower = a.toLowerCase().trim();
    const bLower = b.toLowerCase().trim();

    if (aLower === bLower) return true;

    const maxLen = Math.max(aLower.length, bLower.length);
    if (maxLen === 0) return false;

    const distance = levenshtein(aLower, bLower);
    return distance / maxLen <= threshold;
};

// Normalize unit
const normalizeUnit = (unit: string): string => {
    const normalized = UNIT_NORMALIZATION[unit.toLowerCase().trim()];
    return normalized || unit;
};

// Tab types
type TabType = 'action' | 'review' | 'ready' | 'all';

// Item status classification
type ItemStatus = 'critical' | 'warning' | 'ready';

export const Stage3Cleanse: React.FC<Stage3CleanseProps> = ({
    items,
    existingCategories,
    existingLocations,
    onNext,
    onBack,
}) => {
    const [draftItems, setDraftItems] = useState<DraftInventoryItem[]>(() => {
        // Initial processing: detect issues
        return items.map(item => ({
            ...item,
            issues: [],
            isDuplicate: false,
        }));
    });

    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [editingId, setEditingId] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<TabType>('all');

    // Batch edit state
    const [batchCategory, setBatchCategory] = useState('');
    const [batchLocation, setBatchLocation] = useState('');
    const [batchUnit, setBatchUnit] = useState('');
    const [batchPar, setBatchPar] = useState<number | ''>('');
    const [batchSupplier, setBatchSupplier] = useState('');

    // Detect duplicates and issues
    const processedItems = useMemo(() => {
        const processed = [...draftItems];
        const nameMap = new Map<string, number[]>();

        // Build name map for duplicate detection
        processed.forEach((item, index) => {
            if (item.isDeleted) return;
            const lower = item.name.toLowerCase().trim();
            if (!nameMap.has(lower)) {
                nameMap.set(lower, []);
            }
            nameMap.get(lower)!.push(index);
        });

        // Check for issues
        processed.forEach((item, index) => {
            if (item.isDeleted) return;

            const issues: ValidationIssue[] = [];

            // Check for exact duplicates
            const lower = item.name.toLowerCase().trim();
            const duplicates = nameMap.get(lower) || [];
            if (duplicates.length > 1 && duplicates[0] !== index) {
                item.isDuplicate = true;
                issues.push({
                    field: 'name',
                    message: `${WIZARD_STRINGS.duplicateWarning} "${processed[duplicates[0]].name}"`,
                    severity: 'warning',
                });
            }

            // Check for missing category
            if (!item.category) {
                issues.push({
                    field: 'category',
                    message: WIZARD_STRINGS.missingCategory,
                    severity: 'warning',
                });
            }

            // Check for invalid unit
            const normalized = normalizeUnit(item.unit || '');
            if (item.unit && normalized !== item.unit) {
                issues.push({
                    field: 'unit',
                    message: `${WIZARD_STRINGS.invalidUnit}: "${item.unit}" → "${normalized}"`,
                    severity: 'warning',
                });
            }

            item.issues = issues;
        });

        return processed;
    }, [draftItems]);

    // Classify item status
    const getItemStatus = (item: DraftInventoryItem): ItemStatus => {
        const hasCritical = !item.name || !item.unit || !item.category || !item.location;
        if (hasCritical) return 'critical';
        if (item.isDuplicate || (item.issues?.length || 0) > 0) return 'warning';
        return 'ready';
    };

    // Categorized items
    const categorizedItems = useMemo(() => {
        const active = processedItems.filter(i => !i.isDeleted);
        const critical: DraftInventoryItem[] = [];
        const warning: DraftInventoryItem[] = [];
        const ready: DraftInventoryItem[] = [];

        active.forEach(item => {
            const status = getItemStatus(item);
            if (status === 'critical') critical.push(item);
            else if (status === 'warning') warning.push(item);
            else ready.push(item);
        });

        return { critical, warning, ready, all: active };
    }, [processedItems]);

    // All available categories (existing + from items)
    const activeItems = categorizedItems.all;
    const allCategories = useMemo(() => {
        const cats = new Set(existingCategories);
        activeItems.forEach(i => i.category && cats.add(i.category));
        return Array.from(cats).sort();
    }, [existingCategories, activeItems]);

    // All available locations
    const allLocations = useMemo(() => {
        const locs = new Set(existingLocations);
        activeItems.forEach(i => i.location && locs.add(i.location));
        return Array.from(locs).sort();
    }, [existingLocations, activeItems]);

    // Handlers
    const handleUpdateItem = useCallback((id: string, updates: Partial<DraftInventoryItem>) => {
        setDraftItems(prev => prev.map(item =>
            item.id === id ? { ...item, ...updates } : item
        ));
    }, []);

    const handleDeleteItem = useCallback((id: string) => {
        setDraftItems(prev => prev.map(item =>
            item.id === id ? { ...item, isDeleted: true } : item
        ));
        setSelectedIds(prev => {
            const next = new Set(prev);
            next.delete(id);
            return next;
        });
    }, []);

    const handleMergeItems = useCallback((keepId: string, deleteId: string) => {
        setDraftItems(prev => prev.map(item =>
            item.id === deleteId ? { ...item, isDeleted: true } : item
        ));
    }, []);

    const handleAutoFix = useCallback((id: string) => {
        setDraftItems(prev => prev.map(item => {
            if (item.id !== id) return item;
            return {
                ...item,
                unit: normalizeUnit(item.unit || 'pcs'),
            };
        }));
    }, []);

    // Selection handlers
    const handleToggleSelect = useCallback((id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    }, []);

    const handleSelectAll = useCallback(() => {
        setSelectedIds(new Set(activeItems.map(i => i.id)));
    }, [activeItems]);

    const handleDeselectAll = useCallback(() => {
        setSelectedIds(new Set());
    }, []);

    // Batch operations
    const handleBatchSetCategory = useCallback(() => {
        if (!batchCategory) return;
        setDraftItems(prev => prev.map(item =>
            selectedIds.has(item.id) ? { ...item, category: batchCategory } : item
        ));
        setBatchCategory('');
    }, [batchCategory, selectedIds]);

    const handleBatchSetLocation = useCallback(() => {
        if (!batchLocation) return;
        setDraftItems(prev => prev.map(item =>
            selectedIds.has(item.id) ? { ...item, location: batchLocation } : item
        ));
        setBatchLocation('');
    }, [batchLocation, selectedIds]);

    const handleBatchSetUnit = useCallback(() => {
        if (!batchUnit) return;
        setDraftItems(prev => prev.map(item =>
            selectedIds.has(item.id) ? { ...item, quantityUnit: batchUnit } : item
        ));
        setBatchUnit('');
    }, [batchUnit, selectedIds]);

    const handleBatchSetPar = useCallback(() => {
        if (batchPar === '') return;
        setDraftItems(prev => prev.map(item =>
            selectedIds.has(item.id) ? { ...item, minStockLevel: Number(batchPar) } : item
        ));
        setBatchPar('');
    }, [batchPar, selectedIds]);

    const handleBatchSetSupplier = useCallback(() => {
        if (!batchSupplier) return;
        setDraftItems(prev => prev.map(item =>
            selectedIds.has(item.id) ? { ...item, supplier: batchSupplier } : item
        ));
        setBatchSupplier('');
    }, [batchSupplier, selectedIds]);

    const handleBatchDelete = useCallback(() => {
        setDraftItems(prev => prev.map(item =>
            selectedIds.has(item.id) ? { ...item, isDeleted: true } : item
        ));
        setSelectedIds(new Set());
    }, [selectedIds]);

    const handleNext = useCallback(() => {
        onNext(processedItems.filter(i => !i.isDeleted));
    }, [processedItems, onNext]);

    return (
        <div className="space-y-6">
            {/* Data Health Bar */}
            <DataHealthBar
                criticalCount={categorizedItems.critical.length}
                warningCount={categorizedItems.warning.length}
                readyCount={categorizedItems.ready.length}
                totalCount={activeItems.length}
            />

            {/* Tab Navigation */}
            <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg">
                <button
                    onClick={() => setActiveTab('action')}
                    className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${activeTab === 'action'
                        ? 'bg-red-500 text-white'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                        }`}
                >
                    🔴 Action Required ({categorizedItems.critical.length})
                </button>
                <button
                    onClick={() => setActiveTab('review')}
                    className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${activeTab === 'review'
                        ? 'bg-amber-500 text-white'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                        }`}
                >
                    🟡 Review ({categorizedItems.warning.length})
                </button>
                <button
                    onClick={() => setActiveTab('ready')}
                    className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${activeTab === 'ready'
                        ? 'bg-green-500 text-white'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                        }`}
                >
                    ✅ Ready ({categorizedItems.ready.length})
                </button>
                <button
                    onClick={() => setActiveTab('all')}
                    className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${activeTab === 'all'
                        ? 'bg-blue-500 text-white'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                        }`}
                >
                    All ({activeItems.length})
                </button>
            </div>

            {/* Critical Items Alert (only shown if there are critical items) */}
            {categorizedItems.critical.length > 0 && activeTab !== 'action' && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
                    <div className="flex items-center gap-2">
                        <span className="text-xl">🔴</span>
                        <span className="font-semibold text-red-700 dark:text-red-300">
                            {categorizedItems.critical.length} items need your attention before proceeding
                        </span>
                        <button
                            onClick={() => setActiveTab('action')}
                            className="ml-auto text-sm text-red-600 dark:text-red-400 hover:underline"
                        >
                            View all →
                        </button>
                    </div>
                </div>
            )}

            {/* Batch Edit Section */}
            <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-gray-700 dark:text-gray-300">
                        {WIZARD_STRINGS.batchEdit}
                    </h4>
                    <div className="flex items-center gap-2 text-sm">
                        <span className="text-gray-500 dark:text-gray-400">
                            Selected: {selectedIds.size}
                        </span>
                        <button
                            onClick={handleSelectAll}
                            className="text-blue-500 hover:underline"
                        >
                            {WIZARD_STRINGS.selectAll}
                        </button>
                        <button
                            onClick={handleDeselectAll}
                            className="text-gray-500 hover:underline"
                        >
                            {WIZARD_STRINGS.deselectAll}
                        </button>
                    </div>
                </div>

                <div className="flex flex-wrap gap-3">
                    {/* Set Category */}
                    <div className="flex items-center gap-2">
                        <select
                            value={batchCategory}
                            onChange={e => setBatchCategory(e.target.value)}
                            className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm"
                        >
                            <option value="">{WIZARD_STRINGS.setCategory}</option>
                            {allCategories.map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>
                        <button
                            onClick={handleBatchSetCategory}
                            disabled={!batchCategory || selectedIds.size === 0}
                            className="px-3 py-1.5 bg-blue-500 text-white rounded-lg text-sm disabled:opacity-50"
                        >
                            Apply
                        </button>
                    </div>

                    {/* Set Location */}
                    <div className="flex items-center gap-2">
                        <select
                            value={batchLocation}
                            onChange={e => setBatchLocation(e.target.value)}
                            className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm"
                        >
                            <option value="">{WIZARD_STRINGS.setLocation}</option>
                            {allLocations.map(loc => (
                                <option key={loc} value={loc}>{loc}</option>
                            ))}
                        </select>
                        <button
                            onClick={handleBatchSetLocation}
                            disabled={!batchLocation || selectedIds.size === 0}
                            className="px-3 py-1.5 bg-blue-500 text-white rounded-lg text-sm disabled:opacity-50"
                        >
                            Apply
                        </button>
                    </div>

                    {/* Set Unit */}
                    <div className="flex items-center gap-2">
                        <select
                            value={batchUnit}
                            onChange={e => setBatchUnit(e.target.value)}
                            className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm"
                        >
                            <option value="">{WIZARD_STRINGS.setUnit}</option>
                            {UNIT_OPTIONS.map(u => (
                                <option key={u} value={u}>{u}</option>
                            ))}
                        </select>
                        <button
                            onClick={handleBatchSetUnit}
                            disabled={!batchUnit || selectedIds.size === 0}
                            className="px-3 py-1.5 bg-blue-500 text-white rounded-lg text-sm disabled:opacity-50"
                        >
                            Apply
                        </button>
                    </div>

                    {/* Set Par Level */}
                    <div className="flex items-center gap-2">
                        <input
                            type="number"
                            value={batchPar}
                            onChange={e => setBatchPar(e.target.value ? Number(e.target.value) : '')}
                            placeholder={WIZARD_STRINGS.setParLevel}
                            className="w-24 px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm"
                        />
                        <button
                            onClick={handleBatchSetPar}
                            disabled={batchPar === '' || selectedIds.size === 0}
                            className="px-3 py-1.5 bg-blue-500 text-white rounded-lg text-sm disabled:opacity-50"
                        >
                            Apply
                        </button>
                    </div>

                    {/* Set Supplier */}
                    <div className="flex items-center gap-2">
                        <input
                            type="text"
                            value={batchSupplier}
                            onChange={e => setBatchSupplier(e.target.value)}
                            placeholder={WIZARD_STRINGS.setSupplier}
                            className="w-32 px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm"
                        />
                        <button
                            onClick={handleBatchSetSupplier}
                            disabled={!batchSupplier || selectedIds.size === 0}
                            className="px-3 py-1.5 bg-blue-500 text-white rounded-lg text-sm disabled:opacity-50"
                        >
                            Apply
                        </button>
                    </div>

                    {/* Delete Selected */}
                    <button
                        onClick={handleBatchDelete}
                        disabled={selectedIds.size === 0}
                        className="px-3 py-1.5 bg-red-500 text-white rounded-lg text-sm disabled:opacity-50"
                    >
                        {WIZARD_STRINGS.deleteSelected}
                    </button>
                </div>
            </div>

            {/* Items Table */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="overflow-x-auto max-h-96">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 dark:bg-gray-900 sticky top-0">
                            <tr>
                                <th className="px-4 py-3 text-left w-10">
                                    <input
                                        type="checkbox"
                                        checked={selectedIds.size === activeItems.length && activeItems.length > 0}
                                        onChange={() => selectedIds.size === activeItems.length ? handleDeselectAll() : handleSelectAll()}
                                        className="rounded"
                                    />
                                </th>
                                <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">Name</th>
                                <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">Category</th>
                                <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">Unit</th>
                                <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">Location</th>
                                <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">{WIZARD_STRINGS.parLevel}</th>
                                <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">{WIZARD_STRINGS.supplier}</th>
                                <th className="px-4 py-3 w-10"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {(activeTab === 'action' ? categorizedItems.critical :
                                activeTab === 'review' ? categorizedItems.warning :
                                    activeTab === 'ready' ? categorizedItems.ready :
                                        activeItems).map(item => {
                                            const status = getItemStatus(item);
                                            return (
                                                <tr
                                                    key={item.id}
                                                    className={`
                                        ${status === 'critical' ? 'bg-red-50/50 dark:bg-red-900/10 border-l-4 border-l-red-500' :
                                                            status === 'warning' ? 'bg-amber-50/50 dark:bg-amber-900/10 border-l-4 border-l-amber-500' :
                                                                'border-l-4 border-l-green-500'
                                                        }
                                        ${selectedIds.has(item.id) ? 'bg-blue-50 dark:bg-blue-900/20' : ''}
                                    `}
                                                >
                                                    <td className="px-4 py-2">
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedIds.has(item.id)}
                                                            onChange={() => handleToggleSelect(item.id)}
                                                            className="rounded"
                                                        />
                                                    </td>
                                                    <td className="px-4 py-2">
                                                        {editingId === item.id ? (
                                                            <input
                                                                type="text"
                                                                value={item.name}
                                                                onChange={e => handleUpdateItem(item.id, { name: e.target.value })}
                                                                className="w-full px-2 py-1 border rounded"
                                                                autoFocus
                                                                onBlur={() => setEditingId(null)}
                                                            />
                                                        ) : (
                                                            <span
                                                                className="text-gray-900 dark:text-white cursor-pointer hover:underline"
                                                                onClick={() => setEditingId(item.id)}
                                                            >
                                                                {item.name}
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-2">
                                                        <select
                                                            value={item.category || ''}
                                                            onChange={e => handleUpdateItem(item.id, { category: e.target.value })}
                                                            className="px-2 py-1 border border-gray-200 dark:border-gray-600 rounded bg-transparent text-sm"
                                                        >
                                                            <option value="">--</option>
                                                            {allCategories.map(cat => (
                                                                <option key={cat} value={cat}>{cat}</option>
                                                            ))}
                                                        </select>
                                                    </td>
                                                    <td className="px-4 py-2">
                                                        <select
                                                            value={item.quantityUnit || item.unit || 'pcs'}
                                                            onChange={e => handleUpdateItem(item.id, { quantityUnit: e.target.value })}
                                                            className="px-2 py-1 border border-gray-200 dark:border-gray-600 rounded bg-transparent text-sm"
                                                        >
                                                            {UNIT_OPTIONS.map(u => (
                                                                <option key={u} value={u}>{u}</option>
                                                            ))}
                                                        </select>
                                                    </td>
                                                    <td className="px-4 py-2">
                                                        <select
                                                            value={item.location || ''}
                                                            onChange={e => handleUpdateItem(item.id, { location: e.target.value })}
                                                            className="px-2 py-1 border border-gray-200 dark:border-gray-600 rounded bg-transparent text-sm"
                                                        >
                                                            <option value="">--</option>
                                                            {allLocations.map(loc => (
                                                                <option key={loc} value={loc}>{loc}</option>
                                                            ))}
                                                        </select>
                                                    </td>
                                                    <td className="px-4 py-2">
                                                        <input
                                                            type="number"
                                                            value={item.minStockLevel ?? item.suggestedPar ?? ''}
                                                            onChange={e => handleUpdateItem(item.id, { minStockLevel: e.target.value ? Number(e.target.value) : undefined })}
                                                            className="w-16 px-2 py-1 border border-gray-200 dark:border-gray-600 rounded bg-transparent text-sm text-center"
                                                            placeholder="--"
                                                        />
                                                    </td>
                                                    <td className="px-4 py-2">
                                                        <input
                                                            type="text"
                                                            value={item.supplier || ''}
                                                            onChange={e => handleUpdateItem(item.id, { supplier: e.target.value })}
                                                            className="w-24 px-2 py-1 border border-gray-200 dark:border-gray-600 rounded bg-transparent text-sm"
                                                            placeholder="--"
                                                        />
                                                    </td>
                                                    <td className="px-4 py-2">
                                                        <button
                                                            onClick={() => handleDeleteItem(item.id)}
                                                            className="p-1 text-gray-400 hover:text-red-500 rounded"
                                                        >
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                            </svg>
                                                        </button>
                                                    </td>
                                                </tr>
                                            )
                                        })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Footer */}
            <div className="flex justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                    onClick={onBack}
                    className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                    ← {WIZARD_STRINGS.back}
                </button>
                <button
                    onClick={handleNext}
                    disabled={activeItems.length === 0}
                    className={`
            px-6 py-2 rounded-lg font-medium transition-colors
            ${activeItems.length > 0
                            ? 'bg-blue-500 hover:bg-blue-600 text-white'
                            : 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                        }
          `}
                >
                    {WIZARD_STRINGS.next}: {WIZARD_STRINGS.step4} →
                </button>
            </div>
        </div>
    );
};

export default Stage3Cleanse;
