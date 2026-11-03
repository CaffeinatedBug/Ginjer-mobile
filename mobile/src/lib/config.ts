import { z } from "zod";
export const DEV_URL = "https://devapi.ginjer.io/graphql";
export const PROD_URL = "https://prodapi.ginjer.io/graphql";
export function validateConfig(url: string | undefined, development: boolean) {
  const endpoint = z
    .enum([DEV_URL, PROD_URL])
    .parse(url ?? (development ? DEV_URL : PROD_URL));
  if (!development && endpoint !== PROD_URL)
    throw new Error("Release builds require production API");
  return endpoint;
}
export const API_URL = validateConfig(
  process.env.EXPO_PUBLIC_GINJER_API_URL,
  __DEV__,
);
// Accounts and live telemetry currently run on devapi, while the LoRaWAN
// downlink dispatcher is hosted on production.
export const DOWNLINK_API_URL = PROD_URL;
// Foreground device views refresh from Ginjer every 20 seconds.
export const POLL_INTERVAL_MS = 20_000;
export const ONLINE_THRESHOLD_MS = 24 * 60 * 60 * 1000;
export const REQUEST_TIMEOUT_MS = 20_000;
