/**
 * Photo Scan Section
 * Multi-photo upload with AI recognition for inventory items
 * 🆕 Uses Multi-Invoice OCR for accurate supplier/cost extraction from ALL photos
 */
import React, { useState, useRef, useCallback } from 'react';
import { DraftInventoryItem } from './types';
import { WIZARD_STRINGS } from './constants';
import { analyzeMultipleInvoices } from '../../services/geminiService';
import { preprocessImage } from '../../features/inventory-scan/utils/imagePreprocessing';

interface PhotoScanSectionProps {
    onItemsFound: (items: DraftInventoryItem[]) => void;
    existingNames?: string[];
}

interface PhotoPreview {
    file: File;
    url: string;
}

export const PhotoScanSection: React.FC<PhotoScanSectionProps> = ({
    onItemsFound,
    existingNames = [],
}) => {
    const [photos, setPhotos] = useState<PhotoPreview[]>([]);
    const [scanMode, setScanMode] = useState<'shelf' | 'invoice'>('shelf');
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [results, setResults] = useState<DraftInventoryItem[]>([]);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const MAX_PHOTOS = 10;

    // Add photo
    const handleAddPhoto = useCallback((files: FileList | null) => {
        if (!files) return;

        const remaining = MAX_PHOTOS - photos.length;
        const newPhotos: PhotoPreview[] = [];

        for (let i = 0; i < Math.min(files.length, remaining); i++) {
            const file = files[i];
            if (file.type.startsWith('image/')) {
                newPhotos.push({
                    file,
                    url: URL.createObjectURL(file),
                });
            }
        }

        setPhotos(prev => [...prev, ...newPhotos]);
        setError(null);
    }, [photos.length]);

    // Remove photo
    const handleRemovePhoto = useCallback((index: number) => {
        setPhotos(prev => {
            const photo = prev[index];
            if (photo) {
                URL.revokeObjectURL(photo.url);
            }
            return prev.filter((_, i) => i !== index);
        });
    }, []);

    // Trigger file input
    const triggerUpload = useCallback(() => {
        fileInputRef.current?.click();
    }, []);

    // Run AI analysis
    const handleAnalyze = useCallback(async () => {
        if (photos.length === 0) return;

        setIsAnalyzing(true);
        setError(null);

        try {
            // Process images
            const processedImages = await Promise.all(
                photos.map(async (photo) => {
                    const processed = await preprocessImage(photo.file, {
                        targetSizeKB: 300,
                        maxWidth: 1500,
                        autoEnhance: true
                    });
                    return {
                        base64: processed.base64,
                        mimeType: 'image/jpeg'
                    };
                })
            );

            console.log(`[PhotoScanSection] Analyzing ${processedImages.length} photos in mode: ${scanMode}`);

            let draftItems: DraftInventoryItem[] = [];

            if (scanMode === 'invoice') {
                // INVOICE MODE (Existing logic)
                const invoiceResult = await analyzeMultipleInvoices(
                    processedImages,
                    existingNames
                );

                if (!invoiceResult.items || invoiceResult.items.length === 0) {
                    throw new Error('No items found. Please try clearer photos.');
                }

                draftItems = invoiceResult.items.map((item) => ({
                    id: crypto.randomUUID(),
                    name: item.name || '',
                    category: '',
                    quantityUnit: item.unit || 'pcs',
                    unitCost: item.unitCost,
                    minStockLevel: 0,
                    supplier: invoiceResult.supplier,
                    issues: [],
                }));

            } else {
                // SHELF MODE (New logic)
                const { analyzeMultiAngleImages } = await import('../../services/geminiService');

                // Map to 'fridge' or 'storage' generic area for now
                const shelfResult = await analyzeMultiAngleImages(
                    processedImages,
                    'storage', // Defaulting to storage, could add specific selector later if needed
                    existingNames
                );

                if (!shelfResult || shelfResult.length === 0) {
                    throw new Error('No food items identified. Try closer photos.');
                }

                draftItems = shelfResult.map((item: any) => ({
                    id: crypto.randomUUID(),
                    name: item.name || item.itemName || '',
                    category: item.category || '',
                    quantityUnit: item.quantityUnit || item.unit || 'pcs',
                    // Shelf scan doesn't give cost, default to 0
                    unitCost: 0,
                    // Use quantity found as initial stock? Wizard usually sets *items*, 
                    // usually wizard is for defining the *item list*, but quantity is useful for initial count.
                    // The DraftInventoryItem type might not have 'quantity' field visible in this file, 
                    // but looking at Stage1Ingest it maps template items. 
                    // Let's check DraftInventoryItem def. logic below assumes keys.
                    // Wait, helper in Stage1Ingest didn't set quantity, only minStockLevel. 
                    // But 'excelItems' probably has quantity. 
                    // Let's assume we capture what we can. 
                    // Actually, for Setup, we primarily want the Item Definition (Name, Unit, Category).
                    minStockLevel: 0,
                    supplier: undefined,
                    issues: [],
                    // If DraftInventoryItem has distinct 'currentQuantity', we might want to set it if supported
                    // But based on types in Stage1, it seems focused on catalogue. 
                    // We'll stick to basic fields.
                }));
            }

            setResults(draftItems);
            onItemsFound(draftItems);

        } catch (err: any) {
            console.error('Photo scan error:', err);
            setError(err.message || 'Failed to analyze photos');
        } finally {
            setIsAnalyzing(false);
        }
    }, [photos, existingNames, onItemsFound, scanMode]);

    return (
        <div className="space-y-6">
            {/* Scan Mode Selector */}
            <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
                <button
                    onClick={() => setScanMode('shelf')}
                    className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${scanMode === 'shelf'
                        ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                        }`}
                >
                    <span className="mr-2">🥫</span>
                    {WIZARD_STRINGS.modeShelf}
                </button>
                <button
                    onClick={() => setScanMode('invoice')}
                    className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${scanMode === 'invoice'
                        ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                        }`}
                >
                    <span className="mr-2">📄</span>
                    {WIZARD_STRINGS.modeInvoice}
                </button>
            </div>

            {/* Helper Text */}
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center -mt-2">
                {scanMode === 'shelf' ? WIZARD_STRINGS.modeShelfDesc : WIZARD_STRINGS.modeInvoiceDesc}
            </p>

            {/* Photo Grid */}
            <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-6">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
                    📷 {WIZARD_STRINGS.noPhotos}
                </h3>

                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                    {photos.map((photo, index) => (
                        <div key={index} className="relative aspect-square group">
                            <img
                                src={photo.url}
                                alt={`Photo ${index + 1}`}
                                className="w-full h-full object-cover rounded-lg"
                            />
                            <button
                                onClick={() => handleRemovePhoto(index)}
                                className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-sm"
                            >
                                ×
                            </button>
                        </div>
                    ))}

                    {/* Add Photo Button */}
                    {photos.length < MAX_PHOTOS && (
                        <button
                            onClick={triggerUpload}
                            className="aspect-square border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg flex flex-col items-center justify-center hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                        >
                            <span className="text-3xl mb-1">📷</span>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                                {WIZARD_STRINGS.addPhoto}
                            </span>
                        </button>
                    )}
                </div>

                <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">
                    {WIZARD_STRINGS.photoLimit} ({photos.length}/{MAX_PHOTOS})
                </p>

                {/* Hidden file input */}
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={e => handleAddPhoto(e.target.files)}
                    className="hidden"
                />
            </div>

            {/* Analyze Button */}
            <button
                onClick={handleAnalyze}
                disabled={photos.length === 0 || isAnalyzing}
                className={`
                    w-full py-4 rounded-xl font-semibold text-lg transition-all flex items-center justify-center gap-3
                    ${photos.length > 0 && !isAnalyzing
                        ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white hover:from-blue-600 hover:to-indigo-600 shadow-lg'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                    }
                `}
            >
                {isAnalyzing ? (
                    <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                        {WIZARD_STRINGS.scanning}
                    </>
                ) : (
                    <>
                        🔍 {WIZARD_STRINGS.startScan}
                    </>
                )}
            </button>

            {/* Error */}
            {error && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400">
                    {error}
                </div>
            )}

            {/* Results Preview */}
            {results.length > 0 && (
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <span className="text-2xl">✅</span>
                        <h3 className="font-semibold text-green-800 dark:text-green-200">
                            {results.length} {WIZARD_STRINGS.foundItems}
                        </h3>
                    </div>

                    <div className="max-h-60 overflow-y-auto space-y-2">
                        {results.slice(0, 20).map((item, index) => (
                            <div
                                key={item.id}
                                className="flex items-center justify-between py-2 px-3 bg-white dark:bg-gray-800 rounded-lg text-sm"
                            >
                                <span className="text-gray-900 dark:text-white">
                                    {index + 1}. {item.name}
                                </span>
                                <span className="text-gray-500 dark:text-gray-400">
                                    {item.quantityUnit}
                                </span>
                            </div>
                        ))}
                        {results.length > 20 && (
                            <p className="text-center text-sm text-gray-500 py-2">
                                ... and {results.length - 20} more
                            </p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default PhotoScanSection;
