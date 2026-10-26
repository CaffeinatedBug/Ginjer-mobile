# Handoffs

Lead serial reconnaissance/scaffold in progress. Fan-out begins only after doctor/lint/typecheck gate passes. Four concurrency slots mean the ten requested roles will be grouped into sequential batches with explicit ownership.

- Platform to Lead (2026-10-30): `app.json` now uses Ginjer branding and provisional Android package `io.senra.ginjer`; confirm package ownership before store submission. `app.config.js` injects a Google Maps key only from `GOOGLE_MAPS_ANDROID_API_KEY`; no key is stored in the repository. EAS preview/production profiles target production GraphQL. `npm audit` remains blocked by Expo CLI's nested Zod 3 advisory; see SEC-01.

- 2026-10-30 locations/notifications -> Lead: call resetEventMemory() from src/features/notifications/store.ts during lib/session.ts logout after AsyncStorage cleanup. In-memory feed otherwise survives account switch in same process; storage scope itself is user-scoped.
- 2026-10-30 downlink -> Lead: no available test device or controller payload specification exists in the authenticated account. The adapter sends the collection's `{value: number|string}` object, but main-output mapping, colour encoding and physical outcome are unverified. No live command was sent. A designated device, permitted command values and observed response/telemetry are needed before classifying this feature as accepted.
