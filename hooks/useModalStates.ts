/**
 * Modal States Hook
 * 
 * Manages all modal open/close states and browser history integration
 * Extracted from App.tsx modal-related logic
 * 
 * Updated to include all raw setters for Integration Guide compatibility
 */

import React from 'react';
import { useState, useEffect, useCallback } from 'react';
import { InventoryItem, Business } from '../types';

export interface UseModalStatesReturn {
    // Scanner
    isScannerOpen: boolean;
    setIsScannerOpen: React.Dispatch<React.SetStateAction<boolean>>;
    scannerMode: 'receipt' | 'fridge' | 'sales';
    setScannerMode: React.Dispatch<React.SetStateAction<'receipt' | 'fridge' | 'sales'>>;
    openScanner: (mode: 'receipt' | 'fridge' | 'sales') => void;
    closeScanner: () => void;

    // Edit Item Modal
    isEditModalOpen: boolean;
    setIsEditModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
    editingItem: InventoryItem | null;
    setEditingItem: React.Dispatch<React.SetStateAction<InventoryItem | null>>;

    // Business Dropdown
    isBusinessDropdownOpen: boolean;
    setIsBusinessDropdownOpen: React.Dispatch<React.SetStateAction<boolean>>;

    // Store Modal
    isStoreModalOpen: boolean;
    setIsStoreModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
    editingBusiness: Business | null;
    setEditingBusiness: React.Dispatch<React.SetStateAction<Business | null>>;

    // Join Store Modal
    isJoinStoreModalOpen: boolean;
    setIsJoinStoreModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
    joinStoreCode: string;
    setJoinStoreCode: React.Dispatch<React.SetStateAction<string>>;
    joinStoreNameAlias: string;
    setJoinStoreNameAlias: React.Dispatch<React.SetStateAction<string>>;

    // Meta Manager Modal
    isMetaManagerOpen: boolean;
    setIsMetaManagerOpen: React.Dispatch<React.SetStateAction<boolean>>;
    metaTab: 'categories' | 'locations';
    setMetaTab: React.Dispatch<React.SetStateAction<'categories' | 'locations'>>;
    metaNewValue: string;
    setMetaNewValue: React.Dispatch<React.SetStateAction<string>>;

    // Helpers
    closeAllModals: () => void;
}

export function useModalStates(): UseModalStatesReturn {
    // Scanner
    const [isScannerOpen, setIsScannerOpen] = useState(false);
    const [scannerMode, setScannerMode] = useState<'receipt' | 'fridge' | 'sales'>('receipt');

    // Edit Item Modal
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);

    // Business Dropdown
    const [isBusinessDropdownOpen, setIsBusinessDropdownOpen] = useState(false);

    // Store Modal
    const [isStoreModalOpen, setIsStoreModalOpen] = useState(false);
    const [editingBusiness, setEditingBusiness] = useState<Business | null>(null);

    // Join Store Modal
    const [isJoinStoreModalOpen, setIsJoinStoreModalOpen] = useState(false);
    const [joinStoreCode, setJoinStoreCode] = useState('');
    const [joinStoreNameAlias, setJoinStoreNameAlias] = useState('');

    // Meta Manager Modal
    const [isMetaManagerOpen, setIsMetaManagerOpen] = useState(false);
    const [metaTab, setMetaTab] = useState<'categories' | 'locations'>('categories');
    const [metaNewValue, setMetaNewValue] = useState('');

    // Handle browser back button
    useEffect(() => {
        const handlePopState = () => {
            // Close modals when user presses back
            if (isScannerOpen || isEditModalOpen || isStoreModalOpen || isJoinStoreModalOpen || isMetaManagerOpen) {
                setIsScannerOpen(false);
                setIsEditModalOpen(false);
                setIsStoreModalOpen(false);
                setIsJoinStoreModalOpen(false);
                setIsMetaManagerOpen(false);
                setEditingItem(null);
                setEditingBusiness(null);
            }
        };

        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, [isScannerOpen, isEditModalOpen, isStoreModalOpen, isJoinStoreModalOpen, isMetaManagerOpen]);

    // Push state when opening modal for back button support
    const pushState = useCallback(() => {
        window.history.pushState({ modal: true }, '');
    }, []);

    // Scanner helpers
    const openScanner = useCallback((mode: 'receipt' | 'fridge' | 'sales') => {
        pushState();
        setScannerMode(mode);
        setIsScannerOpen(true);
    }, [pushState]);

    const closeScanner = useCallback(() => {
        setIsScannerOpen(false);
    }, []);

    // Close all modals
    const closeAllModals = useCallback(() => {
        setIsScannerOpen(false);
        setIsEditModalOpen(false);
        setIsStoreModalOpen(false);
        setIsJoinStoreModalOpen(false);
        setIsMetaManagerOpen(false);
        setEditingItem(null);
        setEditingBusiness(null);
        setJoinStoreCode('');
        setJoinStoreNameAlias('');
        setMetaNewValue('');
    }, []);

    return {
        // Scanner
        isScannerOpen,
        setIsScannerOpen,
        scannerMode,
        setScannerMode,
        openScanner,
        closeScanner,

        // Edit Item Modal
        isEditModalOpen,
        setIsEditModalOpen,
        editingItem,
        setEditingItem,

        // Business Dropdown
        isBusinessDropdownOpen,
        setIsBusinessDropdownOpen,

        // Store Modal
        isStoreModalOpen,
        setIsStoreModalOpen,
        editingBusiness,
        setEditingBusiness,

        // Join Store Modal
        isJoinStoreModalOpen,
        setIsJoinStoreModalOpen,
        joinStoreCode,
        setJoinStoreCode,
        joinStoreNameAlias,
        setJoinStoreNameAlias,

        // Meta Manager Modal
        isMetaManagerOpen,
        setIsMetaManagerOpen,
        metaTab,
        setMetaTab,
        metaNewValue,
        setMetaNewValue,

        // Helpers
        closeAllModals,
    };
}

export default useModalStates;
