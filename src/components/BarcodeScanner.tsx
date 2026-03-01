"use client";

import React, { useEffect, useRef, useState } from "react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { X, ScanBarcode } from "lucide-react";

const BARCODE_FORMATS = [
  Html5QrcodeSupportedFormats.EAN_13,
  Html5QrcodeSupportedFormats.EAN_8,
  Html5QrcodeSupportedFormats.UPC_A,
  Html5QrcodeSupportedFormats.UPC_E,
  Html5QrcodeSupportedFormats.CODE_128,
  Html5QrcodeSupportedFormats.CODE_39,
  Html5QrcodeSupportedFormats.QR_CODE,
];

interface BarcodeScannerProps {
  onScan: (barcode: string) => void;
  onClose: () => void;
}

export default function BarcodeScanner({ onScan, onClose }: BarcodeScannerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(true);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isRunningRef = useRef(false);

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

    const html5Qrcode = new Html5Qrcode(id, { formatsToSupport: BARCODE_FORMATS, verbose: false });
    scannerRef.current = html5Qrcode;

    html5Qrcode
      .start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 220, height: 140 },
        },
        (decodedText) => {
          onScan(decodedText);
        },
        () => {
          // Ignore scan errors (no code in frame)
        }
      )
      .then(() => {
        if (!cancelled) {
          isRunningRef.current = true;
          setIsStarting(false);
          setError(null);
        }
      })
      .catch((err: Error) => {
        if (!cancelled) {
          setIsStarting(false);
          setError(err?.message || "Could not start camera. Check permissions.");
        }
      });

    return () => {
      cancelled = true;
      scannerRef.current = null;
      if (!isRunningRef.current) {
        if (wrapper.parentNode) wrapper.parentNode.removeChild(wrapper);
        return;
      }
      isRunningRef.current = false;
      html5Qrcode
        .stop()
        .then(() => html5Qrcode.clear())
        .catch(() => { })
        .finally(() => {
          if (wrapper.parentNode) wrapper.parentNode.removeChild(wrapper);
        });
    };
  }, [onScan]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="glass-panel w-full max-w-lg rounded-2xl overflow-hidden relative border border-white/10 shadow-2xl">
        <div className="absolute top-4 right-4 z-10">
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
          {isStarting && (
            <div className="absolute inset-0 flex items-center justify-center bg-neutral-900/90">
              <p className="text-white/60">Starting camera…</p>
            </div>
          )}
          {error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-neutral-900/95 p-4 text-center">
              <p className="text-red-400 text-sm mb-4">{error}</p>
              <p className="text-white/50 text-xs">Use HTTPS and allow camera access.</p>
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
