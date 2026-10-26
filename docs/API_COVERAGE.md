# API coverage

All operations POST JSON to configured HTTPS origin; raw authorization token. Queries in sanitized collection are authoritative, supplemented by captured dev schema. A sanitized authenticated read smoke is recorded in `docs/api-captures/live-read-smoke.json`; device values and mutations remain unverified.

| Operation | Variables | Selected response | Consumer / verification |
|---|---|---|---|
| SignIn | auth: SignInInput {emailId,password,application:Ginjer,forever:true} | _id firstName lastName emailId token defaultAccount organisationId; phoneNo/alternateNo{countryCode number}; image{key location} | Auth/session/profile; live sign-in and field types verified, no values retained |
| OrgList | none | accounts{organisationId name isActive isAccepted isAdmin} | Organisation picker; live read passed (one active accepted org) |
| ProjectList | params: ParamInput {organisationId} | projectOverview{_id name description active organisationId location{placeName lat lng} userCount{_id userCount} deviceCount{_id deviceCount} clusterCount{_id clusterCount} nonLoRaWANDeviceCount{_id nonLoRaWANDeviceCount}} | Projects/analytics; live read passed (one project) |
| DeviceList | params {organisationId,projectId} | projects{_id name clusters{_id name devices{_id name devEui hardwareId timestamp deleted}}} | List/lightweight polling; updated query accepted by live API, but the result is empty so per-device field values remain unverified |
| DeviceDetails | params {organisationId,projectId} | DeviceList plus description organisationId projectId clusterId networkId hardwareType position{placeName lat lng} outputs{outputId outputName value label color} attributes{attributeId attributeName value} | Details/maps/events/analytics; live empty result passed; value shapes remain unverified; no device-ID filtering supported |
| ModuleList | params {organisationId} | modules{_id label moduleType organisationId} | Downlink picker; live read passed (103 downlink interfaces) |
| HardwareList | params {organisationId} | hardwareList{_id name type deleted} | Device enrollment hardware picker; authenticated live read passed (142 records; values not retained) |
| NetworkList | params {organisationId} | networkList{_id name deleted networkInterface} | Device enrollment network picker; authenticated live read passed (7 records; values not retained) |
| ClusterList | params: ClusterParamInput {organisationId,projectId} | clusters{_id name deleted} | Device enrollment cluster picker; authenticated live call returned `INTERNAL_SERVER_ERROR`; UI permits a verified manual ID and records the limitation |
| SaveDevice (mutation) | device: DeviceInput {organisationId,projectId,clusterId,hardwareId,networkId,mainOutputId,devEui,name,attributes,…} | saveDevice device fields | Device enrollment; schema and adapter test verified. No live mutation has been sent, so device registration remains operator-verified work. |
| SendDownlink (query with side effects) | action: SendDownlinkInput {organisationId,deviceId,downlinkInterfaceId,value:JsonObject} | sendDownlink{timestamp type message} | Never retry; controller semantics/live execution pending |
| SignUp (mutation) | user: SignUpInput {firstName,lastName,emailId,password,application:Ginjer} | signUp{_id firstName lastName emailId} | Auth; discovered schema, live pending |
| UpdateUserProfile (mutation) | editUserInput: EditUserInput {_id,firstName,lastName,emailId,phoneNo?,alternateNo?} | updateUserProfile{_id firstName lastName emailId phoneNo{countryCode number} alternateNo{countryCode number} image{key location}} | Edit profile; schema verified, live pending |

No subscription used. Notifications and analytics derived locally as requested. Schema additionally exposes historical/alert operations; these do not override requested scope. Full exposed operation inventory in api-captures/schema.json. Discovery requests are read-only and unauthenticated; HTTP200 alone is not authenticated operation evidence.
