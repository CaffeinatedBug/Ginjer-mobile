# API coverage

All operations POST JSON to configured HTTPS origin; raw authorization token. Queries in sanitized collection are authoritative, supplemented by captured dev schema. Live authenticated results are not yet verified.

| Operation | Variables | Selected response | Consumer / verification |
|---|---|---|---|
| SignIn | auth: SignInInput {emailId,password,application:Ginjer,forever:true} | _id firstName lastName emailId token defaultAccount organisationId; phoneNo/alternateNo{countryCode number}; image{key location} | Auth/session/profile; schema verified, live pending |
| OrgList | none | accounts{organisationId name isActive isAccepted isAdmin} | Organisation picker; live pending |
| ProjectList | params: ParamInput {organisationId} | projectOverview{_id name description active organisationId location{placeName lat lng} userCount{_id userCount} deviceCount{_id deviceCount} clusterCount{_id clusterCount} nonLoRaWANDeviceCount{_id nonLoRaWANDeviceCount}} | Projects/analytics; live pending |
| DeviceList | params {organisationId,projectId} | projects{_id name clusters{_id name devices{_id name devEui hardwareId timestamp}}} | List/lightweight polling; live pending |
| DeviceDetails | params {organisationId,projectId} | DeviceList plus description organisationId projectId clusterId networkId hardwareType deleted position{placeName lat lng} outputs{outputId outputName value label color} attributes{attributeId attributeName value} | Details/maps/events/analytics; no device-ID filtering supported |
| ModuleList | params {organisationId} | modules{_id label moduleType organisationId} | Downlink picker; enums schema verified |
| SendDownlink (query with side effects) | action: SendDownlinkInput {organisationId,deviceId,downlinkInterfaceId,value:JsonObject} | sendDownlink{timestamp type message} | Never retry; controller semantics/live execution pending |
| SignUp (mutation) | user: SignUpInput {firstName,lastName,emailId,password,application:Ginjer} | signUp{_id firstName lastName emailId} | Auth; discovered schema, live pending |
| UpdateUserProfile (mutation) | editUserInput: EditUserInput {_id,firstName,lastName,emailId,phoneNo?,alternateNo?} | updateUserProfile{_id firstName lastName emailId phoneNo{countryCode number} alternateNo{countryCode number} image{key location}} | Edit profile; schema verified, live pending |

No subscription used. Notifications and analytics derived locally as requested. Schema additionally exposes historical/alert operations; these do not override requested scope. Full exposed operation inventory in api-captures/schema.json. Discovery requests are read-only and unauthenticated; HTTP200 alone is not authenticated operation evidence.
