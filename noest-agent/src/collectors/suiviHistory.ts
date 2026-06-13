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

function parseSuiviHtml(html: string): SuiviEntry[] {
  const stripped = stripHtml(html);
  const lines = stripped.split("\n").map((l) => l.trim()).filter(Boolean);

  const entries: SuiviEntry[] = [];
  let current: Partial<SuiviEntry> = {};

  for (const line of lines) {
    const dateMatch = line.match(
      /^(\d{2}\/\d{2}\/\d{4}\s*\d{2}:\d{2})/
    );
    if (dateMatch) {
      if (current.date) {
        entries.push(current as SuiviEntry);
      }
      current = { date: dateMatch[1], text: line.slice(dateMatch[1].length).trim(), location: "" };
      continue;
    }

    const locationMatch = line.match(/^(?:Localisation|Location|Ville|Wilaya)\s*:\s*(.+)/i);
    if (locationMatch && current.date) {
      current.location = locationMatch[1].trim();
      continue;
    }

    if (current.date) {
      current.text = (current.text + " " + line).trim();
    }
  }

  if (current.date) {
    entries.push(current as SuiviEntry);
  }

  return entries;
}

export async function getSuiviHistory(
  cookies: string,
  tracking: string
): Promise<SuiviEntry[]> {
  const xsrfCookie = parseCookie(cookies, "XSRF-TOKEN");
  const xsrfToken = xsrfCookie ? decodeURIComponent(xsrfCookie) : "";

  const headers: Record<string, string> = {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    Cookie: cookies,
    Accept: "text/html, */*",
    "Content-Type": "application/x-www-form-urlencoded",
    "X-Requested-With": "XMLHttpRequest",
    Referer: BASE_URL + "/maj",
  };
  if (xsrfToken) {
    headers["X-XSRF-TOKEN"] = xsrfToken;
  }

  const body = new URLSearchParams({ tracking });

  const res = await fetch(`${BASE_URL}/maj/content/list/part`, {
    method: "POST",
    headers,
    body,
  });

  if (!res.ok) {
    console.warn(`Suivi history for ${tracking} returned ${res.status} — skipping`);
    return [];
  }

  const html = await res.text();
  return parseSuiviHtml(html);
}

export async function getSuiviHistoryBatch(
  cookies: string,
  trackings: string[]
): Promise<Record<string, SuiviEntry[]>> {
  const map: Record<string, SuiviEntry[]> = {};
  const concurrency = 3;
  const chunks: string[][] = [];

  for (let i = 0; i < trackings.length; i += concurrency) {
    chunks.push(trackings.slice(i, i + concurrency));
  }

  for (const chunk of chunks) {
    const results = await Promise.allSettled(
      chunk.map((t) => getSuiviHistory(cookies, t))
    );
    for (let i = 0; i < chunk.length; i++) {
      const r = results[i];
      map[chunk[i]] = r.status === "fulfilled" ? r.value : [];
      if (r.status === "rejected") {
        console.warn(`Suivi history for ${chunk[i]} failed: ${r.reason}`);
      }
    }
  }

  return map;
}
