/**
 * ManagerMenuForm Component
 * 
 * Full menu item creation form for Managers with BOM support
 */

import React, { useState, useRef } from 'react';
import { Image as ImageIcon, Link as LinkIcon } from 'lucide-react';
import { MenuItem, InventoryItem } from '../../../types';
import { IngredientSelector, IngredientUsage } from './IngredientSelector';

interface ManagerMenuFormProps {
    inventory: InventoryItem[];
    onAddMenuItem: (item: MenuItem) => void;
    onPhotoUpload: (file: File) => void;
}

const CATEGORIES = ['Starter', 'Main', 'Lunch', 'Dessert', 'Beverage', 'Drink', 'Other'];

export function ManagerMenuForm({
    inventory,
    onAddMenuItem,
    onPhotoUpload,
}: ManagerMenuFormProps) {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [price, setPrice] = useState('');
    const [category, setCategory] = useState('Food');
    const [imageUrl, setImageUrl] = useState('');
    const [uploadedImage, setUploadedImage] = useState<string | null>(null);
    const [ingredients, setIngredients] = useState<IngredientUsage[]>([]);

    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setUploadedImage(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const totalCost = ingredients.reduce((sum, item) => sum + item.cost, 0);

    const handleSubmit = () => {
        if (!name || !price) return;

        const newItem: MenuItem = {
            id: crypto.randomUUID(),
            businessId: '',
            name,
            description,
            category,
            sellingPrice: parseFloat(price),
            estimatedCost: totalCost > 0 ? totalCost : parseFloat(price) * 0.3,
            imageUrl: imageUrl || uploadedImage || undefined,
            isActive: true,
            sortOrder: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };

        // Include ingredients in the item object for persistence
        const itemWithIngredients = {
            ...newItem,
            ingredients: ingredients.map(ing => ({
                inventoryItemId: ing.id,
                quantityUsed: ing.qty,
                unitUsed: ing.unit,
                costSnapshot: ing.cost
            }))
        };

        onAddMenuItem(itemWithIngredients);

        // Reset form
        setName('');
        setDescription('');
        setPrice('');
        setImageUrl('');
        setIngredients([]);
        setUploadedImage(null);
    };

    return (
        <div className="lg:col-span-1">
            <div className="bg-white rounded-xl p-8 border border-border sticky top-6 shadow-sm">
                <h3 className="font-bold text-lg text-primary mb-6">Create Menu Item</h3>

                <div className="space-y-6">
                    {/* Image Upload Area */}
                    <div
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full h-48 border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center cursor-pointer hover:bg-background hover:border-accent transition-all relative overflow-hidden group"
                    >
                        {(imageUrl || uploadedImage) ? (
                            <img
                                src={imageUrl || uploadedImage || ''}
                                alt="Preview"
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <div className="flex flex-col items-center text-secondary">
                                <ImageIcon className="w-8 h-8 mb-3 opacity-50" />
                                <span className="text-xs font-bold uppercase tracking-wide">Upload Dish Photo</span>
                            </div>
                        )}
                    </div>
                    <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        accept="image/*"
                        onChange={handleImageUpload}
                    />

                    {/* URL Fallback */}
                    {!uploadedImage && (
                        <div className="relative">
                            <LinkIcon className="absolute left-3 top-3 w-4 h-4 text-secondary" />
                            <input
                                type="text"
                                placeholder="Or paste image URL"
                                className="w-full pl-10 pr-4 py-2.5 bg-background border border-border rounded-lg text-sm focus:outline-none focus:border-accent"
                                value={imageUrl}
                                onChange={e => setImageUrl(e.target.value)}
                            />
                        </div>
                    )}

                    {/* Basic Info */}
                    <div className="space-y-5">
                        <div>
                            <label className="text-xs font-bold text-secondary uppercase tracking-wider mb-2 block">
                                Item Name
                            </label>
                            <input
                                type="text"
                                className="w-full px-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:border-accent"
                                value={name}
                                onChange={e => setName(e.target.value)}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-5">
                            <div>
                                <label className="text-xs font-bold text-secondary uppercase tracking-wider mb-2 block">
                                    Price ($)
                                </label>
                                <input
                                    type="number"
                                    className="w-full px-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:border-accent"
                                    value={price}
                                    onChange={e => setPrice(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-secondary uppercase tracking-wider mb-2 block">
                                    Category
                                </label>
                                <select
                                    className="w-full px-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:border-accent bg-white"
                                    value={category}
                                    onChange={e => setCategory(e.target.value)}
                                >
                                    {CATEGORIES.map(c => (
                                        <option key={c}>{c}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* BOM Ingredient Selector */}
                    <IngredientSelector
                        inventory={inventory}
                        ingredients={ingredients}
                        onIngredientsChange={setIngredients}
                    />

                    {/* Submit Button */}
                    <button
                        onClick={handleSubmit}
                        className="w-full bg-primary text-white py-3 rounded-lg text-sm font-bold tracking-wide hover:bg-black transition-colors shadow-sm"
                    >
                        Add Item to Menu
                    </button>
                </div>
            </div>
        </div>
    );
}

export default ManagerMenuForm;
