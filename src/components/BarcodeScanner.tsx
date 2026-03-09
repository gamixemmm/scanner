"use client";

import React, { useEffect, useRef, useState } from "react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { X, ScanBarcode, Bug } from "lucide-react";
import { requestCameraPermission } from "@/utils/permissions";

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
    wrapper.className = "barcode-scanner-wrapper w-full h-full";
    container.appendChild(wrapper);

    const html5Qrcode = new Html5Qrcode(id, {
      useBarCodeDetectorIfSupported: false,
      verbose: false,
      formatsToSupport: BARCODE_FORMATS,
    });
    scannerRef.current = html5Qrcode;

    const startScanner = (facingMode: "environment" | "user") => {
      return html5Qrcode.start(
        { facingMode },
        {
          fps: 10,
          qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
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

    const initCamera = async () => {
      // Trigger native OS permission dialog if on Capacitor (non-blocking)
      try {
        await requestCameraPermission();
      } catch (e) {
        console.warn('[BarcodeScanner] Permission pre-check failed:', e);
      }

      if (cancelled) return;

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

            html5Qrcode
              .applyVideoConstraints({
                advanced: [{ focusMode: "continuous" } as any],
              } as any)
              .catch(() => {});
          }
        })
        .catch((err: Error) => {
          if (!cancelled) {
            const errStr = err?.message?.toLowerCase() || "";

            if (!triedFrontCameraRef.current && (
              errStr.includes("notfound") ||
              errStr.includes("not found") ||
              errStr.includes("no camera") ||
              errStr.includes("constraint")
            )) {
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
              errorMsg += "Camera permission was denied.";
            } else if (errStr.includes("notfound") || errStr.includes("not found")) {
              errorMsg += "No camera found on this device.";
            } else if (errStr.includes("notreadable") || errStr.includes("in use")) {
              errorMsg += "Camera is already in use.";
            } else if (errStr.includes("secure") || errStr.includes("https")) {
              errorMsg += "Camera requires HTTPS.";
            } else {
              errorMsg += err?.message || "Unknown error.";
            }

            setError(errorMsg);
          }
        });
    };

    initCamera();

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
    <div className="fixed inset-0 z-50 bg-black">
      <div className="w-full h-full flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-black/80 backdrop-blur-sm shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#5A8F53]/20 rounded-xl">
              <ScanBarcode className="text-[#5A8F53]" size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Scan Barcode</h2>
              <p className="text-xs text-white/50">Point camera at the product barcode</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowDebug((d) => !d)}
              className={`p-2.5 rounded-xl transition-colors ${showDebug ? "bg-[#5A8F53]/20 text-[#5A8F53]" : "bg-white/10 text-white/50 hover:text-white"}`}
              aria-label="Toggle debug"
            >
              <Bug size={16} />
            </button>
            <button
              onClick={onClose}
              className="p-2.5 bg-white/10 hover:bg-white/20 rounded-xl text-white/70 transition-colors"
              aria-label="Close"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Camera View — fills remaining space */}
        <div className="relative flex-1 min-h-0 w-full bg-gray-900 flex items-center justify-center overflow-hidden">
          <div ref={containerRef} className="absolute inset-0 w-full h-full" />

          {showTips && !isStarting && !error && (
            <div className="absolute top-3 left-3 right-3 z-[60] rounded-2xl bg-white/95 border border-white/20 px-4 py-3 text-xs shadow-lg pointer-events-none">
              <div className="flex items-start gap-2.5">
                <span className="text-[#5A8F53] shrink-0">💡</span>
                <div>
                  <p className="font-bold text-gray-800 mb-1.5">Tips:</p>
                  <ul className="space-y-1 text-gray-500 text-[11px]">
                    <li>• Hold barcode horizontally in the scan area</li>
                    <li>• Keep steady and ensure good lighting</li>
                    <li>• Move closer or further to focus</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {showDebug && !isStarting && !error && (
            <div className="absolute bottom-2 left-2 right-2 z-[60] rounded-xl bg-black/85 px-3 py-2 font-mono text-[10px] text-green-400 space-y-1 pointer-events-none">
              <div>Frames: {debugMetrics.framesProcessed} | Elapsed: {debugMetrics.elapsedSec}s</div>
              <div>Resolution: {debugMetrics.resolution || "—"} | API: {debugMetrics.apiUsed}</div>
              <div className="text-amber-400 truncate">{debugMetrics.lastError || "—"}</div>
            </div>
          )}

          {isStarting && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900/90 gap-3">
              <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center animate-pulse">
                <ScanBarcode size={24} className="text-white/60" />
              </div>
              <p className="text-white/50 text-sm font-medium">Starting camera…</p>
            </div>
          )}

          {error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900/95 p-6 text-center">
              <div className="bg-red-50 border border-red-200 rounded-2xl p-5 mb-4 max-w-sm">
                <p className="text-red-600 text-sm mb-2">{error}</p>
                <p className="text-gray-500 text-xs">
                  Ensure you&apos;re using HTTPS and have granted camera permissions.
                </p>
              </div>
              <button
                onClick={onClose}
                className="bg-white/10 text-white font-semibold px-6 py-3 rounded-full text-sm hover:bg-white/20 transition-colors"
              >
                Close and try again
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 bg-black/80 backdrop-blur-sm text-center text-white/30 text-xs shrink-0">
          Supports EAN-13, UPC-A, Code 128, QR and more
        </div>
      </div>
    </div>
  );
}
