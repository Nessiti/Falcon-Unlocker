-- DHRU Fusion Pro's modern reseller API (REST + JSON + Bearer token) is a
-- different protocol from the legacy DHRU_FUSION panel API, so it gets its
-- own provider type rather than overloading the existing one.
ALTER TYPE "ProviderType" ADD VALUE 'DHRU_PRO';
