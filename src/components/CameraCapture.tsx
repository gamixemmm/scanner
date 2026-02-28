"use client";

import React, { useRef, useState, useCallback } from 'react';
import { Camera, X, RefreshCw } from 'lucide-react';

interface CameraCaptureProps {
    onCapture: (base64Image: string) => void;
    onClose: () => void;
}

export default function CameraCapture({ onCapture, onClose }: CameraCaptureProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [error, setError] = useState<string>('');
    const [isInitializing, setIsInitializing] = useState(true);

    // Initialize camera
    const startCamera = useCallback(async () => {
        try {
            setIsInitializing(true);
            setError('');

            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }

            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'user' },
                audio: false
            });

            setStream(mediaStream);

            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
            }
        } catch (err: any) {
            console.error("Error accessing camera:", err);
            setError('Could not access the camera. Please ensure permissions are granted.');
        } finally {
            setIsInitializing(false);
        }
    }, [stream]);

    // Start camera on mount
    React.useEffect(() => {
        startCamera();
        return () => {
            // Cleanup on unmount
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
        };
    }, []);

    const handleCapture = () => {
        if (videoRef.current && canvasRef.current) {
            const video = videoRef.current;
            const canvas = canvasRef.current;

            // Set canvas dimensions to match video
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;

            const context = canvas.getContext('2d');
            if (context) {
                // Draw image to canvas
                context.drawImage(video, 0, 0, canvas.width, canvas.height);

                // Convert to base64
                const imageDataUrl = canvas.toDataURL('image/jpeg', 0.8);
                onCapture(imageDataUrl);

                // Stop stream
                if (stream) {
                    stream.getTracks().forEach(track => track.stop());
                }
            }
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="glass-panel w-full max-w-lg rounded-2xl overflow-hidden relative border border-white/10 shadow-2xl">
                <div className="absolute top-4 right-4 z-10 flex gap-2">
                    <button
                        onClick={startCamera}
                        className="p-2 bg-black/50 hover:bg-black/70 rounded-full text-white transition-colors"
                        title="Switch Camera / Restart"
                    >
                        <RefreshCw size={20} />
                    </button>
                    <button
                        onClick={onClose}
                        className="p-2 bg-black/50 hover:bg-red-500/80 rounded-full text-white transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="relative aspect-[3/4] sm:aspect-video w-full bg-neutral-900 flex items-center justify-center">
                    {error ? (
                        <div className="p-6 text-center text-red-400">
                            <p>{error}</p>
                            <button
                                onClick={startCamera}
                                className="mt-4 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors"
                            >
                                Try Again
                            </button>
                        </div>
                    ) : isInitializing ? (
                        <div className="text-white/60 animate-pulse flex flex-col items-center">
                            <Camera size={32} className="mb-2 opacity-50" />
                            <p>Initializing camera...</p>
                        </div>
                    ) : (
                        <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            muted
                            className="w-full h-full object-cover"
                        />
                    )}
                </div>

                <div className="p-6 flex flex-col items-center border-t border-white/5 bg-black/40">
                    <p className="text-white/70 text-sm mb-4 text-center">
                        Position your face clearly in the frame. Ensure good lighting for best results.
                    </p>
                    <button
                        onClick={handleCapture}
                        disabled={isInitializing || !!error}
                        className="flex items-center gap-2 px-8 py-3 rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-medium shadow-lg shadow-fuchsia-900/20 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Camera size={20} />
                        <span>Capture Photo</span>
                    </button>
                </div>

                {/* Hidden canvas for processing */}
                <canvas ref={canvasRef} className="hidden" />
            </div>
        </div>
    );
}
