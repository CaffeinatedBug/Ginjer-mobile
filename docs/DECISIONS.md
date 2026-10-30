# Decisions and verification limits

- Separate `mobile/` npm application: root package-lock is empty, source prototype has pnpm-lock. Prototype remains locally in its original location and sanitized under reference/web-prototype; both excluded from commits and builds until the port passes acceptance.
- Expo SDK 58 selected from installed registry template (58.0.21); expo.dev/go advertises Android SDK 58. Actual phone compatibility remains unverified.
- Dev introspection succeeded on 2026-10-30. Captures retain schema only; response token removed. No collection credentials are used.
- SignIn keeps application Ginjer and forever true. Optional phones and image {location key} are schema-supported.
- Real schema exposes signUp and updateUserProfile. These require typed adapters; no fabricated success or unsupported-operation fallback is justified.
- ParamInput supports organisationId, projectId, time only. No device filter/pagination. DeviceDetails must fetch a project tree. Poll lightweight DeviceList; fetch full details on visible detail/map/analytics screens, deduplicated by project. Large-project full-detail polling needs a backend filtered/paginated operation before scale can be certified.
- Project count objects use userCount/deviceCount/clusterCount/nonLoRaWANDeviceCount, not generic count, confirmed by collection/schema.
- JsonObject accepts a JSON object structurally; controller-specific {value:number|string}, output mapping, toggle values and colour encoding remain UNVERIFIED until designated-device execution. Never infer a downlink interface from output order.
- All timeouts/disconnects or malformed responses after downlink dispatch represent uncertain delivery. Do not auto-retry; retain a persistent safety lock for reconciliation.
- Timestamp units, real response nullability, status threshold (24h provisional), and project-scale performance require live account/device evidence.
- No test credentials, designated test device, EAS project or Android debugging tools supplied at reconnaissance. These block live acceptance/build/device checks, not local implementation.

- User deferred designated-device authorization until devices are added; re-prompt for device name and safe values then. No downlink test authorized now. User will run phone checks with Expo Go --lan. EAS APK remains unverified and no account is supplied.
- Authenticated read smoke passed login/org/projects/modules and empty device list/detail responses. No accessible devices were returned; telemetry response shapes remain schema-only evidence.
