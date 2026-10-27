# Verified implementation progress

## Completed milestones

- Step 0: inventoried the supplied web prototype, 13 frames, API collection, package managers and assets in `INVENTORY.md`, `ASSETS.md`, `SCREEN_TRACEABILITY.md` and `API_COVERAGE.md`.
- Created the separate npm Expo SDK 58 TypeScript scaffold in `mobile/`, shared contracts, runtime response schemas, API repository, theme, UI primitives and navigation types. The source prototype remains at `reference/web-prototype/`.
- Captured dev GraphQL schema and authenticated read smoke with sanitized results in `docs/api-captures/`; the account returned zero devices.

## Implemented and locally verified

- Authenticated native navigation, four tabs, device details route, edit profile, notifications and organisation/project sheets are now wired in `mobile/App.tsx`. These are not accepted on Android until physical QA.
- Auth and profile API adapters, device queries/details, downlink interface selection with persistent uncertain-command lock and explicit reconciliation, polling-derived event feed, map, and real-data analytics are implemented. Live device and command behavior remains unverified because the test account returned no devices.
- Device enrollment is now wired through the schema-discovered real `saveDevice` mutation: Devices has an Add device button; the screen loads hardware/network/output choices, allows only explicitly entered or chosen configuration IDs, validates attributes/location, requires a final confirmation, invalidates dependent data on success, and never retries a registration mutation. The cluster backend call currently fails, so the screen makes that limitation visible and accepts a verified manual cluster ID.
- The full feature navigation and all scoped feature files are integrated. The independent audit fixes cover deleted-device filtering, cached data after failed refetches, Android tab-root Back behavior, session/logout and workspace-selection races, and static a11y lint rules.

## Modified files in current working tree

- Existing uncommitted feature files under `mobile/src/features/`, `mobile/src/assets/`, `mobile/tests/`; existing edits to `mobile/package.json`, lockfile, session and shared primitives, icon assets.
- This checkpoint edited `mobile/src/features/devices/{DevicesScreen,AddDeviceScreen,api}.ts(x)`, `mobile/src/lib/{contracts,operations}.ts`, `mobile/App.tsx`, navigation types, enrollment tests and this file.
- Integration also changed `mobile/App.tsx`, `mobile/src/lib/{graphql,session,workspace}.ts`, navigation types, feature files, tests, app assets/config, `docs/DECISIONS.md`, API capture and QA docs. `git status --short` is the authoritative full file list until staged.

## Executed commands and observed results (2026-10-30)

- Final clean-install gate on 2026-10-30: `npm ci` completed; `npm run lint`, `npm run typecheck`, `npm test -- --watch=false` (11 suites / 31 tests), `npx expo-doctor` (20/20), `npx expo install --check`, `npx expo export --platform android` (3.5 MB Hermes bundle), and `npm audit --audit-level=high` all exited 0. `npx prettier --check App.tsx src tests app.json app.config.js eas.json eslint.config.js package.json` also passes after formatting.
- `CI=1 npx expo start --lan --non-interactive` reached Metro's waiting state and was stopped intentionally. This proves the LAN bundler starts; it is not Android Expo Go verification.
- `python mobile/scripts/live-read-smoke.py` run from the repository root with untracked test credentials: valid sign-in (all expected returned field types), invalid token rejection, one active accepted org, one project, 103 downlink interfaces, and zero-device list/detail reads passed; bad password was rejected. Sanitized results are in `docs/api-captures/live-read-smoke.json`.
- Device-enrollment discovery extended the authenticated smoke to `hardwareList` (142 records) and `networkList` (7 records); the cluster read returned `INTERNAL_SERVER_ERROR`. `cmd /c "npx jest tests/device.enrollment.test.ts --runInBand --watch=false --verbose"` passed (1 suite, 2 tests). No real SaveDevice mutation was dispatched.
- After the enrollment route was added, targeted changed-file ESLint completed with no output (exit 0) and `npm run typecheck` passed. The full lint/test/export gate recorded above predates this small route addition and must be repeated before a release claim; this is intentionally not represented as a fresh full acceptance pass.
- Expo connection diagnosis: `npx expo start --lan --port 8082` completed its cold-cache bundle and displayed `exp://10.129.200.189:8082`. The initial rebuild took roughly one minute. Tunnel mode repeatedly reported `Tunnel URL not found` and fell back to LAN because the host has networking disabled. Local socket probes were denied; elevation showed the active `Narzo 70 Pro 33` connection was unidentified and adding a narrow inbound firewall rule failed with `Access is denied`. Added `npm run start:lan` for a stable port and recorded the required Administrator rule in `MANUAL_QA.md` and `DEFECTS.md`.
- Expo Go was subsequently confirmed working by the user. Fixed the React Native LogBox `Text strings must be rendered within a <Text>` defect by removing two literal whitespace children from the organisation/project sheets. Replaced Edit Profile's separate organisation copy/button with an outlined, accessible Organization field that opens the existing bottom sheet. Locations now renders native map tiles even with no device coordinates and labels the absence of markers without adding a fabricated map center. `GOOGLE_MAPS_ANDROID_API_KEY` and `GOOGLE_MAPS_API_KEY` are both supported by `app.config.js`; neither key was present in inspected environment files/process environment. Post-change `npm run typecheck`, targeted ESLint, `npx expo config --type public`, `git diff --check`, and `tests/locations.clusters.test.ts` passed.
- User supplied `GOOGLE_MAPS_API_KEY` in the repository-root untracked `.env.local`. `app.config.js` now resolves either Maps variable from the process environment, `mobile/.env.local`, or the root local file without logging the value; a direct configuration assertion confirmed the key resolves. The first Android export was blocked only by this tool sandbox's temporary Hermes-file permission. The approved unsandboxed rerun completed: `npx expo export --platform android` bundled 1,264 modules and exported the Android Hermes bundle (3.6 MB) to `mobile/dist`.
- Final Maps-key checkpoint: `git check-ignore` confirms the root `.env.local` is ignored; `npm run typecheck` and targeted ESLint for the configuration, Locations, Profile, Organisation and Project files passed after the configuration change.

## Outstanding defects and dependencies

- `docs/DEFECTS.md` contains all current release blockers. Full navigation, visual and functional integration, broader tests, Android export and clean checkout verification remain.
- Live device, downlink, telemetry, maps, EAS APK and physical phone acceptance have no verified result. The authenticated test account currently has zero devices. A designated device and permitted downlink values are needed before a live command.
- `npm audit --audit-level=high` is clean through the tested scoped Zod override. The remaining audit output reports 14 low transitive findings; the offered fix would downgrade Expo to SDK 51 and was not applied.

## Next exact implementation steps

The CTO's expanded scope and next-session priorities are mapped in `docs/HACKATHON_PLAN.md`. Its acceptance matrix supersedes the narrow ordering below, while the original release criteria remain applicable.

1. Obtain an authorized device configuration (DevEUI, hardware/network/cluster/main-output IDs and attributes); use Add device once, verify its list/detail reload, then run the documented live downlink, telemetry, map, notification and analytics matrix.
2. Set the restricted Android Google Maps key in EAS, authenticate EAS, build the preview APK, install it, and run cold-launch/map/session checks.
3. Complete two physical Android QA passes from `docs/MANUAL_QA.md`, record results in `docs/QA_RESULTS.md`, and resolve every resulting defect.
