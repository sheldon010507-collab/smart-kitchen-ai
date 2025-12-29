/**
 * ScanArea - Camera scanning component with capture functionality
 */

import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, RefreshCw, ArrowRight, Upload } from 'lucide-react';
import { ScanStep, RecognizedItem } from '../types';
import RecognitionPreview from './RecognitionPreview';

interface ScanAreaProps {
    step: ScanStep;
    isScanning: boolean;
    recognizedItems: RecognizedItem[];
    error: string | null;
    onCapture: (imageBase64: string, mimeType: string) => void;
    onAdjustQuantity: (index: number, quantity: number) => void;
    onRemoveItem: (index: number) => void;
    onConfirm: () => void;
    onRetry: () => void;
}

const STEP_ICONS: Record<string, React.ReactNode> = {
    storage: '📦',
    front: '🍳',
    back: '🔪'
};

export default function ScanArea({
    step,
    isScanning,
    recognizedItems,
    error,
    onCapture,
    onAdjustQuantity,
    onRemoveItem,
    onConfirm,
    onRetry
}: ScanAreaProps) {
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
                video: { facingMode: 'environment' }
            });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                streamRef.current = stream;
                setCameraActive(true);
            }
        } catch (err) {
            console.error('Camera access denied:', err);
            setCameraError('Camera access denied. Please allow camera permissions or upload an image.');
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

    // Capture image from camera
    const captureImage = useCallback(() => {
        if (videoRef.current && canvasRef.current) {
            const canvas = canvasRef.current;
            const video = videoRef.current;

            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;

            const ctx = canvas.getContext('2d');
            ctx?.drawImage(video, 0, 0);

            const base64 = canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
            onCapture(base64, 'image/jpeg');

            stopCamera();
        }
    }, [onCapture, stopCamera]);

    // Handle file upload
    const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onloadend = () => {
            const base64 = (reader.result as string).split(',')[1];
            const mimeType = file.type || 'image/jpeg';
            onCapture(base64, mimeType);
        };
        reader.readAsDataURL(file);

        // Reset input
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    }, [onCapture]);

    return (
        <div className="max-w-2xl mx-auto">
            {/* Area title */}
            <div className="text-center mb-8">
                <motion.div
                    className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 mb-4 text-3xl"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 300 }}
                >
                    {STEP_ICONS[step.area] || '📷'}
                </motion.div>
                <h2 className="text-2xl font-bold text-slate-900">{step.title}</h2>
                <p className="text-slate-500 mt-2">{step.description}</p>
            </div>

            {/* Camera/Preview area */}
            <div className="relative aspect-video bg-slate-900 rounded-xl overflow-hidden mb-6 shadow-lg">
                {cameraActive ? (
                    <>
                        <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            muted
                            className="w-full h-full object-cover"
                        />
                        {/* Scan frame animation */}
                        <motion.div
                            className="absolute inset-8 border-2 border-white/50 rounded-lg pointer-events-none"
                            animate={{ opacity: [0.5, 1, 0.5] }}
                            transition={{ duration: 2, repeat: Infinity }}
                        />
                        {/* Scan line animation */}
                        <motion.div
                            className="absolute left-8 right-8 h-[2px] bg-emerald-400 pointer-events-none"
                            animate={{ top: ['10%', '90%', '10%'] }}
                            transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                        />
                    </>
                ) : recognizedItems.length > 0 ? (
                    <RecognitionPreview
                        items={recognizedItems}
                        onAdjust={onAdjustQuantity}
                        onRemove={onRemoveItem}
                    />
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-white">
                        <Camera className="w-12 h-12 mb-4 opacity-50" />
                        <p className="opacity-50">Click to start camera or upload image</p>
                        {cameraError && (
                            <p className="text-red-400 text-sm mt-2 px-4 text-center">{cameraError}</p>
                        )}
                    </div>
                )}

                <canvas ref={canvasRef} className="hidden" />
            </div>

            {/* Error message */}
            {error && (
                <motion.div
                    className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    {error}
                </motion.div>
            )}

            {/* Action buttons */}
            <div className="flex gap-4">
                {!cameraActive && recognizedItems.length === 0 && (
                    <>
                        <motion.button
                            className="flex-1 py-4 bg-slate-900 text-white rounded-lg font-medium flex items-center justify-center gap-2 hover:bg-slate-800 transition-colors"
                            onClick={startCamera}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                        >
                            <Camera className="w-5 h-5" />
                            Start Camera
                        </motion.button>

                        <motion.button
                            className="px-6 py-4 border border-slate-300 rounded-lg font-medium flex items-center justify-center gap-2 hover:bg-slate-50 transition-colors"
                            onClick={() => fileInputRef.current?.click()}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                        >
                            <Upload className="w-5 h-5" />
                            Upload
                        </motion.button>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleFileUpload}
                        />
                    </>
                )}

                {cameraActive && (
                    <motion.button
                        className="flex-1 py-4 bg-emerald-600 text-white rounded-lg font-medium flex items-center justify-center gap-2 hover:bg-emerald-500 transition-colors"
                        onClick={captureImage}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                    >
                        <Camera className="w-5 h-5" />
                        Capture
                    </motion.button>
                )}

                {recognizedItems.length > 0 && (
                    <>
                        <motion.button
                            className="px-6 py-4 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                            onClick={() => {
                                onRetry();
                            }}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                        >
                            <RefreshCw className="w-5 h-5" />
                        </motion.button>
                        <motion.button
                            className="flex-1 py-4 bg-slate-900 text-white rounded-lg font-medium flex items-center justify-center gap-2 hover:bg-slate-800 transition-colors"
                            onClick={onConfirm}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                        >
                            Confirm & Continue
                            <ArrowRight className="w-5 h-5" />
                        </motion.button>
                    </>
                )}
            </div>

            {/* Scanning overlay */}
            <AnimatePresence>
                {isScanning && (
                    <motion.div
                        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <motion.div
                            className="bg-white rounded-xl p-8 text-center shadow-2xl"
                            initial={{ scale: 0.9 }}
                            animate={{ scale: 1 }}
                        >
                            <motion.div
                                className="w-12 h-12 border-4 border-slate-200 border-t-slate-900 rounded-full mx-auto mb-4"
                                animate={{ rotate: 360 }}
                                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                            />
                            <p className="text-slate-900 font-medium">Analyzing image...</p>
                            <p className="text-slate-500 text-sm mt-1">AI is recognizing items</p>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
