/**
 * The common Provider Connector interface (Chapter 13). Every connector,
 * regardless of provider type, implements exactly this shape. The rest of
 * the Falcon core (order flow, service mapping, sync jobs, monitoring) only
 * ever talks to these methods - never to a provider's raw API directly.
 */
export interface ProviderConnector {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  testConnection(): Promise<ConnectionTestResult>;
  getServices(): Promise<ConnectorService[]>;
  submitOrder(input: SubmitOrderInput): Promise<SubmitOrderResult>;
  checkOrderStatus(providerOrderId: string, kind: OrderKind): Promise<OrderStatusResult>;
  cancelOrder(providerOrderId: string, kind: OrderKind): Promise<CancelOrderResult>;
  getBalance(): Promise<BalanceResult>;
  syncServices(): Promise<SyncServicesResult>;
}

/**
 * "IMEI" | "SERVER" - matches the convention used everywhere else in the app
 * (OrderQueueEntry.kind, admin-orders.ts, admin-service-mappings.ts). Some
 * provider APIs (WebX) have genuinely separate endpoints per order kind, so
 * it's threaded through the connector interface rather than each connector
 * guessing it from providerServiceId.
 */
export type OrderKind = "IMEI" | "SERVER";

/**
 * API Logs (Chapter 17): tags every fetchWithTimeout call with which
 * connector method it came from, so a logged request can be safely retried
 * by re-invoking the same method rather than raw-replaying stored bytes.
 */
export type ApiLogOperation =
  | "testConnection"
  | "getBalance"
  | "getServices"
  | "submitOrder"
  | "checkOrderStatus"
  | "cancelOrder";

export type ConnectionTestResult = {
  success: boolean;
  responseTimeMs: number;
  statusCode: number | null;
  errorMessage: string | null;
};

export type ConnectorService = {
  providerServiceId: string;
  name: string;
  priceCents: number | null;
  estimatedTime: string | null;
  category: string | null;
  /**
   * Which of Falcon's two order rails this provider service belongs to, when
   * the provider says so. Panels that publish IMEI and Server services in one
   * catalog (Falcon, GSM Theme) tag each group; WebX serves them from separate
   * endpoints, so it knows too. `null` means the provider gave no signal -
   * never assume, because a service mapped to the wrong rail submits through
   * the wrong code path and the order fails at the provider, not here.
   */
  kind: OrderKind | null;
};

export type SubmitOrderInput = {
  providerServiceId: string;
  fieldValues: Record<string, string>;
  kind: OrderKind;
};

export type SubmitOrderResult =
  | { ok: true; providerOrderId: string }
  | { ok: false; error: string };

export type ConnectorOrderStatus =
  | "PENDING"
  | "PROCESSING"
  | "COMPLETED"
  | "REJECTED"
  | "CANCELLED";

export type OrderStatusResult =
  | { ok: true; status: ConnectorOrderStatus; result: string | null }
  | { ok: false; error: string };

export type CancelOrderResult = { ok: true } | { ok: false; error: string };

export type BalanceResult = { ok: true; balanceCents: number } | { ok: false; error: string };

export type SyncServicesResult =
  | { ok: true; services: ConnectorService[] }
  | { ok: false; error: string };
