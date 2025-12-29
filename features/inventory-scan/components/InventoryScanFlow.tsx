/**
 * InventoryScanFlow - Optimized single-step scan workflow
 * 
 * Features:
 * - Multi-photo upload
 * - AI recognition with progress
 * - Editable results with confidence badges
 * - One-click save to inventory
 */

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Check, RefreshCw, Package, AlertCircle } from 'lucide-react';
import { useOptimizedScan } from '../hooks/useOptimizedScan';
import { ScanAreaType } from '../services/promptTemplates';
import MultiPhotoCapture from './MultiPhotoCapture';
import ScanProgress from './ScanProgress';
import ConfidenceBadge, { EstimationMethodBadge } from './ConfidenceBadge';
import { RecognizedItem } from '../services/optimizedVisionService';

interface InventoryScanFlowProps {
    businessId: string;
    onBack?: () => void;
    onComplete?: () => void;
}

type FlowStep = 'capture' | 'review' | 'complete';

export default function InventoryScanFlow({
    businessId,
    onBack,
    onComplete
}: InventoryScanFlowProps) {
    const [step, setStep] = useState<FlowStep>('capture');
    const [selectedArea, setSelectedArea] = useState<ScanAreaType>('fridge');
    const [capturedFiles, setCapturedFiles] = useState<File[]>([]);

    const {
        isScanning,
        progress,
        result,
        partialItems,
        error,
        startScan,
        adjustQuantity,
        removeItem,
        confirmAndSave,
        reset
    } = useOptimizedScan(businessId);

    // Handle scan start
    const handleStartScan = useCallback(async () => {
        if (capturedFiles.length === 0) return;

        await startScan(capturedFiles, selectedArea);
        setStep('review');
    }, [capturedFiles, selectedArea, startScan]);

    // Handle confirm and save
    const handleConfirm = useCallback(async () => {
        const success = await confirmAndSave();
        if (success) {
            setStep('complete');
        }
    }, [confirmAndSave]);

    // Handle reset
    const handleReset = useCallback(() => {
        reset();
        setCapturedFiles([]);
        setStep('capture');
    }, [reset]);

    // Display items (partial during scanning, full after)
    const displayItems = isScanning ? partialItems : (result?.items || []);

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header */}
            <div className="bg-white border-b border-slate-200 px-4 py-4 sticky top-0 z-10">
                <div className="max-w-2xl mx-auto flex items-center gap-4">
                    {onBack && (
                        <button
                            onClick={onBack}
                            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                    )}
                    <div>
                        <h1 className="text-xl font-bold text-slate-900">Inventory Scan</h1>
                        <p className="text-sm text-slate-500">
                            {step === 'capture' && 'Take photos of your inventory'}
                            {step === 'review' && 'Review and confirm items'}
                            {step === 'complete' && 'Scan complete!'}
                        </p>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-2xl mx-auto p-4 sm:p-6">
                <AnimatePresence mode="wait">
                    {/* STEP 1: Capture */}
                    {step === 'capture' && (
                        <motion.div
                            key="capture"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="space-y-6"
                        >
                            {/* Area selector */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    Scan Area
                                </label>
                                <div className="flex gap-2">
                                    {(['fridge', 'storage', 'prep'] as ScanAreaType[]).map(area => (
                                        <button
                                            key={area}
                                            onClick={() => setSelectedArea(area)}
                                            className={`
                        flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors
                        ${selectedArea === area
                                                    ? 'bg-slate-900 text-white'
                                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}
                      `}
                                        >
                                            {area === 'fridge' && '🧊 Fridge'}
                                            {area === 'storage' && '📦 Storage'}
                                            {area === 'prep' && '🔪 Prep'}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Multi-photo capture */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    Photos <span className="text-slate-400">(multiple angles recommended)</span>
                                </label>
                                <MultiPhotoCapture
                                    maxImages={5}
                                    onImagesChange={setCapturedFiles}
                                />
                            </div>

                            {/* Scan button */}
                            <motion.button
                                onClick={handleStartScan}
                                disabled={capturedFiles.length === 0}
                                className="w-full py-4 bg-slate-900 text-white rounded-xl font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-800 transition-colors"
                                whileHover={{ scale: capturedFiles.length > 0 ? 1.02 : 1 }}
                                whileTap={{ scale: capturedFiles.length > 0 ? 0.98 : 1 }}
                            >
                                <Package className="w-5 h-5" />
                                Scan {capturedFiles.length} Photo{capturedFiles.length !== 1 ? 's' : ''}
                            </motion.button>
                        </motion.div>
                    )}

                    {/* STEP 2: Review */}
                    {step === 'review' && (
                        <motion.div
                            key="review"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="space-y-6"
                        >
                            {/* Error message */}
                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3"
                                >
                                    <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-red-700 font-medium">Recognition Failed</p>
                                        <p className="text-red-600 text-sm">{error}</p>
                                    </div>
                                </motion.div>
                            )}

                            {/* Results summary */}
                            {result && (
                                <div className="flex items-center justify-between">
                                    <div>
                                        <span className="text-lg font-bold text-slate-900">
                                            {result.items.length} items found
                                        </span>
                                        <span className="text-slate-500 text-sm ml-2">
                                            ({result.processing_time_ms}ms)
                                        </span>
                                    </div>
                                    <span className={`
                    px-2 py-1 rounded text-xs font-medium
                    ${result.scan_quality === 'good' ? 'bg-emerald-100 text-emerald-700' :
                                            result.scan_quality === 'medium' ? 'bg-amber-100 text-amber-700' :
                                                'bg-red-100 text-red-700'}
                  `}>
                                        {result.scan_quality === 'good' ? '✓ Good quality' :
                                            result.scan_quality === 'medium' ? '⚠ Medium quality' :
                                                '✗ Poor quality'}
                                    </span>
                                </div>
                            )}

                            {/* Items list */}
                            <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100 overflow-hidden">
                                <AnimatePresence>
                                    {displayItems.map((item, index) => (
                                        <div key={`${item.name}-${index}`}>
                                            <ItemRow
                                                item={item}
                                                index={index}
                                                onAdjust={adjustQuantity}
                                                onRemove={removeItem}
                                                disabled={isScanning}
                                            />
                                        </div>
                                    ))}
                                </AnimatePresence>

                                {displayItems.length === 0 && !isScanning && (
                                    <div className="p-8 text-center text-slate-500">
                                        No items recognized. Try a clearer photo.
                                    </div>
                                )}
                            </div>

                            {/* Suggestions */}
                            {result?.suggestions && result.suggestions.length > 0 && (
                                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                    <p className="text-blue-700 text-sm font-medium mb-2">💡 Suggestions</p>
                                    <ul className="text-blue-600 text-sm space-y-1">
                                        {result.suggestions.map((s, i) => (
                                            <li key={i}>• {s}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {/* Action buttons */}
                            <div className="flex gap-3">
                                <motion.button
                                    onClick={handleReset}
                                    className="px-6 py-3 border border-slate-300 rounded-xl font-medium flex items-center gap-2 hover:bg-slate-50 transition-colors"
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                >
                                    <RefreshCw className="w-5 h-5" />
                                    Rescan
                                </motion.button>

                                <motion.button
                                    onClick={handleConfirm}
                                    disabled={isScanning || !result || result.items.length === 0}
                                    className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-emerald-500 transition-colors"
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                >
                                    <Check className="w-5 h-5" />
                                    Confirm & Save
                                </motion.button>
                            </div>
                        </motion.div>
                    )}

                    {/* STEP 3: Complete */}
                    {step === 'complete' && (
                        <motion.div
                            key="complete"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="text-center py-12"
                        >
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: 'spring', delay: 0.2 }}
                                className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6"
                            >
                                <Check className="w-10 h-10 text-emerald-600" />
                            </motion.div>

                            <h2 className="text-2xl font-bold text-slate-900 mb-2">
                                Inventory Updated!
                            </h2>
                            <p className="text-slate-500 mb-8">
                                {result?.items.length || 0} items have been saved to your inventory.
                            </p>

                            <div className="flex gap-3 justify-center">
                                <motion.button
                                    onClick={handleReset}
                                    className="px-6 py-3 border border-slate-300 rounded-xl font-medium hover:bg-slate-50 transition-colors"
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                >
                                    Scan More
                                </motion.button>

                                {onComplete && (
                                    <motion.button
                                        onClick={onComplete}
                                        className="px-6 py-3 bg-slate-900 text-white rounded-xl font-medium hover:bg-slate-800 transition-colors"
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                    >
                                        Done
                                    </motion.button>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Scanning overlay */}
            <ScanProgress
                percent={progress.percent}
                message={progress.message}
                isVisible={isScanning}
            />
        </div>
    );
}

// Item row component
interface ItemRowProps {
    item: RecognizedItem;
    index: number;
    onAdjust: (index: number, qty: number) => void;
    onRemove: (index: number) => void;
    disabled: boolean;
}

function ItemRow({
    item,
    index,
    onAdjust,
    onRemove,
    disabled
}: ItemRowProps) {
    return (
        <motion.div
            layout
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ delay: index * 0.05 }}
            className="p-4 flex items-center gap-4"
        >
            {/* Item info */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-slate-900 truncate">{item.name}</span>
                    <ConfidenceBadge confidence={item.confidence} size="sm" />
                    {item.matched_inventory_id && (
                        <span className="text-xs text-emerald-600">✓ Matched</span>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    {item.estimation_method && (
                        <EstimationMethodBadge method={item.estimation_method} />
                    )}
                    {item.notes && (
                        <span className="text-xs text-slate-400 truncate">{item.notes}</span>
                    )}
                </div>
            </div>

            {/* Quantity editor */}
            <div className="flex items-center gap-2">
                <button
                    onClick={() => onAdjust(index, item.quantity - 1)}
                    disabled={disabled || item.quantity <= 0}
                    className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center hover:bg-slate-200 disabled:opacity-50 transition-colors"
                >
                    −
                </button>
                <input
                    type="number"
                    value={item.quantity}
                    onChange={(e) => onAdjust(index, parseFloat(e.target.value) || 0)}
                    disabled={disabled}
                    className="w-16 h-8 text-center border border-slate-200 rounded-lg text-sm font-medium disabled:bg-slate-50"
                    min="0"
                    step="0.5"
                />
                <button
                    onClick={() => onAdjust(index, item.quantity + 1)}
                    disabled={disabled}
                    className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center hover:bg-slate-200 disabled:opacity-50 transition-colors"
                >
                    +
                </button>
                <span className="text-sm text-slate-500 w-12">{item.unit}</span>
            </div>

            {/* Remove button */}
            <button
                onClick={() => onRemove(index)}
                disabled={disabled}
                className="w-8 h-8 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-500 flex items-center justify-center disabled:opacity-50 transition-colors"
            >
                ✕
            </button>
        </motion.div>
    );
}
