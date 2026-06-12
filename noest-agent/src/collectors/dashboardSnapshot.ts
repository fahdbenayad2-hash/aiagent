import { NotificationsResponse, DashboardSnapshot } from "../types.js";

const BASE_URL = "https://app.noest-dz.com";

function parseCookie(cookieString: string, name: string): string | undefined {
  for (const pair of cookieString.split("; ")) {
    const [k, ...rest] = pair.split("=");
    if (k.trim() === name) return rest.join("=");
  }
  return undefined;
}

export async function getDashboardSnapshot(
  cookies: string
): Promise<{
  apiResponse: NotificationsResponse;
  snapshot: DashboardSnapshot;
}> {
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

  const snapshot: DashboardSnapshot = {
    date: "",
    pipeline: {
      aExpedier: data.p_a_expedier,
      aPreparer: data.p_a_preparer,
      enPreparation: data.en_preparation,
      enRamassage: data.en_ramassage,
      enTraitement: data.en_transit,
      versHub: data.vers_hub,
      enHub: data.en_hub,
      enLivraison: data.en_livraison,
    },
    problemes: {
      suspendus: data.suspendus,
      desaccord: data.desaccord ?? 0,
    },
    retours: {
      chezStation: data.retours_chez_station,
      chezHubCentral: data.retours_hub_central,
      enTransitStock: data.retour_en_transit_stock,
      recu: data.retour_recu,
    },
    finance: {
      livreNonEncaisse: data.livre_non_encaisse,
      livreEncaisse: data.livre_encaisse,
      recouvrements: data.recouvrements,
      recouvres: data.recouvres ?? 0,
      chequeEncours: data.cheque_encours ?? 0,
    },
  };

  return { apiResponse: data, snapshot };
}
