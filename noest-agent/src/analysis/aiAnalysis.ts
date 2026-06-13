import { SuspendedOrder, SuiviEntry, NonEncaisseOrder, AiAnalysis } from "../types.js";

const GROQ_API_KEY = () => process.env.GROQ_API_KEY;
const GROQ_MODEL = "llama-3.3-70b-versatile";
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

interface GroqResponse {
  choices?: Array<{ message?: { content?: string } }>;
}

interface ParsedAnalysis {
  summary?: string;
  riskLevel?: "low" | "medium" | "high";
  totalBlockedAmount?: number;
  keyIssues?: string[];
  recommendations?: string[];
  oldestOrderDays?: number;
}

function createFallback(): AiAnalysis {
  return {
    summary: "التحليل الذكي غير متوفر — مفتاح GROQ_API_KEY غير مهيأ أو خطأ",
    riskLevel: "low",
    totalBlockedAmount: 0,
    keyIssues: [],
    recommendations: ["يرجى تهيئة GROQ_API_KEY لتفعيل التحليل الذكي"],
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

// Appelle Groq (API compatible OpenAI), force une réponse JSON, et parse le résultat.
// Retourne null en cas d'erreur réseau/API/parsing (jamais d'exception levée).
async function callGroq(apiKey: string, prompt: string): Promise<ParsedAnalysis | null> {
  try {
    const res = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0.3,
        max_tokens: 1024,
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.warn(`Groq API error (${res.status}): ${body.substring(0, 200)}`);
      return null;
    }

    const data: GroqResponse = await res.json();
    const text = data.choices?.[0]?.message?.content;
    if (!text) {
      console.warn("Groq returned empty response");
      return null;
    }

    return JSON.parse(text) as ParsedAnalysis;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`Groq API call failed: ${msg}`);
    return null;
  }
}

export async function analyzeSuspendedOrders(
  orders: SuspendedOrder[],
  suiviMap: Record<string, SuiviEntry[]>
): Promise<AiAnalysis[]> {
  const apiKey = GROQ_API_KEY();
  if (!apiKey) {
    console.warn("GROQ_API_KEY not set — skipping AI analysis");
    return [createFallback()];
  }

  if (orders.length === 0) {
    return [
      {
        summary: "لا توجد طلبات معلقة — كل شيء طبيعي",
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
          `- Tracking: ${o.tracking}, Client: ${o.client} (${o.phone}), Montant: ${o.montant} DA, Produit: ${o.produit}, Tentatives: ${o.nbrTentatives}, Commune: ${o.commune}, Créée le: ${o.createdAt}${suiviContext[o.tracking] ? `, Suivi: ${suiviContext[o.tracking]}` : ""}`
      )
      .join("\n");

    const totalBlocked = wilayaOrders.reduce((s, o) => s + o.montant, 0);
    const oldest = Math.max(...wilayaOrders.map((o) => daysSince(o.createdAt)));

    const prompt = `أنت محلل لوجستي لشركة Noest Express لتوصيل الطرود في الجزائر.

حلل هذه الطلبات المعلقة (suspendues) في ولاية "${wilaya}":

${ordersInfo}

معطيات:
- المبلغ الإجمالي المحجوز: ${totalBlocked} DA
- عدد الطلبات: ${wilayaOrders.length}
- أقدم طلب منذ: ${oldest} يوم

أجب فقط بصيغة JSON بهذا الشكل الدقيق (بدون أي نص قبله أو بعده). اكتب محتوى summary و keyIssues و recommendations باللغة العربية:
{
  "summary": "ملخص الوضع في جملة أو جملتين",
  "riskLevel": "low|medium|high",
  "totalBlockedAmount": ${totalBlocked},
  "keyIssues": ["مشكلة 1", "مشكلة 2"],
  "recommendations": ["اقتراح 1", "اقتراح 2"],
  "oldestOrderDays": ${oldest}
}`;

    const parsed = await callGroq(apiKey, prompt);
    if (!parsed) {
      analyses.push({
        summary: `التحليل غير متوفر لولاية ${wilaya} — خطأ في الـ API`,
        riskLevel: "low",
        totalBlockedAmount: totalBlocked,
        keyIssues: [],
        recommendations: [],
        oldestOrderDays: oldest,
      });
      continue;
    }

    analyses.push({
      summary: parsed.summary || `تحليل ولاية ${wilaya}`,
      riskLevel: parsed.riskLevel || "medium",
      totalBlockedAmount: parsed.totalBlockedAmount ?? totalBlocked,
      keyIssues: Array.isArray(parsed.keyIssues) ? parsed.keyIssues : [],
      recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : [],
      oldestOrderDays: parsed.oldestOrderDays ?? oldest,
    });
  }

  // Global analysis across all wilayas
  if (Object.keys(byWilaya).length > 1) {
    const totalAll = orders.reduce((s, o) => s + o.montant, 0);
    const oldestAll = Math.max(...orders.map((o) => daysSince(o.createdAt)));

    const prompt = `أنت محلل لوجستي لشركة Noest Express.

حلل التحليل العام لـ ${orders.length} طلبات معلقة (suspendues):

حسب الولاية:
${Object.entries(byWilaya)
  .map(
    ([w, os]) =>
      `- ${w}: ${os.length} طلب(ات)، ${os.reduce((s, o) => s + o.montant, 0)} DA محجوزة`
  )
  .join("\n")}

حسب العميل (الأكثر):
${Object.entries(byClient)
  .sort(([, a], [, b]) => b.length - a.length)
  .slice(0, 5)
  .map(([c, os]) => `- ${c}: ${os.length} طلب(ات)`)
  .join("\n")}

المبلغ الإجمالي المحجوز: ${totalAll} DA
أقدم طلب منذ: ${oldestAll} يوم

أجب فقط بصيغة JSON (بدون أي نص قبله أو بعده). اكتب محتوى summary و keyIssues و recommendations باللغة العربية:
{
  "summary": "ملخص عام للوضعية",
  "riskLevel": "low|medium|high",
  "totalBlockedAmount": ${totalAll},
  "keyIssues": ["مشكلة 1", "مشكلة 2"],
  "recommendations": ["اقتراح 1", "اقتراح 2"],
  "oldestOrderDays": ${oldestAll}
}`;

    const parsed = await callGroq(apiKey, prompt);
    if (parsed) {
      analyses.push({
        summary: parsed.summary || "تحليل عام",
        riskLevel: parsed.riskLevel || "medium",
        totalBlockedAmount: parsed.totalBlockedAmount ?? totalAll,
        keyIssues: Array.isArray(parsed.keyIssues) ? parsed.keyIssues : [],
        recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : [],
        oldestOrderDays: parsed.oldestOrderDays ?? oldestAll,
      });
    } else {
      console.warn("Global Groq analysis failed");
    }
  }

  return analyses;
}

export async function analyzeNonEncaisseOrders(
  orders: NonEncaisseOrder[],
  totalAmount: number
): Promise<AiAnalysis | null> {
  const apiKey = GROQ_API_KEY();
  if (!apiKey || orders.length === 0) {
    return null;
  }

  const byWilaya = groupBy(orders, (o) => o.wilaya || "Inconnue");
  const oldest = Math.max(...orders.map((o) => daysSince(o.livredAt)));

  const prompt = `أنت محلل مالي لشركة Noest Express لتوصيل الطرود في الجزائر.

حلل هذه الطلبات التي تم توصيلها ولكن لم يتم تحصيلها (livré non encaissé):

إجمالي المبلغ غير المحصل: ${totalAmount} DA
عدد الطلبات: ${orders.length}
أقدم طلب منذ: ${oldest} يوم

حسب الولاية:
${Object.entries(byWilaya)
  .map(
    ([w, os]) =>
      `- ${w}: ${os.length} طلب(ات)، ${os.reduce((s, o) => s + o.montant, 0)} DA`
  )
  .join("\n")}

حسب عدد المحاولات (أعلى 5):
${[...orders]
  .sort((a, b) => b.nbrTentatives - a.nbrTentatives)
  .slice(0, 5)
  .map((o) => `- ${o.tracking}: ${o.nbrTentatives} محاولة(ات)، ${o.client}`)
  .join("\n")}

أجب فقط بصيغة JSON بهذا الشكل الدقيق (بدون أي نص قبله أو بعده). اكتب محتوى summary و keyIssues و recommendations باللغة العربية:
{
  "summary": "ملخص وضعية التحصيل في جملة أو جملتين",
  "riskLevel": "low|medium|high",
  "totalBlockedAmount": ${totalAmount},
  "keyIssues": ["مشكلة 1", "مشكلة 2"],
  "recommendations": ["اقتراح 1", "اقتراح 2"],
  "oldestOrderDays": ${oldest}
}`;

  const parsed = await callGroq(apiKey, prompt);
  if (!parsed) {
    return null;
  }

  return {
    summary: parsed.summary || "تحليل الطلبات غير المحصلة",
    riskLevel: parsed.riskLevel || "medium",
    totalBlockedAmount: parsed.totalBlockedAmount ?? totalAmount,
    keyIssues: Array.isArray(parsed.keyIssues) ? parsed.keyIssues : [],
    recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : [],
    oldestOrderDays: parsed.oldestOrderDays ?? oldest,
  };
}
