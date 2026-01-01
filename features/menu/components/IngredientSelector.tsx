/**
 * IngredientSelector Component
 * 
 * BOM (Bill of Materials) ingredient selector for menu items
 * Allows adding ingredients with quantity and unit, calculates cost
 */

import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { InventoryItem } from '../../../types';
import { calculateIngredientCost } from '../../../utils/costCalculations';

// Types
export interface IngredientUsage {
    id: string;
    qty: number;
    unit: string;
    cost: number;
}

interface IngredientSelectorProps {
    inventory: InventoryItem[];
    ingredients: IngredientUsage[];
    onIngredientsChange: (ingredients: IngredientUsage[]) => void;
}

const UNIT_OPTIONS = ['g', 'kg', 'ml', 'L', 'pcs', 'oz', 'lb'];

export function IngredientSelector({
    inventory,
    ingredients,
    onIngredientsChange,
}: IngredientSelectorProps) {
    const [selectedIngredient, setSelectedIngredient] = React.useState('');
    const [ingredientQty, setIngredientQty] = React.useState('');
    const [ingredientUnit, setIngredientUnit] = React.useState('g');

    const handleAddIngredient = () => {
        if (!selectedIngredient || !ingredientQty) return;

        const invItem = inventory.find(i => i.id === selectedIngredient);
        if (!invItem) return;

        const qty = parseFloat(ingredientQty);
        const cost = calculateIngredientCost(invItem, qty, ingredientUnit);

        onIngredientsChange([
            ...ingredients,
            { id: selectedIngredient, qty, unit: ingredientUnit, cost }
        ]);

        setSelectedIngredient('');
        setIngredientQty('');
    };

    const handleRemoveIngredient = (index: number) => {
        onIngredientsChange(ingredients.filter((_, i) => i !== index));
    };

    const totalCost = ingredients.reduce((sum, item) => sum + item.cost, 0);

    return (
        <div className="pt-4 border-t border-border">
            <label className="text-xs font-bold text-secondary uppercase tracking-wider mb-3 block">
                Recipe Costing (BOM)
            </label>

            <div className="bg-background p-4 rounded-lg space-y-3 border border-border">
                {/* Add Ingredient Row */}
                <div className="flex gap-2">
                    <select
                        className="w-[45%] text-xs border border-border rounded-md px-2 py-2.5 bg-white focus:outline-none truncate"
                        value={selectedIngredient}
                        onChange={e => setSelectedIngredient(e.target.value)}
                    >
                        <option value="">Ingredient</option>
                        {inventory.map(i => (
                            <option key={i.id} value={i.id}>
                                {i.name} (${i.unitCost?.toFixed(2)}/{i.quantityUnit})
                            </option>
                        ))}
                    </select>

                    <input
                        type="number"
                        placeholder="Qty"
                        className="w-[20%] text-xs border border-border rounded-md px-2 py-2.5 bg-white focus:outline-none"
                        value={ingredientQty}
                        onChange={e => setIngredientQty(e.target.value)}
                    />

                    <select
                        className="w-[20%] text-xs border border-border rounded-md px-1 py-2.5 bg-white focus:outline-none"
                        value={ingredientUnit}
                        onChange={e => setIngredientUnit(e.target.value)}
                    >
                        {UNIT_OPTIONS.map(u => (
                            <option key={u} value={u}>{u}</option>
                        ))}
                    </select>

                    <button
                        type="button"
                        onClick={handleAddIngredient}
                        className="w-[15%] flex items-center justify-center bg-white border border-border rounded-md hover:bg-gray-50"
                    >
                        <Plus className="w-4 h-4 text-primary" />
                    </button>
                </div>

                {/* Ingredient List */}
                {ingredients.length > 0 && (
                    <div className="space-y-2 pt-2">
                        {ingredients.map((ing, idx) => {
                            const item = inventory.find(i => i.id === ing.id);
                            return (
                                <div
                                    key={idx}
                                    className="flex justify-between items-center text-xs text-primary py-1 border-b border-border last:border-0"
                                >
                                    <span className="font-medium truncate max-w-[120px]">
                                        {item?.name} ({ing.qty}{ing.unit})
                                    </span>
                                    <div className="flex items-center space-x-2">
                                        <span className="font-mono">${ing.cost.toFixed(2)}</span>
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveIngredient(idx)}
                                            className="text-secondary hover:text-red-600"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}

                        {/* Total */}
                        <div className="flex justify-between items-center pt-3 text-xs font-bold text-primary border-t border-border">
                            <span>Total Cost</span>
                            <span className="font-mono text-sm">${totalCost.toFixed(2)}</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default IngredientSelector;
