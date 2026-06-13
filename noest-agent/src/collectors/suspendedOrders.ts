import { SuspendedOrder } from "../types.js";

const BASE_URL = "https://app.noest-dz.com";

// Query string capturée depuis le DataTables de /livraisons/suspendu (DevTools).
// Ne pas reconstruire à la main : Laravel valide la définition des colonnes envoyée
// par le frontend. start/length/_ sont remplacés dynamiquement.
const COLUMNS_QS =
  "columns%5B0%5D%5Bdata%5D=btnid&columns%5B0%5D%5Bname%5D=&columns%5B0%5D%5Bsearchable%5D=false&columns%5B0%5D%5Borderable%5D=false&columns%5B0%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B0%5D%5Bsearch%5D%5Bregex%5D=false" +
  "&columns%5B1%5D%5Bdata%5D=package_info&columns%5B1%5D%5Bname%5D=&columns%5B1%5D%5Bsearchable%5D=true&columns%5B1%5D%5Borderable%5D=true&columns%5B1%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B1%5D%5Bsearch%5D%5Bregex%5D=false" +
  "&columns%5B2%5D%5Bdata%5D=customer_location&columns%5B2%5D%5Bname%5D=&columns%5B2%5D%5Bsearchable%5D=true&columns%5B2%5D%5Borderable%5D=true&columns%5B2%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B2%5D%5Bsearch%5D%5Bregex%5D=false" +
  "&columns%5B3%5D%5Bdata%5D=remarque_produit&columns%5B3%5D%5Bname%5D=&columns%5B3%5D%5Bsearchable%5D=true&columns%5B3%5D%5Borderable%5D=true&columns%5B3%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B3%5D%5Bsearch%5D%5Bregex%5D=false" +
  "&columns%5B4%5D%5Bdata%5D=suivi&columns%5B4%5D%5Bname%5D=&columns%5B4%5D%5Bsearchable%5D=true&columns%5B4%5D%5Borderable%5D=false&columns%5B4%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B4%5D%5Bsearch%5D%5Bregex%5D=false" +
  "&columns%5B5%5D%5Bdata%5D=actions&columns%5B5%5D%5Bname%5D=&columns%5B5%5D%5Bsearchable%5D=false&columns%5B5%5D%5Borderable%5D=true&columns%5B5%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B5%5D%5Bsearch%5D%5Bregex%5D=false" +
  "&columns%5B6%5D%5Bdata%5D=checkbox&columns%5B6%5D%5Bname%5D=&columns%5B6%5D%5Bsearchable%5D=false&columns%5B6%5D%5Borderable%5D=false&columns%5B6%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B6%5D%5Bsearch%5D%5Bregex%5D=false" +
  "&columns%5B7%5D%5Bdata%5D=tracking&columns%5B7%5D%5Bname%5D=&columns%5B7%5D%5Bsearchable%5D=true&columns%5B7%5D%5Borderable%5D=true&columns%5B7%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B7%5D%5Bsearch%5D%5Bregex%5D=false" +
  "&columns%5B8%5D%5Bdata%5D=reference&columns%5B8%5D%5Bname%5D=&columns%5B8%5D%5Bsearchable%5D=true&columns%5B8%5D%5Borderable%5D=true&columns%5B8%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B8%5D%5Bsearch%5D%5Bregex%5D=false" +
  "&columns%5B9%5D%5Bdata%5D=client&columns%5B9%5D%5Bname%5D=&columns%5B9%5D%5Bsearchable%5D=false&columns%5B9%5D%5Borderable%5D=true&columns%5B9%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B9%5D%5Bsearch%5D%5Bregex%5D=false" +
  "&columns%5B10%5D%5Bdata%5D=phone&columns%5B10%5D%5Bname%5D=&columns%5B10%5D%5Bsearchable%5D=true&columns%5B10%5D%5Borderable%5D=true&columns%5B10%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B10%5D%5Bsearch%5D%5Bregex%5D=false" +
  "&columns%5B11%5D%5Bdata%5D=phone_2&columns%5B11%5D%5Bname%5D=&columns%5B11%5D%5Bsearchable%5D=true&columns%5B11%5D%5Borderable%5D=true&columns%5B11%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B11%5D%5Bsearch%5D%5Bregex%5D=false" +
  "&columns%5B12%5D%5Bdata%5D=adresse&columns%5B12%5D%5Bname%5D=&columns%5B12%5D%5Bsearchable%5D=false&columns%5B12%5D%5Borderable%5D=true&columns%5B12%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B12%5D%5Bsearch%5D%5Bregex%5D=false" +
  "&columns%5B13%5D%5Bdata%5D=commune&columns%5B13%5D%5Bname%5D=&columns%5B13%5D%5Bsearchable%5D=false&columns%5B13%5D%5Borderable%5D=true&columns%5B13%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B13%5D%5Bsearch%5D%5Bregex%5D=false" +
  "&columns%5B14%5D%5Bdata%5D=wilaya&columns%5B14%5D%5Bname%5D=&columns%5B14%5D%5Bsearchable%5D=false&columns%5B14%5D%5Borderable%5D=true&columns%5B14%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B14%5D%5Bsearch%5D%5Bregex%5D=false" +
  "&columns%5B15%5D%5Bdata%5D=montant&columns%5B15%5D%5Bname%5D=&columns%5B15%5D%5Bsearchable%5D=false&columns%5B15%5D%5Borderable%5D=true&columns%5B15%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B15%5D%5Bsearch%5D%5Bregex%5D=false" +
  "&columns%5B16%5D%5Bdata%5D=remarque&columns%5B16%5D%5Bname%5D=&columns%5B16%5D%5Bsearchable%5D=false&columns%5B16%5D%5Borderable%5D=true&columns%5B16%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B16%5D%5Bsearch%5D%5Bregex%5D=false" +
  "&columns%5B17%5D%5Bdata%5D=produit&columns%5B17%5D%5Bname%5D=&columns%5B17%5D%5Bsearchable%5D=false&columns%5B17%5D%5Borderable%5D=true&columns%5B17%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B17%5D%5Bsearch%5D%5Bregex%5D=false" +
  "&columns%5B18%5D%5Bdata%5D=created_at&columns%5B18%5D%5Bname%5D=&columns%5B18%5D%5Bsearchable%5D=false&columns%5B18%5D%5Borderable%5D=true&columns%5B18%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B18%5D%5Bsearch%5D%5Bregex%5D=false" +
  "&columns%5B19%5D%5Bdata%5D=expedier_at&columns%5B19%5D%5Bname%5D=&columns%5B19%5D%5Bsearchable%5D=false&columns%5B19%5D%5Borderable%5D=true&columns%5B19%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B19%5D%5Bsearch%5D%5Bregex%5D=false" +
  "&columns%5B20%5D%5Bdata%5D=20&columns%5B20%5D%5Bname%5D=&columns%5B20%5D%5Bsearchable%5D=false&columns%5B20%5D%5Borderable%5D=true&columns%5B20%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B20%5D%5Bsearch%5D%5Bregex%5D=false" +
  "&columns%5B21%5D%5Bdata%5D=21&columns%5B21%5D%5Bname%5D=&columns%5B21%5D%5Bsearchable%5D=false&columns%5B21%5D%5Borderable%5D=true&columns%5B21%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B21%5D%5Bsearch%5D%5Bregex%5D=false" +
  "&columns%5B22%5D%5Bdata%5D=data_lists&columns%5B22%5D%5Bname%5D=&columns%5B22%5D%5Bsearchable%5D=false&columns%5B22%5D%5Borderable%5D=false&columns%5B22%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B22%5D%5Bsearch%5D%5Bregex%5D=false" +
  "&order%5B0%5D%5Bcolumn%5D=1&order%5B0%5D%5Bdir%5D=desc" +
  "&search%5Bvalue%5D=&search%5Bregex%5D=false" +
  "&type_id=0&stop_desk=0&wilaya_id=0&maj_id=0&askFilter=0&nbr_tent=100&with_stock=2";

function parseCookie(cookieString: string, name: string): string | undefined {
  for (const pair of cookieString.split("; ")) {
    const [k, ...rest] = pair.split("=");
    if (k.trim() === name) return rest.join("=");
  }
  return undefined;
}

// Nettoie le champ "produit" brut, ex: " # ستار غشوة ( Qty : 1 ) ," -> "ستار غشوة ( Qty : 1 )"
function cleanProduit(raw: string): string {
  return raw
    .replace(/^\s*#\s*/, "")
    .replace(/,\s*$/, "")
    .trim();
}

interface RawSuspendedRow {
  tracking: string;
  client: string;
  phone: string;
  wilaya: string;
  commune: string;
  adresse: string;
  produit: string;
  nbr_tent: number;
  created_at: string;
  expedier_at: string;
  montant: { montant: string; old_montant: string; tracking: string };
  package_info?: {
    driver?: { id: number; name: string; phone: string };
    deliver_at?: { date: string; defined: number };
  };
}

export async function getSuspendedOrders(
  cookies: string,
  csrfToken?: string
): Promise<SuspendedOrder[]> {
  let csrf = csrfToken;
  if (!csrf) {
    const xsrfCookie = parseCookie(cookies, "XSRF-TOKEN");
    csrf = xsrfCookie ? decodeURIComponent(xsrfCookie) : "";
  }

  const headers: Record<string, string> = {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    Cookie: cookies,
    Accept: "application/json, text/plain, */*",
    "X-Requested-With": "XMLHttpRequest",
    Referer: BASE_URL + "/livraisons/suspendu",
  };
  if (csrf) {
    headers["X-CSRF-TOKEN"] = csrf;
  }

  const url =
    `${BASE_URL}/livraisons/suspendu/list?` +
    `draw=1&start=0&length=100&_=${Date.now()}&${COLUMNS_QS}`;

  const res = await fetch(url, { method: "GET", headers });

  if (!res.ok) {
    console.warn(`Suspended orders API returned ${res.status} — skipping`);
    return [];
  }

  const json = await res.json();
  const rows: RawSuspendedRow[] = Array.isArray(json.data) ? json.data : [];

  const orders: SuspendedOrder[] = [];
  for (const r of rows) {
    if (!r?.tracking) continue;

    const driver =
      r.package_info?.driver && r.package_info.driver.name
        ? { name: r.package_info.driver.name, phone: r.package_info.driver.phone }
        : null;

    const deliverAt =
      r.package_info?.deliver_at?.defined === 1
        ? r.package_info.deliver_at.date
        : null;

    orders.push({
      tracking: r.tracking,
      client: r.client ?? "",
      phone: r.phone ?? "",
      wilaya: r.wilaya ?? "",
      commune: r.commune ?? "",
      adresse: r.adresse ?? "",
      produit: cleanProduit(r.produit ?? ""),
      montant: parseFloat(r.montant?.montant ?? "0") || 0,
      nbrTentatives: r.nbr_tent ?? 0,
      driver,
      createdAt: r.created_at ?? "",
      expedierAt: r.expedier_at ?? "",
      deliverAt,
    });
  }

  return orders;
}
