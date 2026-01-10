/**
 * SuccessPage - Shown after successful inventory setup completion
 */
import React from 'react';

interface SuccessPageProps {
    itemCount: number;
    categoryCount: number;
    locationCount: number;
    onViewInventory: () => void;
    onStartCount?: () => void;
}

export const SuccessPage: React.FC<SuccessPageProps> = ({
    itemCount,
    categoryCount,
    locationCount,
    onViewInventory,
    onStartCount,
}) => {
    return (
        <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
            {/* Celebration Icon */}
            <div className="text-7xl mb-6 animate-bounce">🎉</div>

            {/* Title */}
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Inventory Setup Complete!
            </h2>
            <p className="text-gray-500 dark:text-gray-400 mb-8">
                Your inventory baseline has been created successfully.
            </p>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-6 mb-10 w-full max-w-md">
                <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4">
                    <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                        {itemCount}
                    </div>
                    <div className="text-sm text-green-700 dark:text-green-300">
                        Items Added
                    </div>
                </div>
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4">
                    <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                        {categoryCount}
                    </div>
                    <div className="text-sm text-blue-700 dark:text-blue-300">
                        Categories
                    </div>
                </div>
                <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-4">
                    <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                        {locationCount}
                    </div>
                    <div className="text-sm text-purple-700 dark:text-purple-300">
                        Locations
                    </div>
                </div>
            </div>

            {/* Next Steps Hint */}
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 mb-8 w-full max-w-md text-left">
                <div className="flex items-start gap-3">
                    <span className="text-xl">💡</span>
                    <div>
                        <div className="font-semibold text-amber-700 dark:text-amber-300 mb-1">
                            Next Step: First Count
                        </div>
                        <p className="text-sm text-amber-600 dark:text-amber-400">
                            All items have been initialized with quantity 0. Perform a stock count to update actual quantities.
                        </p>
                    </div>
                </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4">
                <button
                    onClick={onViewInventory}
                    className="px-6 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                    📊 View Inventory
                </button>
                {onStartCount && (
                    <button
                        onClick={onStartCount}
                        className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-medium hover:from-green-600 hover:to-emerald-600 shadow-lg transition-all"
                    >
                        📦 Start First Count
                    </button>
                )}
            </div>
        </div>
    );
};

export default SuccessPage;
