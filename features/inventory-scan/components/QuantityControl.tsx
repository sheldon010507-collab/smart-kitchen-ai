/**
 * QuantityControl Component
 * 
 * +/- buttons for quick quantity adjustment
 */

import React from 'react';
import { Plus, Minus } from 'lucide-react';

interface QuantityControlProps {
    value: number;
    unit: string;
    onChange: (newValue: number) => void;
    min?: number;
    step?: number;
    disabled?: boolean;
    size?: 'sm' | 'md' | 'lg';
}

export default function QuantityControl({
    value,
    unit,
    onChange,
    min = 0,
    step = 1,
    disabled = false,
    size = 'md'
}: QuantityControlProps) {

    const handleDecrease = () => {
        const newVal = Math.max(min, value - step);
        onChange(Math.round(newVal * 100) / 100); // Avoid floating point issues
    };

    const handleIncrease = () => {
        const newVal = value + step;
        onChange(Math.round(newVal * 100) / 100);
    };

    const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newVal = parseFloat(e.target.value) || min;
        onChange(Math.max(min, newVal));
    };

    // Size variants
    const sizes = {
        sm: {
            button: 'w-6 h-6',
            input: 'w-12 h-6 text-xs',
            unit: 'text-xs w-6',
            icon: 'w-3 h-3',
        },
        md: {
            button: 'w-8 h-8',
            input: 'w-14 h-8 text-sm',
            unit: 'text-sm w-8',
            icon: 'w-4 h-4',
        },
        lg: {
            button: 'w-10 h-10',
            input: 'w-20 h-10 text-base',
            unit: 'text-base w-12',
            icon: 'w-5 h-5',
        },
    };

    const s = sizes[size];

    return (
        <div className="flex items-center gap-1">
            {/* Decrease Button */}
            <button
                type="button"
                onClick={handleDecrease}
                disabled={disabled || value <= min}
                className={`${s.button} flex items-center justify-center rounded-lg border border-gray-200 
          hover:bg-gray-50 hover:border-gray-300 
          disabled:opacity-30 disabled:cursor-not-allowed
          active:scale-95 transition-all`}
                aria-label="Decrease quantity"
            >
                <Minus className={s.icon} />
            </button>

            {/* Input Field */}
            <input
                type="number"
                value={value}
                onChange={handleInput}
                disabled={disabled}
                className={`${s.input} text-center font-medium border border-gray-200 rounded-lg 
          focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20
          disabled:bg-gray-100 disabled:cursor-not-allowed`}
                min={min}
                step={step}
            />

            {/* Unit Label */}
            <span className={`${s.unit} text-gray-500 text-center`}>{unit}</span>

            {/* Increase Button */}
            <button
                type="button"
                onClick={handleIncrease}
                disabled={disabled}
                className={`${s.button} flex items-center justify-center rounded-lg border border-gray-200 
          hover:bg-gray-50 hover:border-gray-300 
          disabled:opacity-30 disabled:cursor-not-allowed
          active:scale-95 transition-all`}
                aria-label="Increase quantity"
            >
                <Plus className={s.icon} />
            </button>
        </div>
    );
}
