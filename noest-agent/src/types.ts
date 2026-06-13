// NotificationsResponse — mirrors every field from POST /get/notifications
// Some fields (recouvres, cheque_encours, desaccord) are optional: the API
// omits them when their value is 0, and they appear only when non-zero.
export interface NotificationsResponse {
  p_a_expedier: number;
  p_a_preparer: number;
  en_preparation: number;
  en_ramassage: number;
  en_transit: number;
  vers_hub: number;
  en_hub: number;
  en_livraison: number;
  suspendus: number;
  retours_chez_station: number;
  retours_hub_central: number;
  retour_en_transit_stock: number;
  retour_recu: number;
  livre_non_encaisse: number;
  livre_encaisse: number;
  recouvrements: number;
  recouvres?: number;
  cheque_encours?: number;
  desaccord?: number;
  a_supprimer?: number;
  modif_request?: number;
}

// DashboardSnapshot — organised by operational domain
export interface DashboardSnapshot {
  date: string;

  pipeline: {
    aExpedier: number;
    aPreparer: number;
    enPreparation: number;
    enRamassage: number;
    enTraitement: number;
    versHub: number;
    enHub: number;
    enLivraison: number;
  };

  problemes: {
    suspendus: number;
    desaccord: number;
  };

  retours: {
    chezStation: number;
    chezHubCentral: number;
    enTransitStock: number;
    recu: number;
  };

  finance: {
    livreNonEncaisse: number;
    livreEncaisse: number;
    recouvrements: number;
    recouvres: number;
    chequeEncours: number;
  };
}

// FlatMetrics — dotted keys for analysis, e.g. "pipeline.aPreparer"
export type FlatMetrics = Record<string, number>;

export interface SnapshotWithDeltas {
  date: string;
  current: DashboardSnapshot;
  flatMetrics: FlatMetrics;
  deltaVsYesterday: FlatMetrics;
  deltaVs7dAvg: FlatMetrics;
  alerts: string[];
}

// Backward-compatible Phase 0 types (kept for the JSON output structure)
export interface NavbarSnapshot {
  colisPrets: number;
  enTraitement: number;
  enExpedition: {
    versHub: number;
    enHub: number;
  };
  enLivraison: number;
  suspendus: number;
  retours: {
    chezStation: number;
    chezHubCentral: number;
    prepares: number;
    enTransit: number;
  };
}

export interface Snapshot {
  date: string;
  notificationsApi: NotificationsResponse;
  navbarCounts: NavbarSnapshot;
  dashboard: DashboardSnapshot;
  flatMetrics: FlatMetrics;
  deltaVsYesterday: FlatMetrics;
  deltaVs7dAvg: FlatMetrics;
  alerts: string[];
  suspendedDetails: SuspendedDetails | null;
  analyses: AiAnalysis[];
}

// Alert rule
export interface AlertRule {
  id: string;
  description: string;
  severity: "🔴" | "🟡" | "ℹ️";
  check: (
    current: FlatMetrics,
    deltas: { vsYesterday: FlatMetrics; vs7dAvg: FlatMetrics }
  ) => string | null;
}

// Phase 2 — Suspended orders
export interface SuspendedOrder {
  tracking: string;
  client: string;
  montant: number;
  dateColis: string;
  statut: string;
  ville: string;
  wilaya: string;
  totalPercu: number;
  aPercu: number;
}

export interface SuiviEntry {
  date: string;
  text: string;
  location: string;
}

export interface SuspendedDetails {
  orders: SuspendedOrder[];
  suiviMap: Record<string, SuiviEntry[]>;
  totalAmount: number;
  orderCount: number;
}

export interface AiAnalysis {
  summary: string;
  riskLevel: "low" | "medium" | "high";
  totalBlockedAmount: number;
  keyIssues: string[];
  recommendations: string[];
  oldestOrderDays: number;
}

// Phase 2 fields on Snapshot
export interface Phase2Data {
  suspendedDetails: SuspendedDetails | null;
  analyses: AiAnalysis[];
}
