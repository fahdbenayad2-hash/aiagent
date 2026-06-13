import { SuiviEntry } from "../types.js";
import { stripHtml } from "../utils/html.js";

const BASE_URL = "https://app.noest-dz.com";

function parseCookie(cookieString: string, name: string): string | undefined {
  for (const pair of cookieString.split("; ")) {
    const [k, ...rest] = pair.split("=");
    if (k.trim() === name) return rest.join("=");
  }
  return undefined;
}

interface MajPartResponse {
  content?: Record<string, string>;
  count?: Record<string, number>;
  last_maj?: Record<string, string>;
  last_maj_date?: Record<string, string>;
}

// Récupère l'historique "Suivi" pour un lot de trackings en un seul POST.
// Retourne une entrée unique par tracking (le texte complet "stripé" est lisible
// directement par Claude/Gemini, pas besoin d'un parsing structuré ligne par ligne).
export async function getSuiviHistoryBatch(
  cookies: string,
  trackings: string[],
  csrfToken?: string
): Promise<Record<string, SuiviEntry[]>> {
  const map: Record<string, SuiviEntry[]> = {};
  if (trackings.length === 0) return map;

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
    "Content-Type": "application/x-www-form-urlencoded",
    "X-Requested-With": "XMLHttpRequest",
    Referer: BASE_URL + "/livraisons/suspendu",
  };
  if (csrf) {
    headers["X-CSRF-TOKEN"] = csrf;
  }

  const body = new URLSearchParams();
  for (const t of trackings) {
    body.append("TrackingsList[]", t);
  }

  const res = await fetch(`${BASE_URL}/maj/content/list/part`, {
    method: "POST",
    headers,
    body,
  });

  if (!res.ok) {
    console.warn(`Suivi history batch returned ${res.status} — skipping`);
    return map;
  }

  const data: MajPartResponse = await res.json();

  for (const tracking of trackings) {
    const rawHtml = data.content?.[tracking] ?? "";
    const text = stripHtml(rawHtml);
    const lastMajDate = data.last_maj_date?.[tracking] ?? "";

    map[tracking] = text
      ? [{ date: lastMajDate, text, location: "" }]
      : [];
  }

  return map;
}
