/**
 * The common Provider Connector interface (Chapter 13). Every connector,
 * regardless of provider type, implements exactly this shape. The rest of
 * the Falcon core (order flow, service mapping, sync jobs, monitoring) only
 * ever talks to these methods — never to a provider's raw API directly.
 */
export interface ProviderConnector {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  testConnection(): Promise<ConnectionTestResult>;
  getServices(): Promise<ConnectorService[]>;
  submitOrder(input: SubmitOrderInput): Promise<SubmitOrderResult>;
  checkOrderStatus(providerOrderId: string): Promise<OrderStatusResult>;
  cancelOrder(providerOrderId: string): Promise<CancelOrderResult>;
  getBalance(): Promise<BalanceResult>;
  syncServices(): Promise<SyncServicesResult>;
}

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
};

export type SubmitOrderInput = {
  providerServiceId: string;
  fieldValues: Record<string, string>;
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
