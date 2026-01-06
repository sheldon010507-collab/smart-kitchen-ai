/**
 * Export dropdown button (CSV/PDF)
 */

import React, { useState, useRef, useEffect } from 'react';
import { Download, FileText, FileSpreadsheet, ChevronDown } from 'lucide-react';
import type { ShoppingListItem } from '../types';
import { downloadCsv } from '../utils/exportToCsv';
import { printShoppingList } from '../utils/exportToPdf';

interface ExportButtonProps {
    items: ShoppingListItem[];
    businessName?: string;
    disabled?: boolean;
}

const ExportButton: React.FC<ExportButtonProps> = ({ items, businessName, disabled = false }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleExportCsv = () => {
        downloadCsv(items, 'shopping-list', businessName);
        setIsOpen(false);
    };

    const handleExportPdf = () => {
        printShoppingList(items, 'Shopping List', businessName);
        setIsOpen(false);
    };

    if (disabled || items.length === 0) {
        return (
            <button
                disabled
                className="flex items-center space-x-2 px-3 py-2 text-sm text-[#D3D1CB] border border-[#E9E9E7] rounded-lg cursor-not-allowed"
            >
                <Download className="w-4 h-4" />
                <span>Export</span>
            </button>
        );
    }

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center space-x-1 md:space-x-2 px-2 md:px-3 py-2 text-sm text-[#37352F] border border-[#E9E9E7] rounded-lg hover:bg-[#F7F6F3] transition-colors"
            >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Export</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-[#E9E9E7] py-1 z-20">
                    <button
                        onClick={handleExportCsv}
                        className="w-full flex items-center space-x-3 px-4 py-2.5 text-sm text-[#37352F] hover:bg-[#F7F6F3] transition-colors"
                    >
                        <FileSpreadsheet className="w-4 h-4 text-green-600" />
                        <div className="text-left">
                            <div className="font-medium">Export as CSV</div>
                            <div className="text-xs text-[#787774]">For spreadsheets</div>
                        </div>
                    </button>
                    <button
                        onClick={handleExportPdf}
                        className="w-full flex items-center space-x-3 px-4 py-2.5 text-sm text-[#37352F] hover:bg-[#F7F6F3] transition-colors"
                    >
                        <FileText className="w-4 h-4 text-red-600" />
                        <div className="text-left">
                            <div className="font-medium">Print / PDF</div>
                            <div className="text-xs text-[#787774]">For printing</div>
                        </div>
                    </button>
                </div>
            )}
        </div>
    );
};

export default ExportButton;
