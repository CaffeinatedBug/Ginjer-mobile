# Defects and release blockers

No completion claim is authorized while these are open.

| ID | Status | Issue / expected / actual | Owner / remaining dependency |
|---|---|---|---|
| LIVE-01 | Backend blocked | Device telemetry/downlink/map acceptance requires devices; authenticated account returns zero devices | User will add devices, then identify permitted name/values |
| RELEASE-01 | External verification pending | Actual EAS preview APK install/launch has not occurred | Expo account/project and Android target not supplied; user plans Expo Go LAN |
| QA-01 | Open | Full implementation and automated acceptance pending | Build team |
| QA-02 | Manual pending | Two complete Android QA passes, visual fidelity, TalkBack, rotation, keyboard, lifecycle | User phone verification |
| SCALE-01 | Backend limitation | No pagination/device-ID detail filter in verified ParamInput | Backend contract for scalable project detail access |
| PERF-01 | Unverified | Startup, response and memory measurements require running Android | Android device/emulator |

Downlink timeout is never evidence of failed delivery and never triggers automatic resend. Device test question deferred per user instruction.
