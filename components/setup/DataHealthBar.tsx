/**
 * DataHealthBar - Visual indicator of data completion status
 */
import React from 'react';

interface DataHealthProps {
    criticalCount: number;
    warningCount: number;
    readyCount: number;
    totalCount: number;
}

export const DataHealthBar: React.FC<DataHealthProps> = ({
    criticalCount,
    warningCount,
    readyCount,
    totalCount,
}) => {
    const healthPercentage = totalCount > 0
        ? Math.round((readyCount / totalCount) * 100)
        : 0;

    const getHealthColor = () => {
        if (criticalCount > 0) return 'from-red-500 to-red-400';
        if (warningCount > 0) return 'from-amber-500 to-amber-400';
        return 'from-green-500 to-green-400';
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <span className="text-lg font-semibold text-gray-900 dark:text-white">
                        Data Health
                    </span>
                    <span className={`text-2xl font-bold ${criticalCount > 0 ? 'text-red-500' :
                            warningCount > 0 ? 'text-amber-500' :
                                'text-green-500'
                        }`}>
                        {healthPercentage}%
                    </span>
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                    {readyCount}/{totalCount} items ready
                </div>
            </div>

            {/* Progress Bar */}
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                    className={`h-full bg-gradient-to-r ${getHealthColor()} transition-all duration-500`}
                    style={{ width: `${healthPercentage}%` }}
                />
            </div>

            {/* Status Summary */}
            <div className="flex items-center gap-6 mt-3 text-sm">
                {criticalCount > 0 && (
                    <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                        <span className="text-red-600 dark:text-red-400 font-medium">
                            {criticalCount} critical
                        </span>
                    </div>
                )}
                {warningCount > 0 && (
                    <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                        <span className="text-amber-600 dark:text-amber-400 font-medium">
                            {warningCount} warnings
                        </span>
                    </div>
                )}
                <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
                    <span className="text-green-600 dark:text-green-400 font-medium">
                        {readyCount} ready
                    </span>
                </div>
            </div>
        </div>
    );
};

export default DataHealthBar;
