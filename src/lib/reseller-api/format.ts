import { OrderStatus } from "@/generated/prisma/client";

export const API_VERSION = "1.0";

/** DHRU/GSM Theme status codes: 0 Waiting Action, 1 In Process, 3 Rejected, 4 Success. */
export function toDhruStatus(status: OrderStatus): number {
  switch (status) {
    case OrderStatus.PENDING:
    case OrderStatus.CHECKING:
      return 0;
    case OrderStatus.PROCESSING:
      return 1;
    case OrderStatus.COMPLETED:
      return 4;
    case OrderStatus.REJECTED:
    case OrderStatus.CANCELLED:
      return 3;
    default:
      return 0;
  }
}

export function successEnvelope(payload: Record<string, unknown>) {
  return { SUCCESS: [payload], apiversion: API_VERSION };
}

export function errorEnvelope(message: string) {
  return { ERROR: [{ MESSAGE: message }], apiversion: API_VERSION };
}
