"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import BarcodeScanner from "@/components/BarcodeScanner";
import ChatInterface from "@/components/ChatInterface";
import { ScanBarcode, Sparkles, ArrowLeft, Loader2, MessageCircle, X } from "lucide-react";

// Look up product from Open Beauty Facts / Open Food Facts via our API
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
  } catch {
    // ignore
  }
  return { name: "", image_url: null };
}

export default function ProductScanPage() {
  const [showScanner, setShowScanner] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [product, setProduct] = useState<{
    name: string;
    score: number | null;
    reasoning: string | null;
    image_url: string | null;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isScoring, setIsScoring] = useState(false);
  const [hasScanResult, setHasScanResult] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('aura_scan_result');
      setHasScanResult(!!saved);
    } catch { }
  }, []);

  const handleScan = useCallback((barcode: string) => {
    setShowScanner(false);
    setIsLoading(true);
    (async () => {
      const apiProduct = await getProductByBarcode(barcode);
      const name =
        apiProduct.name ||
        (() => {
          const mock: Record<string, string> = {
            "5901234123457": "CeraVe Hydrating Cleanser",
            "3600530824692": "La Roche-Posay Toleriane Double Repair",
            "3337875301234": "The Ordinary Niacinamide 10% + Zinc 1%",
            "3337875597333": "The Ordinary",
            "012345678901": "Paula's Choice 2% BHA Liquid",
            "987654321098": "COSRX Snail Mucin Essence",
          };
          return mock[barcode] ?? `Product (barcode: ${barcode})`;
        })();

      setProduct({ name, score: null, reasoning: null, image_url: apiProduct.image_url || null });
      setIsLoading(false);

      // If we have saved scan results, fetch the AI score
      let scanResult: any = null;
      try { scanResult = JSON.parse(localStorage.getItem('aura_scan_result') || ''); } catch { }
      if (scanResult) {
        setIsScoring(true);
        try {
          const res = await fetch('/api/product-score', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ scanResult, productName: name }),
          });
          if (res.ok) {
            const data = await res.json();
            setProduct(prev => prev ? { ...prev, score: data.score, reasoning: data.reasoning } : prev);
          }
        } catch (err) {
          console.error('Score fetch failed:', err);
        } finally {
          setIsScoring(false);
        }
      }
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
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <span className="bg-violet-500/20 text-violet-400 p-2 rounded-lg">3</span>
            Scan product barcode
          </h2>

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
                <div className="min-w-0">
                  <p className="text-sm uppercase tracking-wider text-white/50 font-semibold mb-1">
                    Product
                  </p>
                  <p className="text-xl font-bold text-white">{product.name}</p>
                </div>
              </div>

              {hasScanResult ? (
                <>
                  <div className="rounded-xl bg-black/30 border border-white/10 p-6 text-center">
                    <p className="text-sm uppercase tracking-wider text-white/50 font-semibold mb-3">
                      Overall match score
                    </p>
                    {isScoring ? (
                      <div className="flex flex-col items-center gap-2 py-2">
                        <Loader2 className="text-violet-400 animate-spin" size={32} />
                        <p className="text-white/50 text-sm">Aura is evaluating this product…</p>
                      </div>
                    ) : product.score !== null ? (
                      <>
                        <p className="text-5xl font-black text-white mx-auto w-fit">
                          {product.score}/100
                        </p>
                        {product.reasoning && (
                          <p className="text-white/60 text-sm mt-3 leading-relaxed">{product.reasoning}</p>
                        )}
                      </>
                    ) : (
                      <p className="text-white/40 text-sm">Score unavailable</p>
                    )}
                  </div>

                  {/* Ask Aura CTA */}
                  <button
                    onClick={() => setShowChat(true)}
                    disabled={isScoring}
                    className="w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-3 transition-all
                      bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white shadow-lg shadow-violet-900/20 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <MessageCircle size={22} />
                    Ask Aura how to use it
                  </button>

                  <div className="rounded-xl bg-gradient-to-r from-violet-500/10 to-fuchsia-500/10 border border-white/10 p-5 flex items-start gap-3">
                    <Sparkles className="text-violet-400 shrink-0 mt-0.5" size={22} />
                    <p className="text-white/90 font-medium leading-snug">
                      Your Personal Cosmetologist has insights about this product.
                    </p>
                  </div>
                </>
              ) : (
                <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-5 flex items-start gap-3">
                  <Sparkles className="text-amber-400 shrink-0 mt-0.5" size={22} />
                  <div>
                    <p className="text-white/90 font-medium leading-snug">
                      Complete a face scan first to get your personalized match score.
                    </p>
                    <Link href="/" className="text-violet-400 hover:text-violet-300 text-sm font-medium mt-2 inline-block transition-colors">
                      ← Go to Face Scan
                    </Link>
                  </div>
                </div>
              )}

              <button
                onClick={() => {
                  setShowScanner(true);
                  setProduct(null);
                }}
                className="w-full py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-colors font-medium text-white/80 flex items-center justify-center gap-2"
              >
                <ScanBarcode size={18} />
                Scan another product
              </button>
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

      {/* Aura Chat Overlay */}
      {showChat && product && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-lg h-[80vh] flex flex-col rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
            <button
              onClick={() => setShowChat(false)}
              className="absolute top-3 right-3 z-10 p-2 bg-black/50 hover:bg-red-500/80 rounded-full text-white transition-colors"
            >
              <X size={18} />
            </button>
            <ChatInterface
              contextData={{ product: { name: product.name, score: product.score, reasoning: product.reasoning } }}
              initialMessage={`Hi! I see you scanned **${product.name}**${product.score !== null ? ` — it scored **${product.score}/100** based on your skin profile.${product.reasoning ? ` ${product.reasoning}` : ''}` : '.'} Want to know how to use it, if it's right for you, or what ingredients to watch out for? Just ask!`}
              onClose={() => setShowChat(false)}
            />
          </div>
        </div>
      )}
    </main>
  );
}
