"use client";

import React, { useCallback, useState } from "react";
import Link from "next/link";
import BarcodeScanner from "@/components/BarcodeScanner";
import CameraTest from "@/components/CameraTest";
import ChatInterface from "@/components/ChatInterface";
import { ScanBarcode, Sparkles, ArrowLeft, Loader2, TestTube2, X, Camera } from "lucide-react";

function getScoreByBarcode(barcode: string, hasFaceAnalysis: boolean): number {
  if (!hasFaceAnalysis) return 0;
  const mockScores: Record<string, number> = {
    "5901234123457": 87,
    "3600530824692": 92,
    "3337875301234": 78,
    "012345678901": 85,
    "987654321098": 91,
  };
  return mockScores[barcode] ?? Math.floor(70 + Math.random() * 25);
}

async function getProductByBarcode(barcode: string): Promise<{
  name: string;
  image_url: string | null;
}> {
  try {
    const res = await fetch(`/api/product?barcode=${encodeURIComponent(barcode)}`, { cache: "no-store" });
    const data = await res.json();
    if (data.product_name) {
      const name = data.brands ? `${data.brands} - ${data.product_name}` : data.product_name;
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
  const [hasFaceAnalysis, setHasFaceAnalysis] = useState(false);

  React.useEffect(() => {
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

      setProduct({ name, score, image_url: apiProduct.image_url || null, barcode, foundInApi });
      setHasFaceAnalysis(hasFace);
      setIsLoading(false);
    })();
  }, []);

  return (
    <main className="min-h-screen min-h-dvh bg-[#F8F9FB]">
      <div className="max-w-lg mx-auto px-4 pt-3 pb-8">
        {/* ─── Nav ─── */}
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-gray-400 hover:text-gray-700 text-sm py-3 transition-colors"
        >
          <ArrowLeft size={16} />
          Back
        </Link>

        {/* ─── Header ─── */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 mb-1">
            Product Scan
          </h1>
          <p className="text-sm text-gray-500 max-w-xs mx-auto">
            Scan a product barcode to check compatibility with your skin profile.
          </p>
        </div>

        {/* ─── Scanner Card ─── */}
        <div className="card p-5 space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="step-badge bg-[#E6F5F3] text-[#2D9F93]">3</span>
              <h2 className="text-base font-semibold text-gray-900">Scan Product</h2>
            </div>
            <button
              onClick={() => setShowCameraTest(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg transition-colors text-gray-500"
            >
              <TestTube2 size={12} />
              Test Camera
            </button>
          </div>

          {!product && !isLoading && (
            <button
              onClick={() => setShowScanner(true)}
              className="w-full aspect-[4/3] rounded-xl border-2 border-dashed border-gray-200 hover:border-[#2D9F93]/40 bg-gray-50 flex flex-col items-center justify-center cursor-pointer transition-all group"
            >
              <div className="p-3.5 bg-[#E6F5F3] group-hover:bg-[#D0EDEA] rounded-full mb-3 transition-colors">
                <ScanBarcode className="text-[#2D9F93]" size={32} />
              </div>
              <p className="font-medium text-gray-800 text-sm">Tap to scan barcode</p>
              <p className="text-xs text-gray-400 mt-1">Point camera at the product barcode</p>
            </button>
          )}

          {isLoading && (
            <div className="aspect-[4/3] w-full rounded-xl bg-gray-50 flex flex-col items-center justify-center gap-3">
              <Loader2 className="text-[#2D9F93] animate-spin" size={32} />
              <p className="text-gray-500 text-sm font-medium">Loading product…</p>
            </div>
          )}

          {product && !isLoading && (
            <div className="space-y-5 animate-fade-in-up">
              {/* Product Info */}
              <div className="flex gap-3.5 items-start">
                {product.image_url && (
                  <img
                    src={product.image_url}
                    alt=""
                    className="w-16 h-16 rounded-xl object-contain bg-gray-50 border border-gray-200 shrink-0"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-xs uppercase tracking-wider text-gray-400 font-semibold mb-1">Product</p>
                  <p className="text-lg font-bold text-gray-900">{product.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5 font-mono">
                    Barcode: {product.barcode}
                  </p>
                  {!product.foundInApi && (
                    <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-1 bg-amber-50 border border-amber-200 rounded text-xs text-amber-600">
                      <span>⚠</span>
                      <span>Product not found in database</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Score */}
              {hasFaceAnalysis ? (
                <div className="card-flat p-5 text-center bg-gray-50">
                  <p className="text-xs uppercase tracking-wider text-gray-400 font-semibold mb-2">
                    Match Score
                  </p>
                  <p className="text-4xl font-black text-gray-900">
                    {product.score}<span className="text-lg text-gray-400 font-medium">/100</span>
                  </p>
                  <p className="text-xs text-gray-400 mt-2">
                    Based on your face analysis
                  </p>
                </div>
              ) : (
                <div className="card-flat p-5 text-center bg-amber-50/60 border-amber-100">
                  <p className="text-xs uppercase tracking-wider text-amber-600 font-semibold mb-2">
                    Get Your Match Score
                  </p>
                  <p className="text-sm text-gray-600 mb-3">
                    Complete a face scan to see how this product matches your skin
                  </p>
                  <Link
                    href="/"
                    className="btn-primary inline-flex items-center gap-2 text-sm py-2.5 px-4"
                  >
                    <Camera size={16} />
                    Scan Your Face
                  </Link>
                </div>
              )}

              {/* Aura prompt */}
              <div className="card-flat p-4 bg-[#E6F5F3]/50 border-[#2D9F93]/15 flex items-start gap-3">
                <Sparkles className="text-[#2D9F93] shrink-0 mt-0.5" size={18} />
                <p className="text-sm text-gray-700 leading-snug">
                  Ask your personal cosmetologist about this product for personalized insights.
                </p>
              </div>

              {/* Actions */}
              <div className="space-y-2.5">
                <button
                  onClick={() => setShowChat(true)}
                  className="btn-primary w-full flex items-center justify-center gap-2 text-sm"
                >
                  <Sparkles size={16} />
                  Ask About This Product
                </button>
                <button
                  onClick={() => { setShowScanner(true); setProduct(null); }}
                  className="btn-secondary w-full flex items-center justify-center gap-2 text-sm"
                >
                  <ScanBarcode size={16} />
                  Scan Another Product
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
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center">
          <div className="w-full sm:max-w-lg h-[85vh] sm:h-[75vh] bg-white sm:rounded-2xl rounded-t-2xl shadow-2xl flex flex-col overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between bg-gray-50">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-[#E6F5F3] flex items-center justify-center">
                  <Sparkles size={16} className="text-[#2D9F93]" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-gray-800">Ask Derma</h2>
                  <p className="text-xs text-gray-400 truncate max-w-[200px]">About {product.name}</p>
                </div>
              </div>
              <button
                onClick={() => setShowChat(false)}
                className="p-2 hover:bg-gray-200 rounded-lg transition-colors text-gray-400"
              >
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <ChatInterface
                contextData={(() => {
                  let savedAnalysis = null;
                  try {
                    const savedData = localStorage.getItem('aura_face_analysis');
                    if (savedData) savedAnalysis = JSON.parse(savedData);
                  } catch (e) { /* ignore */ }

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
