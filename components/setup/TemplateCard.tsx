/**
 * Template Card Component
 * Displays a template in the selection grid
 */
import React from 'react';
import { TemplateCardProps } from './types';
import { WIZARD_STRINGS } from './constants';
import { isSystemTemplate } from './constants';

export const TemplateCard: React.FC<TemplateCardProps> = ({
    template,
    source,
    onSelect,
    onEdit,
    onDelete,
    onPreview,
    isSelected = false,
}) => {
    const canEdit = source === 'user' && !isSystemTemplate(template.id);

    return (
        <div
            className={`
        relative p-4 rounded-xl border-2 transition-all duration-200 cursor-pointer
        ${isSelected
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600'
                }
        ${isSelected ? 'shadow-lg' : 'hover:shadow-md'}
      `}
            onClick={() => onSelect(template)}
        >
            {/* Selected Indicator */}
            {isSelected && (
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                </div>
            )}

            {/* Icon & Actions */}
            <div className="flex justify-between items-start mb-2">
                <span className="text-3xl">{template.icon}</span>
                {canEdit && (
                    <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                        {onEdit && (
                            <button
                                onClick={() => onEdit(template)}
                                className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                                title="Edit"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                            </button>
                        )}
                        {onDelete && (
                            <button
                                onClick={() => onDelete(template)}
                                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                                title="Delete"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Name */}
            <h3 className="font-semibold text-gray-900 dark:text-white mb-1 line-clamp-1">
                {template.name}
            </h3>

            {/* Chinese name (if available) */}
            {template.nameZh && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                    {template.nameZh}
                </p>
            )}

            {/* Stats */}
            <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                <span>{template.items.length} {WIZARD_STRINGS.items}</span>
                <span>•</span>
                <span>{template.categories.length} {WIZARD_STRINGS.categories}</span>
            </div>

            {/* Preview Button */}
            {onPreview && (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onPreview(template);
                    }}
                    className="mt-3 w-full py-1.5 text-sm font-medium text-blue-600 dark:text-blue-400 
                     hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                >
                    {WIZARD_STRINGS.preview}
                </button>
            )}

            {/* Source Badge */}
            {source === 'system' && (
                <div className="absolute top-2 left-2">
                    <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full">
                        System
                    </span>
                </div>
            )}
        </div>
    );
};

export default TemplateCard;
