import { NextRequest, NextResponse } from "next/server";

type LookupResult = {
  product_name: string;
  brands: string | null;
  image_url: string | null;
};

export async function GET(request: NextRequest) {
  const barcode = request.nextUrl.searchParams.get("barcode");
  console.log("[Product API] Request received for barcode:", barcode);
  
  if (!barcode || !/^\d+$/.test(barcode)) {
    console.log("[Product API] Invalid barcode format:", barcode);
    return NextResponse.json(
      { product_name: null, brands: null, image_url: null },
      { status: 200 }
    );
  }

  // Use Scanbot API
  try {
    console.log("[Product API] Trying Scanbot API...");
    const scanbot = await lookupScanbot(barcode);
    if (scanbot) {
      console.log("[Product API] ✓ Found in Scanbot:", scanbot.product_name);
      return NextResponse.json(scanbot, {
        headers: { "Cache-Control": "no-store" },
      });
    }
    console.log("[Product API] ✗ Not found in Scanbot");
  } catch (err) {
    console.error("[Product API] Error with Scanbot API:", err);
  }

  console.log("[Product API] No product found for barcode:", barcode);
  return NextResponse.json(
    { product_name: null, brands: null, image_url: null },
    { status: 200 }
  );
}

async function lookupScanbot(barcode: string): Promise<LookupResult | null> {
  console.log("[Scanbot] Looking up barcode:", barcode);
  
  try {
    const url = `https://scanbot.io/wp-json/upc/v1/lookup/${encodeURIComponent(barcode)}`;
    console.log("[Scanbot] Fetching:", url);
    
    const res = await fetch(url, {
      headers: {
        "Accept": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      cache: "no-store",
    });
    
    console.log("[Scanbot] Response status:", res.status);
    
    if (!res.ok) {
      console.log("[Scanbot] Response not OK");
      return null;
    }
    
    const data = await res.json();
    console.log("[Scanbot] Response data:", JSON.stringify(data).substring(0, 500));
    
    if (!data.product || !data.product.name) {
      console.log("[Scanbot] No product found in response");
      return null;
    }
    
    const result = {
      product_name: data.product.name,
      brands: data.product.brand || null,
      image_url: data.product.imageUrl || null,
    };
    
    console.log("[Scanbot] Found product:", result);
    return result;
  } catch (err) {
    console.error("[Scanbot] Error:", err);
    return null;
  }
}
