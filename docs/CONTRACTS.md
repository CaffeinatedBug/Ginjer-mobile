# Shared implementation contracts

- Native root mobile/, strict TypeScript; npm lock only. SDK58 managed Expo.
- Navigation: React Navigation native stack + bottom tabs. Route IDs: Home, Login, SignUp, DeviceDetails {deviceId}, EditProfile, Notifications; tabs Devices, Locations, Analytics, Profile.
- src/lib/contracts.ts exports runtime zod schemas and inferred types. IDs strings, API scalars remain unknown until validated. Missing measurements stay absent.
- src/lib/graphql.ts exports request(query,variables,schema,{signal?,mutation?,authenticated?}). No retries inside transport; raw token header fixed allowlisted origin; all errors sanitized.
- src/lib/session.ts exports useSession, hydrateSession, establishSession, logout. SecureStore only for secrets. queryClient owned by lib/query.ts; logout cancels/clears all stores.
- Workspace state in lib/workspace.ts: orgId/projectId; scoped query keys ['projects',orgId], ['devices',orgId,projectId], ['details',orgId,projectId], ['modules',orgId]. Switch cancels obsolete work.
- API repository in lib/repository.ts: signIn/listOrganisations/listProjects/listDevices/listDeviceDetails/listModules. Feature mutation adapters under feature/api.
- Shared UI exports Screen, Button, Field, Header, Sheet, Skeleton, EmptyState, Snackbar, Icon from shared/index.tsx. Theme lib/theme.ts. Keep 48dp targets and accessible roles.
- Device details fetched once per project per observer group; no per-row detail calls. Poll only focused/active views, 30s interval. Unknown timestamps yield Unknown status.
- Persistent downlink safety state belongs to downlink feature; synchronous acquisition prevents double taps; unresolved dispatch blocks future submission until external reconciliation.
- Ownership: platform config + scripts; UI shared; API lib + contracts; auth/profile respective features; org/projects/devices; downlink; locations; notifications/analytics/uplink; QA tests/docs audit. Do not cross-edit without HANDOFFS entry.
- No implementation or test status is evidence of live operation or device verification.
