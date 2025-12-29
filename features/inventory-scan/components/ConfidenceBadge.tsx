/**
 * ConfidenceBadge - Visual indicator for recognition confidence
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Check, AlertTriangle, HelpCircle } from 'lucide-react';

interface ConfidenceBadgeProps {
    confidence: number;
    showLabel?: boolean;
    size?: 'sm' | 'md' | 'lg';
}

export default function ConfidenceBadge({
    confidence,
    showLabel = false,
    size = 'md'
}: ConfidenceBadgeProps) {
    // Determine level and styling
    const level = getConfidenceLevel(confidence);

    const sizeClasses = {
        sm: 'h-5 text-xs px-1.5',
        md: 'h-6 text-sm px-2',
        lg: 'h-8 text-base px-3'
    };

    const iconSizes = {
        sm: 'w-3 h-3',
        md: 'w-4 h-4',
        lg: 'w-5 h-5'
    };

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`
        inline-flex items-center gap-1 rounded-full font-medium
        ${sizeClasses[size]}
        ${level.bgColor} ${level.textColor}
      `}
            title={`${Math.round(confidence * 100)}% confidence`}
        >
            <level.Icon className={iconSizes[size]} />
            {showLabel && (
                <span>{level.label}</span>
            )}
            {!showLabel && (
                <span>{Math.round(confidence * 100)}%</span>
            )}
        </motion.div>
    );
}

/**
 * Get confidence level configuration
 */
function getConfidenceLevel(confidence: number) {
    if (confidence >= 0.8) {
        return {
            level: 'high',
            label: 'High',
            Icon: Check,
            bgColor: 'bg-emerald-100',
            textColor: 'text-emerald-700',
            dotColor: 'bg-emerald-500'
        };
    } else if (confidence >= 0.5) {
        return {
            level: 'medium',
            label: 'Medium',
            Icon: AlertTriangle,
            bgColor: 'bg-amber-100',
            textColor: 'text-amber-700',
            dotColor: 'bg-amber-500'
        };
    } else {
        return {
            level: 'low',
            label: 'Low',
            Icon: HelpCircle,
            bgColor: 'bg-red-100',
            textColor: 'text-red-700',
            dotColor: 'bg-red-500'
        };
    }
}

/**
 * Simple dot indicator variant
 */
export function ConfidenceDot({
    confidence,
    size = 'md'
}: {
    confidence: number;
    size?: 'sm' | 'md' | 'lg';
}) {
    const level = getConfidenceLevel(confidence);

    const sizes = {
        sm: 'w-2 h-2',
        md: 'w-3 h-3',
        lg: 'w-4 h-4'
    };

    return (
        <span
            className={`inline-block rounded-full ${level.dotColor} ${sizes[size]}`}
            title={`${Math.round(confidence * 100)}% confidence`}
        />
    );
}

/**
 * Estimation method badge
 */
export function EstimationMethodBadge({ method }: { method?: string }) {
    if (!method) return null;

    const methodLabels: Record<string, { label: string; color: string }> = {
        'direct_count': { label: 'Counted', color: 'bg-blue-100 text-blue-700' },
        'visual_estimate': { label: 'Estimated', color: 'bg-purple-100 text-purple-700' },
        'weight_estimate': { label: 'By Weight', color: 'bg-orange-100 text-orange-700' },
        'partial_visible': { label: 'Partial', color: 'bg-slate-100 text-slate-600' }
    };

    const config = methodLabels[method] || { label: method, color: 'bg-slate-100 text-slate-600' };

    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${config.color}`}>
            {config.label}
        </span>
    );
}
