/**
 * useMenuManager Hook
 * 
 * Manages menu state and operations
 */

import { useState, useCallback } from 'react';
import { MenuItem } from '../../../types';

interface UseMenuManagerProps {
    menu: MenuItem[];
    onAddMenuItem: (item: MenuItem) => void;
    onUpdateMenuItem: (item: MenuItem) => void;
    onDeleteMenuItem: (id: string) => void;
}

export function useMenuManager({
    menu,
    onAddMenuItem,
    onUpdateMenuItem,
    onDeleteMenuItem,
}: UseMenuManagerProps) {
    // Staff modal state
    const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [editingItem, setEditingItem] = useState<Partial<MenuItem> | null>(null);

    // Scanning state (for photo upload)
    const [isScanning, setIsScanning] = useState(false);

    // Open create modal (Staff)
    const openCreateModal = useCallback(() => {
        setIsCreating(true);
        setEditingItem({});
        setIsStaffModalOpen(true);
    }, []);

    // Open edit modal (Staff)
    const openEditModal = useCallback((item: MenuItem) => {
        setIsCreating(false);
        setEditingItem(item);
        setIsStaffModalOpen(true);
    }, []);

    // Close modal
    const closeModal = useCallback(() => {
        setIsStaffModalOpen(false);
        setEditingItem(null);
    }, []);

    // Handle save from Staff modal
    const handleStaffSave = useCallback((item: MenuItem) => {
        if (isCreating) {
            onAddMenuItem(item);
        } else {
            onUpdateMenuItem(item);
        }
        closeModal();
    }, [isCreating, onAddMenuItem, onUpdateMenuItem, closeModal]);

    // Start scanning
    const startScanning = useCallback(() => {
        setIsScanning(true);
    }, []);

    // Stop scanning
    const stopScanning = useCallback(() => {
        setIsScanning(false);
    }, []);

    return {
        // Staff modal state
        isStaffModalOpen,
        isCreating,
        editingItem,

        // Scanning state
        isScanning,

        // Actions
        openCreateModal,
        openEditModal,
        closeModal,
        handleStaffSave,
        startScanning,
        stopScanning,

        // Pass-through handlers
        onAddMenuItem,
        onUpdateMenuItem,
        onDeleteMenuItem,
    };
}

export default useMenuManager;
