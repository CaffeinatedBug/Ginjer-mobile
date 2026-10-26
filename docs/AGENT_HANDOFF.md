# Ginjer native port — continuation handoff

## Project state

This repository ports the Figma Make web prototype into the Expo SDK 58 native app in `mobile/`. The web source is preserved read-only at `reference/web-prototype/`; do not use it as a build input. The active native app uses React Navigation, TypeScript strict mode, TanStack Query, Zustand, SecureStore, AsyncStorage, react-hook-form, Zod, React Native Maps, and Jest Expo.

The working tree is intentionally uncommitted. Preserve all changes; do not reset, check out, or delete files. `docs/PROGRESS.md` is the running checkpoint, `docs/DECISIONS.md` records API conclusions, `docs/DEFECTS.md` records unresolved acceptance blockers, and `docs/MANUAL_QA.md` is the physical Android test plan.

## Source of truth

1. `reference/web-prototype/src/{App.tsx,api/ginjer.ts,components/GoogleMap.tsx,index.css}` controls behavior and visual intent.
2. `docs/api/Ginjer.sanitized.postman_collection.json` and `docs/api-captures/{schema.json,introspection.json}` control API contract.
3. `Ginjer-frames/` is secondary visual reference.

Do not restore credentials, JWTs, demo data, fallback coordinates, prototype Busylight assumptions, or hardcoded profile data. The original collection and prototype are gitignored because they may contain secrets. Test credentials exist only in untracked root `.env.local` as `GINJER_TEST_EMAIL` and `GINJER_TEST_PASSWORD`.

## Implemented and wired

- Root application: `mobile/App.tsx` loads Roboto and splash screen, restores SecureStore session, shows offline status, error recovery, native stack, and Devices/Locations/Analytics/Profile tabs. Tab-root Back behavior is set to exit.
- Session/API: `mobile/src/lib/{graphql,session,workspace,workspaceWrite,repository,contracts,config}.ts` provides raw-token GraphQL transport, runtime Zod validation, typed errors, request timeout, expiry logout, query cancellation, secure session persistence, and guarded workspace persistence.
- Auth/profile: real sign-in, discovered `signUp` and `updateUserProfile` adapters, validation, profile fields, dirty discard confirmation, logout confirmation, initials/avatar fallback.
- Organisation/projects/devices: real query sheets with loading/error/empty/search states; device search, status derivation, refresh, FlatList layout/scroll restoration, deleted-device filtering, and generic/hardware-aware artwork.
- Device enrollment: Devices exposes Add device. The route uses discovered `hardwareList`, `networkList`, `clusters`, modules, and the real `saveDevice` mutation; it validates required configuration/attribute/location input, offers only loaded choices or manual verified IDs, requires a final confirmation, invalidates device/project data after success, and does not retry.
- Device details/downlink: real details/outputs/attributes and generic send-downlink module/value flow. Downlinks are never retried; the app persists an uncertain-delivery lock and requires explicit physical reconciliation.
- Uplink/locations/notifications/analytics: focused/foreground polling, stale timestamps, device map with pure JS clustering, local event snapshots in AsyncStorage, read state, and analytics derived only from returned counts/timestamps/numeric attributes.
- Shared UI: safe-area screen/header/buttons/fields/sheets/snackbar/skeleton/empty state/icons, accessibility metadata, reduce-motion handling, and small-screen sheet sizing.
- Release/tooling: Android app metadata, Ginjer assets/splash, `eas.json` preview APK + production AAB profiles, environment-only Android Maps config in `app.config.js`, ESLint including React Native a11y rules, Prettier, test setup, and sanitized live-smoke script.

## Verified evidence

All commands below were executed from `mobile/` on 2026-10-30 after `npm ci`:

```powershell
npm run lint                         # pass, no warnings
npx prettier --check App.tsx src tests app.json app.config.js eas.json eslint.config.js package.json  # pass
npm run typecheck                    # pass
npm test -- --watch=false            # 11 suites, 31 tests pass
npx expo-doctor                      # 20/20 checks pass
npx expo install --check             # dependencies up to date
npx expo export --platform android   # pass; 3.5 MB Hermes bundle
npm audit --audit-level=high         # exit 0; 14 low transitive findings remain
```

`python mobile/scripts/live-read-smoke.py` was executed from the repository root with untracked credentials. Sanitized output in `docs/api-captures/live-read-smoke.json` verifies valid sign-in field types, bad-password rejection, invalid-token rejection, one active accepted organisation, one project, 103 downlink interfaces, hardware list (142 records), network list (7 records), and zero devices. The discovered cluster-list call returned `INTERNAL_SERVER_ERROR`. It does not verify telemetry shapes, map coordinates, a real registration, real downlinks, sign-up, or profile mutation.

After the enrollment addition, targeted changed-file ESLint and `npm run typecheck` pass; `npx jest tests/device.enrollment.test.ts --runInBand --watch=false --verbose` passes (1 suite, 2 tests). The immediately preceding full gate is recorded in `PROGRESS.md`; rerun the full gate once an operator has supplied the actual device configuration.

`CI=1 npx expo start --lan --non-interactive` reached Metro's waiting state and was stopped; this verifies the bundler starts, not that Expo Go launched on a device.

Credential/fabrication scan completed with zero files containing the old prototype email, JWT-like values, fallback coordinates, demo mode, download-code UI, or sample-avatar name in native source/tests/docs.

## Not implemented or not accepted

These items block completion. Do not claim production readiness until they are closed.

| Blocker | Why it remains | Exact next action |
|---|---|---|
| `LIVE-01` / `DEVICE-CTRL-01` | Current authorized account has zero devices, so no telemetry shape, map location, generic command, main-output toggle, or colour payload can be observed. | Add a designated dev device; obtain its name and safe values; discover exact output-to-module mapping; run one authorized command, observe the result and next poll, then implement/test toggle and colour with rollback. |
| `DEVICE-ENROLL-01` | Cluster lookup currently returns an internal server error, and no authorized record creation has been performed. | Get a verified cluster ID from the device operator (manual entry is supported), then register exactly one designated dev device and verify it appears after reload. |
| `QA-01` / `QA-02` | No end-to-end live walkthrough or physical Android passes. | Execute every checklist item in `docs/MANUAL_QA.md` twice, log factual results in `docs/QA_RESULTS.md`, fix defects, and repeat. |
| `RELEASE-01` / `MAP-01` | EAS is not authenticated and no restricted Android Maps key/signing SHA-1 is available. | Authenticate EAS; set `GOOGLE_MAPS_ANDROID_API_KEY` as an EAS secret, restricted to `io.senra.ginjer` and signing SHA-1; build preview APK; install and cold-launch it. |
| `SCALE-01` | Verified `ParamInput` has no device filter or pagination. Full detail queries are project-wide. | Obtain backend pagination/filter support or document a bounded supported device scale after real measurements. |
| `PERF-01` | No Android device/emulator or `adb` was available. | Measure launch, interaction, memory and polling behavior with the manual QA instructions. |

The device details screen intentionally does **not** fake the prototype's main-output toggle and colour picker. The GraphQL API exposes modules but does not establish which controller values or downlink interface belong to any output; guessing would violate the no-fabrication requirement.

## Important technical decisions

- API sends raw `authorization` token, never `Bearer`.
- Development defaults to `https://devapi.ginjer.io/graphql`; preview/production profiles use production URL.
- Sign-in uses `application: "Ginjer"` and `forever: true`.
- The dev API signals a bad password as `INTERNAL_SERVER_ERROR` at `path: ["signIn"]`, with message indicators `invalid` and `password`. Only that exact observed shape maps to an auth error.
- Lightweight device poll interval is 30 seconds; details are fetched only where needed. Polling stops when unfocused/backgrounded.
- Timestamp status threshold is provisionally 24h. It needs live device confirmation.
- `@expo/cli` has a scoped Zod 4 override to remove a high advisory. It passed Doctor, dependency check, export, tests, and LAN startup, but Expo upstream declares Zod 3. Monitor it when updating Expo.

## First commands for the next agent

```powershell
Set-Location D:\Projects\Ginjer
Get-Content docs\PROGRESS.md
Get-Content docs\DEFECTS.md
Get-Content docs\AGENT_HANDOFF.md
git status --short
Set-Location mobile
npm ci
npm run lint
npm run typecheck
npm test -- --watch=false
npx expo-doctor
npx expo export --platform android
```

Then work from the blocker table. Update `docs/PROGRESS.md`, `docs/DEFECTS.md`, `docs/DECISIONS.md`, `docs/API_COVERAGE.md`, and `docs/SCREEN_TRACEABILITY.md` with executed evidence after each verified milestone.
