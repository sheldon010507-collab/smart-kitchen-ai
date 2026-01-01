/**
 * MenuManager Component (Refactored)
 * 
 * Main container component for menu management
 * Combines sub-components for Staff/Manager views
 * 
 * Original: 682 lines → Refactored: ~100 lines
 */

import React, { useRef } from 'react';
import { Camera, Loader2, Plus } from 'lucide-react';
import { MenuItem, InventoryItem } from '../../types';
import { analyzeMenuPhoto, fileToGenerativePart } from '../../services/geminiService';

// Sub-components
import { MenuList } from './components/MenuList';
import { ManagerMenuForm } from './components/ManagerMenuForm';
import { StaffMenuModal } from './components/StaffMenuModal';
import { useMenuManager } from './hooks/useMenuManager';

interface MenuManagerProps {
    menu: MenuItem[];
    inventory: InventoryItem[];
    onAddMenuItem: (item: MenuItem) => void;
    onDeleteMenuItem: (id: string) => void;
    onUpdateMenuItem: (item: MenuItem) => void;
    isStaff?: boolean;
}

export function MenuManager({
    menu,
    inventory,
    onAddMenuItem,
    onDeleteMenuItem,
    onUpdateMenuItem,
    isStaff = false,
}: MenuManagerProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const {
        isStaffModalOpen,
        isCreating,
        editingItem,
        isScanning,
        openCreateModal,
        openEditModal,
        closeModal,
        handleStaffSave,
        startScanning,
        stopScanning,
    } = useMenuManager({ menu, onAddMenuItem, onUpdateMenuItem, onDeleteMenuItem });

    // Handle photo upload for menu scanning
    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (isScanning) {
            try {
                const base64 = await fileToGenerativePart(file);
                const items = await analyzeMenuPhoto(base64, file.type);
                items.forEach(item => onAddMenuItem(item));
            } catch (error) {
                console.error(error);
                alert('Failed to analyze menu photo');
            } finally {
                stopScanning();
            }
        }
    };

    return (
        <div className="space-y-8">
            {/* Header */}
            {!isStaff ? (
                <div className="bg-background rounded-xl p-8 border border-border flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-bold text-primary tracking-tight">Menu Engineering</h2>
                        <p className="text-secondary text-sm mt-1">
                            Group dishes, build recipes, and track live costs.
                        </p>
                    </div>
                    <button
                        onClick={() => { startScanning(); fileInputRef.current?.click(); }}
                        className="bg-white border border-border text-primary px-5 py-2.5 rounded-lg text-sm font-bold hover:bg-background transition-colors flex items-center shadow-sm"
                    >
                        {isScanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4 mr-2" />}
                        Scan Menu Photo
                    </button>
                    <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        accept="image/*"
                        onChange={handlePhotoUpload}
                    />
                </div>
            ) : (
                <div className="flex justify-between items-center pb-2 border-b border-border">
                    <h2 className="text-xl font-bold text-primary tracking-tight">Current Menu</h2>
                    <button
                        onClick={openCreateModal}
                        className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-black transition-colors flex items-center shadow-sm"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Add New Dish
                    </button>
                </div>
            )}

            {/* Main Content */}
            <div className={isStaff ? 'w-full' : 'grid grid-cols-1 lg:grid-cols-3 gap-12'}>
                {/* Manager: Create Form */}
                {!isStaff && (
                    <ManagerMenuForm
                        inventory={inventory}
                        onAddMenuItem={onAddMenuItem}
                        onPhotoUpload={() => { }}
                    />
                )}

                {/* Menu List */}
                <MenuList
                    menu={menu}
                    inventory={inventory}
                    isStaff={isStaff}
                    onEdit={openEditModal}
                    onDelete={onDeleteMenuItem}
                />

                {/* Staff: Edit/Create Modal */}
                {isStaff && (
                    <StaffMenuModal
                        isOpen={isStaffModalOpen}
                        isCreating={isCreating}
                        editingItem={editingItem}
                        onClose={closeModal}
                        onSave={handleStaffSave}
                    />
                )}
            </div>
        </div>
    );
}

export default MenuManager;
