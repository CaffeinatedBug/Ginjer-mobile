# Hackathon.md: Ginjer Mobile (Expo Go) build brief

## 0. Mission

You are the lead of a build team finishing the Ginjer Mobile app (React Native, Expo, Android, SenRa IoT). It is a hackathon MVP judged on **working features**. Implement every item below that is in scope, run it for real in Expo Go, and debug until it works. Do not stop at "mostly working". Do not hide behind unverified claims: every "done" needs evidence (command output, passing test, or a written manual check).

Existing work is already in the repo. Before changing anything:
1. Read `docs/PROGRESS.md`, `docs/DEFECTS.md`, `docs/DECISIONS.md`, `docs/API_COVERAGE.md`.
2. Run `git status` and preserve the dirty worktree. Do not revert or rewrite code that already works.
3. Inspect `docs/api-captures/schema.json` (the captured GraphQL schema). It contains operations beyond the Postman collection, such as `automationRuns`, `deviceHistoricalData` and alert operations. This schema is the main source of extra API capability, since the Postman collection is the only other thing we have.

## 1. Locked decisions (from the owner; do not reopen)

1. **Expo Go only.** The app must always run in Expo Go on a physical Android phone with `npx expo start --lan`. No custom native modules, no prebuild-only config plugins, no development build. Check the docs for the installed SDK before adding any package.
2. **No push notifications.** In-app notifications are enough. "Banner notifications" means an in-app banner shown while the app is open.
3. **Automation Panel is built natively**, modeled on the panel designs in the Figma section `Ginjer Mobile App 2.5 with Web App Snapshots` (see section 5). No WebView.
4. **Target: all 6 must-haves + at least 7 of the 8 good-to-haves + 2 to 3 delighters.** Basic WhatsApp (Meta API) is the one planned deferral. 7 of 8 is accepted.
5. **We only have the Postman collection and the schema.** No extra credentials, device lists, GIF assets or web URLs will be supplied. Discover everything else from the schema and live read-only probes. When something is ambiguous, make a confident best guess, record it in `docs/DECISIONS.md`, and keep building. Do not stop to ask, except for missing test credentials (ask once, then continue with work that doesn't need them).
6. **Hackathon MVP: working features first, security is not the first concern.** You may send live downlinks to any device in the dev project that the owner's test account can access. Do not spend time on security audits, `npm audit`, CSP or a11y audits. The one security rule that stays: never commit the real JWT, emails or passwords that appear in the Postman collection, and keep test credentials in untracked `.env.local`.
7. Where the existing code and the Figma frames differ, keep the code's version. Where there is no code for a frame, guess confidently in the same visual language. Never flag frame differences.

## 2. Operating mode: swarm

If your environment can spawn sub-agents, spawn the roster below. Otherwise run the same roles in sequence with the same boundaries.

**Step 0 (Lead only, serial):** read the docs above, run `npm ci`, typecheck, lint, tests and `npx expo-doctor`, and write down the current status per requirement in `docs/PROGRESS.md`. Fix any broken base before fan-out.

| # | Agent | Owns |
|---|---|---|
| 1 | Lead / Integrator | architecture, merges, runs the full gate after every merge, `docs/DECISIONS.md` |
| 2 | API / Schema | schema probing, adapters for new operations, `docs/API_COVERAGE.md`, test-account smoke script |
| 3 | Devices & Commands | compact/expanded list, two-tap command flow, command GIF/animation feedback |
| 4 | Notifications | in-app banner, event feed, notifications panel, routing |
| 5 | Automation | Automation Panel + Summary Panel |
| 6 | Insights | Health Check panel, Analytics, Device Summary / history charts |
| 7 | Map & Profile | map info sheet with commands, sign-up/join, profile and settings |
| 8 | Delighters | Custom Analytics, Digital Twin, Subsections (section 6) |
| 9 | QA | tests, live smoke runs, bug bash, `docs/DEFECTS.md` |

Rules: each agent edits only its own areas. Cross-boundary needs go in `docs/HANDOFFS.md`. Make small conventional commits. The Lead merges and re-runs lint, typecheck, tests and `npx expo export --platform android` after every merge. No agent may mock around a failing real call; fix the cause.

## 3. Requirements matrix and what "done" means

### Must-haves (all 6 required)

| # | Requirement | Current status | Required outcome |
|---|---|---|---|
| M1 | Sign In | Implemented, live login seen | Keep working; verify with multiple organisations and after a restart |
| M2 | Project Selection | Implemented | Verify switching projects refetches all dependent data |
| M3 | Device List (expanded + compact + manipulation) | Partial | Add compact and expanded modes (toggle persisted); expanded cards show quick commands (section 4); keep search, filters, refresh, status. Fix the enrollment cluster lookup failure |
| M4 | Device Downlinks, two taps, GIF interfacing | Partial | Two-tap command flow with animated feedback (section 4) |
| M5 | Banner Notifications with routing | Missing | In-app banner for newly observed events; tap routes to the right device (section 5) |
| M6 | Automation Panel + Summary Panel | Missing | Native panel from the Figma web snapshots, real data (section 5) |

### Good-to-haves (7 of 8 required)

| # | Requirement | Required outcome |
|---|---|---|
| G1 | Sign Up | Form works against the real sign-up operation found in the schema; includes "request to join an organisation / demo organisation" if the schema has an operation for it. If no operation exists, open the production web sign-up with `expo-web-browser` and note it |
| G2 | Profile Settings | Edit profile (real update operation if present), switch organisation and project, show project info |
| G3 | Notifications Panel | Real alert/notification feed if the schema has one; otherwise the derived event feed. Read/unread persisted |
| G4 | Health Check Panel | One panel with user-oriented health checks computed from real data (section 5) |
| G5 | Analytics | Use the real analytics operations if the schema has them; otherwise the existing derived dashboard, extended |
| G6 | Device Summary | Outputs, history chart from `deviceHistoricalData` (or the closest real operation), map |
| G7 | Map View | Info sheet with summary link, two-tap commands and routing to the device |
| G8 | Basic WhatsApp | **Deferred.** Needs Meta credentials and a backend. Optional stretch only after everything else is done: a "Share via WhatsApp" button on the Health Check panel using `Linking.openURL`. Never report this as the Meta integration |

### Delighters (pick 2 to 3, in this order; defer the rest)

1. Custom Analytics, 2. Digital Twin (state-only version), 3. Subsections. Voice commands, Advanced WhatsApp chatbot and Mobile widgets are deferred (they need native code or external backends, which conflicts with Expo Go).

## 4. Device list and two-tap commands

**List modes.** A header toggle switches Compact (name, status dot and text, last heard, one-line key value) and Expanded (adds outputs, key attributes, location, quick commands). Persist the choice in AsyncStorage.

**Two-tap command flow.** Tap 1 selects a command; tap 2 confirms and sends. Tap 1 turns the command chip into a "Confirm: <device name> <command>" state that auto-reverts after about 4 seconds. Tap 2 sends the real downlink.
- Commands come from real data: each device's `outputs` (`outputId`, `outputName`, `value`, `label`, `color`) and the `DOWNLINK_INTERFACE` module from `ModuleList`. Toggle-like outputs offer the opposite of the current value; outputs with a palette offer the real colour choices. Do not invent commands.
- Value shape: keep the existing `{ value: ... }` shape from the prototype. The first live send on the dev API is the verification. Record the result and any needed adjustment in `docs/DECISIONS.md`.
- Animated feedback ("GIF interfacing"): idle, sending, sent, uncertain/failed states as an animated graphic on the card. Use any GIF/animated assets found in `Ginjer-frames/`; otherwise build the animations with Reanimated or `lottie-react-native` (both work in Expo Go). Use `expo-image` for GIFs.
- Safety that stays because it is correctness, not security: never retry an uncertain command automatically, lock the control while a send is pending, and show the real API response message.
- The same flow is reused from the map info sheet and from Device Details.

## 5. Notifications, Automation, Health Check

**Banner notifications (M5).**
- Source of events: a real alert operation from the schema if one exists; otherwise the derived event feed (diffing polled snapshots: new uplink timestamp, or an output or attribute value changing materially).
- A root-level banner component slides in from the top with a haptic, queues multiple events, auto-dismisses after about 5 seconds, deduplicates by `deviceId + timestamp + type`, and on tap routes to that device's details.
- When the app returns from the background, run one catch-up poll and show a single summary banner ("N new events") that opens the notifications panel.
- Polling interval is a named constant (15 to 30 s). Polling pauses when the app is backgrounded or the screen is unfocused.

**Automation Panel (M6).**
- Locate the web snapshots in the Figma section `Ginjer Mobile App 2.5 with Web App Snapshots` (look in `Ginjer-frames/` or the exported frames, including the screen labelled "Automation Engine"). Rebuild that panel as native mobile screens in the app's design language. A Summary Panel sits at the top (counts such as total automations, active, last run status, failures in the last 24 h).
- Data: use `automationRuns` and any related read operations in `docs/api-captures/schema.json`. Capture exact arguments and types first with read-only probes using the test account. Everything shown must come from those responses. If the snapshots show actions (enable, disable, run now) and the schema has a clear matching mutation, implement them with the same two-tap confirm pattern; otherwise omit them.
- Entry point: a clearly visible card or tab entry; routes from notifications and the device details when an automation relates to that device.

**Health Check Panel (G4).** There is no backend definition, so derive it from real data per project: online/offline/stale device counts, devices not heard from within the threshold, low-battery or weak-signal indicators from attributes whose names match battery or signal (only when such attributes exist), and a per-device list sorted by severity. Tapping a row routes to the device. Show an honest empty state when no such data exists.

## 6. Delighters (only with real data)

- **Custom Analytics:** the user picks numeric attributes from real devices and adds them as cards or charts on a custom dashboard, persisted locally.
- **Digital Twin (state-only):** a visual panel of a device's real outputs and attributes with animated indicators (for example colour glow for colour outputs, toggle states), adjustable through the two-tap command flow. No fabricated state.
- **Subsections (Intellidrip, Airport, Dehn):** group the user's real projects whose name or description matches these keywords and show a project-specific panel from real data. If the test account has no matching project, skip it and report it.

## 7. Technical rules

- Expo managed workflow, TypeScript strict. Keep `npx expo-doctor` and `npx expo install --check` clean.
- Allowed in Expo Go (verify for the installed SDK): `react-native-svg`, `react-native-reanimated`, `lottie-react-native`, `expo-image`, `react-native-maps`, `@react-native-async-storage/async-storage`, `expo-secure-store`, `@react-native-community/netinfo`, `expo-haptics`, `expo-web-browser`.
- Charts: draw them with `react-native-svg` (line, bar, sparkline) rather than adding a heavy chart library.
- Keep the existing architecture (TanStack Query, Zustand, react-hook-form + zod, secure session, typed errors). Reuse the existing downlink service, status derivation and event-feed code.
- API: GraphQL POST to the dev endpoint by default (`https://devapi.ginjer.io/graphql`), production at `https://prodapi.ginjer.io/graphql`. The token goes in the `authorization` header, raw, with no Bearer prefix. Existing operations: SignIn, OrgList (`accounts`), ProjectList (`projectOverview`), DeviceList and DeviceDetails (`projects`), ModuleList (`modules`), SendDownlink (`sendDownlink`). Extra operations come from the captured schema; probe them read-only first and never invent fields.
- No fabricated data in production paths: every number, status, event and chart on screen comes from a real response or is derived from one. Designed empty states when nothing exists.

## 8. Work order

1. Step 0 (section 2), then schema discovery (agent 2): produce a table of operations for automation, history, alerts, health, analytics, sign-up/join and profile update, with exact arguments and a live read-only probe result for each.
2. Must-haves first: M3 and M4 (compact/expanded, two-tap flow), M5 (banner), M6 (Automation). Re-verify M1 and M2.
3. Good-to-haves: G6 and G7 (history and the map sheet reuse the command flow), G3, G4, G5, G1, G2.
4. Delighters in the section 6 order, only if the must-haves and seven good-to-haves are working.
5. Stretch: the G8 share button, if time remains.

## 9. Debug loop and definition of done

Run this loop until it is clean: integrate, run the full gate, run the live smoke on the dev API, QA logs defects in `docs/DEFECTS.md` (steps, expected, actual, owner), owners fix, QA re-verifies. Also test deliberately: wrong password, expired session, airplane mode, empty project, a device without GPS, double taps, background and foreground, app kill and relaunch, small (320x568) and large (412x915) screens.

Done means:
- `npm ci && npm run lint && npm run typecheck && npm test` pass, `npx expo-doctor` is clean, and `npx expo export --platform android` succeeds.
- Live smoke on the dev API with the test account: login, organisation and project switch, device list in both modes, a two-tap command with real API response, a polled update producing a banner that routes to the device, Automation Panel, notifications panel, health check, analytics, device summary with history, map sheet with command, profile, logout.
- All 6 must-haves and at least 7 of 8 good-to-haves (G8 deferred) work, plus the chosen delighters.
- `docs/DEFECTS.md` has no open P0 or P1 items.
- `docs/MANUAL_QA.md` gives a step-by-step checklist to verify on a physical phone via `npx expo start --lan`. State exactly what you could not verify yourself.

## 10. Final report

What was built per requirement with its evidence, what was derived from existing data because no operation exists (and why), the unverified items (for example the downlink value shape if no live send was possible), open backend questions, and the commands to run the app.