# Defects and release blockers

No completion claim is authorized while these are open.

| ID | Status | Issue / expected / actual | Owner / remaining dependency |
|---|---|---|---|
| LIVE-01 | Backend blocked | Device telemetry/downlink/map acceptance requires devices; authenticated account returns zero devices | User will add devices, then identify permitted name/values |
| RELEASE-01 | External verification pending | Actual EAS preview APK install/launch has not occurred | Expo account/project and Android target not supplied; user plans Expo Go LAN |
| QA-01 | External verification pending | Final local automated gate is green: clean install, lint, typecheck, 31 tests, Expo Doctor, dependency check, Android export and high/critical audit threshold. The live end-to-end acceptance matrix cannot run because the authenticated account returns zero devices. | Populated dev account and a designated test device |
| QA-02 | Manual pending | Two complete Android QA passes, visual fidelity, TalkBack, rotation, keyboard, lifecycle | User phone verification |
| SCALE-01 | Backend limitation | No pagination/device-ID detail filter in verified ParamInput | Backend contract for scalable project detail access |
| PERF-01 | Unverified | Startup, response and memory measurements require running Android | Android device/emulator |
| SEC-01 | Resolved with tested override | Initial `npm audit --audit-level=high` found three high findings through Expo SDK 58 CLI's nested `zod@3.25.76` (GHSA-mrhx-c7xc-m3w5). Scoped npm override `@expo/cli > zod@4.6.7` removed all high/critical findings. Expo Doctor 20/20, dependency check, Android export, LAN Metro start, typecheck and 31 tests passed after override. Risk: upstream CLI declares `zod^3`; unexercised CLI paths still need monitoring. | Platform / monitor Expo SDK patches |
| MAP-01 | Release configuration pending | Preview/production Android Google Maps key is not supplied in `GOOGLE_MAPS_ANDROID_API_KEY`. Expo Go uses its bundled map setup; signed APK map rendering needs the project's restricted key and signing SHA-1. | Google Maps key in EAS environment and APK test |
| DEVICE-CTRL-01 | Backend/device blocked | Main-output toggle and colour control cannot be mapped to a verified downlink interface or controller payload: authenticated account has zero devices. Current device UI offers only the generic Send Downlink sheet. Expected: working toggle/colour with pending, confirmation and rollback. Actual: unavailable until a designated device and safe command values can be tested. | Downlink owner / designated device and controller contract |
| DEVICE-ENROLL-01 | Backend blocked | The `clusters(params:{organisationId,projectId})` lookup needed by device enrollment returned `INTERNAL_SERVER_ERROR` on the authenticated dev account. Expected: selectable project clusters. Actual: app permits an operator-entered verified cluster ID while retaining the failure warning. | Backend repair or a verified cluster ID from the device operator; then authorized live SaveDevice + reload verification |
| DEV-ACCESS-01 | Resolved by user verification | Metro produced `exp://10.129.200.189:8082`; initial investigation showed a restricted local socket/firewall environment and unavailable tunnel. The user subsequently confirmed Expo Go bundles and runs successfully. | Keep the stable `npm run start:lan` command and the firewall recovery instruction in `MANUAL_QA.md` for future network changes. |

Downlink timeout is never evidence of failed delivery and never triggers automatic resend. Device test question deferred per user instruction.

2026-10-30 live auth probe: dev bad-password call was rejected with `INTERNAL_SERVER_ERROR` at path `signIn` and a message containing `invalid` and `password`. An invalid token returned `UNAUTHENTICATED`. Sanitized evidence is in `docs/api-captures/live-read-smoke.json`; the transport now maps only that exact sign-in pattern to an auth error.
