import React, { useMemo } from 'react';
import {
    CheckCircle2,
    AlertTriangle,
    AlertCircle,
    Package,
    MapPin,
    FolderTree,
    Sparkles
} from 'lucide-react';
import type { DraftInventoryItem, DraftLocation, DraftCategory } from '../../types';

interface Props {
    draftItems: DraftInventoryItem[];
    draftLocations: DraftLocation[];
    draftCategories: DraftCategory[];
    onCommit: () => void;
    isCommitting: boolean;
}

const Stage4Commit: React.FC<Props> = ({
    draftItems,
    draftLocations,
    draftCategories,
    onCommit,
    isCommitting,
}) => {
    // Summary stats
    const stats = useMemo(() => {
        const errorCount = draftItems.filter(i => i.status === 'error').length;
        const warningCount = draftItems.filter(i => i.status === 'warning').length;
        const readyCount = draftItems.filter(i => i.status === 'ready').length;

        return {
            totalItems: draftItems.length,
            errorCount,
            warningCount,
            readyCount,
            canCommit: errorCount === 0 && draftItems.length > 0,
            categories: new Set(draftItems.map(i => i.category)).size,
            locations: new Set(draftItems.map(i => i.location)).size,
        };
    }, [draftItems]);

    if (stats.errorCount > 0) {
        return (
            <div className="p-6 max-w-2xl mx-auto">
                <div className="text-center py-12">
                    <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-gray-900 mb-2">Cannot Complete Setup</h2>
                    <p className="text-gray-500 mb-6">
                        <span className="font-bold text-red-600">{stats.errorCount}</span> items need to be fixed
                    </p>
                    <div className="text-sm text-gray-500">
                        Please go back and fix the issues in the "Needs Fix" tab
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-2xl mx-auto">
            <div className="text-center mb-8">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 className="w-10 h-10 text-green-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Ready to Complete Setup</h2>
                <p className="text-gray-500">The following data will be imported</p>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-4 mb-8">
                <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
                    <Package className="w-8 h-8 text-primary mx-auto mb-2" />
                    <div className="text-2xl font-bold text-gray-900">{stats.totalItems}</div>
                    <div className="text-sm text-gray-500">Items</div>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
                    <FolderTree className="w-8 h-8 text-purple-500 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-gray-900">{stats.categories}</div>
                    <div className="text-sm text-gray-500">Categories</div>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
                    <MapPin className="w-8 h-8 text-orange-500 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-gray-900">{stats.locations}</div>
                    <div className="text-sm text-gray-500">Locations</div>
                </div>
            </div>

            {/* Status Summary */}
            <div className="bg-gray-50 rounded-xl p-4 mb-8">
                <h3 className="font-medium text-gray-900 mb-3">Data Status</h3>
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-green-500" />
                            <span className="text-sm text-gray-600">Ready</span>
                        </div>
                        <span className="text-sm font-medium text-gray-900">{stats.readyCount} items</span>
                    </div>
                    {stats.warningCount > 0 && (
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4 text-yellow-500" />
                                <span className="text-sm text-gray-600">Has warnings (will use defaults)</span>
                            </div>
                            <span className="text-sm font-medium text-yellow-600">{stats.warningCount} items</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Warning Notice */}
            {stats.warningCount > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-8">
                    <div className="flex gap-3">
                        <AlertTriangle className="w-5 h-5 text-yellow-600 shrink-0 mt-0.5" />
                        <div>
                            <h4 className="font-medium text-yellow-800 mb-1">About Warnings</h4>
                            <p className="text-sm text-yellow-700">
                                {stats.warningCount} items are using default values (e.g., par level is 0).
                                You can update these values anytime after setup.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Next Steps */}
            <div className="bg-primary/5 rounded-xl p-4 mb-8">
                <h3 className="font-medium text-primary mb-3 flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    Next Steps
                </h3>
                <ul className="text-sm text-gray-600 space-y-2">
                    <li className="flex items-start gap-2">
                        <span className="text-primary">→</span>
                        <span>Do your <strong>first inventory count</strong> to enter actual quantities</span>
                    </li>
                    <li className="flex items-start gap-2">
                        <span className="text-primary">→</span>
                        <span>Update <strong>unit costs</strong> for cost analysis</span>
                    </li>
                    <li className="flex items-start gap-2">
                        <span className="text-primary">→</span>
                        <span>Set up <strong>low stock alerts</strong> to ensure timely restocking</span>
                    </li>
                </ul>
            </div>

            {/* Commit Button */}
            <button
                onClick={onCommit}
                disabled={!stats.canCommit || isCommitting}
                className={`
          w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2
          ${stats.canCommit && !isCommitting
                        ? 'bg-green-600 text-white hover:bg-green-700'
                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'}
        `}
            >
                {isCommitting ? (
                    <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Saving...
                    </>
                ) : (
                    <>
                        <CheckCircle2 className="w-5 h-5" />
                        Complete Setup
                    </>
                )}
            </button>
        </div>
    );
};

export default Stage4Commit;
