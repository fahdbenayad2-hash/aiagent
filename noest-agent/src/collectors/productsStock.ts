const BASE_URL = "https://app.noest-dz.com";

export interface Product {
  id: number;
  reference: string;
  title: string;
  barcode: string;
  price: number;
  isActive: boolean;
  stockPhysique: number;
  stockReserve: number;
  stockDisponible: number;
  retours: number;
}

export interface ProductsStockDetails {
  products: Product[];
  totalProducts: number;
  totalStockDisponible: number;
  outOfStock: Product[];
  lowStock: Product[];
  highRetours: Product[];
}

const LOW_STOCK_THRESHOLD = 5;
const HIGH_RETOURS_THRESHOLD = 3;

const COLUMNS_QS =
  "columns%5B0%5D%5Bdata%5D=image&columns%5B0%5D%5Bname%5D=&columns%5B0%5D%5Bsearchable%5D=true&columns%5B0%5D%5Borderable%5D=true&columns%5B0%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B0%5D%5Bsearch%5D%5Bregex%5D=false" +
  "&columns%5B1%5D%5Bdata%5D=id&columns%5B1%5D%5Bname%5D=&columns%5B1%5D%5Bsearchable%5D=true&columns%5B1%5D%5Borderable%5D=true&columns%5B1%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B1%5D%5Bsearch%5D%5Bregex%5D=false" +
  "&columns%5B2%5D%5Bdata%5D=reference&columns%5B2%5D%5Bname%5D=&columns%5B2%5D%5Bsearchable%5D=true&columns%5B2%5D%5Borderable%5D=true&columns%5B2%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B2%5D%5Bsearch%5D%5Bregex%5D=false" +
  "&columns%5B3%5D%5Bdata%5D=title&columns%5B3%5D%5Bname%5D=&columns%5B3%5D%5Bsearchable%5D=true&columns%5B3%5D%5Borderable%5D=true&columns%5B3%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B3%5D%5Bsearch%5D%5Bregex%5D=false" +
  "&columns%5B4%5D%5Bdata%5D=barcode&columns%5B4%5D%5Bname%5D=&columns%5B4%5D%5Bsearchable%5D=true&columns%5B4%5D%5Borderable%5D=true&columns%5B4%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B4%5D%5Bsearch%5D%5Bregex%5D=false" +
  "&columns%5B5%5D%5Bdata%5D=price&columns%5B5%5D%5Bname%5D=&columns%5B5%5D%5Bsearchable%5D=true&columns%5B5%5D%5Borderable%5D=true&columns%5B5%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B5%5D%5Bsearch%5D%5Bregex%5D=false" +
  "&columns%5B6%5D%5Bdata%5D=is_active&columns%5B6%5D%5Bname%5D=&columns%5B6%5D%5Bsearchable%5D=true&columns%5B6%5D%5Borderable%5D=true&columns%5B6%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B6%5D%5Bsearch%5D%5Bregex%5D=false" +
  "&columns%5B7%5D%5Bdata%5D=stock_phisique&columns%5B7%5D%5Bname%5D=&columns%5B7%5D%5Bsearchable%5D=true&columns%5B7%5D%5Borderable%5D=true&columns%5B7%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B7%5D%5Bsearch%5D%5Bregex%5D=false" +
  "&columns%5B8%5D%5Bdata%5D=stock_reserve&columns%5B8%5D%5Bname%5D=&columns%5B8%5D%5Bsearchable%5D=true&columns%5B8%5D%5Borderable%5D=true&columns%5B8%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B8%5D%5Bsearch%5D%5Bregex%5D=false" +
  "&columns%5B9%5D%5Bdata%5D=stock_disponible&columns%5B9%5D%5Bname%5D=&columns%5B9%5D%5Bsearchable%5D=true&columns%5B9%5D%5Borderable%5D=true&columns%5B9%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B9%5D%5Bsearch%5D%5Bregex%5D=false" +
  "&columns%5B10%5D%5Bdata%5D=retours&columns%5B10%5D%5Bname%5D=&columns%5B10%5D%5Bsearchable%5D=true&columns%5B10%5D%5Borderable%5D=true&columns%5B10%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B10%5D%5Bsearch%5D%5Bregex%5D=false" +
  "&columns%5B11%5D%5Bdata%5D=history&columns%5B11%5D%5Bname%5D=&columns%5B11%5D%5Bsearchable%5D=true&columns%5B11%5D%5Borderable%5D=true&columns%5B11%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B11%5D%5Bsearch%5D%5Bregex%5D=false" +
  "&order%5B0%5D%5Bcolumn%5D=1&order%5B0%5D%5Bdir%5D=desc" +
  "&search%5Bvalue%5D=&search%5Bregex%5D=false";

function parseCookie(cookieString: string, name: string): string | undefined {
  for (const pair of cookieString.split("; ")) {
    const [k, ...rest] = pair.split("=");
    if (k.trim() === name) return rest.join("=");
  }
  return undefined;
}

function toInt(v: unknown): number {
  if (typeof v === "number") return v;
  if (typeof v === "string") return parseInt(v, 10) || 0;
  return 0;
}

interface RawProduct {
  id?: unknown;
  reference?: string | null;
  title?: string | null;
  barcode?: string | null;
  price?: unknown;
  is_active?: unknown;
  stock_phisique?: unknown;
  stock_reserve?: unknown;
  stock_disponible?: unknown;
  retours?: unknown;
}

export async function getProductsStock(
  cookies: string,
  csrfToken?: string
): Promise<ProductsStockDetails> {
  let csrf = csrfToken;
  if (!csrf) {
    const xsrfCookie = parseCookie(cookies, "XSRF-TOKEN");
    csrf = xsrfCookie ? decodeURIComponent(xsrfCookie) : "";
  }

  const headers: Record<string, string> = {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    Cookie: cookies,
    Accept: "application/json, text/javascript, */*; q=0.01",
    "X-Requested-With": "XMLHttpRequest",
    Referer: BASE_URL + "/products",
  };
  if (csrf) {
    headers["X-CSRF-TOKEN"] = csrf;
  }

  const url =
    `${BASE_URL}/list/products?` +
    `draw=1&start=0&length=200&_=${Date.now()}&${COLUMNS_QS}`;

  const res = await fetch(url, { method: "GET", headers });

  if (!res.ok) {
    console.warn(`Products API returned ${res.status} — skipping`);
    return {
      products: [],
      totalProducts: 0,
      totalStockDisponible: 0,
      outOfStock: [],
      lowStock: [],
      highRetours: [],
    };
  }

  const json = await res.json();
  const rows: RawProduct[] = Array.isArray(json.data) ? json.data : [];

  const products: Product[] = rows
    .filter((r) => r?.id !== undefined)
    .map((r) => ({
      id: toInt(r.id),
      reference: r.reference ?? "",
      title: r.title ?? "",
      barcode: r.barcode ?? "",
      price: toInt(r.price),
      isActive:
        r.is_active === 1 ||
        r.is_active === true ||
        r.is_active === "1",
      stockPhysique: toInt(r.stock_phisique),
      stockReserve: toInt(r.stock_reserve),
      stockDisponible: toInt(r.stock_disponible),
      retours: toInt(r.retours),
    }));

  const activeProducts = products.filter((p) => p.isActive);
  const outOfStock = activeProducts.filter((p) => p.stockDisponible === 0);
  const lowStock = activeProducts.filter(
    (p) => p.stockDisponible > 0 && p.stockDisponible <= LOW_STOCK_THRESHOLD
  );
  const highRetours = activeProducts.filter(
    (p) => p.retours >= HIGH_RETOURS_THRESHOLD
  );
  const totalStockDisponible = activeProducts.reduce(
    (s, p) => s + p.stockDisponible,
    0
  );

  return {
    products,
    totalProducts: products.length,
    totalStockDisponible,
    outOfStock,
    lowStock,
    highRetours,
  };
}
