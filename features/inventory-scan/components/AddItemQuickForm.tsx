/**
 * AddItemQuickForm Component
 * 
 * Quick form for adding missed items during scan review
 */

import React, { useState } from 'react';
import { X, Check } from 'lucide-react';

interface AddItemQuickFormProps {
    onAdd: (item: { name: string; quantity: number; unit: string }) => void;
    onCancel: () => void;
    suggestions?: string[];  // Known item names for autocomplete
}

const UNITS = ['pcs', 'kg', 'g', 'box', 'bag', 'bottle', 'pack', 'L', 'ml', 'bunch', 'portion'];

export default function AddItemQuickForm({
    onAdd,
    onCancel,
    suggestions = []
}: AddItemQuickFormProps) {
    const [name, setName] = useState('');
    const [quantity, setQuantity] = useState(1);
    const [unit, setUnit] = useState('pcs');
    const [showSuggestions, setShowSuggestions] = useState(false);

    const filteredSuggestions = suggestions
        .filter(s => s.toLowerCase().includes(name.toLowerCase()))
        .slice(0, 6);

    const handleSubmit = (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!name.trim()) return;
        onAdd({ name: name.trim(), quantity, unit });
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleSubmit();
        } else if (e.key === 'Escape') {
            onCancel();
        }
    };

    return (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl shadow-sm">
            <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-bold text-blue-800">Add Missing Item</span>
                <button
                    onClick={onCancel}
                    className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded-lg transition-colors"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
                {/* Name Input with Autocomplete */}
                <div className="relative">
                    <input
                        type="text"
                        value={name}
                        onChange={e => { setName(e.target.value); setShowSuggestions(true); }}
                        onFocus={() => setShowSuggestions(true)}
                        onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                        onKeyDown={handleKeyDown}
                        placeholder="Item name"
                        className="w-full px-4 py-2.5 text-sm border border-blue-200 rounded-lg focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 bg-white"
                        autoFocus
                    />

                    {/* Suggestions Dropdown */}
                    {showSuggestions && filteredSuggestions.length > 0 && name && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 max-h-48 overflow-y-auto">
                            {filteredSuggestions.map((s, i) => (
                                <button
                                    key={i}
                                    type="button"
                                    onClick={() => { setName(s); setShowSuggestions(false); }}
                                    className="w-full px-4 py-2 text-left text-sm hover:bg-blue-50 first:rounded-t-lg last:rounded-b-lg"
                                >
                                    {s}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Quantity and Unit Row */}
                <div className="flex gap-2">
                    <input
                        type="number"
                        value={quantity}
                        onChange={e => setQuantity(Math.max(0.1, parseFloat(e.target.value) || 1))}
                        onKeyDown={handleKeyDown}
                        className="w-20 px-3 py-2.5 text-sm text-center border border-blue-200 rounded-lg focus:outline-none focus:border-blue-400"
                        min="0.1"
                        step="0.1"
                    />

                    <select
                        value={unit}
                        onChange={e => setUnit(e.target.value)}
                        className="flex-1 px-3 py-2.5 text-sm border border-blue-200 rounded-lg focus:outline-none focus:border-blue-400 bg-white"
                    >
                        {UNITS.map(u => (
                            <option key={u} value={u}>{u}</option>
                        ))}
                    </select>

                    <button
                        type="submit"
                        disabled={!name.trim()}
                        className="px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                    >
                        <Check className="w-4 h-4" />
                    </button>
                </div>
            </form>
        </div>
    );
}
