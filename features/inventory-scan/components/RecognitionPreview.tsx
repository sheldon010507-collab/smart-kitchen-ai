/**
 * RecognitionPreview - Shows AI recognition results with editable quantities
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Minus, Plus, X } from 'lucide-react';
import { RecognizedItem } from '../types';

interface RecognitionPreviewProps {
    items: RecognizedItem[];
    onAdjust: (index: number, quantity: number) => void;
    onRemove: (index: number) => void;
}

export default function RecognitionPreview({ items, onAdjust, onRemove }: RecognitionPreviewProps) {
    return (
        <div className="p-4 sm:p-6 h-full overflow-auto">
            <h3 className="text-white font-medium mb-4">
                Recognized {items.length} item{items.length !== 1 ? 's' : ''}
            </h3>

            <div className="space-y-3">
                {items.map((item, index) => (
                    <motion.div
                        key={index}
                        className="bg-white/10 backdrop-blur rounded-lg p-4 flex items-center justify-between gap-4"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                    >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                            {/* Confidence indicator */}
                            <div
                                className={`
                  w-2 h-2 rounded-full flex-shrink-0
                  ${item.confidence > 0.8 ? "bg-emerald-400" :
                                        item.confidence > 0.5 ? "bg-yellow-400" : "bg-red-400"}
                `}
                                title={`${(item.confidence * 100).toFixed(0)}% confidence`}
                            />
                            <div className="min-w-0">
                                <p className="text-white font-medium truncate">{item.name}</p>
                                <p className="text-white/60 text-sm">
                                    {(item.confidence * 100).toFixed(0)}% confident
                                    {item.matched_sku_id && <span className="text-emerald-400 ml-2">✓ Matched</span>}
                                </p>
                            </div>
                        </div>

                        {/* Quantity editor */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                            <button
                                className="w-8 h-8 rounded-lg bg-white/20 text-white flex items-center justify-center hover:bg-white/30 transition-colors"
                                onClick={() => onAdjust(index, item.quantity - 1)}
                            >
                                <Minus className="w-4 h-4" />
                            </button>
                            <input
                                type="number"
                                value={item.quantity}
                                onChange={(e) => onAdjust(index, parseFloat(e.target.value) || 0)}
                                className="w-16 h-8 bg-white/20 rounded-lg text-center text-white text-sm focus:outline-none focus:ring-2 focus:ring-white/50"
                                min="0"
                                step="0.1"
                            />
                            <button
                                className="w-8 h-8 rounded-lg bg-white/20 text-white flex items-center justify-center hover:bg-white/30 transition-colors"
                                onClick={() => onAdjust(index, item.quantity + 1)}
                            >
                                <Plus className="w-4 h-4" />
                            </button>
                            <span className="text-white/60 text-sm w-12">{item.unit}</span>

                            {/* Remove button */}
                            <button
                                className="w-8 h-8 rounded-lg bg-red-500/20 text-red-400 flex items-center justify-center hover:bg-red-500/30 transition-colors"
                                onClick={() => onRemove(index)}
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </motion.div>
                ))}

                {items.length === 0 && (
                    <div className="text-center text-white/50 py-8">
                        No items recognized. Try a clearer image.
                    </div>
                )}
            </div>
        </div>
    );
}
