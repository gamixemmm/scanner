"use client";

import React, { useCallback, useState, useEffect } from "react";
import BarcodeScanner from "@/components/BarcodeScanner";
import CameraTest from "@/components/CameraTest";
import ChatInterface from "@/components/ChatInterface";
import { ScanBarcode, Sparkles, Loader2, X, Camera, ChevronRight, ShieldCheck, Zap, Eye, History, Trash2 } from "lucide-react";
import { TabId } from "@/components/BottomNav";

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

function ScoreRing({ score }: { score: number }) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 85 ? '#5A8F53' : score >= 70 ? '#FF9F0A' : '#FF453A';

  return (
    <div className="relative w-[140px] h-[140px]">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r={radius} fill="none" stroke="#F3F4F6" strokeWidth="8" />
        <circle
          cx="60" cy="60" r={radius} fill="none"
          stroke={color} strokeWidth="8" strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={offset}
          className="transition-all duration-1000 ease-out"
          style={{ filter: `drop-shadow(0 0 6px ${color}40)` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[36px] font-black text-[#1A1D26] leading-none">{score}</span>
        <span className="text-[11px] text-[#9CA3AF] font-semibold mt-0.5">/ 100</span>
      </div>
    </div>
  );
}

export default function ProductScanTab({ onNavigateToTab, onScannerActiveChange }: { onNavigateToTab?: (tab: TabId) => void; onScannerActiveChange?: (active: boolean) => void }) {
  const [showScanner, setShowScanner] = useState(false);

  // Notify parent when scanner visibility changes
  useEffect(() => {
    onScannerActiveChange?.(showScanner);
  }, [showScanner, onScannerActiveChange]);
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
  const [showHistory, setShowHistory] = useState(false);
  const [scanHistory, setScanHistory] = useState<{ name: string; barcode: string; score: number; image_url: string | null; date: string; hasFace: boolean }[]>([]);

  useEffect(() => {
    const faceData = localStorage.getItem('aura_face_analysis');
    setHasFaceAnalysis(!!faceData);
    try {
      const saved = localStorage.getItem('derma_product_history');
      if (saved) setScanHistory(JSON.parse(saved));
    } catch { /* ignore */ }
  }, []);

  const saveToHistory = useCallback((p: { name: string; barcode: string; score: number; image_url: string | null }, hasFace: boolean) => {
    setScanHistory(prev => {
      const entry = {
        ...p,
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
        hasFace,
      };
      const updated = [entry, ...prev.filter(h => h.barcode !== p.barcode)].slice(0, 30);
      localStorage.setItem('derma_product_history', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const deleteHistoryItem = useCallback((barcode: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setScanHistory(prev => {
      const updated = prev.filter(h => h.barcode !== barcode);
      localStorage.setItem('derma_product_history', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const loadFromHistory = useCallback((item: typeof scanHistory[0]) => {
    setProduct({ name: item.name, score: item.score, image_url: item.image_url, barcode: item.barcode, foundInApi: true });
    setShowHistory(false);
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

      const p = { name, score, image_url: apiProduct.image_url || null, barcode, foundInApi };
      setProduct(p);
      setHasFaceAnalysis(hasFace);
      setIsLoading(false);
      saveToHistory({ name, barcode, score, image_url: apiProduct.image_url || null }, hasFace);
    })();
  }, [saveToHistory]);

  const instructions = [
    { icon: <ScanBarcode size={18} />, title: "Find the barcode", desc: "Locate the barcode on the product packaging" },
    { icon: <Camera size={18} />, title: "Point & scan", desc: "Hold steady and let the camera read it" },
    { icon: <Zap size={18} />, title: "Get results", desc: "See compatibility score and AI insights" },
  ];

  return (
    <div className="flex flex-col h-full bg-white overflow-hidden">
      {/* ─── Overview (no product scanned yet) ─── */}
      {!product && !isLoading && !showScanner && !showHistory && (
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="px-5 pt-5 pb-3 shrink-0 flex items-center justify-between">
            <div>
              <h1 className="text-[22px] font-bold text-[#1A1D26] tracking-tight">Product Scanner</h1>
              <p className="text-[13px] text-[#9CA3AF] mt-0.5">Check if a product is right for your skin</p>
            </div>
            {scanHistory.length > 0 && (
              <button
                onClick={() => setShowHistory(true)}
                className="w-9 h-9 rounded-xl bg-[#F3F4F6] text-[#6B7280] hover:bg-[#E5E7EB] flex items-center justify-center transition-colors relative"
                title="Scan history"
              >
                <History size={18} />
                <span className="absolute -top-1 -right-1 w-4.5 h-4.5 bg-[#5A8F53] text-white text-[9px] font-bold rounded-full flex items-center justify-center min-w-[18px] h-[18px]">
                  {scanHistory.length}
                </span>
              </button>
            )}
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto px-5 pb-6">
            {/* Hero illustration area */}
            <div className="relative bg-gradient-to-br from-[#E8F3E6] to-[#D4EDDA] rounded-[28px] p-6 mt-2 mb-6 flex flex-col items-center text-center overflow-hidden">
              {/* Decorative circles */}
              <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-[#5A8F53]/10"></div>
              <div className="absolute -bottom-4 -left-4 w-20 h-20 rounded-full bg-[#5A8F53]/8"></div>
              
              <div className="w-20 h-20 rounded-[22px] bg-white shadow-lg shadow-[#5A8F53]/10 flex items-center justify-center mb-4 animate-float-gentle relative z-10">
                <ScanBarcode size={36} className="text-[#5A8F53]" />
              </div>
              <h2 className="text-[18px] font-bold text-[#1A1D26] mb-1 relative z-10">Scan Any Product</h2>
              <p className="text-[13px] text-[#6B7280] leading-relaxed max-w-[260px] relative z-10">
                Instantly check ingredients and get a compatibility score based on your skin profile
              </p>
            </div>

            {/* How it works */}
            <h3 className="text-[13px] font-bold text-[#9CA3AF] uppercase tracking-[0.15em] mb-3 ml-1">How it works</h3>
            <div className="space-y-3 mb-8">
              {instructions.map((step, idx) => (
                <div 
                  key={idx} 
                  className="flex items-start gap-3.5 p-3.5 bg-[#F9FAFB] rounded-2xl animate-card-rise"
                  style={{ animationDelay: `${0.1 + idx * 0.15}s` }}
                >
                  <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center shrink-0 text-[#5A8F53]">
                    {step.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-semibold text-[#1A1D26]">{step.title}</p>
                    <p className="text-[12px] text-[#9CA3AF] mt-0.5">{step.desc}</p>
                  </div>
                  <span className="text-[12px] font-bold text-[#D1D5DB] mt-2.5">{idx + 1}</span>
                </div>
              ))}
            </div>

            {/* Scan button */}
            <button
              onClick={() => setShowScanner(true)}
              className="w-full bg-[#5A8F53] hover:bg-[#477441] active:scale-[0.97] text-white font-bold py-4 rounded-full transition-all duration-300 shadow-[0_8px_24px_rgba(90,143,83,0.35)] text-[16px] relative overflow-hidden"
            >
              <div className="absolute inset-0 overflow-hidden rounded-full">
                <div className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-white/15 to-transparent animate-shimmer-sweep"></div>
              </div>
              <span className="relative z-10 flex items-center justify-center gap-2">
                <ScanBarcode size={20} />
                Start Scanning
              </span>
            </button>
          </div>
        </div>
      )}

      {/* ─── History Panel ─── */}
      {showHistory && !product && !isLoading && (
        <div className="flex flex-col h-full">
          <div className="px-5 pt-5 pb-3 shrink-0 flex items-center justify-between">
            <div>
              <h1 className="text-[22px] font-bold text-[#1A1D26] tracking-tight">Scan History</h1>
              <p className="text-[13px] text-[#9CA3AF] mt-0.5">{scanHistory.length} product{scanHistory.length !== 1 ? 's' : ''} scanned</p>
            </div>
            <button
              onClick={() => setShowHistory(false)}
              className="w-9 h-9 rounded-xl bg-[#F3F4F6] text-[#6B7280] hover:bg-[#E5E7EB] flex items-center justify-center transition-colors"
            >
              <X size={18} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-5 pb-6">
            {scanHistory.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center px-6">
                <History size={40} className="text-[#E5E7EB] mb-3" />
                <p className="text-[#9CA3AF] text-sm font-medium">No scans yet</p>
                <p className="text-[#D1D5DB] text-xs mt-1">Your scanned products will appear here</p>
              </div>
            ) : (
              <div className="space-y-3 mt-2">
                {scanHistory.map((item, idx) => (
                  <div
                    key={item.barcode + idx}
                    onClick={() => loadFromHistory(item)}
                    className="bg-white rounded-2xl p-4 shadow-sm border border-[#F0F0F0] flex items-center gap-3.5 cursor-pointer hover:shadow-md transition-all active:scale-[0.98] animate-card-rise"
                    style={{ animationDelay: `${idx * 0.05}s` }}
                  >
                    {item.image_url ? (
                      <img src={item.image_url} alt="" className="w-12 h-12 rounded-xl object-contain bg-[#F9FAFB] border border-[#F0F0F0] shrink-0" />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-[#F9FAFB] border border-[#F0F0F0] flex items-center justify-center shrink-0">
                        <ScanBarcode size={18} className="text-[#D1D5DB]" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] font-semibold text-[#1A1D26] truncate">{item.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {item.hasFace && (
                          <span className={`text-[11px] font-bold ${item.score >= 85 ? 'text-[#5A8F53]' : item.score >= 70 ? 'text-[#FF9F0A]' : 'text-[#FF453A]'}`}>
                            {item.score}/100
                          </span>
                        )}
                        <span className="text-[11px] text-[#D1D5DB]">•</span>
                        <span className="text-[11px] text-[#9CA3AF]">{item.date}</span>
                      </div>
                    </div>
                    <button
                      onClick={(e) => deleteHistoryItem(item.barcode, e)}
                      className="text-[#D1D5DB] hover:text-[#EF4444] p-1.5 shrink-0 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── Loading state ─── */}
      {isLoading && (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6">
          <div className="w-16 h-16 rounded-2xl bg-[#E8F3E6] flex items-center justify-center animate-pulse">
            <Loader2 className="text-[#5A8F53] animate-spin" size={28} />
          </div>
          <div className="text-center">
            <p className="text-[16px] font-bold text-[#1A1D26]">Looking up product…</p>
            <p className="text-[13px] text-[#9CA3AF] mt-1">Searching our database</p>
          </div>
        </div>
      )}

      {/* ─── Results ─── */}
      {product && !isLoading && (
        <div className="flex flex-col h-full">
          {/* Results Header */}
          <div className="px-5 pt-5 pb-3 flex items-center justify-between shrink-0">
            <h1 className="text-[22px] font-bold text-[#1A1D26] tracking-tight">Results</h1>
            <button
              onClick={() => { setProduct(null); }}
              className="text-[13px] font-semibold text-[#5A8F53] bg-[#E8F3E6] px-3.5 py-1.5 rounded-full hover:bg-[#D4EDDA] transition-colors"
            >
              New Scan
            </button>
          </div>

          {/* Scrollable results */}
          <div className="flex-1 overflow-y-auto px-5 pb-6 space-y-4">
            {/* Product Card */}
            <div className="bg-white rounded-[24px] p-5 shadow-sm border border-[#F0F0F0] animate-card-rise" style={{ animationDelay: '0.1s' }}>
              <div className="flex gap-4 items-center">
                {product.image_url ? (
                  <img
                    src={product.image_url}
                    alt=""
                    className="w-16 h-16 rounded-2xl object-contain bg-[#F9FAFB] border border-[#F0F0F0] shrink-0"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-2xl bg-[#F9FAFB] border border-[#F0F0F0] flex items-center justify-center shrink-0">
                    <ScanBarcode size={24} className="text-[#D1D5DB]" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-[16px] font-bold text-[#1A1D26] leading-snug">{product.name}</p>
                  <p className="text-[12px] text-[#9CA3AF] mt-1 font-mono">#{product.barcode}</p>
                  {!product.foundInApi && (
                    <span className="inline-block mt-1.5 px-2 py-0.5 bg-amber-50 border border-amber-200 rounded-lg text-[11px] text-amber-600 font-medium">
                      Not in database
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Score Card */}
            {hasFaceAnalysis ? (
              <div className="bg-white rounded-[24px] p-6 shadow-sm border border-[#F0F0F0] flex flex-col items-center text-center animate-card-rise" style={{ animationDelay: '0.25s' }}>
                <p className="text-[11px] font-bold text-[#9CA3AF] uppercase tracking-[0.15em] mb-4">Skin Compatibility</p>
                <ScoreRing score={product.score} />
                <p className="text-[13px] text-[#6B7280] mt-3 max-w-[220px]">
                  {product.score >= 85 ? 'Great match for your skin type!' :
                   product.score >= 70 ? 'Decent match — some ingredients may not be ideal' :
                   'May not be the best fit for your skin'}
                </p>
                <div className="flex items-center gap-1.5 mt-2 text-[#5A8F53]">
                  <ShieldCheck size={14} />
                  <span className="text-[12px] font-semibold">Based on your face scan</span>
                </div>
              </div>
            ) : (
              <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-[24px] p-5 border border-amber-100/60 animate-card-rise text-center" style={{ animationDelay: '0.25s' }}>
                <Eye size={28} className="text-amber-500 mx-auto mb-2" />
                <p className="text-[14px] font-bold text-[#1A1D26] mb-1">Get Your Match Score</p>
                <p className="text-[12px] text-[#6B7280] mb-3">Complete a face scan to see how this product matches your skin</p>
                <button 
                  onClick={() => onNavigateToTab?.('face-scan')}
                  className="inline-flex items-center gap-1.5 text-[13px] text-[#5A8F53] font-semibold hover:underline"
                >
                  <Camera size={14} /> Go to Face Scan tab
                  <ChevronRight size={14} />
                </button>
              </div>
            )}

            {/* AI Insight Prompt */}
            <div 
              onClick={() => setShowChat(true)}
              className="bg-gradient-to-r from-[#E8F3E6] to-[#D4EDDA] rounded-[24px] p-5 flex items-center gap-4 cursor-pointer hover:shadow-md transition-all active:scale-[0.98] animate-card-rise"
              style={{ animationDelay: '0.4s' }}
            >
              <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center shrink-0">
                <Sparkles size={22} className="text-[#5A8F53]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-bold text-[#1A1D26]">Ask Derma About This</p>
                <p className="text-[12px] text-[#6B7280] mt-0.5">Get personalized AI insights</p>
              </div>
              <ChevronRight size={18} className="text-[#5A8F53] shrink-0" />
            </div>

            {/* Scan Another */}
            <button
              onClick={() => { setShowScanner(true); setProduct(null); }}
              className="w-full bg-[#F3F4F6] hover:bg-[#E5E7EB] active:scale-[0.97] text-[#1A1D26] font-bold py-3.5 rounded-full transition-all text-[14px] flex items-center justify-center gap-2 animate-card-rise"
              style={{ animationDelay: '0.5s' }}
            >
              <ScanBarcode size={18} />
              Scan Another Product
            </button>
          </div>
        </div>
      )}

      {/* ─── Scanner Overlay ─── */}
      {showScanner && (
        <BarcodeScanner
          onScan={handleScan}
          onClose={() => setShowScanner(false)}
        />
      )}

      {showCameraTest && (
        <CameraTest onClose={() => setShowCameraTest(false)} />
      )}

      {/* ─── Chat Modal ─── */}
      {showChat && product && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center">
          <div className="w-full sm:max-w-lg h-[85vh] sm:h-[75vh] bg-white sm:rounded-2xl rounded-t-2xl shadow-2xl flex flex-col overflow-hidden animate-slide-up-fade">
            <div className="px-5 py-3.5 border-b border-[#F0F0F0] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#E8F3E6] flex items-center justify-center">
                  <Sparkles size={16} className="text-[#5A8F53]" />
                </div>
                <div>
                  <h2 className="text-[14px] font-bold text-[#1A1D26]">Ask Derma</h2>
                  <p className="text-[11px] text-[#9CA3AF] truncate max-w-[200px]">About {product.name}</p>
                </div>
              </div>
              <button
                onClick={() => setShowChat(false)}
                className="w-8 h-8 rounded-lg hover:bg-[#F3F4F6] flex items-center justify-center transition-colors text-[#9CA3AF]"
              >
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 min-h-0 overflow-hidden">
              <ChatInterface
                contextData={(() => {
                  let savedAnalysis = null;
                  try {
                    const savedData = localStorage.getItem('aura_face_analysis');
                    if (savedData) savedAnalysis = JSON.parse(savedData);
                  } catch { /* ignore */ }

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
    </div>
  );
}
