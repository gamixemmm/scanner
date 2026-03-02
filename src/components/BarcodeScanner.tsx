"use client";

import React, { useEffect, useRef, useState } from "react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { X, ScanBarcode, Bug } from "lucide-react";

const BARCODE_FORMATS = [
  Html5QrcodeSupportedFormats.EAN_13,
  Html5QrcodeSupportedFormats.EAN_8,
  Html5QrcodeSupportedFormats.UPC_A,
  Html5QrcodeSupportedFormats.UPC_E,
  Html5QrcodeSupportedFormats.CODE_128,
  Html5QrcodeSupportedFormats.CODE_39,
];

const NATIVE_DETECTOR_SUPPORTED =
  typeof window !== "undefined" && "BarcodeDetector" in window;

interface BarcodeScannerProps {
  onScan: (barcode: string) => void;
  onClose: () => void;
}

export default function BarcodeScanner({ onScan, onClose }: BarcodeScannerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(true);
  const [showDebug, setShowDebug] = useState(false);
  const [showTips, setShowTips] = useState(true);
  const [debugMetrics, setDebugMetrics] = useState({
    framesProcessed: 0,
    lastError: "",
    elapsedSec: 0,
    resolution: "",
    apiUsed: NATIVE_DETECTOR_SUPPORTED ? "Native BarcodeDetector" : "WASM/ZXing",
  });
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isRunningRef = useRef(false);
  const startTimeRef = useRef<number>(0);
  const elapsedIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const triedFrontCameraRef = useRef(false);

  // Auto-hide tips after 5 seconds
  useEffect(() => {
    if (showTips && !isStarting && !error) {
      const timer = setTimeout(() => setShowTips(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [showTips, isStarting, error]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let cancelled = false;
    const id = "barcode-reader-" + Math.random().toString(36).slice(2);
    container.innerHTML = "";
    const wrapper = document.createElement("div");
    wrapper.id = id;
    wrapper.className = "w-full h-full min-h-[240px]";
    container.appendChild(wrapper);

    const html5Qrcode = new Html5Qrcode(id, {
      useBarCodeDetectorIfSupported: true,
      verbose: true,
      formatsToSupport: BARCODE_FORMATS,
    });
    scannerRef.current = html5Qrcode;

    const startScanner = (facingMode: "environment" | "user") => {
      return html5Qrcode.start(
        { facingMode },
        {
          fps: 10,
          qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
            // EAN-13 barcodes are horizontal and need a wide, short scan area
            const width = Math.min(viewfinderWidth * 0.95, 600);
            const height = Math.min(viewfinderHeight * 0.35, 200);
            return {
              width: Math.max(280, Math.floor(width)),
              height: Math.max(100, Math.floor(height)),
            };
          },
          disableFlip: false,
          aspectRatio: 1.777778,
        },
        (decodedText) => {
          console.log("[BarcodeScanner] Scanned:", decodedText);
          onScan(decodedText);
        },
        (errorMessage) => {
          setDebugMetrics((m) => ({
            ...m,
            framesProcessed: m.framesProcessed + 1,
            lastError: errorMessage || "No code in frame",
          }));
        }
      );
    };

    startScanner("environment")
      .then(() => {
        if (!cancelled) {
          isRunningRef.current = true;
          setIsStarting(false);
          setError(null);
          startTimeRef.current = Date.now();
          elapsedIntervalRef.current = setInterval(() => {
            setDebugMetrics((m) => ({
              ...m,
              elapsedSec: Math.floor((Date.now() - startTimeRef.current) / 1000),
            }));
          }, 1000);
          try {
            const settings = html5Qrcode.getRunningTrackSettings();
            const res = settings.width && settings.height
              ? `${settings.width}×${settings.height}`
              : "—";
            setDebugMetrics((m) => ({ ...m, resolution: res }));
          } catch {
            // ignore
          }

          // Try to nudge continuous focus on supporting devices (best-effort).
          // html5-qrcode validates videoConstraints; applying after start avoids rejection.
          html5Qrcode
            .applyVideoConstraints({
              advanced: [{ focusMode: "continuous" } as any],
            } as any)
            .catch(() => {});
        }
      })
      .catch((err: Error) => {
        if (!cancelled) {
          console.error("[BarcodeScanner] Camera start error:", err);
          const errStr = err?.message?.toLowerCase() || "";
          
          // Try front camera as fallback if rear camera fails
          if (!triedFrontCameraRef.current && (
            errStr.includes("notfound") || 
            errStr.includes("not found") || 
            errStr.includes("no camera") ||
            errStr.includes("constraint")
          )) {
            console.log("[BarcodeScanner] Trying front camera as fallback...");
            triedFrontCameraRef.current = true;
            setError("Rear camera not available. Trying front camera...");
            
            setTimeout(() => {
              if (!cancelled) {
                startScanner("user")
                  .then(() => {
                    if (!cancelled) {
                      isRunningRef.current = true;
                      setIsStarting(false);
                      setError(null);
                      startTimeRef.current = Date.now();
                      elapsedIntervalRef.current = setInterval(() => {
                        setDebugMetrics((m) => ({
                          ...m,
                          elapsedSec: Math.floor((Date.now() - startTimeRef.current) / 1000),
                        }));
                      }, 1000);
                    }
                  })
                  .catch((frontErr: Error) => {
                    console.error("[BarcodeScanner] Front camera also failed:", frontErr);
                    setIsStarting(false);
                    setError("No camera available. Please check your device and browser settings.");
                  });
              }
            }, 500);
            return;
          }
          
          setIsStarting(false);
          let errorMsg = "Could not start camera. ";
          
          if (errStr.includes("permission") || errStr.includes("denied")) {
            errorMsg += "Camera permission was denied. Please allow camera access in your browser settings.";
          } else if (errStr.includes("notfound") || errStr.includes("not found") || errStr.includes("no camera")) {
            errorMsg += "No camera found on this device.";
          } else if (errStr.includes("notreadable") || errStr.includes("in use") || errStr.includes("already in use")) {
            errorMsg += "Camera is already in use. Close other apps using the camera and try again.";
          } else if (errStr.includes("secure") || errStr.includes("https")) {
            errorMsg += "Camera requires HTTPS. Please use a secure connection.";
          } else if (errStr.includes("constraint") || errStr.includes("overconstrained")) {
            errorMsg += "Camera settings not supported by your device.";
          } else {
            errorMsg += err?.message || "Unknown error. Check browser console for details.";
          }
          
          setError(errorMsg);
        }
      });

    return () => {
      cancelled = true;
      scannerRef.current = null;
      if (elapsedIntervalRef.current) {
        clearInterval(elapsedIntervalRef.current);
        elapsedIntervalRef.current = null;
      }
      if (!isRunningRef.current) {
        if (wrapper.parentNode) wrapper.parentNode.removeChild(wrapper);
        return;
      }
      isRunningRef.current = false;
      html5Qrcode
        .stop()
        .then(() => html5Qrcode.clear())
        .catch(() => {})
        .finally(() => {
          if (wrapper.parentNode) wrapper.parentNode.removeChild(wrapper);
        });
    };
  }, [onScan]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="glass-panel w-full max-w-lg rounded-2xl overflow-hidden relative border border-white/10 shadow-2xl">
        <div className="absolute top-4 right-4 z-10 flex gap-2">
          <button
            onClick={() => setShowDebug((d) => !d)}
            className={`p-2 rounded-full text-white transition-colors ${
              showDebug ? "bg-violet-600" : "bg-black/50 hover:bg-black/70"
            }`}
            aria-label="Toggle debug"
            title="Debug"
          >
            <Bug size={20} />
          </button>
          <button
            onClick={onClose}
            className="p-2 bg-black/50 hover:bg-red-500/80 rounded-full text-white transition-colors"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 pb-4">
          <h2 className="text-xl font-semibold flex items-center gap-2 mb-1">
            <ScanBarcode className="text-violet-400" size={24} />
            Scan product barcode
          </h2>
          <p className="text-sm text-white/50">Point your camera at the barcode on the product.</p>
        </div>

        <div className="relative aspect-[4/3] w-full bg-neutral-900 flex items-center justify-center overflow-hidden">
          <div ref={containerRef} className="absolute inset-0 w-full h-full" />
          
          {showTips && !isStarting && !error && (
            <div className="absolute top-2 left-2 right-2 z-[60] rounded-lg bg-black/90 border border-violet-500/30 px-3 py-2 text-xs text-white/80 pointer-events-none">
              <div className="flex items-start gap-2">
                <span className="text-violet-400 shrink-0">💡</span>
                <div>
                  <p className="font-semibold text-violet-300 mb-1">Scanning Tips:</p>
                  <ul className="space-y-0.5 text-[11px]">
                    <li>• Hold barcode horizontally in the scan area</li>
                    <li>• Keep steady and ensure good lighting</li>
                    <li>• Move closer or further to focus</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
          
          {showDebug && !isStarting && !error && (
            <div className="absolute bottom-2 left-2 right-2 z-[60] rounded-lg bg-black/90 border border-white/20 px-3 py-2 font-mono text-[10px] text-green-400 space-y-1 pointer-events-none">
              <div>Frames: {debugMetrics.framesProcessed} | Elapsed: {debugMetrics.elapsedSec}s</div>
              <div>Resolution: {debugMetrics.resolution || "—"} | API: {debugMetrics.apiUsed}</div>
              <div className="text-amber-400 truncate" title={debugMetrics.lastError}>
                Last: {debugMetrics.lastError || "—"}
              </div>
            </div>
          )}
          {isStarting && (
            <div className="absolute inset-0 flex items-center justify-center bg-neutral-900/90">
              <p className="text-white/60">Starting camera…</p>
            </div>
          )}
          {error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-neutral-900/95 p-6 text-center">
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-4 max-w-md">
                <p className="text-red-400 text-sm mb-2">{error}</p>
                <p className="text-white/50 text-xs mb-3">
                  Make sure you're using HTTPS and have granted camera permissions in your browser settings.
                </p>
                <details className="text-left text-xs text-white/40 mt-2">
                  <summary className="cursor-pointer hover:text-white/60 mb-1">Troubleshooting tips</summary>
                  <ul className="list-disc list-inside space-y-1 mt-2">
                    <li>Check if another app is using your camera</li>
                    <li>Try refreshing the page</li>
                    <li>Make sure you're on HTTPS (not HTTP)</li>
                    <li>Check browser camera permissions</li>
                    <li>Try a different browser (Chrome/Edge recommended)</li>
                    <li>On mobile, try rotating your device</li>
                  </ul>
                </details>
              </div>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-white text-sm transition-colors"
              >
                Close and try again
              </button>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-white/5 text-center text-white/40 text-xs">
          Supports EAN-13, UPC-A, Code 128, QR and more
        </div>
      </div>
    </div>
  );
}
