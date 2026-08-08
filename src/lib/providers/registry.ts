import "server-only";
import type { Provider } from "@/generated/prisma/client";
import { ProviderType } from "@/generated/prisma/client";
import type { ProviderConnector } from "./types";
import { GenericJsonConnector } from "./generic-json-connector";
import { PhpQueryConnector } from "./php-query-connector";
import { XmlConnector } from "./xml-connector";
import { DhruFusionConnector } from "./dhru-fusion-connector";
import { WebXConnector } from "./webx-connector";
import { GsmThemeConnector } from "./gsm-theme-connector";
import { FalconConnector } from "./falcon-connector";
import { decryptSecret } from "@/lib/security/encryption";

/**
 * The single place that knows which connector class implements which
 * provider type. Per the Global Rule, adding a new provider type means
 * adding one class + one case here - nothing else in the app should ever
 * need to change. Decrypting secrets (Chapter 19) here, once, for the same
 * reason: no connector subclass ever needs to know encryption exists.
 */
export function getProviderConnector(provider: Provider): ProviderConnector {
  const decrypted: Provider = {
    ...provider,
    apiKey: provider.apiKey ? decryptSecret(provider.apiKey) : provider.apiKey,
    apiSecret: provider.apiSecret ? decryptSecret(provider.apiSecret) : provider.apiSecret,
    token: provider.token ? decryptSecret(provider.token) : provider.token,
  };

  switch (decrypted.type) {
    case ProviderType.DHRU_FUSION:
      return new DhruFusionConnector(decrypted);
    case ProviderType.PHP_API:
      return new PhpQueryConnector(decrypted);
    case ProviderType.XML_API:
      return new XmlConnector(decrypted);
    case ProviderType.WEBX:
      return new WebXConnector(decrypted);
    case ProviderType.GSM_THEME:
      return new GsmThemeConnector(decrypted);
    case ProviderType.FALCON:
      return new FalconConnector(decrypted);
    case ProviderType.REST_API:
    case ProviderType.JSON_API:
    case ProviderType.CUSTOM_API:
      return new GenericJsonConnector(decrypted);
  }
}
