/**
 * StepIndicator - Multi-step progress indicator for scan flow
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Check, Warehouse, Package } from 'lucide-react';
import { ScanStep } from '../types';

interface StepIndicatorProps {
    steps: ScanStep[];
    currentStep: number;
    completedSteps: Set<number>;
}

const STEP_ICONS: Record<string, React.ReactNode> = {
    storage: <Warehouse className="w-5 h-5" />,
    front: <Package className="w-5 h-5" />,
    back: <Package className="w-5 h-5" />
};

export default function StepIndicator({ steps, currentStep, completedSteps }: StepIndicatorProps) {
    return (
        <div className="flex items-center justify-center gap-2 sm:gap-4">
            {steps.map((step, index) => (
                <React.Fragment key={step.area}>
                    {/* Step circle */}
                    <div className="flex items-center gap-2">
                        <motion.div
                            className={`
                w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors
                ${completedSteps.has(index)
                                    ? "bg-emerald-500 border-emerald-500 text-white"
                                    : index === currentStep
                                        ? "bg-slate-900 border-slate-900 text-white"
                                        : "bg-white border-slate-300 text-slate-400"
                                }
              `}
                            animate={{
                                scale: index === currentStep ? 1.1 : 1
                            }}
                            transition={{ type: 'spring', stiffness: 300 }}
                        >
                            {completedSteps.has(index) ? (
                                <Check className="w-5 h-5" />
                            ) : (
                                STEP_ICONS[step.area] || <span>{index + 1}</span>
                            )}
                        </motion.div>

                        {/* Step title - hidden on small screens */}
                        <span className={`
              hidden sm:block text-sm font-medium transition-colors
              ${index === currentStep ? "text-slate-900" : "text-slate-400"}
            `}>
                            {step.title}
                        </span>
                    </div>

                    {/* Connector line */}
                    {index < steps.length - 1 && (
                        <div className="w-8 sm:w-16 h-[2px] bg-slate-200 relative overflow-hidden">
                            <motion.div
                                className="absolute inset-y-0 left-0 bg-slate-900"
                                initial={{ width: 0 }}
                                animate={{ width: completedSteps.has(index) ? '100%' : 0 }}
                                transition={{ duration: 0.5 }}
                            />
                        </div>
                    )}
                </React.Fragment>
            ))}
        </div>
    );
}
