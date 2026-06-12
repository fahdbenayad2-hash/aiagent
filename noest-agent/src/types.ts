export interface EnExpedition {
  versHub: number;
  enHub: number;
}

export interface Retours {
  chezStation: number;
  chezHubCentral: number;
  prepares: number;
  enTransit: number;
}

export interface NavbarSnapshot {
  colisPrets: number;
  enTraitement: number;
  enExpedition: EnExpedition;
  enLivraison: number;
  suspendus: number;
  retours: Retours;
}

export interface Snapshot {
  date: string;
  navbarCounts: NavbarSnapshot;
}
