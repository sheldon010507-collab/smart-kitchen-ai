/**
 * StaffMenuModal Component
 * 
 * Modal for Staff to create/edit menu items (simplified version)
 */

import React, { useState, useRef, useEffect } from 'react';
import { X, Save, Image as ImageIcon } from 'lucide-react';
import { MenuItem } from '../../../types';

interface StaffMenuModalProps {
    isOpen: boolean;
    isCreating: boolean;
    editingItem: Partial<MenuItem> | null;
    onClose: () => void;
    onSave: (item: MenuItem) => void;
}

const CATEGORIES = ['Starter', 'Main', 'Lunch', 'Dessert', 'Beverage', 'Drink', 'Food', 'Other'];

export function StaffMenuModal({
    isOpen,
    isCreating,
    editingItem,
    onClose,
    onSave,
}: StaffMenuModalProps) {
    const [name, setName] = useState('');
    const [category, setCategory] = useState('Food');
    const [price, setPrice] = useState('');
    const [imageUrl, setImageUrl] = useState('');
    const imageInputRef = useRef<HTMLInputElement>(null);

    // Sync form with editing item
    useEffect(() => {
        if (editingItem) {
            setName(editingItem.name || '');
            setCategory(editingItem.category || 'Food');
            setPrice(editingItem.sellingPrice?.toString() || '');
            setImageUrl(editingItem.imageUrl || '');
        } else {
            setName('');
            setCategory('Food');
            setPrice('');
            setImageUrl('');
        }
    }, [editingItem]);

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setImageUrl(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const priceNum = parseFloat(price) || 0;

        const item: MenuItem = {
            id: editingItem?.id || Date.now().toString(),
            businessId: editingItem?.businessId || '',
            name,
            category,
            sellingPrice: priceNum,
            estimatedCost: editingItem?.estimatedCost || priceNum * 0.3,
            imageUrl: imageUrl || undefined,
            description: editingItem?.description || '',
            isActive: editingItem?.isActive ?? true,
            sortOrder: editingItem?.sortOrder ?? 0,
            createdAt: editingItem?.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };

        onSave(item);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-xl w-full max-w-md shadow-2xl border border-border p-6 relative">
                {/* Header */}
                <div className="flex justify-between items-center mb-6">
                    <h3 className="font-bold text-lg text-primary">
                        {isCreating ? 'Create New Dish' : 'Edit Dish Details'}
                    </h3>
                    <button onClick={onClose} className="text-secondary hover:text-primary transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Image Upload */}
                    <div className="space-y-2">
                        <div
                            onClick={() => imageInputRef.current?.click()}
                            className={`w-full h-48 rounded-xl border-2 border-dashed ${imageUrl ? 'border-transparent' : 'border-border'} bg-background hover:bg-gray-100 transition-colors flex flex-col items-center justify-center cursor-pointer relative overflow-hidden group`}
                        >
                            {imageUrl ? (
                                <>
                                    <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <span className="text-white font-bold text-sm flex items-center">
                                            <ImageIcon className="w-4 h-4 mr-2" /> Change Photo
                                        </span>
                                    </div>
                                </>
                            ) : (
                                <div className="flex flex-col items-center text-secondary/60">
                                    <div className="bg-white p-3 rounded-xl shadow-sm border border-border mb-3">
                                        <ImageIcon className="w-6 h-6 text-secondary" />
                                    </div>
                                    <span className="text-xs font-bold uppercase tracking-wide text-secondary">
                                        Upload Photo
                                    </span>
                                </div>
                            )}
                        </div>
                        <input
                            type="file"
                            ref={imageInputRef}
                            className="hidden"
                            accept="image/*"
                            onChange={handleImageUpload}
                        />
                    </div>

                    {/* Dish Name */}
                    <div className="space-y-1.5">
                        <label className="block text-[10px] font-bold text-secondary uppercase tracking-widest">
                            Dish Name
                        </label>
                        <input
                            type="text"
                            required
                            value={name}
                            onChange={e => setName(e.target.value)}
                            className="w-full px-4 py-3 rounded-lg border border-border focus:outline-none focus:border-accent text-sm bg-background font-medium"
                            placeholder="e.g. Grilled Salmon"
                        />
                    </div>

                    {/* Category & Price */}
                    <div className="grid grid-cols-2 gap-5">
                        <div className="space-y-1.5">
                            <label className="block text-[10px] font-bold text-secondary uppercase tracking-widest">
                                Category
                            </label>
                            <select
                                value={category}
                                onChange={e => setCategory(e.target.value)}
                                className="w-full px-4 py-3 rounded-lg border border-border focus:outline-none focus:border-accent text-sm bg-background font-medium appearance-none"
                            >
                                {CATEGORIES.map(c => (
                                    <option key={c} value={c}>{c}</option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="block text-[10px] font-bold text-secondary uppercase tracking-widest">
                                Price ($)
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                required
                                value={price}
                                onChange={e => setPrice(e.target.value)}
                                className="w-full px-4 py-3 rounded-lg border border-border focus:outline-none focus:border-accent text-sm bg-background font-medium"
                                placeholder="0.00"
                            />
                        </div>
                    </div>

                    {/* Image URL Fallback */}
                    <div className="space-y-1.5">
                        <label className="block text-[10px] font-bold text-secondary uppercase tracking-widest">
                            Or Image URL
                        </label>
                        <input
                            type="text"
                            placeholder="https://..."
                            value={imageUrl}
                            onChange={e => setImageUrl(e.target.value)}
                            className="w-full px-4 py-3 rounded-lg border border-border focus:outline-none focus:border-accent text-sm bg-background text-secondary"
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex justify-between items-center pt-4 mt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-6 py-2.5 text-secondary font-bold hover:text-primary transition-colors text-sm"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-6 py-2.5 bg-primary text-white rounded-lg font-bold shadow-sm hover:bg-black transition-colors flex items-center justify-center text-sm"
                        >
                            <Save className="w-4 h-4 mr-2" />
                            {isCreating ? 'Create Item' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default StaffMenuModal;
