import { NextRequest, NextResponse } from "next/server";

const UA = "AuraCosmeticAdvisor/1.0";

// Open Beauty Facts / Open Food Facts API response shape
type ProductPayload = {
  product_name?: string;
  product_name_en?: string;
  brands?: string;
  image_front_url?: string;
  image_url?: string;
};

type LookupResult = {
  product_name: string;
  brands: string | null;
  image_url: string | null;
};

async function lookup(
  baseUrl: string,
  barcode: string
): Promise<LookupResult | null> {
  const fields = [
    "product_name",
    "product_name_en",
    "brands",
    "image_front_url",
    "image_url",
  ].join(",");
  const url = `${baseUrl}/${encodeURIComponent(barcode)}.json?fields=${fields}`;
  const res = await fetch(url, {
    headers: { "User-Agent": UA },
    cache: "no-store",
  });
  const data = await res.json();
  if (!res.ok || data.status !== 1 || !data.product) return null;

  const p: ProductPayload = data.product;
  const name =
    (p.product_name_en && p.product_name_en.trim()) ||
    (p.product_name && p.product_name.trim());
  if (!name) return null;

  return {
    product_name: name,
    brands: p.brands ? String(p.brands).trim() : null,
    image_url:
      (p.image_front_url && p.image_front_url.trim()) ||
      (p.image_url && p.image_url.trim()) ||
      null,
  };
}

export async function GET(request: NextRequest) {
  const barcode = request.nextUrl.searchParams.get("barcode");
  if (!barcode || !/^\d+$/.test(barcode)) {
    return NextResponse.json(
      { product_name: null, brands: null, image_url: null },
      { status: 200 }
    );
  }

  try {
    // 1) Open Beauty Facts — cosmetics/skincare (official API)
    const obf = await lookup("https://world.openbeautyfacts.org/api/v2/product", barcode);
    if (obf) {
      return NextResponse.json(obf, {
        headers: { "Cache-Control": "no-store" },
      });
    }

    // 2) Open Food Facts — fallback (food + some cosmetics)
    const off = await lookup("https://world.openfoodfacts.org/api/v2/product", barcode);
    if (off) {
      return NextResponse.json(off, {
        headers: { "Cache-Control": "no-store" },
      });
    }
  } catch {
    // ignore
  }

  return NextResponse.json(
    { product_name: null, brands: null, image_url: null },
    { status: 200 }
  );
}
