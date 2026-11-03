# Screen traceability

Targets below map prototype behavior to native feature folders. All screens are wired, but a row is accepted only after its listed verification runs; physical Android checks remain pending. Source: web `App.tsx` and `index.css`; frames secondary. Main-output toggle/colour is tracked as backend blocked in `DEFECTS.md` until controller mapping is verified on a designated device.

| Prototype screen / interaction | Native owner | Verification |
|---|---|---|
| Login, email/password blur errors, show password, pending/error | features/auth | RNTL; bad password/network/live sign-in |
| Sign-up | features/auth | Schema adapter tests; authorized account creation |
| Profile, real identity, phones, organisation | features/profile | Live returned fields; no sample identity |
| Edit profile, validation, dirty/back/discard/save | features/profile | RNTL; live update and reload |
| Organisation sheet search/loading/error/empty/pending/select | features/organisations | Query tests; org switch cancellation |
| Project sheet search/loading/error/empty/select | features/projects | Query tests; project switch cancellation |
| Project cards, workspace header and mobile workspace sections | features/projects/ProjectWorkspaceScreen | Workspace RNTL test; Android card/navigation check |
| Devices search/debounce/filter/refresh/scroll/status/skeleton/retry | features/devices | FlatList tests; real data; 10k-row performance |
| Add device button, configuration pickers, manual verified IDs, confirmation | features/devices/AddDeviceScreen | Enrollment contract tests; hardware/network authenticated reads; authorized operator registration and reload |
| Device details outputs/attributes/last heard | features/devices | Schema tests; live reads |
| Main output toggle and colour picker | features/downlink | Designated-device mapping and rollback/uncertain tests |
| Downlink module selection, value, pending/result | features/downlink | Duplicate/timeout tests; authorized real execution |
| Downlink animated sending/success/uncertain feedback | features/downlink | Contract tests; authorized real execution |
| Locations search/markers/clusters/zoom | features/locations | Android map key and gesture verification |
| Device info sheet, View Device, View Map focus | features/locations | Navigation/device-coordinate checks |
| Notifications screen/search/read state/device navigation | features/notifications | Snapshot diff tests; persistence; real uplink |
| In-app notification banner/foreground summary/vibration | features/notifications/EventBanner | Diff tests; Android event generation and routing |
| Notification panel and View all | features/notifications | Android sheet/back/read checks |
| Analytics counts/status/last-heard/attributes | features/analytics | Pure derivation tests; no invented charts |
| Health Check, Custom Analytics, Automation Summary | features/analytics | Pure derivation/runtime adapter tests; live project data |
| Automation list, enable/disable toggle, Run now, refresh and expandable run fields | features/projects/ProjectWorkspaceScreen | Toggle/manual mutation contract tests; live alert/run and designated action checks |
| Device history chart and state-only Digital Twin | features/devices | History parser tests; designated-device API/Android check |
| Logout confirm/cancel/session/cache clear | lib/session | Session tests; restart and expiry |
| Snackbar, sheet scrim/swipe/Android back | shared | RNTL; TalkBack and keyboard checks |
| Offline, slow network, errors and stale data | lib/graphql + uplink | Cancellation/retry tests; airplane mode |
| Tab/stack navigation, rotation, font scale, keyboard | navigation + shared | 320x568, 360x800, 412x915 screenshots |
| Screen index, download code, demo/API switch | Removed from native scope | Release source/bundle scan |

Asset inventory: ASSETS.md. Full source/dependency inventory: INVENTORY.md and reference package.json. Original uses React19/Vite8/Tailwind4, browser localStorage/history, Vite proxy and Maps JS key; none are native contracts.
