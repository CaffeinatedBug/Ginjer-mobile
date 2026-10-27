# Ginjer Android implementation plan

## Objective

Build an Android app in React Native that reproduces the relevant Ginjer web workflows using the mobile screens, components, assets and states in the supplied Figma file. The existing Ginjer GraphQL API is the integration target. Do not redesign the interface or substitute invented components for the supplied design.

## Discovery and design handoff

1. Inventory every mobile frame, variant, interaction, navigation path, component, token, image and icon in `Alum Hacks v1.0.fig`. Distinguish mobile designs from web reference snapshots. Record missing fonts and obtain the original files or approved equivalents.
2. Compare the inventory with the authenticated production web app and existing iOS app. Record behaviour, roles, empty/loading/error states, filters, validation, and actions that are not specified in Figma. Confirm the intended scope where the web app has no corresponding mobile design.
3. Export the original Figma assets at suitable resolutions and translate the design system into reusable React Native components. Check each screen against the source at Android device sizes, including safe areas and keyboard handling.

## Existing integration

The provided Postman collection contains GraphQL operations for sign-in, accounts/organisations, project overview, device list and details, modules, and downlinks. Authenticated requests use the `authorization` header with the returned token. The collection has no saved response examples. Validate the endpoint, inputs, errors, token lifetime, pagination and permissions against a suitable test account before relying on assumptions.

Create an operation-to-screen matrix as part of discovery. The supplied collection does not document operations for profile editing, analytics, alerts, and other web features; these must be confirmed with the API owner. Do not manufacture live data or present incomplete actions as functional. Only build additional Node.js services if an agreed requirement cannot be met by the existing API; do not duplicate the production backend by default.

## Delivery sequence

1. Establish an Android React Native and TypeScript project, environment configuration, navigation, secure session storage, GraphQL client and typed error handling. Keep credentials and tokens out of source control and logs.
2. Implement sign-in and session restoration, then organisation and project selection, matching all supplied Figma states.
3. Implement device listing and details and the supported downlink flow, including confirmation and server errors as defined by the product.
4. Implement the Figma locations flow with real device coordinates and the agreed map provider, then profile, analytics, alerts and remaining designed journeys as their API contracts become available.
5. Verify functionality using a test account and representative data; test session expiry, permission boundaries, network failure, Android back navigation, multiple screen sizes and accessibility. Compare every delivered screen and state with Figma.
6. Provide Android build and run instructions, configuration documentation, an API coverage matrix and a Postman collection for any newly agreed backend operations.

## Information needed

- A non-production or explicitly approved test account and environment, with representative organisations, projects and devices; do not place credentials in the repository.
- Access to the authenticated web application or a walkthrough, and optionally the existing iOS app, to establish behaviour that is not visible on the public product page.
- API documentation or collection additions for the remaining designed workflows, plus the map provider and Android key configuration.
- The missing Figma fonts, and confirmation of the first-release scope where the web product exceeds the mobile design.
