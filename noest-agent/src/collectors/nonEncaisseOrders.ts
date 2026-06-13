import { NonEncaisseOrder } from "../types.js";

const BASE_URL = "https://app.noest-dz.com";

const COLUMNS_QS =
  "columns%5B0%5D%5Bdata%5D=btnid&columns%5B0%5D%5Bname%5D=&columns%5B0%5D%5Bsearchable%5D=false&columns%5B0%5D%5Borderable%5D=false&columns%5B0%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B0%5D%5Bsearch%5D%5Bregex%5D=false" +
  "&columns%5B1%5D%5Bdata%5D=package_info&columns%5B1%5D%5Bname%5D=&columns%5B1%5D%5Bsearchable%5D=true&columns%5B1%5D%5Borderable%5D=true&columns%5B1%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B1%5D%5Bsearch%5D%5Bregex%5D=false" +
  "&columns%5B2%5D%5Bdata%5D=customer_location&columns%5B2%5D%5Bname%5D=&columns%5B2%5D%5Bsearchable%5D=true&columns%5B2%5D%5Borderable%5D=true&columns%5B2%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B2%5D%5Bsearch%5D%5Bregex%5D=false" +
  "&columns%5B3%5D%5Bdata%5D=remarque_produit&columns%5B3%5D%5Bname%5D=&columns%5B3%5D%5Bsearchable%5D=true&columns%5B3%5D%5Borderable%5D=true&columns%5B3%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B3%5D%5Bsearch%5D%5Bregex%5D=false" +
  "&columns%5B4%5D%5Bdata%5D=suivi&columns%5B4%5D%5Bname%5D=&columns%5B4%5D%5Bsearchable%5D=true&columns%5B4%5D%5Borderable%5D=false&columns%5B4%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B4%5D%5Bsearch%5D%5Bregex%5D=false" +
  "&columns%5B5%5D%5Bdata%5D=livred_at&columns%5B5%5D%5Bname%5D=&columns%5B5%5D%5Bsearchable%5D=true&columns%5B5%5D%5Borderable%5D=true&columns%5B5%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B5%5D%5Bsearch%5D%5Bregex%5D=false" +
  "&columns%5B6%5D%5Bdata%5D=tracking&columns%5B6%5D%5Bname%5D=&columns%5B6%5D%5Bsearchable%5D=true&columns%5B6%5D%5Borderable%5D=true&columns%5B6%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B6%5D%5Bsearch%5D%5Bregex%5D=false" +
  "&columns%5B7%5D%5Bdata%5D=reference&columns%5B7%5D%5Bname%5D=&columns%5B7%5D%5Bsearchable%5D=true&columns%5B7%5D%5Borderable%5D=true&columns%5B7%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B7%5D%5Bsearch%5D%5Bregex%5D=false" +
  "&columns%5B8%5D%5Bdata%5D=client&columns%5B8%5D%5Bname%5D=&columns%5B8%5D%5Bsearchable%5D=false&columns%5B8%5D%5Borderable%5D=true&columns%5B8%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B8%5D%5Bsearch%5D%5Bregex%5D=false" +
  "&columns%5B9%5D%5Bdata%5D=phone&columns%5B9%5D%5Bname%5D=&columns%5B9%5D%5Bsearchable%5D=true&columns%5B9%5D%5Borderable%5D=true&columns%5B9%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B9%5D%5Bsearch%5D%5Bregex%5D=false" +
  "&columns%5B10%5D%5Bdata%5D=phone_2&columns%5B10%5D%5Bname%5D=&columns%5B10%5D%5Bsearchable%5D=true&columns%5B10%5D%5Borderable%5D=true&columns%5B10%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B10%5D%5Bsearch%5D%5Bregex%5D=false" +
  "&columns%5B11%5D%5Bdata%5D=adresse&columns%5B11%5D%5Bname%5D=&columns%5B11%5D%5Bsearchable%5D=false&columns%5B11%5D%5Borderable%5D=true&columns%5B11%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B11%5D%5Bsearch%5D%5Bregex%5D=false" +
  "&columns%5B12%5D%5Bdata%5D=commune&columns%5B12%5D%5Bname%5D=&columns%5B12%5D%5Bsearchable%5D=false&columns%5B12%5D%5Borderable%5D=true&columns%5B12%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B12%5D%5Bsearch%5D%5Bregex%5D=false" +
  "&columns%5B13%5D%5Bdata%5D=wilaya&columns%5B13%5D%5Bname%5D=&columns%5B13%5D%5Bsearchable%5D=false&columns%5B13%5D%5Borderable%5D=true&columns%5B13%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B13%5D%5Bsearch%5D%5Bregex%5D=false" +
  "&columns%5B14%5D%5Bdata%5D=montant&columns%5B14%5D%5Bname%5D=&columns%5B14%5D%5Bsearchable%5D=false&columns%5B14%5D%5Borderable%5D=true&columns%5B14%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B14%5D%5Bsearch%5D%5Bregex%5D=false" +
  "&columns%5B15%5D%5Bdata%5D=remarque&columns%5B15%5D%5Bname%5D=&columns%5B15%5D%5Bsearchable%5D=false&columns%5B15%5D%5Borderable%5D=true&columns%5B15%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B15%5D%5Bsearch%5D%5Bregex%5D=false" +
  "&columns%5B16%5D%5Bdata%5D=produit&columns%5B16%5D%5Bname%5D=&columns%5B16%5D%5Bsearchable%5D=false&columns%5B16%5D%5Borderable%5D=true&columns%5B16%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B16%5D%5Bsearch%5D%5Bregex%5D=false" +
  "&columns%5B17%5D%5Bdata%5D=created_at&columns%5B17%5D%5Bname%5D=&columns%5B17%5D%5Bsearchable%5D=false&columns%5B17%5D%5Borderable%5D=true&columns%5B17%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B17%5D%5Bsearch%5D%5Bregex%5D=false" +
  "&columns%5B18%5D%5Bdata%5D=remarque_produit.poids&columns%5B18%5D%5Bname%5D=&columns%5B18%5D%5Bsearchable%5D=false&columns%5B18%5D%5Borderable%5D=true&columns%5B18%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B18%5D%5Bsearch%5D%5Bregex%5D=false" +
  "&columns%5B19%5D%5Bdata%5D=expedier_at&columns%5B19%5D%5Bname%5D=&columns%5B19%5D%5Bsearchable%5D=true&columns%5B19%5D%5Borderable%5D=true&columns%5B19%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B19%5D%5Bsearch%5D%5Bregex%5D=false" +
  "&columns%5B20%5D%5Bdata%5D=data_lists&columns%5B20%5D%5Bname%5D=&columns%5B20%5D%5Bsearchable%5D=false&columns%5B20%5D%5Borderable%5D=false&columns%5B20%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B20%5D%5Bsearch%5D%5Bregex%5D=false" +
  "&order%5B0%5D%5Bcolumn%5D=1&order%5B0%5D%5Bdir%5D=desc" +
  "&search%5Bvalue%5D=&search%5Bregex%5D=false" +
  "&type_id=0&stop_desk=0&wilaya_id=0&commune_id=&with_stock=2";

function parseCookie(cookieString: string, name: string): string | undefined {
  for (const pair of cookieString.split("; ")) {
    const [k, ...rest] = pair.split("=");
    if (k.trim() === name) return rest.join("=");
  }
  return undefined;
}

interface RawNonEncaisseRow {
  tracking: string;
  reference: string | null;
  client: string;
  phone: string;
  phone_2: string | null;
  wilaya: string;
  commune: string;
  wilaya_id: number;
  adresse: string;
  produit: string;
  poids: string | null;
  montant: { montant: string; old_montant: string; tracking: string };
  remarque: string | null;
  nbr_tent: number;
  stop_desk: number;
  created_at: string;
  expedier_at: string;
  livred_at: string;
  package_info?: {
    driver?: { id: number | string; name: string; phone: string };
  };
  data_lists?: {
    SumLivred?: string;
  };
}

export async function getNonEncaisseOrders(
  cookies: string,
  csrfToken?: string
): Promise<{ orders: NonEncaisseOrder[]; sumLivred: number }> {
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
    Referer: BASE_URL + "/livraison/non/encaisse",
  };
  if (csrf) {
    headers["X-CSRF-TOKEN"] = csrf;
  }

  const url =
    `${BASE_URL}/livraison/non/encaisse/list?` +
    `draw=1&start=0&length=100&_=${Date.now()}&${COLUMNS_QS}`;

  const res = await fetch(url, { method: "GET", headers });

  if (!res.ok) {
    console.warn(`Non-encaisse API returned ${res.status} — skipping`);
    return { orders: [], sumLivred: 0 };
  }

  const json = await res.json();
  const rows: RawNonEncaisseRow[] = Array.isArray(json.data) ? json.data : [];

  let sumLivred = 0;
  const orders: NonEncaisseOrder[] = [];

  for (const r of rows) {
    if (!r?.tracking) continue;

    const driver =
      r.package_info?.driver && r.package_info.driver.name
        ? { name: r.package_info.driver.name, phone: r.package_info.driver.phone }
        : null;

    const orderSumLivred = parseFloat(r.data_lists?.SumLivred ?? "0") || 0;
    if (orderSumLivred > sumLivred) {
      sumLivred = orderSumLivred;
    }

    orders.push({
      tracking: r.tracking,
      reference: r.reference ?? null,
      client: r.client ?? "",
      phone: r.phone ?? "",
      phone_2: r.phone_2 ?? null,
      wilaya: r.wilaya ?? "",
      commune: r.commune ?? "",
      wilaya_id: r.wilaya_id ?? 0,
      adresse: r.adresse ?? "",
      produit: r.produit ?? "",
      poids: r.poids ?? null,
      montant: parseFloat(r.montant?.montant ?? "0") || 0,
      remarque: r.remarque ?? null,
      nbrTentatives: r.nbr_tent ?? 0,
      stopDesk: r.stop_desk ?? 0,
      driver,
      createdAt: r.created_at ?? "",
      expedierAt: r.expedier_at ?? "",
      livredAt: r.livred_at ?? "",
      sumLivred: orderSumLivred,
    });
  }

  return { orders, sumLivred };
}
