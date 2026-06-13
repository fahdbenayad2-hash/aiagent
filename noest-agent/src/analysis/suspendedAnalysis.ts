import { SuspendedOrder, SuiviEntry, SuspendedDetails } from "../types.js";

export function buildSuspendedDetails(
  orders: SuspendedOrder[],
  suiviMap: Record<string, SuiviEntry[]>
): SuspendedDetails {
  const totalAmount = orders.reduce((sum, o) => sum + o.montant, 0);

  return {
    orders,
    suiviMap,
    totalAmount,
    orderCount: orders.length,
  };
}
