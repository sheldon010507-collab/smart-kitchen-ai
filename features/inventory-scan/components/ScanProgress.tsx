/**
 * ScanProgress - Progress display component with animated loader
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';

interface ScanProgressProps {
    percent: number;
    message: string;
    isVisible: boolean;
}

export default function ScanProgress({ percent, message, isVisible }: ScanProgressProps) {
    if (!isVisible) return null;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50"
        >
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-white rounded-2xl p-8 max-w-sm w-full mx-4 shadow-2xl"
            >
                {/* Animated loader */}
                <div className="flex justify-center mb-6">
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    >
                        <Loader2 className="w-12 h-12 text-slate-900" />
                    </motion.div>
                </div>

                {/* Progress bar */}
                <div className="mb-4">
                    <div className="flex justify-between text-sm mb-2">
                        <span className="text-slate-600">Analyzing</span>
                        <span className="text-slate-900 font-medium">{Math.round(percent)}%</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <motion.div
                            className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400"
                            initial={{ width: 0 }}
                            animate={{ width: `${percent}%` }}
                            transition={{ duration: 0.3 }}
                        />
                    </div>
                </div>

                {/* Status message */}
                <motion.p
                    key={message}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center text-slate-500 text-sm"
                >
                    {message}
                </motion.p>
            </motion.div>
        </motion.div>
    );
}

/**
 * Mini progress bar for inline use
 */
export function MiniProgress({ percent }: { percent: number }) {
    return (
        <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
            <motion.div
                className="h-full bg-emerald-500"
                initial={{ width: 0 }}
                animate={{ width: `${percent}%` }}
                transition={{ duration: 0.3 }}
            />
        </div>
    );
}
