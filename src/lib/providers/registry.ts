import "server-only";
import type { Provider } from "@/generated/prisma/client";
import { ProviderType } from "@/generated/prisma/client";
import type { ProviderConnector } from "./types";
import { GenericJsonConnector } from "./generic-json-connector";
import { PhpQueryConnector } from "./php-query-connector";
import { XmlConnector } from "./xml-connector";
import { DhruFusionConnector } from "./dhru-fusion-connector";

/**
 * The single place that knows which connector class implements which
 * provider type. Per the Global Rule, adding a new provider type means
 * adding one class + one case here — nothing else in the app should ever
 * need to change.
 */
export function getProviderConnector(provider: Provider): ProviderConnector {
  switch (provider.type) {
    case ProviderType.DHRU_FUSION:
      return new DhruFusionConnector(provider);
    case ProviderType.PHP_API:
      return new PhpQueryConnector(provider);
    case ProviderType.XML_API:
      return new XmlConnector(provider);
    case ProviderType.REST_API:
    case ProviderType.JSON_API:
    case ProviderType.CUSTOM_API:
      return new GenericJsonConnector(provider);
  }
}
