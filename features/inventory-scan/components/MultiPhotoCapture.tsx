/**
 * MultiPhotoCapture - Multi-photo upload component
 */

import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Upload, X, Image as ImageIcon, Trash2, Plus } from 'lucide-react';

interface CapturedImage {
    id: string;
    file: File;
    preview: string;
}

interface MultiPhotoCaptureProps {
    maxImages?: number;
    onImagesChange: (files: File[]) => void;
    disabled?: boolean;
}

export default function MultiPhotoCapture({
    maxImages = 5,
    onImagesChange,
    disabled = false
}: MultiPhotoCaptureProps) {
    const [images, setImages] = useState<CapturedImage[]>([]);
    const [cameraActive, setCameraActive] = useState(false);
    const [cameraError, setCameraError] = useState<string | null>(null);

    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const streamRef = useRef<MediaStream | null>(null);

    // Start camera
    const startCamera = useCallback(async () => {
        setCameraError(null);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: 'environment',
                    width: { ideal: 1920 },
                    height: { ideal: 1080 }
                }
            });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                streamRef.current = stream;
                setCameraActive(true);
            }
        } catch (err) {
            console.error('Camera access denied:', err);
            setCameraError('Camera access denied. Please allow permissions or upload images.');
        }
    }, []);

    // Stop camera
    const stopCamera = useCallback(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        setCameraActive(false);
    }, []);

    // Capture from camera
    const captureFromCamera = useCallback(() => {
        if (!videoRef.current || !canvasRef.current) return;

        const canvas = canvasRef.current;
        const video = videoRef.current;

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        const ctx = canvas.getContext('2d');
        ctx?.drawImage(video, 0, 0);

        canvas.toBlob((blob) => {
            if (!blob) return;

            const file = new File([blob], `scan_${Date.now()}.jpg`, { type: 'image/jpeg' });
            const preview = URL.createObjectURL(blob);

            const newImage: CapturedImage = {
                id: `img_${Date.now()}`,
                file,
                preview
            };

            setImages(prev => {
                const updated = [...prev, newImage].slice(-maxImages);
                onImagesChange(updated.map(i => i.file));
                return updated;
            });
        }, 'image/jpeg', 0.9);
    }, [maxImages, onImagesChange]);

    // Handle file upload
    const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;

        const newImages: CapturedImage[] = files.slice(0, maxImages - images.length).map((file: File) => ({
            id: `img_${Date.now()}_${Math.random().toString(36).slice(2)}`,
            file,
            preview: URL.createObjectURL(file)
        }));

        setImages(prev => {
            const updated = [...prev, ...newImages].slice(-maxImages);
            onImagesChange(updated.map(i => i.file));
            return updated;
        });

        // Reset input
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    }, [images.length, maxImages, onImagesChange]);

    // Remove an image
    const removeImage = useCallback((id: string) => {
        setImages(prev => {
            const img = prev.find(i => i.id === id);
            if (img) URL.revokeObjectURL(img.preview);

            const updated = prev.filter(i => i.id !== id);
            onImagesChange(updated.map(i => i.file));
            return updated;
        });
    }, [onImagesChange]);

    // Clear all images
    const clearAll = useCallback(() => {
        images.forEach(img => URL.revokeObjectURL(img.preview));
        setImages([]);
        onImagesChange([]);
    }, [images, onImagesChange]);

    const canAddMore = images.length < maxImages;

    return (
        <div className="space-y-4">
            {/* Camera view or capture options */}
            {cameraActive ? (
                <div className="relative aspect-video bg-slate-900 rounded-xl overflow-hidden">
                    <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover"
                    />

                    {/* Scan overlay */}
                    <motion.div
                        className="absolute inset-8 border-2 border-white/50 rounded-lg pointer-events-none"
                        animate={{ opacity: [0.5, 1, 0.5] }}
                        transition={{ duration: 2, repeat: Infinity }}
                    />

                    {/* Capture button */}
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-4">
                        <motion.button
                            onClick={captureFromCamera}
                            className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-lg"
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                        >
                            <Camera className="w-8 h-8 text-slate-900" />
                        </motion.button>
                    </div>

                    {/* Close camera button */}
                    <button
                        onClick={stopCamera}
                        className="absolute top-4 right-4 w-10 h-10 bg-black/50 rounded-full flex items-center justify-center text-white"
                    >
                        <X className="w-5 h-5" />
                    </button>

                    {/* Image count */}
                    <div className="absolute top-4 left-4 bg-black/50 text-white px-3 py-1 rounded-full text-sm">
                        {images.length}/{maxImages} photos
                    </div>
                </div>
            ) : (
                <div className="space-y-4">
                    {/* Image previews */}
                    {images.length > 0 && (
                        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                            <AnimatePresence mode="popLayout">
                                {images.map((img, index) => (
                                    <motion.div
                                        key={img.id}
                                        layout
                                        initial={{ opacity: 0, scale: 0.8 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.8 }}
                                        className="relative aspect-square rounded-lg overflow-hidden bg-slate-100"
                                    >
                                        <img
                                            src={img.preview}
                                            alt={`Captured ${index + 1}`}
                                            className="w-full h-full object-cover"
                                        />
                                        <button
                                            onClick={() => removeImage(img.id)}
                                            className="absolute top-1 right-1 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white shadow-md"
                                            disabled={disabled}
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                        <div className="absolute bottom-1 left-1 bg-black/50 text-white text-xs px-1.5 py-0.5 rounded">
                                            {index + 1}
                                        </div>
                                    </motion.div>
                                ))}
                            </AnimatePresence>

                            {/* Add more button */}
                            {canAddMore && !disabled && (
                                <motion.button
                                    layout
                                    onClick={startCamera}
                                    className="aspect-square rounded-lg border-2 border-dashed border-slate-300 flex items-center justify-center text-slate-400 hover:border-slate-400 hover:text-slate-500 transition-colors"
                                >
                                    <Plus className="w-8 h-8" />
                                </motion.button>
                            )}
                        </div>
                    )}

                    {/* Initial capture options */}
                    {images.length === 0 && (
                        <div className="aspect-video bg-slate-100 rounded-xl flex flex-col items-center justify-center gap-4 border-2 border-dashed border-slate-300">
                            <div className="flex gap-2">
                                <ImageIcon className="w-12 h-12 text-slate-400" />
                            </div>
                            <p className="text-slate-500 text-sm">Take photos or upload images</p>
                            <p className="text-slate-400 text-xs">Up to {maxImages} photos from different angles</p>
                        </div>
                    )}

                    {/* Action buttons */}
                    {!disabled && (
                        <div className="flex gap-3">
                            <motion.button
                                onClick={startCamera}
                                disabled={!canAddMore}
                                className="flex-1 py-3 bg-slate-900 text-white rounded-lg font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-800 transition-colors"
                                whileHover={{ scale: canAddMore ? 1.02 : 1 }}
                                whileTap={{ scale: canAddMore ? 0.98 : 1 }}
                            >
                                <Camera className="w-5 h-5" />
                                {images.length > 0 ? 'Add Photo' : 'Take Photo'}
                            </motion.button>

                            <motion.button
                                onClick={() => fileInputRef.current?.click()}
                                disabled={!canAddMore}
                                className="px-6 py-3 border border-slate-300 rounded-lg font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
                                whileHover={{ scale: canAddMore ? 1.02 : 1 }}
                                whileTap={{ scale: canAddMore ? 0.98 : 1 }}
                            >
                                <Upload className="w-5 h-5" />
                                Upload
                            </motion.button>

                            {images.length > 0 && (
                                <motion.button
                                    onClick={clearAll}
                                    className="px-4 py-3 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                >
                                    <Trash2 className="w-5 h-5" />
                                </motion.button>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Hidden file input */}
            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleFileUpload}
            />

            {/* Hidden canvas for capture */}
            <canvas ref={canvasRef} className="hidden" />

            {/* Camera error */}
            {cameraError && (
                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-red-500 text-sm text-center"
                >
                    {cameraError}
                </motion.p>
            )}
        </div>
    );
}
