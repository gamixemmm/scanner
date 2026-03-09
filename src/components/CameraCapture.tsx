"use client";

import React, { useRef, useState, useCallback, useEffect } from 'react';
import { Camera, X, RefreshCw, Sparkles } from 'lucide-react';
import { requestCameraPermission } from '@/utils/permissions';

const DEBUG_MESH = true;

// CDN base for MediaPipe face_mesh v0.4 — loaded as a browser <script>, not bundled by webpack
const MP_CDN = 'https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4.1633559619';

// ── Label drawing helper ─────────────────────────────────────────────────────
// Draws a colored dot with a first-letter icon, a short connector line,
// and a dark pill badge with white text — readable on any skin tone.
function drawIssueLabel(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    issue: string,
    color: string
) {
    const label = ISSUE_DISPLAY[issue.toLowerCase()] ?? issue;
    const dotR = 11;

    // Dot: filled circle with a slightly lighter ring
    ctx.beginPath();
    ctx.arc(x, y, dotR + 3, 0, Math.PI * 2);
    ctx.fillStyle = color + '44'; // 27% opacity halo
    ctx.fill();

    ctx.beginPath();
    ctx.arc(x, y, dotR, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // First letter inside dot
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label[0].toUpperCase(), x, y);

    // Pill badge below dot
    const pillPadX = 7;
    const pillPadY = 4;
    const pillH = 20;
    ctx.font = 'bold 11px sans-serif';
    const textW = ctx.measureText(label).width;
    const pillW = textW + pillPadX * 2;
    const pillX = x - pillW / 2;
    const pillY = y + dotR + 5;
    const r = pillH / 2;

    // Rounded rect (manual, works in all browsers)
    ctx.beginPath();
    ctx.moveTo(pillX + r, pillY);
    ctx.lineTo(pillX + pillW - r, pillY);
    ctx.quadraticCurveTo(pillX + pillW, pillY, pillX + pillW, pillY + r);
    ctx.lineTo(pillX + pillW, pillY + pillH - r);
    ctx.quadraticCurveTo(pillX + pillW, pillY + pillH, pillX + pillW - r, pillY + pillH);
    ctx.lineTo(pillX + r, pillY + pillH);
    ctx.quadraticCurveTo(pillX, pillY + pillH, pillX, pillY + pillH - r);
    ctx.lineTo(pillX, pillY + r);
    ctx.quadraticCurveTo(pillX, pillY, pillX + r, pillY);
    ctx.closePath();

    ctx.fillStyle = 'rgba(0,0,0,0.82)';
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Label text inside pill
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, x, pillY + pillH / 2);
}

// ── Pixel-based skin analysis ─────────────────────────────────────────────────
// Samples the actual RGB values from the video frame at MediaPipe landmark
// positions to detect skin conditions without any external API call.

type Landmark = { x: number; y: number; z: number };
type DetectedIssue = { name: string; landmarkIndices: number[] };

// Sample the average RGB of a small patch centered on a landmark
function samplePatch(
    data: ImageData,
    lm: Landmark,
    w: number,
    h: number,
    r = 5
): [number, number, number] {
    const cx = Math.round(lm.x * w);
    const cy = Math.round(lm.y * h);
    let red = 0, grn = 0, blu = 0, n = 0;
    for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
            const px = cx + dx;
            const py = cy + dy;
            if (px < 0 || py < 0 || px >= w || py >= h) continue;
            const i = (py * w + px) * 4;
            red += data.data[i];
            grn += data.data[i + 1];
            blu += data.data[i + 2];
            n++;
        }
    }
    if (!n) return [128, 100, 80];
    return [red / n, grn / n, blu / n];
}

function avgPatches(
    data: ImageData,
    indices: number[],
    landmarks: Landmark[],
    w: number,
    h: number
): [number, number, number] {
    let r = 0, g = 0, b = 0, n = 0;
    for (const idx of indices) {
        if (!landmarks[idx]) continue;
        const [pr, pg, pb] = samplePatch(data, landmarks[idx], w, h);
        r += pr; g += pg; b += pb; n++;
    }
    if (!n) return [128, 100, 80];
    return [r / n, g / n, b / n];
}

function lum(r: number, g: number, b: number): number {
    return 0.299 * r + 0.587 * g + 0.114 * b;
}

function analyzeSkinPixels(
    imageData: ImageData,
    landmarks: Landmark[],
    w: number,
    h: number
): DetectedIssue[] {
    const issues: DetectedIssue[] = [];

    // ── Global Baseline: forehead (most neutral skin region) ──
    const foreheadBaselineIdx = [10, 67, 109, 338, 297, 151, 9, 8, 107, 336];
    const [fR, fG, fB] = avgPatches(imageData, foreheadBaselineIdx, landmarks, w, h);
    const baseLum = lum(fR, fG, fB);
    const baseRedIdx = fR / (fG + fB + 1);

    const faceRegions: { name: string; landmarks: number[]; neighbors: number[] }[] = [
        // Forehead (center, away from hairline & brows)
        {
            name: 'forehead',
            landmarks: [10, 151, 9, 8, 107, 336, 109, 338],
            neighbors: [10, 151, 9, 8, 107, 336]
        },
        // Left cheek (broad flat area)
        {
            name: 'left_cheek',
            landmarks: [50, 123, 187, 207, 213, 147, 192, 214, 212, 216],
            neighbors: [50, 123, 93, 132, 116]
        },
        // Right cheek (broad flat area)
        {
            name: 'right_cheek',
            landmarks: [280, 352, 411, 427, 433, 376, 416, 434, 432, 436],
            neighbors: [280, 352, 323, 361, 345]
        },
        // Nose (ridge and upper flat sides, avoiding dark nostrils)
        {
            name: 'nose',
            landmarks: [4, 5, 6, 195, 197, 1, 2, 98, 327],
            neighbors: [6, 197, 195, 5, 4, 1]
        },
        // Left jawline (lower cheek above the dark contour)
        {
            name: 'left_jaw',
            landmarks: [150, 149, 176, 148, 136, 172],
            neighbors: [150, 149, 176, 148]
        },
        // Right jawline (lower cheek above the dark contour)
        {
            name: 'right_jaw',
            landmarks: [379, 378, 400, 377, 365, 397],
            neighbors: [379, 378, 400, 377]
        },
        // Chin (center chin)
        {
            name: 'chin',
            landmarks: [152, 175, 199, 200, 201, 208, 428, 421],
            neighbors: [152, 175, 199, 200, 149, 378]
        },
    ];

    for (const region of faceRegions) {
        // Compute average color for this entire region
        const [rR, rG, rB] = avgPatches(imageData, region.landmarks, landmarks, w, h);
        const regionLum = lum(rR, rG, rB);
        const regionRedIdx = rR / (rG + rB + 1);

        // 1. Redness: region is significantly redder than the forehead baseline
        if (regionRedIdx > baseRedIdx * 1.08 && region.name !== 'nose' && region.name !== 'forehead') {
            // Note: nose is naturally redder on many people, forehead is the baseline
            issues.push({ name: `redness_${region.name}`, landmarkIndices: region.landmarks });
        }

        // 2. Hyperpigmentation: region is darker and warmer than the forehead baseline
        if (regionLum < baseLum * 0.70 && regionRedIdx > baseRedIdx * 1.05 && region.name !== 'forehead') {
            issues.push({ name: `hyperpigmentation_${region.name}`, landmarkIndices: region.landmarks });
        }

        // 3. Texture: high luminance variance across the region
        const lumSamples = region.landmarks
            .filter(idx => landmarks[idx])
            .map(idx => {
                const [r, g, b] = samplePatch(imageData, landmarks[idx], w, h, 6);
                return lum(r, g, b);
            });

        if (lumSamples.length > 0) {
            const mean = lumSamples.reduce((a, b) => a + b, 0) / lumSamples.length;
            const variance = lumSamples.reduce((a, b) => a + (b - mean) ** 2, 0) / lumSamples.length;
            if (variance > 500) {
                issues.push({ name: `texture_${region.name}`, landmarkIndices: region.landmarks });
            }
        }

        // 4. Acne: small spots darker OR redder than their LOCAL region baseline
        // We use region.neighbors for the local baseline to avoid the acne spot skewing it
        const [nR, nG, nB] = avgPatches(imageData, region.neighbors, landmarks, w, h);
        const localLum = lum(nR, nG, nB);
        const localRedIdx = nR / (nG + nB + 1);
        const acneHits: number[] = [];
        for (const idx of region.landmarks) {
            if (!landmarks[idx]) continue;
            const [sR, sG, sB] = samplePatch(imageData, landmarks[idx], w, h, 5);
            const spotLum = lum(sR, sG, sB);
            const spotRedIdx = sR / (sG + sB + 1);
            if (spotLum < localLum * 0.80 && spotRedIdx > localRedIdx * 1.15) {
                acneHits.push(idx);
            }
        }
        if (acneHits.length >= 1) {
            issues.push({ name: `acne_${region.name}`, landmarkIndices: acneHits });
        }
    }

    return issues;
}

// Map issue keywords → MediaPipe 468-landmark indices (approximate face regions)
const ISSUE_TO_LANDMARKS: Record<string, number[]> = {
    acne: [10, 151, 9, 8],
    redness: [234, 454, 128, 358],
    hyperpigmentation: [152, 377, 400],
    texture: [168, 6, 197],
    scarring: [234, 454, 132, 361],
    'uneven tone': [152, 377],
    'dark spots': [234, 454],
};

const ISSUE_LABEL_COLORS: Record<string, string> = {
    acne: '#eab308',
    redness: '#ef4444',
    hyperpigmentation: '#f97316',
    texture: '#8b5cf6',
    scarring: '#ec4899',
    'uneven tone': '#f97316',
    'dark spots': '#f97316',
};

// Human-readable display names for the pill labels
const ISSUE_DISPLAY: Record<string, string> = {
    acne: 'Acne',
    redness: 'Redness',
    hyperpigmentation: 'Hyperpigm.',
    texture: 'Texture',
    scarring: 'Scarring',
    'uneven tone': 'Uneven Tone',
    'dark spots': 'Dark Spots',
};

function getIssueColor(issue: string): string {
    const lower = issue.toLowerCase();
    for (const [key, color] of Object.entries(ISSUE_LABEL_COLORS)) {
        if (lower.startsWith(key) || lower.includes(key)) return color;
    }
    return '#a78bfa';
}

function detectFaceYaw(landmarks: any[]): 'straight' | 'left' | 'right' {
    const nose = landmarks[1];
    const leftCheek = landmarks[454];  // User's left
    const rightCheek = landmarks[234]; // User's right
    if (!nose || !leftCheek || !rightCheek) return 'straight';

    const distLeft = Math.abs(leftCheek.x - nose.x);
    const distRight = Math.abs(rightCheek.x - nose.x);
    const ratio = distLeft / (distRight + 0.001);

    if (ratio > 1.8) return 'right'; // User looking Right
    if (ratio < 0.55) return 'left'; // User looking Left
    return 'straight';
}

function getLandmarkIndicesForIssue(issue: string): number[] {
    const lower = issue.toLowerCase();
    for (const [key, indices] of Object.entries(ISSUE_TO_LANDMARKS)) {
        if (lower.includes(key)) return indices;
    }
    return [10, 234, 454];
}

// Injects the MediaPipe face_mesh.js script tag once and resolves when ready.
// This bypasses webpack bundling entirely — the script runs in the browser's global scope,
// making window.FaceMesh available without any module system involvement.
let mediaPipeScriptPromise: Promise<void> | null = null;
function loadMediaPipeScript(): Promise<void> {
    if (mediaPipeScriptPromise) return mediaPipeScriptPromise;
    mediaPipeScriptPromise = new Promise<void>((resolve, reject) => {
        // Already loaded from a previous mount
        if (typeof window !== 'undefined' && (window as any).FaceMesh) {
            resolve();
            return;
        }
        const src = `${MP_CDN}/face_mesh.js`;
        const existing = document.querySelector(`script[src="${src}"]`);
        if (existing) {
            // Script tag exists but FaceMesh may not be ready yet — poll briefly
            const check = setInterval(() => {
                if ((window as any).FaceMesh) { clearInterval(check); resolve(); }
            }, 50);
            return;
        }
        const script = document.createElement('script');
        script.src = src;
        script.crossOrigin = 'anonymous';
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Failed to load MediaPipe face_mesh.js from CDN'));
        document.head.appendChild(script);
    });
    return mediaPipeScriptPromise;
}

interface CameraCaptureProps {
    onCapture: (base64Image: string) => void;
    onClose: () => void;
    onAnalyze?: (base64Image: string, localIssues?: string[]) => Promise<void>;
    analysisOverlay?: string[] | null;
    isAnalyzing?: boolean;
    analysisError?: string | null;
}

export default function CameraCapture({
    onCapture,
    onClose,
    onAnalyze,
    analysisOverlay = null,
    isAnalyzing = false,
    analysisError = null,
}: CameraCaptureProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const overlayRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const faceMeshRef = useRef<any>(null);
    const rafRef = useRef<number>(0);
    const meshPairsRef = useRef<number[][]>([]);
    const analysisOverlayRef = useRef(analysisOverlay);
    const isAnalyzingRef = useRef(isAnalyzing);
    // Pixel analysis state — no React re-render needed, canvas draws directly from these
    const skinCanvasRef = useRef<HTMLCanvasElement | null>(null); // offscreen canvas for pixel sampling
    const frameCountRef = useRef(0);                              // throttle: analyze every N frames
    const issueHistoryRef = useRef<DetectedIssue[][]>([]);        // last 5 results for smoothing
    const localIssuesRef = useRef<DetectedIssue[]>([]);           // current smoothed result

    // Build state
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [error, setError] = useState<string>('');
    const [isInitializing, setIsInitializing] = useState(true);
    const [meshReady, setMeshReady] = useState(false);
    const [meshError, setMeshError] = useState<string | null>(null);
    const [debugInfo, setDebugInfo] = useState<string>('loading mesh…');

    // Multi-angle scan state
    type ScanPhase = 'idle' | 'straight' | 'left' | 'right' | 'done';
    const [scanPhase, setScanPhase] = useState<ScanPhase>('idle');
    const scanPhaseRef = useRef<ScanPhase>('idle');
    const setScanPhaseSafe = useCallback((p: ScanPhase) => { scanPhaseRef.current = p; setScanPhase(p); }, []);

    const accumulatedIssuesRef = useRef<DetectedIssue[]>([]);
    const scanSamplesRef = useRef(0);
    const straightImageRef = useRef<string | null>(null);

    // Keep refs in sync with props so interval callbacks always see the latest values
    useEffect(() => { analysisOverlayRef.current = analysisOverlay; }, [analysisOverlay]);
    useEffect(() => { isAnalyzingRef.current = isAnalyzing; }, [isAnalyzing]);

    // ── Camera ──────────────────────────────────────────────────────────────
    const startCamera = useCallback(async () => {
        try {
            setIsInitializing(true);
            setError('');
            
            if (streamRef.current) {
                streamRef.current.getTracks().forEach((t) => t.stop());
                streamRef.current = null;
            }

            // Try requesting permission first (non-blocking — always falls through to getUserMedia)
            try {
                await requestCameraPermission();
            } catch (permErr) {
                console.warn('[CameraCapture] Permission pre-check failed, attempting getUserMedia directly:', permErr);
            }

            // Always attempt getUserMedia — this is the real permission gate on Android WebView
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
                audio: false,
            });
            streamRef.current = mediaStream;
            setStream(mediaStream);
        } catch (err) {
            console.error('[CameraCapture] Camera access failed:', err);
            const message = err instanceof Error ? err.message : '';
            if (message.includes('NotAllowedError') || message.includes('Permission')) {
                setError('Camera permission denied. Please grant camera access in your device settings and try again.');
            } else if (message.includes('NotFoundError') || message.includes('DevicesNotFound')) {
                setError('No camera found on this device.');
            } else {
                setError('Could not access the camera. Please ensure permissions are granted.');
            }
        } finally {
            setIsInitializing(false);
        }
    }, []);

    useEffect(() => {
        startCamera();
        return () => {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach((t) => t.stop());
                streamRef.current = null;
            }
            cancelAnimationFrame(rafRef.current);
        };
    }, []);

    useEffect(() => {
        if (!stream || !videoRef.current) return;
        const video = videoRef.current;
        video.srcObject = stream;
        video.play().catch(() => { });
    }, [stream]);

    // ── MediaPipe FaceMesh initialisation ───────────────────────────────────
    const [meshInitKey, setMeshInitKey] = useState(0);
    const retryMeshInit = useCallback(() => {
        setMeshError(null);
        setMeshReady(false);
        // Reset the cached promise so the script can be re-loaded
        mediaPipeScriptPromise = null;
        if (faceMeshRef.current) {
            try { faceMeshRef.current.close(); } catch { /* ignore */ }
            faceMeshRef.current = null;
        }
        setMeshInitKey(k => k + 1);
    }, []);

    useEffect(() => {
        let cancelled = false;

        async function init() {
            try {
                setDebugInfo('loading MediaPipe…');

                // 1. Load face_mesh.js as a <script> so window.FaceMesh is available
                await loadMediaPipeScript();
                if (cancelled) return;

                const FaceMeshClass = (window as any).FaceMesh;
                if (!FaceMeshClass) throw new Error('window.FaceMesh not found after script load');

                // 2. Create the FaceMesh instance — locateFile points WASM files to the same CDN
                const faceMesh = new FaceMeshClass({
                    locateFile: (file: string) => `${MP_CDN}/${file}`,
                });

                faceMesh.setOptions({
                    maxNumFaces: 1,
                    refineLandmarks: false,
                    minDetectionConfidence: 0.5,
                    minTrackingConfidence: 0.5,
                });

                // 3. Pre-load model WASM (optional but prevents a delay on first frame)
                if (typeof faceMesh.initialize === 'function') {
                    await faceMesh.initialize();
                }
                if (cancelled) return;

                // 4. Get mesh tessellation connection pairs (pure JS, no TF.js needed)
                try {
                    const fl = await import('@tensorflow-models/face-landmarks-detection');
                    const pairs = (fl as any).util?.getAdjacentPairs?.(fl.SupportedModels.MediaPipeFaceMesh);
                    meshPairsRef.current = Array.isArray(pairs) ? pairs : [];
                    if (DEBUG_MESH) console.log('[mesh] connection pairs:', meshPairsRef.current.length);
                } catch (e) {
                    console.warn('[mesh] could not load connection pairs:', e);
                }

                faceMeshRef.current = faceMesh;
                setMeshReady(true);
                setMeshError(null);
                setDebugInfo('mesh ready');
                if (DEBUG_MESH) console.log('[mesh] FaceMesh ready');
            } catch (e) {
                if (!cancelled) {
                    const msg = e instanceof Error ? e.message : String(e);
                    console.error('[mesh] init error:', e);
                    setDebugInfo(`init error: ${msg}`);
                    setMeshError('AI engine failed to load. Tap retry.');
                }
            }
        }

        init();

        return () => {
            cancelled = true;
            if (faceMeshRef.current) {
                try { faceMeshRef.current.close(); } catch { /* ignore */ }
                faceMeshRef.current = null;
            }
            meshPairsRef.current = [];
            setMeshReady(false);
        };
    }, [meshInitKey]);

    // ── Draw loop ────────────────────────────────────────────────────────────
    // Sends each video frame to MediaPipe, then draws the mesh lines returned
    // via the onResults callback directly onto the overlay canvas.
    useEffect(() => {
        if (!meshReady || !videoRef.current || !overlayRef.current) return;

        const video = videoRef.current;
        const overlay = overlayRef.current;
        const faceMesh = faceMeshRef.current;
        if (!faceMesh) return;

        let running = true;

        // onResults is called by MediaPipe after each frame is processed
        faceMesh.onResults((results: any) => {
            if (!running) return;

            const ctx = overlay.getContext('2d');
            if (!ctx) return;

            ctx.clearRect(0, 0, overlay.width, overlay.height);

            const landmarks: Array<{ x: number; y: number; z: number }> | undefined =
                results.multiFaceLandmarks?.[0];

            if (landmarks && landmarks.length > 0) {
                // ── Pixel-based skin analysis (every 10 frames ≈ ~3 times/sec) ──
                frameCountRef.current++;
                if (frameCountRef.current % 10 === 0) {
                    // Reuse/create offscreen canvas for pixel sampling
                    if (!skinCanvasRef.current) {
                        skinCanvasRef.current = document.createElement('canvas');
                    }
                    const sc = skinCanvasRef.current;
                    sc.width = video.videoWidth;
                    sc.height = video.videoHeight;
                    const sc2d = sc.getContext('2d');
                    if (sc2d) {
                        sc2d.drawImage(video, 0, 0);
                        const imgData = sc2d.getImageData(0, 0, sc.width, sc.height);
                        const detected = analyzeSkinPixels(imgData, landmarks, sc.width, sc.height);

                        // Smooth over last 5 analyses — only show issue if seen ≥ 3 times
                        issueHistoryRef.current.push(detected);
                        if (issueHistoryRef.current.length > 5) issueHistoryRef.current.shift();
                        const counts: Record<string, number> = {};
                        const latestIndices: Record<string, number[]> = {};
                        for (const batch of issueHistoryRef.current)
                            for (const iss of batch) {
                                counts[iss.name] = (counts[iss.name] ?? 0) + 1;
                                latestIndices[iss.name] = iss.landmarkIndices;
                            }
                        localIssuesRef.current = Object.entries(counts)
                            .filter(([, c]) => c >= 3)
                            .map(([name]) => ({ name, landmarkIndices: latestIndices[name] ?? [] }));

                        // ── Multi-Scan State Machine ──
                        const currentPhase = scanPhaseRef.current;
                        if (currentPhase !== 'idle' && currentPhase !== 'done') {
                            const yaw = detectFaceYaw(landmarks);
                            if (yaw === currentPhase) {
                                scanSamplesRef.current++;
                                if (scanSamplesRef.current >= 4) { // Stable for roughly ~1.3 seconds
                                    // Accumulate unique issues
                                    const map = new Map();
                                    [...accumulatedIssuesRef.current, ...localIssuesRef.current].forEach(i => map.set(i.name, i));
                                    accumulatedIssuesRef.current = Array.from(map.values());

                                    scanSamplesRef.current = 0;
                                    if (currentPhase === 'straight') {
                                        // Save straight image for API
                                        if (videoRef.current && canvasRef.current) {
                                            const video = videoRef.current;
                                            const canvas = canvasRef.current;
                                            canvas.width = video.videoWidth;
                                            canvas.height = video.videoHeight;
                                            const snapCtx = canvas.getContext('2d');
                                            if (snapCtx) {
                                                snapCtx.drawImage(video, 0, 0, canvas.width, canvas.height);
                                                straightImageRef.current = canvas.toDataURL('image/jpeg', 0.8);
                                            }
                                        }
                                        setScanPhaseSafe('left');
                                    } else if (currentPhase === 'left') {
                                        setScanPhaseSafe('right');
                                    } else if (currentPhase === 'right') {
                                        setScanPhaseSafe('done');
                                        if (onAnalyze && straightImageRef.current) {
                                            const finalIssues = accumulatedIssuesRef.current.map(i => i.name);
                                            onAnalyze(straightImageRef.current, finalIssues).finally(() => setScanPhaseSafe('idle'));
                                        } else {
                                            setScanPhaseSafe('idle');
                                        }
                                    }
                                }
                            } else {
                                scanSamplesRef.current = 0; // Reset if they look away
                            }
                        }
                    }

                    if (DEBUG_MESH) {
                        setDebugInfo(
                            `faces:1 kp:${landmarks.length} local:[${localIssuesRef.current.map(i => i.name).join(',')}]`
                        );
                    }
                }

                const w = overlay.width;
                const h = overlay.height;
                const pairs = meshPairsRef.current;

                if (pairs.length > 0) {
                    // Draw white mesh lines
                    ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
                    ctx.lineWidth = 1;
                    ctx.lineCap = 'round';
                    ctx.beginPath();
                    for (const [i, j] of pairs) {
                        const p1 = landmarks[i];
                        const p2 = landmarks[j];
                        if (p1 && p2) {
                            ctx.moveTo(p1.x * w, p1.y * h);
                            ctx.lineTo(p2.x * w, p2.y * h);
                        }
                    }
                    ctx.stroke();

                    // Subtle blue glow pass
                    ctx.strokeStyle = 'rgba(100, 200, 255, 0.2)';
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    for (const [i, j] of pairs) {
                        const p1 = landmarks[i];
                        const p2 = landmarks[j];
                        if (p1 && p2) {
                            ctx.moveTo(p1.x * w, p1.y * h);
                            ctx.lineTo(p2.x * w, p2.y * h);
                        }
                    }
                    ctx.stroke();
                } else {
                    // Fallback: dots if pairs unavailable
                    ctx.fillStyle = 'rgba(255,255,255,0.7)';
                    for (const kp of landmarks) {
                        ctx.beginPath();
                        ctx.arc(kp.x * w, kp.y * h, 1.5, 0, Math.PI * 2);
                        ctx.fill();
                    }
                }

                // ── Render Analysis Labels ──
                const apiOverlay = analysisOverlayRef.current;

                // If API is active, just map those names. Otherwise, merge accumulated & live local issues
                let issuesToDraw: DetectedIssue[] = [];
                if (apiOverlay && apiOverlay.length > 0) {
                    issuesToDraw = apiOverlay.map(name => ({
                        name,
                        landmarkIndices: getLandmarkIndicesForIssue(name)
                    }));
                } else {
                    const localLive = localIssuesRef.current;
                    const acc = accumulatedIssuesRef.current;
                    if (acc.length > 0) {
                        const map = new Map<string, DetectedIssue>();
                        [...acc, ...localLive].forEach(i => map.set(i.name, i));
                        issuesToDraw = Array.from(map.values());
                    } else {
                        issuesToDraw = localLive;
                    }
                }

                if (issuesToDraw.length > 0) {
                    for (const issue of issuesToDraw) {
                        const indices = issue.landmarkIndices;
                        let sx = 0, sy = 0, n = 0;
                        for (const idx of indices) {
                            const kp = landmarks[idx];
                            if (kp) { sx += kp.x * w; sy += kp.y * h; n++; }
                        }
                        if (!n) continue;
                        const cx = sx / n;
                        const cy = sy / n;

                        // Strip regional suffix for display (e.g. acne_left_cheek -> acne)
                        const displayName = issue.name.split('_')[0];
                        drawIssueLabel(ctx, cx, cy, displayName, getIssueColor(displayName));

                        // ── DEBUG: visualize individual hit landmarks vs label centroid ──
                        if (DEBUG_MESH && issue.name.toLowerCase().includes('acne')) {
                            // Red dots at each individual hit landmark with index number
                            for (const idx of indices) {
                                const kp = landmarks[idx];
                                if (!kp) continue;
                                const px = kp.x * w;
                                const py = kp.y * h;
                                // Red circle
                                ctx.beginPath();
                                ctx.arc(px, py, 6, 0, Math.PI * 2);
                                ctx.fillStyle = 'rgba(255, 0, 0, 0.8)';
                                ctx.fill();
                                ctx.strokeStyle = '#fff';
                                ctx.lineWidth = 1;
                                ctx.stroke();
                                // Index number
                                ctx.fillStyle = '#fff';
                                ctx.font = 'bold 8px monospace';
                                ctx.textAlign = 'center';
                                ctx.textBaseline = 'middle';
                                ctx.fillText(String(idx), px, py);
                                // Line from hit point to centroid
                                ctx.beginPath();
                                ctx.moveTo(px, py);
                                ctx.lineTo(cx, cy);
                                ctx.strokeStyle = 'rgba(255, 255, 0, 0.4)';
                                ctx.lineWidth = 1;
                                ctx.setLineDash([4, 4]);
                                ctx.stroke();
                                ctx.setLineDash([]);
                            }
                            // Green crosshair at centroid (where label was placed)
                            const crossSize = 12;
                            ctx.strokeStyle = '#00ff00';
                            ctx.lineWidth = 2;
                            ctx.beginPath();
                            ctx.moveTo(cx - crossSize, cy);
                            ctx.lineTo(cx + crossSize, cy);
                            ctx.moveTo(cx, cy - crossSize);
                            ctx.lineTo(cx, cy + crossSize);
                            ctx.stroke();

                            // Console log with all coordinates
                            console.log(`[ACNE DEBUG] hitLandmarks=[${indices.join(',')}]`,
                                `centroid=(${cx.toFixed(0)},${cy.toFixed(0)})`,
                                indices.map(idx => {
                                    const kp = landmarks[idx];
                                    return kp ? `#${idx}(${(kp.x * w).toFixed(0)},${(kp.y * h).toFixed(0)})` : `#${idx}(?)`;
                                }).join(' ')
                            );
                        }
                    }
                }
            } else {
                if (DEBUG_MESH) setDebugInfo('faces:0 — move closer or improve lighting');
            }
        });

        // Tick: send each frame to MediaPipe, throttled by requestAnimationFrame
        async function tick() {
            if (!running) return;

            const vw = video.videoWidth;
            const vh = video.videoHeight;

            if (!vw || !vh || video.readyState < 2) {
                if (DEBUG_MESH) setDebugInfo(`waiting for video… readyState:${video.readyState}`);
                rafRef.current = requestAnimationFrame(tick);
                return;
            }

            // Keep canvas dimensions synced to video
            if (overlay.width !== vw || overlay.height !== vh) {
                overlay.width = vw;
                overlay.height = vh;
            }

            try {
                await faceMesh.send({ image: video });
            } catch (e) {
                if (DEBUG_MESH) {
                    setDebugInfo(`send error: ${e instanceof Error ? e.message : String(e)}`);
                }
            }

            rafRef.current = requestAnimationFrame(tick);
        }

        tick();

        return () => {
            running = false;
            cancelAnimationFrame(rafRef.current);
        };
    }, [meshReady]);

    // ── Capture helpers ──────────────────────────────────────────────────────
    const captureFrameAsBase64 = useCallback((): Promise<string> => {
        return new Promise((resolve, reject) => {
            if (!videoRef.current || !canvasRef.current) {
                reject(new Error('Video or canvas not ready'));
                return;
            }
            const video = videoRef.current;
            const canvas = canvasRef.current;
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext('2d');
            if (!ctx) { reject(new Error('Canvas context not available')); return; }
            ctx.drawImage(video, 0, 0);
            resolve(canvas.toDataURL('image/jpeg', 0.8));
        });
    }, []);

    const startMultiScan = useCallback(() => {
        if (!onAnalyze || isAnalyzing) return;
        setScanPhaseSafe('straight');
        accumulatedIssuesRef.current = [];
        scanSamplesRef.current = 0;
        straightImageRef.current = null;
    }, [onAnalyze, isAnalyzing, setScanPhaseSafe]);

    // Scan only starts when user clicks Start Scan button (no auto-start)

    const handleCapture = useCallback(() => {
        if (!videoRef.current || !canvasRef.current) return;
        const video = videoRef.current;
        const canvas = canvasRef.current;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.drawImage(video, 0, 0);
            onCapture(canvas.toDataURL('image/jpeg', 0.8));
            if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
        }
    }, [onCapture]);

    const showVideo = !error && !isInitializing;

    // ── Render ───────────────────────────────────────────────────────────────
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90">
            {/* Header / Top controls */}
            <div className="absolute top-0 inset-x-0 z-50 px-4 py-safe-top pt-8 pb-4 flex justify-between items-center bg-gradient-to-b from-black/50 to-transparent">
                <button
                    onClick={onClose}
                    className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-white"
                >
                    <X size={20} />
                </button>
            </div>

            <div className="relative w-full h-full flex items-center justify-center overflow-hidden bg-zinc-900">
                {error ? (
                    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center p-6 text-center bg-zinc-900">
                        <p className="text-red-400 mb-4">{error}</p>
                        <button
                            onClick={startCamera}
                            className="px-6 py-3 bg-white text-black font-bold rounded-full transition-transform active:scale-95"
                        >
                            Try Again
                        </button>
                    </div>
                ) : isInitializing ? (
                    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center text-white/60 animate-pulse bg-zinc-900">
                        <Camera size={32} className="mb-3 opacity-50" />
                        <p className="font-medium tracking-wide">Initializing camera…</p>
                    </div>
                ) : (
                    <>
                        {/* Video Layer */}
                        <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            muted
                            className="absolute inset-0 w-full h-full object-contain bg-black"
                        />
                        {/* Mesh Overlay */}
                        <canvas
                            ref={overlayRef}
                            className="absolute inset-0 w-full h-full object-contain opacity-30 mix-blend-screen pointer-events-none"
                        />

                        {/* Mesh Loading Overlay */}
                        {!meshReady && (
                            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/30 pointer-events-none">
                                <div className="flex flex-col items-center gap-3 animate-pulse">
                                    <div className="w-12 h-12 border-[3px] border-white/40 border-t-white rounded-full animate-spin"></div>
                                    <p className="text-white/90 text-sm font-semibold tracking-wide">
                                        {meshError ? meshError : 'Loading AI Engine…'}
                                    </p>
                                    {meshError && (
                                        <button
                                            onClick={retryMeshInit}
                                            className="pointer-events-auto mt-1 px-5 py-2 bg-white text-black text-sm font-bold rounded-full active:scale-95 transition-transform"
                                        >
                                            Retry
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Analysis Feedback Layer */}
                        {isAnalyzing && (
                            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm z-30 flex items-center justify-center pb-20">
                                <div className="flex flex-col items-center animate-fade-in">
                                    <div className="w-20 h-20 border-[3px] border-[#5A8F53] border-t-transparent rounded-full animate-spin mb-6 shadow-[0_0_30px_rgba(90,143,83,0.5)]"></div>
                                    <p className="text-white font-bold tracking-wide text-lg drop-shadow-md">Analyzing Skin...</p>
                                    <p className="text-white/70 text-sm mt-2 font-medium">Extracting aura parameters</p>
                                </div>
                            </div>
                        )}

                        {/* Scan phase status text — floating, no oval */}
                        {scanPhase !== 'idle' && (
                            <div className="absolute inset-0 z-20 pointer-events-none flex items-center justify-center">
                                <div className="mt-[300px] text-center">
                                    <span className="bg-black/40 backdrop-blur-md text-white/90 text-xs px-4 py-1.5 rounded-full font-semibold uppercase tracking-widest border border-white/10 shadow-lg">
                                        {scanPhase === 'straight' ? 'Look Straight' :
                                         scanPhase === 'left' ? 'Turn Left' :
                                         scanPhase === 'right' ? 'Turn Right' :
                                         'Perfect'}
                                    </span>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Bottom Controls Panel */}
            <div className="absolute bottom-0 inset-x-0 z-50 bg-gradient-to-t from-black via-black/80 to-transparent pt-16 pb-6 px-6">
               
                {/* Instruction Text */}
                <div className="text-center mb-4">
                    <h3 className="text-white text-[17px] font-bold mb-1 tracking-wide">
                        {scanPhase === 'straight' && 'Look Straight at Camera'}
                        {scanPhase === 'left' && 'Slowly Turn Head Left'}
                        {scanPhase === 'right' && 'Slowly Turn Head Right'}
                        {scanPhase === 'idle' && !meshReady && 'Loading AI Engine...'}
                        {scanPhase === 'idle' && meshReady && 'Ready to Scan'}
                        {scanPhase === 'done' && 'Scan Complete'}
                    </h3>
                    <p className="text-white/50 text-[13px] font-medium">
                        {scanPhase !== 'idle' && scanPhase !== 'done' ? 'Hold pose until prompt changes' : 
                         scanPhase === 'idle' && meshReady ? 'Tap Start Scan to begin' : 'Ensure good lighting for best results'}
                    </p>
                </div>

                <div className="flex items-center justify-center pb-2">
                    {scanPhase === 'idle' ? (
                        /* Start Scan Button */
                        <button 
                            onClick={startMultiScan}
                            disabled={isAnalyzing || !meshReady}
                            className={`w-full max-w-xs py-4 rounded-full font-bold text-[17px] tracking-wide transition-all duration-300 ${
                                meshReady 
                                    ? 'bg-white text-black active:scale-95 shadow-[0_0_30px_rgba(255,255,255,0.3)]' 
                                    : 'bg-white/20 text-white/40 cursor-not-allowed'
                            }`}
                        >
                            {meshReady ? 'Start Scan' : 'Loading...'}
                        </button>
                    ) : (
                        /* Scanning indicator */
                        <div className="flex items-center gap-3 px-8 py-4 rounded-full bg-[#5A8F53]/20 border border-[#5A8F53]/40">
                            <div className="w-3 h-3 bg-[#5A8F53] rounded-full animate-pulse"></div>
                            <span className="text-white font-semibold text-[15px] tracking-wide">
                                {scanPhase === 'done' ? 'Processing...' : 'Scanning...'}
                            </span>
                        </div>
                    )}
                </div>
            </div>

            <canvas ref={canvasRef} className="hidden" />
        </div>
    );
}
