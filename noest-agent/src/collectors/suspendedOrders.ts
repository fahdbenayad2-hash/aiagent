import { SuspendedOrder } from "../types.js";

const BASE_URL = "https://app.noest-dz.com";

function parseCookie(cookieString: string, name: string): string | undefined {
  for (const pair of cookieString.split("; ")) {
    const [k, ...rest] = pair.split("=");
    if (k.trim() === name) return rest.join("=");
  }
  return undefined;
}

export async function getSuspendedOrders(
  cookies: string
): Promise<SuspendedOrder[]> {
  const xsrfCookie = parseCookie(cookies, "XSRF-TOKEN");
  const xsrfToken = xsrfCookie ? decodeURIComponent(xsrfCookie) : "";

  const headers: Record<string, string> = {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    Cookie: cookies,
    Accept: "application/json, text/plain, */*",
    "X-Requested-With": "XMLHttpRequest",
    Referer: BASE_URL + "/home",
  };
  if (xsrfToken) {
    headers["X-XSRF-TOKEN"] = xsrfToken;
  }

  const params = new URLSearchParams({
    "_": String(Date.now()),
    "draw": "1",
    "start": "0",
    "length": "100",
    "order[0][column]": "0",
    "order[0][dir]": "asc",
  });

  const res = await fetch(`${BASE_URL}/maj?${params.toString()}`, {
    method: "GET",
    headers,
  });

  if (!res.ok) {
    console.warn(
      `Suspended orders API returned ${res.status} — skipping`
    );
    return [];
  }

  const json = await res.json();
  const rows: unknown[] = json.data ?? json.rows ?? json.records ?? [];

  const orders: SuspendedOrder[] = [];
  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    const cells = r.cells ?? r;
    const cellArray = Array.isArray(cells) ? cells : [];

    const tracking = String(cellArray[0] ?? r.tracking ?? r.DT_RowId ?? "");
    const client = String(cellArray[1] ?? r.client ?? r.nom ?? "");
    const montant = Number(cellArray[2] ?? r.montant ?? r.montant_total ?? 0);
    const dateColis = String(cellArray[3] ?? r.date_colis ?? r.date ?? "");
    const statut = String(cellArray[4] ?? r.statut ?? r.status ?? "");
    const ville = String(cellArray[5] ?? r.ville ?? "");
    const wilaya = String(cellArray[6] ?? r.wilaya ?? "");
    const totalPercu = Number(cellArray[7] ?? r.total_percu ?? 0);
    const aPercu = Number(cellArray[8] ?? r.a_percu ?? 0);

    if (!tracking) continue;

    orders.push({ tracking, client, montant, dateColis, statut, ville, wilaya, totalPercu, aPercu });
  }

  return orders;
}
