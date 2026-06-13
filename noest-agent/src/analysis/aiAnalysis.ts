import { SuspendedOrder, SuiviEntry, AiAnalysis } from "../types.js";

const GEMINI_API_KEY = () => process.env.GEMINI_API_KEY;

interface GeminiResponseCandidate {
  content?: {
    parts?: Array<{ text?: string }>;
  };
}

interface GeminiResponse {
  candidates?: GeminiResponseCandidate[];
}

function createFallback(): AiAnalysis {
  return {
    summary: "Analyse IA non disponible — clé API Gemini manquante ou erreur",
    riskLevel: "low",
    totalBlockedAmount: 0,
    keyIssues: [],
    recommendations: ["Configurer GEMINI_API_KEY pour activer l'analyse IA"],
    oldestOrderDays: 0,
  };
}

function daysSince(dateStr: string): number {
  if (!dateStr) return 0;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return 0;
  return Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
}

function groupBy<T>(items: T[], keyFn: (item: T) => string): Record<string, T[]> {
  const map: Record<string, T[]> = {};
  for (const item of items) {
    const key = keyFn(item);
    if (!map[key]) map[key] = [];
    map[key].push(item);
  }
  return map;
}

function truncateSuivi(suiviEntries: SuiviEntry[], max = 5): SuiviEntry[] {
  return suiviEntries.slice(0, max);
}

export async function analyzeSuspendedOrders(
  orders: SuspendedOrder[],
  suiviMap: Record<string, SuiviEntry[]>
): Promise<AiAnalysis[]> {
  const apiKey = GEMINI_API_KEY();
  if (!apiKey) {
    console.warn("GEMINI_API_KEY not set — skipping AI analysis");
    return [createFallback()];
  }

  if (orders.length === 0) {
    return [
      {
        summary: "Aucune commande suspendue — tout est normal",
        riskLevel: "low",
        totalBlockedAmount: 0,
        keyIssues: [],
        recommendations: [],
        oldestOrderDays: 0,
      },
    ];
  }

  const byWilaya = groupBy(orders, (o) => o.wilaya || "Inconnue");
  const byClient = groupBy(orders, (o) => o.client || "Inconnu");

  const analyses: AiAnalysis[] = [];

  for (const [wilaya, wilayaOrders] of Object.entries(byWilaya)) {
    const suiviContext: Record<string, string> = {};
    for (const order of wilayaOrders) {
      const entries = truncateSuivi(suiviMap[order.tracking] || []);
      suiviContext[order.tracking] = entries
        .map((e) => `[${e.date}] ${e.text}${e.location ? ` @ ${e.location}` : ""}`)
        .join(" | ");
    }

    const ordersInfo = wilayaOrders
      .map(
        (o) =>
          `- Tracking: ${o.tracking}, Client: ${o.client}, Montant: ${o.montant} DA, Date: ${o.dateColis}, Statut: ${o.statut}, Ville: ${o.ville}${suiviContext[o.tracking] ? `, Suivi: ${suiviContext[o.tracking]}` : ""}`
      )
      .join("\n");

    const totalBlocked = wilayaOrders.reduce((s, o) => s + o.montant, 0);
    const oldest = Math.max(...wilayaOrders.map((o) => daysSince(o.dateColis)));

    const prompt = `Tu es un analyste logistique pour Noest Express, une entreprise de livraison en Algérie.

Analyse ces commandes suspendues (bloquées) dans la wilaya "${wilaya}":

${ordersInfo}

Règles d'analyse:
- Montant total bloqué: ${totalBlocked} DA
- Nombre de commandes: ${wilayaOrders.length}
- Plus ancienne depuis: ${oldest} jours

Réponds UNIQUEMENT en JSON avec cette structure exacte:
{
  "summary": "Résumé de la situation en 1-2 phrases",
  "riskLevel": "low|medium|high",
  "totalBlockedAmount": ${totalBlocked},
  "keyIssues": ["problème 1", "problème 2"],
  "recommendations": ["recommendation 1", "recommendation 2"],
  "oldestOrderDays": ${oldest}
}`;

    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: {
              responseMimeType: "application/json",
              temperature: 0.3,
              maxOutputTokens: 1024,
            },
          }),
        }
      );

      if (!res.ok) {
        const body = await res.text().catch(() => "");
        console.warn(`Gemini API error (${res.status}): ${body.substring(0, 200)}`);
        analyses.push({
          summary: `Analyse non disponible pour ${wilaya} — erreur API`,
          riskLevel: "low",
          totalBlockedAmount: totalBlocked,
          keyIssues: [],
          recommendations: [],
          oldestOrderDays: oldest,
        });
        continue;
      }

      const data: GeminiResponse = await res.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) {
        console.warn(`Gemini returned empty response for ${wilaya}`);
        analyses.push({
          summary: `Analyse non disponible pour ${wilaya} — réponse vide`,
          riskLevel: "low",
          totalBlockedAmount: totalBlocked,
          keyIssues: [],
          recommendations: [],
          oldestOrderDays: oldest,
        });
        continue;
      }

      const parsed = JSON.parse(text);
      analyses.push({
        summary: parsed.summary || `Analyse pour ${wilaya}`,
        riskLevel: parsed.riskLevel || "medium",
        totalBlockedAmount: parsed.totalBlockedAmount ?? totalBlocked,
        keyIssues: Array.isArray(parsed.keyIssues) ? parsed.keyIssues : [],
        recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : [],
        oldestOrderDays: parsed.oldestOrderDays ?? oldest,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`Gemini API call failed for ${wilaya}: ${msg}`);
      analyses.push({
        summary: `Analyse non disponible pour ${wilaya} — erreur: ${msg.substring(0, 100)}`,
        riskLevel: "low",
        totalBlockedAmount: totalBlocked,
        keyIssues: [],
        recommendations: [],
        oldestOrderDays: oldest,
      });
    }
  }

  // Global analysis across all wilayas
  if (Object.keys(byWilaya).length > 1) {
    const totalAll = orders.reduce((s, o) => s + o.montant, 0);
    const oldestAll = Math.max(...orders.map((o) => daysSince(o.dateColis)));

    const prompt = `Tu es un analyste logistique pour Noest Express.

Analyse GLOBALE de ${orders.length} commandes suspendues:

Par wilaya:
${Object.entries(byWilaya)
  .map(
    ([w, os]) =>
      `- ${w}: ${os.length} commandes, ${os.reduce((s, o) => s + o.montant, 0)} DA bloqués`
  )
  .join("\n")}

Par client (top):
${Object.entries(byClient)
  .sort(([, a], [, b]) => b.length - a.length)
  .slice(0, 5)
  .map(([c, os]) => `- ${c}: ${os.length} commandes`)
  .join("\n")}

Montant total bloqué: ${totalAll} DA
Plus ancienne commande: ${oldestAll} jours

Réponds UNIQUEMENT en JSON:
{
  "summary": "Résumé global",
  "riskLevel": "low|medium|high",
  "totalBlockedAmount": ${totalAll},
  "keyIssues": ["problème 1", "problème 2"],
  "recommendations": ["recommandation 1", "recommandation 2"],
  "oldestOrderDays": ${oldestAll}
}`;

    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: {
              responseMimeType: "application/json",
              temperature: 0.3,
              maxOutputTokens: 1024,
            },
          }),
        }
      );

      if (res.ok) {
        const data: GeminiResponse = await res.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          const parsed = JSON.parse(text);
          analyses.push({
            summary: parsed.summary || "Analyse globale",
            riskLevel: parsed.riskLevel || "medium",
            totalBlockedAmount: parsed.totalBlockedAmount ?? totalAll,
            keyIssues: Array.isArray(parsed.keyIssues) ? parsed.keyIssues : [],
            recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : [],
            oldestOrderDays: parsed.oldestOrderDays ?? oldestAll,
          });
        }
      }
    } catch (err) {
      console.warn("Global Gemini analysis failed:", err);
    }
  }

  return analyses;
}
