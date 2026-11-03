# Ginjer Mobile

Ginjer is an Expo/React Native companion for monitoring and controlling connected devices through the Ginjer GraphQL APIs. It is built for organisation and project workspaces: users can inspect device health and outputs, view locations, send supported downlinks, review notifications, and manage automations from a mobile-first interface.

## What is included

- Secure sign-in and persisted sessions with organisation and project selection.
- A project workspace with Dashboard, Locations, Devices, Users, Automate, Notifications, and Reports views.
- Device search, status, last-heard state, attributes, output values, device detail, historical values, and map locations.
- Device output presentation using real labels, values, icons, and semantic status colours.
- Foreground live polling every 20 seconds for device and telemetry updates.
- Supported downlink flow with interface selection, value entry, command feedback, and automatic reconciliation of ambiguous delivery results.
- Production-routed downlink dispatch using the API's scalar command-value contract; read/auth traffic can remain on the development endpoint during integration.
- Automation listing, active/inactive toggles, and manual runs for the API operations currently available.
- Event banners and notification history derived from observed device changes.
- Analytics, health checks, custom metrics, device history, and a digital-twin style output summary.

The app intentionally renders only data returned by the API. Empty, loading, unsupported, and error states are shown explicitly rather than being replaced with sample device data.

## Tech stack

- Expo SDK 58 / React Native 0.88 / TypeScript
- React Navigation
- TanStack Query for caching, refresh, polling, and request lifecycle
- Zustand and AsyncStorage for local UI/session state
- Zod runtime schemas for API response validation
- React Native Maps for device locations
- Jest + React Native Testing Library + ESLint

## Repository layout

```text
mobile/                  Expo application
  src/features/          Screen-level product features
  src/lib/               GraphQL client, API operations, contracts, repository
  src/shared/            Reusable UI, icons, theme, and primitives
  tests/                 Unit, contract, and flow tests
docs/                    API coverage, QA, decisions, and traceability
reference/               Supplied reference prototype material
Ginjer-frames/           Design-reference frames
```

## Run locally

### Prerequisites

- Node.js 20 LTS or newer
- npm
- Expo Go on an Android or iOS device, or an Android/iOS simulator

### Install and start

```bash
cd mobile
npm ci
npm run start:lan
```

Use the QR code or the `exp://` address printed by Expo. For a phone, the computer and phone must be on the same network.

Other useful commands:

```bash
npm run android
npm run ios
npm run web
npm run lint
npm run typecheck
npm test
npm run check
```

## Configuration

Create `mobile/.env.local` for local-only configuration. It is ignored by Git.

```dotenv
# Development endpoint used for authentication and read-side integration.
EXPO_PUBLIC_GINJER_API_URL=https://devapi.ginjer.io/graphql

# Required only when building Android Maps support.
GOOGLE_MAPS_ANDROID_API_KEY=your_android_maps_key
```

`GOOGLE_MAPS_API_KEY` is also supported as an alternative Maps variable. Never commit access tokens, passwords, API keys, or environment files.

### API routing

The read/auth endpoint is configurable through `EXPO_PUBLIC_GINJER_API_URL`. Downlink mutations are deliberately sent to the production Ginjer API endpoint and use its expected scalar command-value payload. This prevents a development read configuration from accidentally redirecting device commands away from the live command service.

Before issuing a physical command, confirm the selected device, interface, port, and safe command value. A successful API acknowledgement confirms that the command service accepted the request; device-state confirmation still depends on a subsequent uplink or refreshed device state.

## Quality checks

From `mobile/`:

```bash
npm run lint
npm run typecheck
npm test
npx expo export --platform android
```

The test suite covers API contracts, downlink payload routing/value handling, device fetches and history parsing, automation controls, organisation refresh behavior, notifications, and key screen flows. See [Manual QA](docs/MANUAL_QA.md) for physical-device acceptance checks and [API coverage](docs/API_COVERAGE.md) for the currently verified API surface.

## Device command safety

Downlinks affect real hardware. The app avoids automatic command retries and retains an ambiguous-command safeguard when a request outcome cannot be determined. Operators should verify the device state after a command and avoid duplicate dispatches while a state change is pending.

## Contributing

1. Create a branch using the `codex/` prefix.
2. Keep configuration and credentials local.
3. Run lint, type checks, and relevant tests before opening a pull request.
4. Update the matching documentation when API behavior, user flows, or QA expectations change.

## License

This repository does not currently declare a license. Do not assume permission to redistribute its code or bundled design/API materials.
