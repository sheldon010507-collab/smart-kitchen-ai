/**
 * ContainerForm Component
 * Modal form for adding/editing containers with image upload
 */

import React, { useState, useEffect, useRef } from 'react';
import { X, Upload, Camera, Trash2 } from 'lucide-react';
import type { Container, CreateContainerInput, CapacityUnit } from '../../types';

interface ContainerFormProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: CreateContainerInput) => Promise<{ error: string | null }>;
    onUploadImage?: (file: File, containerId: string) => Promise<{ url: string | null; error: string | null }>;
    editingContainer?: Container | null;
    businessId: string;
}

const CAPACITY_UNITS: CapacityUnit[] = ['L', 'kg', 'pcs', 'ml', 'g'];

const ContainerForm: React.FC<ContainerFormProps> = ({
    isOpen,
    onClose,
    onSave,
    editingContainer,
    businessId,
}) => {
    const [name, setName] = useState('');
    const [capacityValue, setCapacityValue] = useState<number>(1);
    const [capacityUnit, setCapacityUnit] = useState<CapacityUnit>('L');
    const [images, setImages] = useState<string[]>([]);
    const [newImageFiles, setNewImageFiles] = useState<File[]>([]);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Reset form when editing container changes
    useEffect(() => {
        if (editingContainer) {
            setName(editingContainer.name);
            setCapacityValue(editingContainer.capacityValue);
            setCapacityUnit(editingContainer.capacityUnit);
            setImages(editingContainer.images);
        } else {
            setName('');
            setCapacityValue(1);
            setCapacityUnit('L');
            setImages([]);
        }
        setNewImageFiles([]);
        setError(null);
    }, [editingContainer, isOpen]);

    // Compress image before upload (max 800px, quality 0.7)
    const compressImage = async (file: File): Promise<File> => {
        return new Promise((resolve) => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = new Image();

            img.onload = () => {
                const maxSize = 800;
                let width = img.width;
                let height = img.height;

                if (width > height && width > maxSize) {
                    height = (height * maxSize) / width;
                    width = maxSize;
                } else if (height > maxSize) {
                    width = (width * maxSize) / height;
                    height = maxSize;
                }

                canvas.width = width;
                canvas.height = height;
                ctx?.drawImage(img, 0, 0, width, height);

                canvas.toBlob((blob) => {
                    if (blob) {
                        const compressedFile = new File([blob], file.name, { type: 'image/jpeg' });
                        resolve(compressedFile);
                    } else {
                        resolve(file);
                    }
                }, 'image/jpeg', 0.7);
            };

            img.onerror = () => resolve(file);
            img.src = URL.createObjectURL(file);
        });
    };

    const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        // Limit to 3 total images
        const remaining = 3 - images.length - newImageFiles.length;
        const toAdd = files.slice(0, remaining);

        // Compress each image
        const compressed = await Promise.all(toAdd.map(compressImage));
        setNewImageFiles(prev => [...prev, ...compressed]);
    };

    const removeImage = (index: number, isNew: boolean) => {
        if (isNew) {
            setNewImageFiles(prev => prev.filter((_, i) => i !== index));
        } else {
            setImages(prev => prev.filter((_, i) => i !== index));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim() || capacityValue <= 0) {
            setError('Please fill in all required fields');
            return;
        }

        setSaving(true);
        setError(null);

        try {
            // For now, just pass existing images (new image upload would require containerId first)
            const result = await onSave({
                businessId,
                name: name.trim(),
                capacityValue,
                capacityUnit,
                images,
            });

            if (result.error) {
                setError(result.error);
            } else {
                onClose();
            }
        } catch (err: any) {
            setError(err.message || 'Failed to save container');
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    const totalImages = images.length + newImageFiles.length;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b">
                    <h3 className="text-lg font-semibold">
                        {editingContainer ? 'Edit Container' : 'Add New Container'}
                    </h3>
                    <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-4 space-y-4">
                    {/* Container Name */}
                    <div>
                        <label className="block text-sm font-medium mb-1">
                            Container Name <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                            placeholder="e.g., Red Lid Medium Box"
                        />
                    </div>

                    {/* Capacity */}
                    <div>
                        <label className="block text-sm font-medium mb-1">
                            Capacity <span className="text-red-500">*</span>
                        </label>
                        <div className="flex gap-2">
                            <input
                                type="number"
                                value={capacityValue}
                                onChange={(e) => setCapacityValue(parseFloat(e.target.value) || 0)}
                                min="0.1"
                                step="0.1"
                                className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                            <select
                                value={capacityUnit}
                                onChange={(e) => setCapacityUnit(e.target.value as CapacityUnit)}
                                className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                            >
                                {CAPACITY_UNITS.map((unit) => (
                                    <option key={unit} value={unit}>{unit}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Photos */}
                    <div>
                        <label className="block text-sm font-medium mb-1">
                            Photos (3 views recommended)
                        </label>
                        <p className="text-xs text-gray-500 mb-2">
                            Upload 1-3 photos from different angles to help AI recognize this container
                        </p>

                        {/* Image Grid */}
                        <div className="grid grid-cols-3 gap-2 mb-2">
                            {/* Existing Images */}
                            {images.map((url, i) => (
                                <div key={`existing-${i}`} className="relative aspect-square">
                                    <img
                                        src={url}
                                        alt={`Container view ${i + 1}`}
                                        className="w-full h-full object-cover rounded-lg border"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => removeImage(i, false)}
                                        className="absolute -top-1 -right-1 p-1 bg-red-500 text-white rounded-full"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </div>
                            ))}

                            {/* New Image Previews */}
                            {newImageFiles.map((file, i) => (
                                <div key={`new-${i}`} className="relative aspect-square">
                                    <img
                                        src={URL.createObjectURL(file)}
                                        alt={`New upload ${i + 1}`}
                                        className="w-full h-full object-cover rounded-lg border"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => removeImage(i, true)}
                                        className="absolute -top-1 -right-1 p-1 bg-red-500 text-white rounded-full"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </div>
                            ))}

                            {/* Upload Placeholder */}
                            {totalImages < 3 && (
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="aspect-square border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center text-gray-400 hover:border-blue-500 hover:text-blue-500 transition-colors"
                                >
                                    <Camera className="w-6 h-6" />
                                    <span className="text-xs mt-1">Add</span>
                                </button>
                            )}
                        </div>

                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={handleImageSelect}
                            className="hidden"
                        />
                    </div>

                    {/* Error */}
                    {error && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                            {error}
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={saving || !name.trim()}
                            className="flex-1 py-2 bg-primary text-white rounded-lg hover:bg-primaryHover disabled:opacity-50"
                        >
                            {saving ? 'Saving...' : editingContainer ? 'Update' : 'Save'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ContainerForm;
