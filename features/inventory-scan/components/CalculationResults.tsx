/**
 * CalculationResults - Shows prep and shopping calculation results
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChefHat, ShoppingCart, Clock, RefreshCw, Check } from 'lucide-react';
import { RequirementCalculation, PrepRequirement, ShoppingTask } from '../types';

interface CalculationResultsProps {
    calculation: RequirementCalculation;
    onReset: () => void;
    onConfirm?: () => void;
}

export default function CalculationResults({ calculation, onReset, onConfirm }: CalculationResultsProps) {
    const [activeTab, setActiveTab] = useState<'prep' | 'shopping'>('prep');

    return (
        <div className="max-w-4xl mx-auto">
            {/* Summary cards */}
            <div className="grid grid-cols-3 gap-4 mb-8">
                <motion.div
                    className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <ChefHat className="w-8 h-8 text-orange-500 mb-2" />
                    <p className="text-3xl font-bold text-slate-900">{calculation.summary.total_prep_items}</p>
                    <p className="text-slate-500 text-sm">Prep Tasks</p>
                </motion.div>

                <motion.div
                    className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                >
                    <ShoppingCart className="w-8 h-8 text-blue-500 mb-2" />
                    <p className="text-3xl font-bold text-slate-900">{calculation.summary.total_shopping_items}</p>
                    <p className="text-slate-500 text-sm">Items to Buy</p>
                </motion.div>

                <motion.div
                    className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                >
                    <Clock className="w-8 h-8 text-emerald-500 mb-2" />
                    <p className="text-3xl font-bold text-slate-900">{calculation.summary.estimated_prep_time}</p>
                    <p className="text-slate-500 text-sm">Est. Minutes</p>
                </motion.div>
            </div>

            {/* Tab switcher */}
            <div className="flex gap-2 mb-6">
                <button
                    className={`
            px-4 py-2 rounded-lg font-medium transition-colors
            ${activeTab === 'prep'
                            ? "bg-slate-900 text-white"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"}
          `}
                    onClick={() => setActiveTab('prep')}
                >
                    🔪 Prep List ({calculation.prep_list.length})
                </button>
                <button
                    className={`
            px-4 py-2 rounded-lg font-medium transition-colors
            ${activeTab === 'shopping'
                            ? "bg-slate-900 text-white"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"}
          `}
                    onClick={() => setActiveTab('shopping')}
                >
                    🛒 Shopping ({calculation.shopping_list.length})
                </button>
            </div>

            {/* Task lists */}
            <AnimatePresence mode="wait">
                {activeTab === 'prep' ? (
                    <motion.div
                        key="prep"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                    >
                        <PrepTaskList tasks={calculation.prep_list} />
                    </motion.div>
                ) : (
                    <motion.div
                        key="shopping"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                    >
                        <ShoppingTaskList tasks={calculation.shopping_list} />
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Action buttons */}
            <div className="flex gap-4 mt-8">
                <button
                    className="px-6 py-3 border border-slate-300 rounded-lg flex items-center gap-2 hover:bg-slate-50 transition-colors"
                    onClick={onReset}
                >
                    <RefreshCw className="w-5 h-5" />
                    Scan Again
                </button>
                {onConfirm && (
                    <button
                        className="flex-1 py-3 bg-slate-900 text-white rounded-lg font-medium flex items-center justify-center gap-2 hover:bg-slate-800 transition-colors"
                        onClick={onConfirm}
                    >
                        <Check className="w-5 h-5" />
                        Confirm & Generate Tasks
                    </button>
                )}
            </div>
        </div>
    );
}

// Prep Task List Component
function PrepTaskList({ tasks }: { tasks: PrepRequirement[] }) {
    if (tasks.length === 0) {
        return (
            <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
                <Check className="w-12 h-12 mx-auto mb-2 text-emerald-500" />
                <p className="text-slate-600">All prep items are stocked!</p>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
            {tasks.map((task, index) => (
                <motion.div
                    key={task.sku_id}
                    className="p-4 flex items-center justify-between"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                >
                    <div>
                        <p className="font-medium text-slate-900">{task.item_name}</p>
                        {task.raw_consumption && task.parent_raw_name && (
                            <p className="text-sm text-slate-500">
                                Uses {task.raw_consumption.toFixed(2)} {task.parent_raw_name}
                            </p>
                        )}
                    </div>
                    <div className="text-right">
                        <p className="text-xl font-bold text-orange-600">
                            {task.quantity} <span className="text-sm font-normal">{task.unit}</span>
                        </p>
                        <p className="text-sm text-slate-500">to prepare</p>
                    </div>
                </motion.div>
            ))}
        </div>
    );
}

// Shopping Task List Component
function ShoppingTaskList({ tasks }: { tasks: ShoppingTask[] }) {
    if (tasks.length === 0) {
        return (
            <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
                <Check className="w-12 h-12 mx-auto mb-2 text-emerald-500" />
                <p className="text-slate-600">No shopping needed!</p>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
            {tasks.map((task, index) => (
                <motion.div
                    key={task.sku_id}
                    className="p-4 flex items-center justify-between"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                >
                    <div className="flex items-center gap-3">
                        {/* Priority indicator */}
                        <div className={`
              w-3 h-3 rounded-full flex-shrink-0
              ${task.priority === 'urgent' ? "bg-red-500" :
                                task.priority === 'normal' ? "bg-yellow-500" : "bg-emerald-500"}
            `} />
                        <div>
                            <p className="font-medium text-slate-900">{task.item_name}</p>
                            <p className="text-sm text-slate-500">{task.reason}</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-xl font-bold text-blue-600">
                            {task.quantity} <span className="text-sm font-normal">{task.unit}</span>
                        </p>
                        <p className="text-sm text-slate-500">to buy</p>
                    </div>
                </motion.div>
            ))}
        </div>
    );
}
