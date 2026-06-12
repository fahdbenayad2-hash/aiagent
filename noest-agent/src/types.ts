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
  recouvres: number;
  cheque_encours: number;
  desaccord: number;
}

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
}
