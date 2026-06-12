import { NavbarSnapshot, NotificationsResponse } from "../types.js";

const BASE_URL = "https://app.noest-dz.com";

function parseCookie(cookieString: string, name: string): string | undefined {
  for (const pair of cookieString.split("; ")) {
    const [k, ...rest] = pair.split("=");
    if (k.trim() === name) return rest.join("=");
  }
  return undefined;
}

export async function getNavbarSnapshot(
  cookies: string
): Promise<{ apiResponse: NotificationsResponse; snapshot: NavbarSnapshot }> {
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

  const res = await fetch(BASE_URL + "/get/notifications", {
    method: "POST",
    headers,
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `Notifications API returned ${res.status} ${res.statusText} — ${body.substring(0, 200)}`
    );
  }

  const data: NotificationsResponse = await res.json();

  const snapshot: NavbarSnapshot = {
    colisPrets: data.p_a_preparer,
    enTraitement: data.en_transit,
    enExpedition: { versHub: data.vers_hub, enHub: data.en_hub },
    enLivraison: data.en_livraison,
    suspendus: data.suspendus,
    retours: {
      chezStation: data.retours_chez_station,
      chezHubCentral: data.retours_hub_central,
      prepares: data.retour_recu,
      enTransit: data.retour_en_transit_stock,
    },
  };

  return { apiResponse: data, snapshot };
}