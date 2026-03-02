"use client";

import React, { useEffect, useRef, useState } from "react";
import { Camera, X, CheckCircle, XCircle } from "lucide-react";

interface CameraTestProps {
  onClose: () => void;
}

export default function CameraTest({ onClose }: CameraTestProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [status, setStatus] = useState<"testing" | "success" | "error">("testing");
  const [errorMsg, setErrorMsg] = useState("");
  const [cameraInfo, setCameraInfo] = useState<{
    hasGetUserMedia: boolean;
    isSecureContext: boolean;
    protocol: string;
    devices: string[];
  }>({
    hasGetUserMedia: false,
    isSecureContext: false,
    protocol: "",
    devices: [],
  });

  useEffect(() => {
    const testCamera = async () => {
      // Check basic browser support
      const hasGetUserMedia = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
      const isSecureContext = window.isSecureContext;
      const protocol = window.location.protocol;

      setStatus("testing");

      // List available devices
      let devices: string[] = [];
      try {
        const deviceList = await navigator.mediaDevices.enumerateDevices();
        devices = deviceList
          .filter((d) => d.kind === "videoinput")
          .map((d) => d.label || `Camera ${d.deviceId.slice(0, 8)}`);
      } catch (e) {
        console.error("Could not enumerate devices:", e);
      }

      setCameraInfo({
        hasGetUserMedia,
        isSecureContext,
        protocol,
        devices,
      });

      if (!hasGetUserMedia) {
        setStatus("error");
        setErrorMsg("getUserMedia not supported in this browser");
        return;
      }

      if (!isSecureContext) {
        setStatus("error");
        setErrorMsg("Not a secure context (HTTPS required)");
        return;
      }

      // Try to access camera
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
          audio: false,
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        setStatus("success");

        // Cleanup after 3 seconds
        setTimeout(() => {
          stream.getTracks().forEach((track) => track.stop());
        }, 3000);
      } catch (err: any) {
        console.error("Camera test error:", err);
        setStatus("error");
        setErrorMsg(err.message || err.name || "Unknown error");
      }
    };

    testCamera();
  }, []);

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

        <div className="p-6">
          <h2 className="text-xl font-semibold flex items-center gap-2 mb-4">
            <Camera className="text-violet-400" size={24} />
            Camera Test
          </h2>

          <div className="space-y-4">
            <div className="bg-black/20 rounded-lg p-4 space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-white/60">getUserMedia Support:</span>
                <span className={cameraInfo.hasGetUserMedia ? "text-green-400" : "text-red-400"}>
                  {cameraInfo.hasGetUserMedia ? "✓ Yes" : "✗ No"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/60">Secure Context (HTTPS):</span>
                <span className={cameraInfo.isSecureContext ? "text-green-400" : "text-red-400"}>
                  {cameraInfo.isSecureContext ? "✓ Yes" : "✗ No"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/60">Protocol:</span>
                <span className="text-white">{cameraInfo.protocol}</span>
              </div>
              <div className="flex items-start justify-between">
                <span className="text-white/60">Cameras Found:</span>
                <span className="text-white text-right">
                  {cameraInfo.devices.length > 0 ? (
                    <div className="space-y-1">
                      {cameraInfo.devices.map((d, i) => (
                        <div key={i} className="text-xs">
                          {d}
                        </div>
                      ))}
                    </div>
                  ) : (
                    "None"
                  )}
                </span>
              </div>
            </div>

            <div className="aspect-video w-full bg-black rounded-lg overflow-hidden relative">
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                playsInline
                muted
              />
              {status === "testing" && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                  <p className="text-white/80">Testing camera access...</p>
                </div>
              )}
            </div>

            {status === "success" && (
              <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 flex items-start gap-3">
                <CheckCircle className="text-green-400 shrink-0 mt-0.5" size={20} />
                <div>
                  <p className="text-green-400 font-medium">Camera works!</p>
                  <p className="text-white/60 text-sm mt-1">
                    Your camera is accessible. The barcode scanner should work.
                  </p>
                </div>
              </div>
            )}

            {status === "error" && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 flex items-start gap-3">
                <XCircle className="text-red-400 shrink-0 mt-0.5" size={20} />
                <div>
                  <p className="text-red-400 font-medium">Camera test failed</p>
                  <p className="text-white/60 text-sm mt-1">{errorMsg}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
