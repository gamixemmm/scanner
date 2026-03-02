"use client";

import React, { useCallback, useState } from "react";
import Link from "next/link";
import BarcodeScanner from "@/components/BarcodeScanner";
import CameraTest from "@/components/CameraTest";
import ChatInterface from "@/components/ChatInterface";
import { ScanBarcode, Sparkles, ArrowLeft, Loader2, TestTube2, X, Camera } from "lucide-react";

// Mock score by barcode (calculated based on face analysis)
function getScoreByBarcode(barcode: string, hasFaceAnalysis: boolean): number {
  if (!hasFaceAnalysis) return 0; // No score without face analysis
  
  const mockScores: Record<string, number> = {
    "5901234123457": 87,
    "3600530824692": 92,
    "3337875301234": 78,
    "012345678901": 85,
    "987654321098": 91,
  };
  return mockScores[barcode] ?? Math.floor(70 + Math.random() * 25);
}

// Look up product via Scanbot API
async function getProductByBarcode(barcode: string): Promise<{
  name: string;
  image_url: string | null;
}> {
  try {
    const res = await fetch(`/api/product?barcode=${encodeURIComponent(barcode)}`, {
      cache: "no-store",
    });
    const data = await res.json();
    if (data.product_name) {
      const name = data.brands
        ? `${data.brands} - ${data.product_name}`
        : data.product_name;
      return { name, image_url: data.image_url || null };
    }
  } catch (err) {
    console.error("[Product] API lookup failed:", err);
  }
  
  return { name: "", image_url: null };
}

export default function ProductScanPage() {
  const [showScanner, setShowScanner] = useState(false);
  const [showCameraTest, setShowCameraTest] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [product, setProduct] = useState<{
    name: string;
    score: number;
    image_url: string | null;
    barcode: string;
    foundInApi: boolean;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Check if user has done face analysis (stored in localStorage)
  const [hasFaceAnalysis, setHasFaceAnalysis] = useState(false);
  
  React.useEffect(() => {
    // Check localStorage for face analysis data
    const faceData = localStorage.getItem('aura_face_analysis');
    setHasFaceAnalysis(!!faceData);
  }, []);

  const handleScan = useCallback((barcode: string) => {
    setShowScanner(false);
    setIsLoading(true);
    (async () => {
      const apiProduct = await getProductByBarcode(barcode);
      const faceData = localStorage.getItem('aura_face_analysis');
      const hasFace = !!faceData;
      const score = getScoreByBarcode(barcode, hasFace);
      
      let name = apiProduct.name;
      let foundInApi = !!apiProduct.name;
      
      if (!name) {
        // Check mock database
        const mock: Record<string, string> = {
          "5901234123457": "CeraVe Hydrating Cleanser",
          "3600530824692": "La Roche-Posay Toleriane Double Repair",
          "3337875301234": "The Ordinary Niacinamide 10% + Zinc 1%",
          "3337875597333": "The Ordinary",
          "012345678901": "Paula's Choice 2% BHA Liquid",
          "987654321098": "COSRX Snail Mucin Essence",
        };
        name = mock[barcode] || "Unknown Product";
        foundInApi = !!mock[barcode];
      }
      
      setProduct({
        name,
        score,
        image_url: apiProduct.image_url || null,
        barcode,
        foundInApi,
      });
      setHasFaceAnalysis(hasFace);
      setIsLoading(false);
    })();
  }, []);

  return (
    <main className="min-h-screen p-6 md:p-12 lg:p-24 flex flex-col">
      <div className="max-w-2xl mx-auto w-full">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-white/60 hover:text-white text-sm mb-8 transition-colors"
        >
          <ArrowLeft size={18} />
          Back to Aura
        </Link>

        <div className="text-center mb-10">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4 gradient-text">
            Product Scan
          </h1>
          <p className="text-lg text-white/60 max-w-xl mx-auto">
            Scan a cosmetic product barcode to see how it fits your personal cosmetologist insights.
          </p>
        </div>

        <div className="glass-panel p-6 rounded-2xl space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <span className="bg-violet-500/20 text-violet-400 p-2 rounded-lg">3</span>
              Scan product barcode
            </h2>
            <button
              onClick={() => setShowCameraTest(true)}
              className="flex items-center gap-2 px-3 py-1.5 text-xs bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-colors text-white/70 hover:text-white"
              title="Test camera access"
            >
              <TestTube2 size={14} />
              Test Camera
            </button>
          </div>

          {!product && !isLoading && (
            <div
              onClick={() => setShowScanner(true)}
              className="aspect-[4/3] w-full rounded-xl border-2 border-dashed border-white/20 hover:border-violet-500/50 bg-black/20 flex flex-col items-center justify-center cursor-pointer transition-all group"
            >
              <div className="p-4 bg-white/5 group-hover:bg-violet-500/20 rounded-full mb-3 transition-colors">
                <ScanBarcode className="text-white/60 group-hover:text-violet-400" size={40} />
              </div>
              <p className="font-medium text-white/80">Tap to scan barcode</p>
              <p className="text-sm text-white/40 mt-1">Point your camera at the product barcode</p>
            </div>
          )}

          {isLoading && (
            <div className="aspect-[4/3] w-full rounded-xl bg-black/20 flex flex-col items-center justify-center gap-4">
              <Loader2 className="text-violet-400 animate-spin" size={40} />
              <p className="text-white/70 font-medium">Loading product…</p>
            </div>
          )}

          {product && !isLoading && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex gap-4 items-start">
                {product.image_url && (
                  <img
                    src={product.image_url}
                    alt=""
                    className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl object-contain bg-white/5 border border-white/10 shrink-0"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm uppercase tracking-wider text-white/50 font-semibold mb-1">
                    Product
                  </p>
                  <p className="text-xl font-bold text-white">{product.name}</p>
                  <p className="text-xs text-white/40 mt-1 font-mono">
                    Barcode: {product.barcode}
                  </p>
                  {!product.foundInApi && (
                    <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-1 bg-amber-500/10 border border-amber-500/30 rounded text-xs text-amber-400">
                      <span>⚠</span>
                      <span>Product not found in database</span>
                    </div>
                  )}
                </div>
              </div>

              {hasFaceAnalysis ? (
                <div className="rounded-xl bg-black/30 border border-white/10 p-6 text-center">
                  <p className="text-sm uppercase tracking-wider text-white/50 font-semibold mb-3">
                    Overall match score
                  </p>
                  <p className="text-5xl font-black text-white mx-auto w-fit">
                    {product.score}/100
                  </p>
                  <p className="text-xs text-white/40 mt-3">
                    Based on your face analysis
                  </p>
                </div>
              ) : (
                <div className="rounded-xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/30 p-6 text-center">
                  <p className="text-sm uppercase tracking-wider text-amber-400 font-semibold mb-3">
                    Get Your Match Score
                  </p>
                  <p className="text-white/80 mb-4">
                    Complete a face scan to see how well this product matches your skin
                  </p>
                  <Link
                    href="/"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 rounded-lg text-white font-medium transition-all"
                  >
                    <Camera size={18} />
                    Scan Your Face
                  </Link>
                </div>
              )}

              <div className="rounded-xl bg-gradient-to-r from-violet-500/10 to-fuchsia-500/10 border border-white/10 p-5 flex items-start gap-3">
                <Sparkles className="text-violet-400 shrink-0 mt-0.5" size={22} />
                <p className="text-white/90 font-medium leading-snug">
                  Ask Aura about this product to get personalized insights and compatibility analysis.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  onClick={() => setShowChat(true)}
                  className="py-3 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 rounded-xl transition-all font-medium text-white flex items-center justify-center gap-2 shadow-lg shadow-violet-500/25"
                >
                  <Sparkles size={18} />
                  Ask Aura about this product
                </button>
                <button
                  onClick={() => {
                    setShowScanner(true);
                    setProduct(null);
                  }}
                  className="py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-colors font-medium text-white/80 flex items-center justify-center gap-2"
                >
                  <ScanBarcode size={18} />
                  Scan another product
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {showScanner && (
        <BarcodeScanner
          onScan={handleScan}
          onClose={() => setShowScanner(false)}
        />
      )}

      {showCameraTest && (
        <CameraTest onClose={() => setShowCameraTest(false)} />
      )}

      {showChat && product && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-4xl h-[80vh] bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl shadow-2xl border border-white/10 flex flex-col overflow-hidden">
            <div className="p-4 border-b border-white/10 flex items-center justify-between bg-black/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center">
                  <Sparkles size={20} className="text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">Ask Aura</h2>
                  <p className="text-xs text-white/50">About {product.name}</p>
                </div>
              </div>
              <button
                onClick={() => setShowChat(false)}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white/70 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <ChatInterface
                contextData={(() => {
                  // Load face analysis from localStorage
                  let savedAnalysis = null;
                  try {
                    const savedData = localStorage.getItem('aura_face_analysis');
                    if (savedData) {
                      savedAnalysis = JSON.parse(savedData);
                    }
                  } catch (e) {
                    console.error('[ProductScan] Error loading saved analysis:', e);
                  }

                  return {
                    scannedProduct: {
                      name: product.name,
                      barcode: product.barcode,
                      score: product.score,
                      image_url: product.image_url,
                      foundInApi: product.foundInApi,
                    },
                    userProfile: savedAnalysis ? {
                      skinType: savedAnalysis.skinType,
                      concerns: savedAnalysis.concerns,
                      currentIngredients: savedAnalysis.ingredients
                    } : null,
                    analysisResult: savedAnalysis?.result || null,
                    hasFaceAnalysis: hasFaceAnalysis,
                  };
                })()}
                initialMessage={`I just scanned this product: "${product.name}" (barcode: ${product.barcode}). Can you tell me about this product, its ingredients, and whether it would be good for my skin?`}
              />
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
