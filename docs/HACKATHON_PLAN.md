# CTO requirements: next-session execution plan

This plan maps the CTO's supplied requirement image to the current Expo app. Status is based on source inspection and the evidence in PROGRESS.md, not a full acceptance pass. The user confirmed Expo Go launches. A real device, live command and complete phone QA remain unverified.

## Requirement matrix

| Requirement | Status today | Remaining acceptance work |
|---|---|---|
| Must: Sign in | Implemented; live login and organisation read observed | Verify session expiry/restart and switching with multiple organisations on phone. |
| Must: Project selection | Implemented; one project live read observed | Verify switching with multiple projects and dependent state. |
| Must: Device list | Partial: search, filters, refresh, status, enrollment | Add compact/expanded modes; clarify which manipulation actions are authorized; test populated project. Enrollment cluster lookup currently fails. |
| Must: Device downlinks | Partial: real generic interface/value flow and uncertain-delivery lock | Obtain controller mapping and safe values; implement verified two-tap shortcuts and GIF feedback; execute a designated live device test. Current flow is not two taps. |
| Must: Banner notifications | Missing: local event feed and routing exist, but no foreground event banner | Add actionable in-app banner for newly observed events, route to device, deduplicate and test; background/remote delivery is not established. |
| Must: Automation panel | Missing | Obtain web mobile URL, authentication and summary requirements; investigate schema and web behavior. Implement authenticated integration or real native panel after contract verification. A blank WebView is not acceptance. |
| Good: Basic WhatsApp | Missing | Candidate for the one deferral: Meta business account, approved templates, server-side credentials/webhooks and health/Intellidrip contract are not supplied. No token in app. |
| Good: Sign up | Implemented adapter/form, mutation unverified | Verify account creation and discover organization join request operation; current form does not provide join. |
| Good: Profile settings | Implemented; live save unverified | Verify update and organisation/project switching on phone; confirm what project settings means. |
| Good: Notifications panel | Local derived event feed exists | CTO requests web notifications; check schema/captures for actual alert feed and integrate if available. Local feed is not equivalent to backend history. |
| Good: Health check panel | Missing | Obtain definition and backend/web operations; implement from real metrics only. |
| Good: Analytics | Real-data derived dashboard exists | CTO requests existing web analytics; compare and discover actual analytics operations. Current derived metrics are not proven equivalent. |
| Good: Device summary | Current details outputs, attributes and map navigation exist | Discover `deviceHistoricalData` and related schema operations, verify live shape, add history and test with device. |
| Good: Map view | Map, clusters, info sheet and device navigation implemented | Verify tiles and real GPS on phone; add direct command entry from info sheet, reusing safe downlink flow. |
| Delighter: Digital twin | Not implemented | Candidate only if controller states and animation assets are supplied; real device-state visualization first, no fabricated state. |
| Delighter: Custom analytics | Not implemented | Candidate: user-configurable views of existing real numeric attributes, subject to real data and verified semantics. |
| Delighter: Voice commands | Not implemented | Defer: voice recognition, ambiguity and command safety need additional design and verification. |
| Delighter: Advanced WhatsApp chatbot | Not implemented | Defer: external backend, messaging approval and integration dependencies. |
| Delighter: Mobile widgets | Not implemented | Defer: native home-screen widgets conflict with Expo Go-only constraint and require a native build. |
| Delighter: Intellidrip/Airport/Dehn subsections | Not implemented | Candidate only if real project identifiers and domain-specific data/requirements are provided; no invented use cases. |

There are eight good-to-have items: delivering seven is 87.5%, so the requested 90–100% mathematically requires all eight. Deferring WhatsApp yields seven of eight, below the stated threshold. This conflict and external dependencies must be surfaced to the CTO rather than reported as 90%. Two or three delighters can be selected only after their real data/contracts are established; the image does not establish three genuinely easy, independent options under the Expo Go constraint.

## Inputs to obtain at the start

1. A designated dev device with GPS, safe downlink interface/value examples and permission to send; verified enrollment identifiers if it must be registered. Confirm expected two-tap commands and GIF assets.
2. Automation mobile web URL, login/session integration method, expected summary panel, and access to inspect requests; health-check definitions and data source; web analytics and notification examples/operations.
3. Signup/join workflow and authorized test account, plus project settings scope. Meta business credentials, approved template and backend/webhook ownership if WhatsApp is required in this window.
4. Physical Android availability for repeated checks; EAS access and restricted Maps key configured in EAS for an APK. Local `.env.local` is ignored and is not automatically uploaded to EAS.

## 6–8 hour sequence (estimates, not guarantees)

| Time | Work and checkpoint |
|---|---|
| 0:00–0:30 | Read PROGRESS/DEFECTS and current git status; run typecheck and relevant tests; obtain inputs above; reproduce current app on phone. Start backend discovery for automation, health, history, notification, signup/join. |
| 0:30–1:45 | Must-haves: compact/expanded device list, foreground notification banner with correct device routing, tests for dedupe/navigation. Verify existing login/project flows. |
| 1:45–3:15 | Automation integration and summary using authorized web/API contract. In parallel conceptually, confirm the two-tap command mapping and add shortcuts with explicit pending/uncertain behavior and real GIF state. No live command without designated safe values. |
| 3:15–4:30 | Integrate real health check, historical device summary and map-to-command. Verify backend notifications and web analytics; preserve honest local fallback only where agreed. |
| 4:30–5:30 | Signup/join, profile/settings and remaining good-to-have checks; assess WhatsApp dependencies and implement only if backend and Meta setup exist. Reprioritize if discovery reveals missing contracts. |
| 5:30–6:15 | Implement up to 2–3 CTO-approved delighters with verified data/assets; prioritize custom analytics and specific subsections or digital twin only when genuinely supported. |
| 6:15–8:00 | Full automated gate, Android export, live end-to-end device path, two physical QA passes as time permits, fix regressions, build/install preview APK if EAS access exists. Update defects and evidence; report incomplete items honestly. |

Time boxes are planning assumptions, not proof that all external integrations or QA can be completed in eight hours. If a must-have is blocked, continue independent work and record the exact blocker; do not substitute demo data or declare it complete. The original acceptance criteria and zero-open-defect/two-pass requirement remain in force unless the user explicitly changes them.

## Next agent's first steps

1. Read this file, `docs/PROGRESS.md`, `docs/DEFECTS.md`, `docs/DECISIONS.md`, and `docs/API_COVERAGE.md`; inspect `git status` and preserve the dirty worktree.
2. Inspect `docs/api-captures/schema.json` for `automationRuns`, historical and alert operations; capture exact arguments/types and run authorized read-only probes before choosing adapters.
3. Implement the actionable event banner and compact/expanded device list, with tests; update progress and defects with actual results.
4. Work through the schedule in priority order and request missing device/CTO inputs early. Never assume a successful mutation or retry an uncertain command.
